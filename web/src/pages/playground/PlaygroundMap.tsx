import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { Icon } from "../../components/Icon";
import { cx, lvl } from "../../components/ui";
import { cssVar, useTheme } from "../../lib/theme";

const KH_BOUNDS: L.LatLngBoundsExpression = [[10.35, 102.3], [14.75, 107.65]];
const MAX_BOUNDS: L.LatLngBoundsExpression = [[8.5, 100.5], [16.5, 109.5]];

export interface MapMarker {
    lat: number;
    lon: number;
    title?: string;
    subtitle?: string;
    properties?: Record<string, any>;
}

export interface SelectedMapItem {
    id?: string | number;
    code?: string;
    name_en?: string;
    name_km?: string;
    administrative_unit?: string;
    level?: string;
    properties?: Record<string, any>;
    coordinates?: [number, number];
}

interface PlaygroundMapProps {
    geojson?: unknown;
    markers?: MapMarker[];
    className?: string;
    title?: string;
    selectedCode?: string | null;
    onSelectFeature?: (item: SelectedMapItem | null) => void;
    onDrillDown?: (path: string, params?: Record<string, string>) => void;
}

function esc(s: unknown): string {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function MapUpdater({
    geojson,
    markers,
    selectedCode,
    onFeatureClick,
    onFeatureHover,
}: {
    geojson?: unknown;
    markers?: MapMarker[];
    selectedCode?: string | null;
    onFeatureClick: (item: SelectedMapItem) => void;
    onFeatureHover: (item: SelectedMapItem | null) => void;
}) {
    const map = useMap();
    const geoJsonLayer = useRef<L.GeoJSON | null>(null);
    const markerLayers = useRef<L.LayerGroup | null>(null);
    const layersByCode = useRef<Map<string, L.Path>>(new Map());

    useEffect(() => {
        // Clean up previous layers
        if (geoJsonLayer.current) {
            map.removeLayer(geoJsonLayer.current);
            geoJsonLayer.current = null;
        }
        if (markerLayers.current) {
            map.removeLayer(markerLayers.current);
            markerLayers.current = null;
        }
        layersByCode.current.clear();

        const group = L.featureGroup();

        // 1. Render GeoJSON if present
        if (geojson && typeof geojson === "object") {
            try {
                const isFc = "type" in geojson && (geojson as { type: string }).type === "FeatureCollection";
                const isFeature = "type" in geojson && (geojson as { type: string }).type === "Feature";
                const isGeom = "type" in geojson && "coordinates" in geojson;

                if (isFc || isFeature || isGeom) {
                    const layer = L.geoJSON(geojson as any, {
                        style: (feat) => {
                            const p = feat?.properties || {};
                            const code = String(p.code || p.id || "");
                            const isSelected = selectedCode && code === selectedCode;

                            return {
                                color: isSelected ? (cssVar("--og-accent") || "#e11d48") : (cssVar("--og-water") || "#0ea5e9"),
                                weight: isSelected ? 3 : 1.5,
                                opacity: isSelected ? 1 : 0.85,
                                fillColor: isSelected ? (cssVar("--og-accent") || "#e11d48") : (cssVar("--og-water") || "#0ea5e9"),
                                fillOpacity: isSelected ? 0.35 : 0.12,
                            };
                        },
                        onEachFeature: (feature, featLayer) => {
                            const p = feature.properties || {};
                            const code = String(p.code || p.id || "");
                            const title = p.name_en || p.name || `Feature ${code}`;
                            const sub = p.name_km || "";
                            const unit = p.administrative_unit || p.type_km || p.level || "";

                            if (code && featLayer instanceof L.Path) {
                                layersByCode.current.set(code, featLayer);
                            }

                            // Hover tooltip
                            featLayer.bindTooltip(
                                `<div class="font-sans text-xs font-semibold">${esc(title)} ${sub ? `<span class="font-khmer font-normal opacity-85">(${esc(sub)})</span>` : ""}</div>`,
                                { sticky: true, className: "og-leaflet-tooltip" },
                            );

                            featLayer.on({
                                mouseover: (e) => {
                                    const target = e.target;
                                    if (target !== layersByCode.current.get(selectedCode || "")) {
                                        target.setStyle?.({
                                            weight: 2.5,
                                            fillOpacity: 0.28,
                                        });
                                    }
                                    onFeatureHover({
                                        id: p.id,
                                        code,
                                        name_en: title,
                                        name_km: sub,
                                        administrative_unit: unit,
                                        level: p.level,
                                        properties: p,
                                    });
                                },
                                mouseout: (e) => {
                                    const target = e.target;
                                    if (target !== layersByCode.current.get(selectedCode || "")) {
                                        layer.resetStyle(target);
                                    }
                                },
                                click: () => {
                                    onFeatureClick({
                                        id: p.id,
                                        code,
                                        name_en: title,
                                        name_km: sub,
                                        administrative_unit: unit,
                                        level: p.level,
                                        properties: p,
                                    });
                                },
                            });
                        },
                    });

                    layer.addTo(map);
                    geoJsonLayer.current = layer;
                    group.addLayer(layer);
                }
            } catch (err) {
                console.warn("[PlaygroundMap] Failed to render GeoJSON", err);
            }
        }

        // 2. Render Markers if present
        if (markers && markers.length > 0) {
            const markersGroup = L.layerGroup();
            markers.forEach((m) => {
                if (typeof m.lat === "number" && typeof m.lon === "number" && !isNaN(m.lat) && !isNaN(m.lon)) {
                    const circle = L.circleMarker([m.lat, m.lon], {
                        radius: 8,
                        color: "#ffffff",
                        weight: 2,
                        fillColor: cssVar("--og-accent") || "#e11d48",
                        fillOpacity: 1,
                    });

                    circle.bindTooltip(
                        `<div class="font-sans text-xs font-semibold">${esc(m.title || "Location")}</div>`,
                        { sticky: true },
                    );

                    circle.on("click", () => {
                        onFeatureClick({
                            name_en: m.title,
                            name_km: m.subtitle,
                            coordinates: [m.lat, m.lon],
                            properties: m.properties,
                        });
                    });

                    circle.addTo(markersGroup);
                    group.addLayer(circle);
                }
            });
            markersGroup.addTo(map);
            markerLayers.current = markersGroup;
        }

        // Fit map bounds if anything was added
        if (group.getLayers().length > 0) {
            try {
                const b = group.getBounds();
                if (b.isValid()) {
                    map.fitBounds(b, { padding: [30, 30], maxZoom: 14 });
                }
            } catch {
                // Ignore bounds fitting errors
            }
        }
    }, [geojson, markers, map, onFeatureClick, onFeatureHover, selectedCode]);

    // Handle selectedCode programmatic highlight
    useEffect(() => {
        if (!selectedCode || !geoJsonLayer.current) return;
        const targetLayer = layersByCode.current.get(selectedCode);
        if (targetLayer && "getBounds" in targetLayer) {
            try {
                const b = (targetLayer as any).getBounds();
                if (b && b.isValid()) {
                    map.fitBounds(b, { padding: [40, 40], maxZoom: 12 });
                }
            } catch {
                // Ignore
            }
        }
    }, [selectedCode, map]);

    return null;
}

function MapControls() {
    const map = useMap();

    const handleCenterCambodia = () => {
        map.fitBounds(KH_BOUNDS, { padding: [20, 20] });
    };

    return (
        <div className="absolute top-3 right-3 z-500 flex flex-col gap-1.5">
            <button
                type="button"
                onClick={handleCenterCambodia}
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface/90 text-ink shadow-card backdrop-blur-md hover:border-line-2 hover:bg-surface transition-colors"
                title="Fit Cambodia Bounds"
            >
                <Icon name="map" className="size-4" />
            </button>
            <button
                type="button"
                onClick={() => map.zoomIn()}
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface/90 text-ink shadow-card backdrop-blur-md hover:border-line-2 hover:bg-surface transition-colors font-mono font-bold text-sm"
                title="Zoom In"
            >
                +
            </button>
            <button
                type="button"
                onClick={() => map.zoomOut()}
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface/90 text-ink shadow-card backdrop-blur-md hover:border-line-2 hover:bg-surface transition-colors font-mono font-bold text-sm"
                title="Zoom Out"
            >
                −
            </button>
        </div>
    );
}

export function PlaygroundMap({
    geojson,
    markers,
    className,
    title,
    selectedCode,
    onSelectFeature,
    onDrillDown,
}: PlaygroundMapProps) {
    const { dark } = useTheme();
    const [inspected, setInspected] = useState<SelectedMapItem | null>(null);

    const handleFeatureClick = (item: SelectedMapItem) => {
        setInspected(item);
        onSelectFeature?.(item);
    };

    const handleFeatureHover = (item: SelectedMapItem | null) => {
        if (!inspected && item) {
            setInspected(item);
        }
    };

    // Calculate features count
    let featuresCount = 0;
    if (geojson && typeof geojson === "object") {
        if ("features" in geojson && Array.isArray((geojson as any).features)) {
            featuresCount = (geojson as any).features.length;
        } else if ("type" in geojson && (geojson as any).type === "Feature") {
            featuresCount = 1;
        }
    } else if (markers) {
        featuresCount = markers.length;
    }

    return (
        <div className={cx("relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card", className || "h-135 w-full")}>
            {/* Top Floating Badge Bar */}
            <div className="absolute top-3 left-3 z-500 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-card backdrop-blur-md">
                    <span className="size-2 rounded-full bg-accent animate-pulse" />
                    <span>{title || "Map Preview"}</span>
                    {featuresCount > 0 && (
                        <span className="ml-1 rounded bg-surface-2 px-1.5 py-0.2 text-[10.5px] font-mono text-ink-3">
                            {featuresCount} {featuresCount === 1 ? "feature" : "features"}
                        </span>
                    )}
                </div>
            </div>

            {/* Map Container */}
            <MapContainer
                bounds={KH_BOUNDS}
                minZoom={6}
                maxBounds={MAX_BOUNDS}
                className={cx("h-full w-full", dark && "og-map-dark")}
                attributionControl={false}
            >
                <TileLayer
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                />
                <MapControls />
                <MapUpdater
                    geojson={geojson}
                    markers={markers}
                    selectedCode={selectedCode}
                    onFeatureClick={handleFeatureClick}
                    onFeatureHover={handleFeatureHover}
                />
            </MapContainer>

            {/* Floating Inspection HUD / Card */}
            {inspected && (
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-500 rounded-xl border border-line bg-surface/95 p-3.5 shadow-xl backdrop-blur-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {inspected.level && <span className={lvl(inspected.level)}>{inspected.level}</span>}
                                {inspected.code && (
                                    <span className="font-mono text-xs font-semibold text-ink-3">#{inspected.code}</span>
                                )}
                                {inspected.administrative_unit && (
                                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-ink-2 border border-line">
                                        {inspected.administrative_unit}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h4 className="m-0 text-sm font-bold text-ink">{inspected.name_en || "Place Details"}</h4>
                                {inspected.name_km && (
                                    <span className="font-khmer text-xs text-ink-2">({inspected.name_km})</span>
                                )}
                            </div>
                            {inspected.coordinates && (
                                <div className="mt-1 font-mono text-[11px] text-accent">
                                    {inspected.coordinates[0].toFixed(5)}, {inspected.coordinates[1].toFixed(5)}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setInspected(null)}
                            className="size-5 rounded text-ink-3 hover:text-ink text-xs font-mono"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Drill down action if code is present */}
                    {onDrillDown && inspected.code && (
                        <div className="mt-2.5 pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-ink-3 text-[11px]">Explore deeper:</span>
                            <div className="flex flex-wrap items-center gap-2">
                                {(inspected.level === "province" || String(inspected.code).length === 2) && (
                                    <button
                                        type="button"
                                        onClick={() => onDrillDown(`/api/boundaries/districts?province_code=${inspected.code}`, { province_code: String(inspected.code) })}
                                        className="cursor-pointer font-semibold text-accent hover:underline text-[11.5px] flex items-center gap-1"
                                    >
                                        <Icon name="polygon" className="size-3" />
                                        <span>Districts Boundary →</span>
                                    </button>
                                )}
                                {(inspected.level === "district" || String(inspected.code).length === 4) && (
                                    <button
                                        type="button"
                                        onClick={() => onDrillDown(`/api/boundaries/communes?district_code=${inspected.code}`, { district_code: String(inspected.code) })}
                                        className="cursor-pointer font-semibold text-accent hover:underline text-[11.5px] flex items-center gap-1"
                                    >
                                        <Icon name="polygon" className="size-3" />
                                        <span>Communes Boundary →</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onDrillDown(`/api/boundaries/item/${inspected.code}`, { code: String(inspected.code) })}
                                    className="cursor-pointer font-semibold text-ink-2 hover:text-ink hover:underline text-[11.5px]"
                                >
                                    Polygon →
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDrillDown(`/api/admin/hierarchy/${inspected.code}`, { id: String(inspected.code) })}
                                    className="cursor-pointer font-semibold text-water hover:underline text-[11.5px]"
                                >
                                    Hierarchy →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Copyright attribution badge */}
            <div className="pointer-events-none absolute bottom-2 right-2 z-500 rounded bg-bg/85 px-2 py-0.5 text-[10px] text-ink-3 backdrop-blur">
                © OpenStreetMap contributors
            </div>
        </div>
    );
}
