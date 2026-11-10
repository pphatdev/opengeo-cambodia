import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Icon } from "../../components/Icon";
import { cx } from "../../components/ui";
import { useI18n } from "../../i18n";
import { ApiError, apiGet, type RequestLog } from "../../lib/api";
import { cssVar, useTheme } from "../../lib/theme";
import type { ApiEnvelope, BoundaryCollection, BoundaryFeature, BoundaryLevel, BoundaryProps, GeocodeResult } from "../../lib/types";
import type { MapTarget } from "./Explorer";

const KH_BOUNDS: L.LatLngBoundsExpression = [[10.35, 102.3], [14.75, 107.65]];
const MAX_BOUNDS: L.LatLngBoundsExpression = [[8.5, 100.5], [16.5, 109.5]];
const mapTool =
    "inline-flex h-9 cursor-pointer items-center gap-[7px] rounded-[9px] border border-line bg-surface px-3 text-[13px] font-medium text-ink shadow-card aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg km:font-khmer [&_svg]:size-[15px]";
// Popup markup is a string for Leaflet; Tailwind still sees these classes in source
const POP_TITLE = "mb-1 font-semibold";
const POP_SUB = "mb-2 text-xs text-ink-3";
const PANES = { base: 410, children: 420, focus: 430 } as const;

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tipHtml = (p: BoundaryProps) => `${esc(p.name_en)}<span class="ml-1 font-khmer text-xs opacity-75">${esc(p.name_km)}</span>`;

const baseStyle = (): L.PathOptions => ({ color: cssVar("--og-ink-3"), weight: 1, opacity: 0.45, fillColor: cssVar("--og-ink-3"), fillOpacity: 0.03 });
const dimmedBaseStyle = (): L.PathOptions => ({ ...baseStyle(), opacity: 0.25, fillOpacity: 0 });
const childStyle = (): L.PathOptions => ({ color: cssVar("--og-water"), weight: 1.5, opacity: 0.85, fillColor: cssVar("--og-water"), fillOpacity: 0.08 });
const focusStyle = (): L.PathOptions => ({ color: cssVar("--og-accent"), weight: 2.5, opacity: 1, fillColor: cssVar("--og-accent"), fillOpacity: 0.15 });

interface Props {
    target: MapTarget | null;
    resetKey: number;
    onSelect: (level: BoundaryLevel, code: string) => void;
    onLog: (entry: RequestLog) => void;
    onReset: () => void;
}

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        const container = map.getContainer();
        if (!container) return;
        const ro = new ResizeObserver(() => {
            map.invalidateSize({ debounceMoveend: true });
        });
        ro.observe(container);
        map.invalidateSize();
        return () => ro.disconnect();
    }, [map]);
    return null;
}

export function ExplorerMap({ target, resetKey, onSelect, onLog, onReset }: Props) {
    const { dark } = useTheme();
    const { t } = useI18n();
    const [picking, setPicking] = useState(false);
    const [loading, setLoading] = useState(false);
    const pickingRef = useRef(picking);
    pickingRef.current = picking;

    return (
        <div
            className={cx(
                "og-map relative h-full w-full min-h-95 sm:min-h-110 [&_.leaflet-container]:absolute [&_.leaflet-container]:inset-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full",
                picking && "og-picking",
                dark && "og-map-dark",
            )}
        >
            <MapContainer
                className="h-full w-full"
                bounds={KH_BOUNDS}
                minZoom={6}
                maxBounds={MAX_BOUNDS}
                aria-label={t("explore.mapLabel")}
            >
                <TileLayer
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapResizer />
                <BoundaryLayers target={target} resetKey={resetKey} dark={dark} onSelect={onSelect} onLog={onLog} setLoading={setLoading} pickingRef={pickingRef} />
                <PointPicker picking={picking} resetKey={resetKey} onSelect={onSelect} onLog={onLog} />
            </MapContainer>
            <div className="absolute right-3 top-3 z-500 flex gap-1.5">
                <button className={mapTool} type="button" aria-pressed={picking} onClick={() => setPicking((p) => !p)} title={t("explore.identifyTitle")}>
                    <Icon name="pin" />{t("explore.identify")}
                </button>
                <button className={mapTool} type="button" onClick={onReset} title={t("explore.resetTitle")}><Icon name="layers" />{t("explore.reset")}</button>
            </div>
            {loading && <div className="absolute left-14 top-3 z-500 flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-2"><span className="size-3 animate-spin rounded-full border-2 border-line-2 border-t-accent" /><span>{t("explore.loadingBoundaries")}</span></div>}
            {picking && <div className="pointer-events-none absolute bottom-3.5 left-1/2 z-500 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1.75 text-[12.5px] text-bg">{t("explore.pickHint")}</div>}
        </div>
    );
}

interface LayerProps {
    target: MapTarget | null;
    resetKey: number;
    dark: boolean;
    onSelect: Props["onSelect"];
    onLog: Props["onLog"];
    setLoading: (v: boolean) => void;
    pickingRef: RefObject<boolean>;
}

function BoundaryLayers({ target, resetKey, dark, onSelect, onLog, setLoading, pickingRef }: LayerProps) {
    const map = useMap();
    const base = useRef<L.GeoJSON | null>(null);
    const children = useRef<L.GeoJSON | null>(null);
    const focus = useRef<L.GeoJSON | null>(null);
    const provinces = useRef<BoundaryCollection | null>(null);
    const dimmed = useRef(false);
    const onSelectRef = useRef(onSelect);
    const onLogRef = useRef(onLog);
    onSelectRef.current = onSelect;
    onLogRef.current = onLog;

    // Dedicated panes keep provinces < children < focus regardless of load order
    useEffect(() => {
        for (const [name, z] of Object.entries(PANES)) {
            if (!map.getPane(name)) map.createPane(name).style.zIndex = String(z);
        }
    }, [map]);

    const showFocus = useCallback(
        (feature: BoundaryFeature | null, fit = true) => {
            if (focus.current) map.removeLayer(focus.current);
            focus.current = null;
            if (!feature) return;
            focus.current = L.geoJSON(feature, { pane: "focus", style: focusStyle, interactive: false }).addTo(map);
            if (fit) map.fitBounds(focus.current.getBounds(), { padding: [30, 30], maxZoom: 13 });
        },
        [map],
    );

    const showChildren = useCallback(
        (fc: BoundaryCollection | null) => {
            if (children.current) map.removeLayer(children.current);
            children.current = null;
            if (!fc?.features?.length) return;
            const layer: L.GeoJSON = L.geoJSON(fc, {
                pane: "children",
                style: childStyle,
                onEachFeature: (f, l) => {
                    const p = f.properties as BoundaryProps;
                    l.bindTooltip(tipHtml(p), { sticky: true, className: "og-tip", direction: "top" });
                    l.on("mouseover", () => (l as L.Path).setStyle({ fillOpacity: 0.22, weight: 2 }));
                    l.on("mouseout", () => layer.resetStyle(l));
                    l.on("click", (e) => {
                        if (pickingRef.current) return;
                        L.DomEvent.stop(e);
                        onSelectRef.current(p.level, p.code);
                    });
                },
            }).addTo(map);
            children.current = layer;
            dimmed.current = true;
            base.current?.setStyle(dimmedBaseStyle);
        },
        [map, pickingRef],
    );

    // National province outlines (loaded once; not logged to keep the console focused)
    useEffect(() => {
        const ctrl = new AbortController();
        setLoading(true);
        apiGet<BoundaryCollection>("/api/boundaries/provinces", undefined, ctrl.signal)
            .then((fc) => {
                provinces.current = fc;
                base.current = L.geoJSON(fc, {
                    pane: "base",
                    style: () => (dimmed.current ? dimmedBaseStyle() : baseStyle()),
                    onEachFeature: (f, l) => {
                        const p = f.properties as BoundaryProps;
                        l.bindTooltip(tipHtml(p), { sticky: true, className: "og-tip", direction: "top" });
                        l.on("mouseover", () => {
                            if (!dimmed.current) (l as L.Path).setStyle({ fillOpacity: 0.12, fillColor: cssVar("--og-accent") });
                        });
                        l.on("mouseout", () => {
                            if (!dimmed.current) (l as L.Path).setStyle(baseStyle());
                        });
                        l.on("click", (e) => {
                            if (pickingRef.current) return;
                            L.DomEvent.stop(e);
                            onSelectRef.current("province", p.code);
                        });
                    },
                }).addTo(map);
            })
            .catch(() => { })
            .finally(() => {
                if (!ctrl.signal.aborted) setLoading(false);
            });
        return () => {
            ctrl.abort();
            if (base.current) map.removeLayer(base.current);
            base.current = null;
        };
    }, [map, setLoading, pickingRef]);

    // React to selection changes from the side panel, search or polygon clicks
    useEffect(() => {
        if (!target) return;
        const ctrl = new AbortController();
        const { level, item } = target;
        const code = item.code ?? String(item.id);
        const get = <T,>(path: string) => apiGet<T>(path, onLogRef.current, ctrl.signal);
        const ignoreAbort = (e: unknown) => {
            if ((e as Error)?.name !== "AbortError") showChildren(null);
        };
        const fetchFocus = () =>
            get<BoundaryFeature>(`/api/boundaries/item/${encodeURIComponent(code)}`)
                .then((f) => showFocus(f))
                .catch(() => { }); // some newer units have no polygon (404)

        if (level === "province") {
            const f = provinces.current?.features.find((x) => x.properties.code === code);
            if (f) showFocus(f);
            else void fetchFocus();
            get<BoundaryCollection>(`/api/boundaries/districts?province_code=${code}`).then(showChildren, ignoreAbort);
        } else if (level === "district") {
            void fetchFocus();
            get<BoundaryCollection>(`/api/boundaries/communes?district_code=${code}`).then(showChildren, ignoreAbort);
        } else {
            const siblings = children.current?.toGeoJSON() as BoundaryCollection | undefined;
            const existing = siblings?.features?.find((x) => x.properties?.code === code);
            if (existing) showFocus(existing);
            else {
                // Arrived via search: also load the neighbouring communes so they're clickable
                void fetchFocus();
                get<BoundaryCollection>(`/api/boundaries/communes?district_code=${code.slice(0, 4)}`).then(showChildren, () => { });
            }
        }
        return () => ctrl.abort();
    }, [target, showFocus, showChildren]);

    // Reset to the national view
    const firstReset = useRef(true);
    useEffect(() => {
        if (firstReset.current) {
            firstReset.current = false;
            return;
        }
        showFocus(null);
        showChildren(null);
        dimmed.current = false;
        base.current?.setStyle(baseStyle);
        map.fitBounds(KH_BOUNDS);
    }, [resetKey, map, showFocus, showChildren]);

    // Re-colour layers after a theme switch (wait a frame for the CSS variables to update)
    useEffect(() => {
        const id = requestAnimationFrame(() => {
            base.current?.setStyle(dimmed.current ? dimmedBaseStyle : baseStyle);
            children.current?.setStyle(childStyle);
            focus.current?.setStyle(focusStyle);
        });
        return () => cancelAnimationFrame(id);
    }, [dark]);

    return null;
}

function PointPicker({
    picking,
    resetKey,
    onLog,
    onSelect,
}: {
    picking: boolean;
    resetKey: number;
    onLog: Props["onLog"];
    onSelect: Props["onSelect"];
}) {
    const map = useMap();
    const marker = useRef<L.CircleMarker | null>(null);
    const boundaryLayer = useRef<L.GeoJSON | null>(null);
    const { t } = useI18n();

    useEffect(() => {
        if (marker.current) map.removeLayer(marker.current);
        marker.current = null;
        if (boundaryLayer.current) map.removeLayer(boundaryLayer.current);
        boundaryLayer.current = null;
    }, [resetKey, picking, map]);

    useMapEvents({
        click(e) {
            if (!picking) return;
            const lat = e.latlng.lat.toFixed(5);
            const lon = e.latlng.lng.toFixed(5);

            if (marker.current) map.removeLayer(marker.current);
            if (boundaryLayer.current) map.removeLayer(boundaryLayer.current);
            boundaryLayer.current = null;

            const m = L.circleMarker(e.latlng, {
                pane: "focus",
                radius: 7,
                color: cssVar("--og-bg"),
                weight: 2,
                fillColor: cssVar("--og-accent"),
                fillOpacity: 1,
            }).addTo(map);
            marker.current = m;

            m.bindPopup(
                `<div class="${POP_SUB}">${esc(t("explore.lookingUp", { coords: `${lat}, ${lon}` }))}</div>`,
            ).openPopup();

            // 1. Fetch boundary zone polygons (instant, in-memory)
            const zonePromise = apiGet<BoundaryCollection>(
                `/api/boundaries/zone?lat=${lat}&lng=${lon}&format=geojson`,
                onLog,
            )
                .then((zoneFc) => {
                    if (zoneFc?.features?.length) {
                        if (boundaryLayer.current) map.removeLayer(boundaryLayer.current);
                        const bLayer = L.geoJSON(zoneFc, {
                            pane: "focus",
                            style: (feat) => {
                                const lvl = feat?.properties?.level;
                                return {
                                    color: lvl === "commune" ? cssVar("--og-accent") : cssVar("--og-water"),
                                    weight: lvl === "commune" ? 2.5 : 1.5,
                                    opacity: lvl === "commune" ? 1 : 0.7,
                                    fillColor: lvl === "commune" ? cssVar("--og-accent") : cssVar("--og-water"),
                                    fillOpacity: lvl === "commune" ? 0.2 : 0.06,
                                };
                            },
                            onEachFeature: (f, l) => {
                                l.on("click", (evt) => {
                                    L.DomEvent.stop(evt);
                                    const p = f.properties as BoundaryProps;
                                    if (p?.code && p?.level) onSelect(p.level, p.code);
                                });
                            },
                        }).addTo(map);
                        boundaryLayer.current = bLayer;
                    }
                    return zoneFc;
                })
                .catch(() => null);

            // 2. Fetch reverse geocoding
            const geocodePromise = apiGet<ApiEnvelope<GeocodeResult>>(
                `/api/geocode/reverse?lat=${lat}&lon=${lon}`,
                onLog,
            ).catch(() => null);

            Promise.all([zonePromise, geocodePromise])
                .then(([zoneFc, geoRes]) => {
                    const communeFeat = zoneFc?.features?.find((f) => f.properties?.level === "commune");
                    const districtFeat = zoneFc?.features?.find((f) => f.properties?.level === "district");
                    const provinceFeat = zoneFc?.features?.find((f) => f.properties?.level === "province");

                    const geoData = geoRes?.data;
                    const h = geoData?.hierarchy ?? ({} as GeocodeResult["hierarchy"]);

                    const provName = provinceFeat?.properties?.name_km || provinceFeat?.properties?.name_en || h.province;
                    const distName = districtFeat?.properties?.name_km || districtFeat?.properties?.name_en || h.district;
                    const commName = communeFeat?.properties?.name_km || communeFeat?.properties?.name_en || h.commune;
                    const villName = h.village;

                    const rows = (
                        [
                            [t("level.province"), provName],
                            [t("level.district"), distName],
                            [t("level.commune"), commName],
                            [t("level.village"), villName],
                        ] as const
                    )
                        .filter((r) => r[1])
                        .map(
                            (r) =>
                                `<span class="text-ink-3">${esc(r[0])}</span><span class="font-khmer font-medium">${esc(r[1])}</span>`,
                        )
                        .join("");

                    const displayName =
                        commName ||
                        distName ||
                        provName ||
                        (geoData?.displayName || t("explore.unknownPlace")).split(",")[0];

                    const code = communeFeat?.properties?.code || districtFeat?.properties?.code || provinceFeat?.properties?.code;
                    const codeBadge = code ? `<span class="ml-1 text-xs text-ink-3 font-mono">(${esc(code)})</span>` : "";

                    m.setPopupContent(
                        `<div class="${POP_TITLE} font-khmer">${esc(displayName)}${codeBadge}</div>` +
                        `<div class="${POP_SUB}">${lat}, ${lon}</div>` +
                        `<div class="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5 text-[12.5px]">${rows}</div>`,
                    );
                })
                .catch((err: unknown) => {
                    const msg =
                        err instanceof ApiError && err.status === 429
                            ? t("explore.geocodeLimit")
                            : (err as Error).message;
                    m.setPopupContent(
                        `<div class="${POP_TITLE}">${esc(t("explore.noResult"))}</div><div class="${POP_SUB}">${esc(msg)}</div>`,
                    );
                });
        },
    });

    return null;
}
