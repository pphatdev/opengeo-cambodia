import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Icon } from "../../components/Icon";
import { cx, lvl } from "../../components/ui";
import { apiGet } from "../../lib/api";
import { cssVar, useTheme } from "../../lib/theme";

const KH_BOUNDS: L.LatLngBoundsExpression = [[10.35, 102.3], [14.75, 107.65]];
const MAX_BOUNDS: [L.LatLngTuple, L.LatLngTuple] = [[8.5, 100.5], [16.5, 109.5]];

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
    /** Click anywhere / GPS / landmarks → live point-in-polygon lookup (default: true) */
    enableLookup?: boolean;
}

/* ------------------------------------------------------------------ */
/* Basemaps                                                            */
/* ------------------------------------------------------------------ */

type BasemapId = "streets" | "satellite" | "terrain" | "none";

interface Basemap {
    id: BasemapId;
    label: string;
    url: string;
    maxZoom: number;
    maxNativeZoom?: number;
    subdomains?: string;
    attribution: string;
    /** Optional label overlay drawn above the base tiles (e.g. place names on satellite) */
    overlayUrl?: string;
}

const BASEMAPS: Basemap[] = [
    {
        id: "streets",
        label: "Streets",
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
    },
    {
        id: "satellite",
        label: "Satellite",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        overlayUrl:
            "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        maxZoom: 19,
        attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
    {
        id: "terrain",
        label: "Terrain",
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        subdomains: "abc",
        maxZoom: 19,
        maxNativeZoom: 17,
        attribution: "© OpenStreetMap contributors, SRTM · © OpenTopoMap (CC-BY-SA)",
    },
    {
        // Boundaries only, no OSM tiles underneath
        id: "none",
        label: "None (boundaries only)",
        url: "",
        maxZoom: 19,
        attribution: "Boundaries © Dept. of Geography, MLMUPC",
    },
];

const BASEMAP_STORAGE_KEY = "og.playground.basemap";

function readStoredBasemap(): BasemapId {
    try {
        const v = localStorage.getItem(BASEMAP_STORAGE_KEY);
        if (v === "streets" || v === "satellite" || v === "terrain" || v === "none") return v;
    } catch {
        // storage unavailable (private mode, blocked site data)
    }
    return "streets";
}

function storeBasemap(id: BasemapId): void {
    try {
        localStorage.setItem(BASEMAP_STORAGE_KEY, id);
    } catch {
        // ignore
    }
}

/* ------------------------------------------------------------------ */
/* Real-world landmarks (quick jumps)                                  */
/* ------------------------------------------------------------------ */

interface Landmark {
    id: string;
    name: string;
    name_km: string;
    lat: number;
    lon: number;
    zoom: number;
}

const LANDMARKS: Landmark[] = [
    { id: "royal-palace", name: "Royal Palace", name_km: "ព្រះបរមរាជវាំង", lat: 11.5637, lon: 104.931, zoom: 15 },
    { id: "independence", name: "Independence Monument", name_km: "វិមានឯករាជ្យ", lat: 11.5564, lon: 104.9282, zoom: 15 },
    { id: "pnh-airport", name: "Phnom Penh Int'l Airport", name_km: "អាកាសយានដ្ឋានភ្នំពេញ", lat: 11.5466, lon: 104.8441, zoom: 14 },
    { id: "angkor-wat", name: "Angkor Wat", name_km: "អង្គរវត្ត", lat: 13.4125, lon: 103.867, zoom: 15 },
    { id: "preah-vihear", name: "Preah Vihear Temple", name_km: "ប្រាសាទព្រះវិហារ", lat: 14.3906, lon: 104.6803, zoom: 15 },
    { id: "battambang", name: "Battambang Old Market", name_km: "ផ្សារណាត់ បាត់ដំបង", lat: 13.0995, lon: 103.1985, zoom: 15 },
    { id: "bokor", name: "Bokor Mountain", name_km: "ភ្នំបូកគោ", lat: 10.6214, lon: 104.0236, zoom: 13 },
    { id: "sihanoukville", name: "Sihanoukville", name_km: "ក្រុងព្រះសីហនុ", lat: 10.6093, lon: 103.5296, zoom: 14 },
    { id: "kratie", name: "Kratie Riverfront", name_km: "ក្រចេះ", lat: 12.4881, lon: 106.0188, zoom: 14 },
];

/* ------------------------------------------------------------------ */
/* Point lookup state                                                  */
/* ------------------------------------------------------------------ */

interface ZoneFeature {
    type: "Feature";
    properties: Record<string, any>;
    geometry: unknown;
}

interface ZoneCollection {
    type: "FeatureCollection";
    features: ZoneFeature[];
}

interface Probe {
    lat: number;
    lon: number;
    label?: string;
    status: "loading" | "ok" | "miss" | "error";
    zone?: ZoneCollection;
    ms?: number;
    error?: string;
}

function esc(s: unknown): string {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Parse free-form coordinates: "11.5564, 104.9282", "11.5564 104.9282", "lat=11.55&lng=104.92",
 * or a Google Maps URL containing "@11.55,104.92". Swaps the pair when given as lng, lat.
 */
function parseLatLng(input: string): { lat: number; lon: number } | { error: string } {
    const text = input.trim();
    if (!text) return { error: "Enter coordinates as: lat, lng" };
    const at = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    const nums = at ? [at[1], at[2]] : text.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 2) return { error: "Need two numbers: lat, lng" };
    let lat = parseFloat(nums[0]);
    let lon = parseFloat(nums[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { error: "Invalid number" };
    // Given as lng, lat (e.g. GeoJSON order) → swap
    if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) [lat, lon] = [lon, lat];
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return { error: "Out of range: lat [-90, 90], lng [-180, 180]" };
    }
    if (!L.latLngBounds(MAX_BOUNDS).contains([lat, lon])) {
        return { error: "That point is outside the Cambodia map area" };
    }
    return { lat, lon };
}

function zonePath(lat: number, lon: number, format: "geojson" | "summary"): string {
    return `/api/boundaries/zone?lat=${lat.toFixed(6)}&lng=${lon.toFixed(6)}&level=all&format=${format}`;
}

/* ------------------------------------------------------------------ */
/* Level colours (same tokens as the level badges in components/ui)    */
/* ------------------------------------------------------------------ */

type BoundaryLevel = "province" | "district" | "commune" | "village";

const LEVEL_ORDER: BoundaryLevel[] = ["province", "district", "commune", "village"];

const LEVEL_TOKENS: Record<BoundaryLevel, { token: string; fallback: string }> = {
    province: { token: "--og-accent", fallback: "#0d9488" },
    district: { token: "--og-water", fallback: "#0284c7" },
    commune: { token: "--og-warn", fallback: "#f59e0b" },
    village: { token: "--og-ok", fallback: "#10b981" },
};

/** Resolve level from properties, falling back to NCDD code length (2 / 4 / 6 / 8 digits) */
function levelOf(p: Record<string, any> | undefined): BoundaryLevel | undefined {
    const raw = String(p?.level || "").toLowerCase();
    if (raw === "province" || raw === "district" || raw === "commune" || raw === "village") return raw;
    const code = String(p?.code || "").replace(/^KH/i, "");
    if (/^\d+$/.test(code)) {
        return ({ 2: "province", 4: "district", 6: "commune", 8: "village" } as Record<number, BoundaryLevel>)[code.length];
    }
    return undefined;
}

function levelColor(level: BoundaryLevel | undefined): string {
    if (!level) return cssVar("--og-ink-2") || "#64748b";
    const { token, fallback } = LEVEL_TOKENS[level];
    return cssVar(token) || fallback;
}

/** Base style for a boundary polygon; coarser levels get thicker strokes and lighter fills */
function boundaryStyle(level: BoundaryLevel | undefined, state: "idle" | "hover" | "selected"): L.PathOptions {
    const color = levelColor(level);
    const baseWeight = level === "province" ? 2 : level === "district" ? 1.6 : 1.2;
    const baseFill = level === "province" ? 0.1 : level === "district" ? 0.14 : 0.18;
    if (state === "selected") {
        return { color, weight: baseWeight + 1.8, opacity: 1, fillColor: color, fillOpacity: 0.42 };
    }
    if (state === "hover") {
        return { color, weight: baseWeight + 1, opacity: 1, fillColor: color, fillOpacity: baseFill + 0.16 };
    }
    return { color, weight: baseWeight, opacity: 0.9, fillColor: color, fillOpacity: baseFill };
}

function featureByLevel(zone: ZoneCollection | undefined, level: string): Record<string, any> | undefined {
    return zone?.features.find((f) => f.properties?.level === level)?.properties;
}

/* ------------------------------------------------------------------ */
/* Map layers                                                          */
/* ------------------------------------------------------------------ */

function MapUpdater({
    geojson,
    markers,
    selectedCode,
    onFeatureClick,
    onFeatureHover,
    themeKey,
}: {
    geojson?: unknown;
    markers?: MapMarker[];
    selectedCode?: string | null;
    onFeatureClick: (item: SelectedMapItem) => void;
    onFeatureHover: (item: SelectedMapItem | null) => void;
    /** Changes when light/dark flips so level colours are re-read from CSS tokens */
    themeKey: string;
}) {
    const map = useMap();
    const geoJsonLayer = useRef<L.GeoJSON | null>(null);
    const markerLayers = useRef<L.LayerGroup | null>(null);
    const layersByCode = useRef<Map<string, L.Path>>(new Map());

    // Keep callbacks/selection in refs so parent re-renders don't rebuild (and refit) the layers
    const clickRef = useRef(onFeatureClick);
    const hoverRef = useRef(onFeatureHover);
    const selectedRef = useRef(selectedCode);
    clickRef.current = onFeatureClick;
    hoverRef.current = onFeatureHover;
    selectedRef.current = selectedCode;

    useEffect(() => {
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
                            const isSelected = !!selectedRef.current && code === selectedRef.current;
                            return boundaryStyle(levelOf(p), isSelected ? "selected" : "idle");
                        },
                        onEachFeature: (feature, featLayer) => {
                            const p = feature.properties || {};
                            const code = String(p.code || p.id || "");
                            const title = p.name_en || p.name || `Feature ${code}`;
                            const sub = p.name_km || "";
                            const unit = p.administrative_unit || p.type_km || p.level || "";
                            const item: SelectedMapItem = {
                                id: p.id,
                                code,
                                name_en: title,
                                name_km: sub,
                                administrative_unit: unit,
                                level: p.level,
                                properties: p,
                            };

                            if (code && featLayer instanceof L.Path) {
                                layersByCode.current.set(code, featLayer);
                            }

                            featLayer.bindTooltip(
                                `<div class="font-sans text-xs font-semibold">${esc(title)} ${sub ? `<span class="font-khmer font-normal opacity-85">(${esc(sub)})</span>` : ""}</div>`,
                                { sticky: true, className: "og-leaflet-tooltip" },
                            );

                            featLayer.on({
                                mouseover: (e) => {
                                    const target = e.target;
                                    if (target !== layersByCode.current.get(selectedRef.current || "")) {
                                        target.setStyle?.(boundaryStyle(levelOf(p), "hover"));
                                        target.bringToFront?.();
                                    }
                                    hoverRef.current(item);
                                },
                                mouseout: (e) => {
                                    const target = e.target;
                                    if (target !== layersByCode.current.get(selectedRef.current || "")) {
                                        layer.resetStyle(target);
                                    }
                                },
                                click: () => clickRef.current(item),
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
                        clickRef.current({
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
    }, [geojson, markers, map]);

    // Restyle + zoom to the selected feature without rebuilding the layer
    useEffect(() => {
        const layer = geoJsonLayer.current;
        if (!layer) return;
        layer.setStyle((feat) => {
            const p = feat?.properties || {};
            const code = String(p.code || p.id || "");
            const isSelected = !!selectedCode && code === selectedCode;
            return boundaryStyle(levelOf(p), isSelected ? "selected" : "idle");
        });
        if (!selectedCode) return;
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
    }, [selectedCode, map, themeKey]);

    return null;
}

/** Draws the looked-up point + its commune / district / province outlines. Non-interactive so clicks pass through. */
function ProbeLayer({ probe, themeKey }: { probe: Probe | null; themeKey: string }) {
    const map = useMap();

    useEffect(() => {
        if (!probe) return;
        // Neutral pin so it never reads as one of the level colours
        const accent = cssVar("--og-ink") || "#0f172a";
        const group = L.layerGroup();

        if (probe.zone) {
            const order: Record<string, number> = { province: 0, district: 1, commune: 2 };
            const features = [...probe.zone.features].sort(
                (a, b) => (order[a.properties?.level] ?? 0) - (order[b.properties?.level] ?? 0),
            );
            L.geoJSON({ type: "FeatureCollection", features } as any, {
                interactive: false,
                style: (feat) => {
                    const level = levelOf(feat?.properties);
                    const color = levelColor(level);
                    if (level === "commune") {
                        return { color, weight: 2.5, opacity: 1, fillColor: color, fillOpacity: 0.26 };
                    }
                    if (level === "district") {
                        return { color, weight: 2.2, opacity: 0.95, dashArray: "7 5", fillColor: color, fillOpacity: 0.06 };
                    }
                    return { color, weight: 2, opacity: 0.8, dashArray: "2 6", fill: false };
                },
            }).addTo(group);
        }

        // Pulse ring + pin dot
        L.circleMarker([probe.lat, probe.lon], {
            radius: 16,
            color: accent,
            weight: 1.5,
            opacity: 0.5,
            fillColor: accent,
            fillOpacity: 0.12,
            interactive: false,
        }).addTo(group);
        L.circleMarker([probe.lat, probe.lon], {
            radius: 6,
            color: "#ffffff",
            weight: 2.5,
            fillColor: accent,
            fillOpacity: 1,
            interactive: false,
        }).addTo(group);

        group.addTo(map);
        return () => {
            map.removeLayer(group);
        };
    }, [probe, map, themeKey]);

    return null;
}

/* ------------------------------------------------------------------ */
/* Cambodia boundary overlays (independent of the basemap)             */
/* ------------------------------------------------------------------ */

type OverlayLevel = "province" | "district" | "commune";
const OVERLAY_LEVELS: OverlayLevel[] = ["province", "district", "commune"];
type OverlayState = Record<OverlayLevel, boolean>;
type OverlayStatus = Partial<Record<OverlayLevel, "loading" | "ready" | "error">>;

const OVERLAY_PATHS: Record<OverlayLevel, string> = {
    province: "/api/boundaries/provinces",
    district: "/api/boundaries/districts",
    commune: "/api/boundaries/communes",
};

/** Panes sit below Leaflet's overlayPane (400) so API response layers always draw on top. Coarser levels on top. */
const OVERLAY_PANES: Record<OverlayLevel, { name: string; z: number }> = {
    commune: { name: "og-ov-commune", z: 370 },
    district: { name: "og-ov-district", z: 380 },
    province: { name: "og-ov-province", z: 390 },
};

const OVERLAY_LABELS: Record<OverlayLevel, string> = {
    province: "Provinces (25)",
    district: "Districts (197)",
    commune: "Communes (1,633)",
};

// Session-wide cache so toggling a layer off/on (or remounting the map) doesn't refetch megabytes of GeoJSON
const overlayCache = new Map<OverlayLevel, Promise<unknown>>();

function loadOverlay(level: OverlayLevel): Promise<unknown> {
    let p = overlayCache.get(level);
    if (!p) {
        p = apiGet<unknown>(OVERLAY_PATHS[level]).catch((err) => {
            overlayCache.delete(level); // allow retry
            throw err;
        });
        overlayCache.set(level, p);
    }
    return p;
}

function overlayStyle(level: OverlayLevel, hover = false): L.PathOptions {
    const color = levelColor(level);
    const base = {
        province: { weight: 2.2, fillOpacity: 0.04, dashArray: undefined as string | undefined },
        district: { weight: 1.3, fillOpacity: 0.05, dashArray: "5 4" },
        commune: { weight: 0.8, fillOpacity: 0.08, dashArray: undefined as string | undefined },
    }[level];
    return {
        color,
        weight: hover ? base.weight + 1.2 : base.weight,
        opacity: hover ? 1 : 0.85,
        dashArray: base.dashArray,
        fillColor: color,
        fillOpacity: hover ? base.fillOpacity + 0.14 : base.fillOpacity,
    };
}

function OverlayLevelLayer({
    level,
    on,
    themeKey,
    onStatus,
}: {
    level: OverlayLevel;
    on: boolean;
    themeKey: string;
    onStatus: (level: OverlayLevel, status: "loading" | "ready" | "error") => void;
}) {
    const map = useMap();
    const statusRef = useRef(onStatus);
    statusRef.current = onStatus;

    useEffect(() => {
        if (!on) return;
        const { name: pane, z } = OVERLAY_PANES[level];
        if (!map.getPane(pane)) {
            map.createPane(pane).style.zIndex = String(z);
        }

        let cancelled = false;
        let layer: L.GeoJSON | null = null;
        statusRef.current(level, "loading");

        loadOverlay(level)
            .then((data) => {
                if (cancelled) return;
                // GeoJSON options are forwarded to each vector layer at runtime, so PathOptions (renderer) apply
                const opts: L.GeoJSONOptions & L.PathOptions = {
                        pane,
                        // Canvas keeps 1,600+ commune polygons smooth; one renderer per pane keeps z-order
                        renderer: L.canvas({ pane, padding: 0.3 }),
                        style: () => overlayStyle(level),
                        onEachFeature: (feature, featLayer) => {
                            const p = feature.properties || {};
                            featLayer.bindTooltip(
                                `<div class="font-sans text-xs font-semibold">${esc(p.name_en || p.name || p.code)}${p.name_km ? ` <span class="font-khmer font-normal opacity-85">(${esc(p.name_km)})</span>` : ""}<span class="ml-1 font-mono font-normal opacity-60">${esc(level)} #${esc(p.code)}</span></div>`,
                                { sticky: true, className: "og-leaflet-tooltip" },
                            );
                            featLayer.on({
                                mouseover: (e) => (e.target as L.Path).setStyle(overlayStyle(level, true)),
                                mouseout: (e) => (e.target as L.Path).setStyle(overlayStyle(level)),
                            });
                        },
                    };
                layer = L.geoJSON(data as any, opts);
                layer.addTo(map);
                statusRef.current(level, "ready");
            })
            .catch(() => {
                if (!cancelled) statusRef.current(level, "error");
            });

        return () => {
            cancelled = true;
            if (layer) map.removeLayer(layer);
        };
    }, [level, on, themeKey, map]);

    return null;
}

/** Click handler + live cursor coordinates (own state so mouse moves don't re-render the map tree) */
function MapInteraction({
    enableLookup,
    onPick,
}: {
    enableLookup: boolean;
    onPick: (lat: number, lon: number) => void;
}) {
    const [cursor, setCursor] = useState<L.LatLng | null>(null);
    useMapEvents({
        click: (e) => {
            if (enableLookup) onPick(e.latlng.lat, e.latlng.lng);
        },
        mousemove: (e) => setCursor(e.latlng),
        mouseout: () => setCursor(null),
    });

    if (!cursor) return null;
    return (
        <div className="pointer-events-none absolute bottom-8 right-2 z-500 rounded-md bg-bg/85 px-2 py-0.5 font-mono text-[10.5px] text-ink-2 shadow-xs backdrop-blur">
            {cursor.lat.toFixed(5)}, {cursor.lng.toFixed(5)}
        </div>
    );
}

function ScaleControl() {
    const map = useMap();
    useEffect(() => {
        const scale = L.control.scale({ position: "bottomright", imperial: false, maxWidth: 110 });
        scale.addTo(map);
        // Sit above the coordinate readout and attribution badge (inline style beats unlayered leaflet.css)
        const el = scale.getContainer();
        if (el) el.style.marginBottom = "54px";
        return () => {
            scale.remove();
        };
    }, [map]);
    return null;
}

function MapControls({
    basemap,
    onBasemap,
    enableLookup,
    onLocate,
    locating,
    onLandmark,
    overlays,
    overlayStatus,
    onToggleOverlay,
    fullscreen,
    onToggleFullscreen,
}: {
    basemap: BasemapId;
    onBasemap: (id: BasemapId) => void;
    enableLookup: boolean;
    onLocate: () => void;
    locating: boolean;
    onLandmark: (l: Landmark) => void;
    overlays: OverlayState;
    overlayStatus: OverlayStatus;
    onToggleOverlay: (level: OverlayLevel) => void;
    fullscreen: boolean;
    onToggleFullscreen: () => void;
}) {
    const map = useMap();
    const [open, setOpen] = useState<"layers" | "places" | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);

    // Keep wheel/click on the control stack from panning/zooming the map underneath
    useEffect(() => {
        if (panelRef.current) {
            L.DomEvent.disableClickPropagation(panelRef.current);
            L.DomEvent.disableScrollPropagation(panelRef.current);
        }
    }, []);

    const btn =
        "inline-flex size-8 cursor-pointer items-center justify-center rounded-xl glass-pill text-ink shadow-xs hover:text-accent transition-all";

    return (
        <div ref={panelRef} className="absolute top-3 right-3 z-500 flex items-start gap-1.5">
            {open === "layers" && (
                <div className="max-h-[calc(100%-1rem)] w-56 overflow-y-auto rounded-xl glass-panel p-1.5 shadow-glass-lg">
                    <div className="px-2 pb-1 pt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Basemap</div>
                    <div role="radiogroup" aria-label="Basemap">
                        {BASEMAPS.map((b) => (
                            <button
                                key={b.id}
                                type="button"
                                role="radio"
                                aria-checked={basemap === b.id}
                                onClick={() => onBasemap(b.id)}
                                className={cx(
                                    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-all",
                                    basemap === b.id ? "glass-pill font-semibold text-ink" : "text-ink-2 hover:text-ink",
                                )}
                            >
                                <span
                                    className={cx(
                                        "grid size-3.5 shrink-0 place-items-center rounded-full border",
                                        basemap === b.id ? "border-ink" : "border-line",
                                    )}
                                >
                                    {basemap === b.id && <span className="size-1.5 rounded-full bg-ink" />}
                                </span>
                                <span>{b.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="mx-2 my-1.5 border-t border-line/60" />
                    <div className="px-2 pb-1 pt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
                        Cambodia boundaries
                    </div>
                    {OVERLAY_LEVELS.map((level) => {
                        const on = overlays[level];
                        const status = overlayStatus[level];
                        const color = levelColor(level);
                        return (
                            <button
                                key={level}
                                type="button"
                                role="checkbox"
                                aria-checked={on}
                                onClick={() => onToggleOverlay(level)}
                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-ink-2 transition-all hover:bg-surface-2 hover:text-ink"
                            >
                                <span
                                    className="grid size-3.5 shrink-0 place-items-center rounded-xs border-[1.5px] text-bg"
                                    style={{ borderColor: color, backgroundColor: on ? color : "transparent" }}
                                >
                                    {on && <Icon name="check" className="size-2.5" />}
                                </span>
                                <span className={cx(on && "font-semibold text-ink")}>{OVERLAY_LABELS[level]}</span>
                                <span className="ml-auto text-[10.5px]">
                                    {on && status === "loading" && (
                                        <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent text-ink-3" />
                                    )}
                                    {on && status === "error" && <span className="text-warn">failed</span>}
                                </span>
                            </button>
                        );
                    })}
                    {overlays.commune && (
                        <div className="px-2 pb-0.5 pt-1 text-[10.5px] text-ink-3">Communes is a ~6&nbsp;MB layer — first load may take a moment.</div>
                    )}
                </div>
            )}
            {open === "places" && (
                <div className="max-h-80 w-60 overflow-y-auto rounded-xl glass-panel p-1.5 shadow-glass-lg">
                    <div className="px-2 pb-1 pt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
                        Real-world places
                    </div>
                    {LANDMARKS.map((l) => (
                        <button
                            key={l.id}
                            type="button"
                            onClick={() => {
                                onLandmark(l);
                                setOpen(null);
                            }}
                            className="flex w-full cursor-pointer flex-col rounded-lg px-2 py-1.5 text-left transition-all hover:bg-surface-2"
                        >
                            <span className="text-xs font-semibold text-ink">{l.name}</span>
                            <span className="font-khmer text-[11px] text-ink-3">{l.name_km}</span>
                        </button>
                    ))}
                </div>
            )}

            <div className="flex flex-col gap-1.5">
                <button
                    type="button"
                    onClick={() => setOpen(open === "layers" ? null : "layers")}
                    className={cx(btn, open === "layers" && "text-accent")}
                    title="Layers: basemap & boundaries"
                    aria-label="Layers: basemap and boundaries"
                >
                    <Icon name="layers" className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={onToggleFullscreen}
                    className={cx(btn, fullscreen && "text-accent")}
                    title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
                    aria-label={fullscreen ? "Exit full screen" : "Full screen"}
                    aria-pressed={fullscreen}
                >
                    <Icon name={fullscreen ? "minimize" : "maximize"} className="size-4" />
                </button>
                {enableLookup && (
                    <>
                        <button
                            type="button"
                            onClick={() => setOpen(open === "places" ? null : "places")}
                            className={cx(btn, open === "places" && "text-accent")}
                            title="Jump to a real-world place"
                            aria-label="Jump to a real-world place"
                        >
                            <Icon name="pin" className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onLocate}
                            disabled={locating}
                            className={cx(btn, locating && "animate-pulse text-accent")}
                            title="Use my location"
                            aria-label="Use my location"
                        >
                            <Icon name="send" className="size-4 -rotate-45" />
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={() => map.fitBounds(KH_BOUNDS, { padding: [20, 20] })}
                    className={btn}
                    title="Fit Cambodia Bounds"
                    aria-label="Fit Cambodia bounds"
                >
                    <Icon name="map" className="size-4" />
                </button>
                <button type="button" onClick={() => map.zoomIn()} className={cx(btn, "font-mono text-sm font-bold")} title="Zoom In" aria-label="Zoom in">
                    +
                </button>
                <button type="button" onClick={() => map.zoomOut()} className={cx(btn, "font-mono text-sm font-bold")} title="Zoom Out" aria-label="Zoom out">
                    −
                </button>
            </div>
        </div>
    );
}

/** Exposes the Leaflet map instance to the parent (for flyTo from outside the MapContainer tree) */
function MapRef({ onReady }: { onReady: (map: L.Map) => void }) {
    const map = useMap();
    useEffect(() => {
        onReady(map);
    }, [map, onReady]);
    return null;
}

/* ------------------------------------------------------------------ */
/* Probe result card                                                   */
/* ------------------------------------------------------------------ */

function ProbeCard({
    probe,
    onClose,
    onDrillDown,
}: {
    probe: Probe;
    onClose: () => void;
    onDrillDown?: (path: string, params?: Record<string, string>) => void;
}) {
    const [copied, setCopied] = useState(false);
    const province = featureByLevel(probe.zone, "province");
    const district = featureByLevel(probe.zone, "district");
    const commune = featureByLevel(probe.zone, "commune");
    const coordText = `${probe.lat.toFixed(6)}, ${probe.lon.toFixed(6)}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(coordText);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // clipboard blocked
        }
    };

    const rows = [
        { level: "commune", p: commune },
        { level: "district", p: district },
        { level: "province", p: province },
    ].filter((r) => r.p);

    const linkBtn =
        "cursor-pointer font-semibold rounded-lg glass-pill px-2.5 py-1 text-[11px] flex items-center gap-1 transition-all";

    return (
        <div className="absolute bottom-4 left-4 right-4 z-500 rounded-2xl glass-panel p-4 shadow-glass-lg transition-all sm:right-auto sm:w-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.75 py-0.5 text-[10.5px] font-semibold text-accent">
                            <Icon name="pin" className="size-3" />
                            Point lookup
                        </span>
                        {probe.label && <span className="truncate text-xs font-semibold text-ink">{probe.label}</span>}
                    </div>
                    <button
                        type="button"
                        onClick={copy}
                        className="cursor-pointer font-mono text-[11px] text-ink-3 hover:text-accent"
                        title="Copy coordinates"
                    >
                        {coordText} {copied ? "✓ copied" : ""}
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-lg glass-pill text-ink-3 transition-all hover:text-ink"
                    title="Close"
                    aria-label="Close"
                >
                    <Icon name="x" className="size-3" />
                </button>
            </div>

            <div className="mt-2.5">
                {probe.status === "loading" && (
                    <div className="flex items-center gap-2 text-xs text-ink-3">
                        <span className="size-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                        Resolving administrative zone…
                    </div>
                )}
                {probe.status === "miss" && (
                    <div className="text-xs text-warn">
                        Outside Cambodia's administrative boundaries (sea, or a neighbouring country).
                    </div>
                )}
                {probe.status === "error" && <div className="text-xs text-warn">Lookup failed: {probe.error}</div>}
                {probe.status === "ok" && (
                    <ol className="m-0 list-none space-y-1.5 p-0">
                        {rows.map(({ level, p }) => (
                            <li key={level} className="flex items-baseline gap-2">
                                <span className={cx(lvl(level), "shrink-0")}>{level}</span>
                                <span className="min-w-0 truncate text-sm font-semibold text-ink">{p!.name_en}</span>
                                {p!.name_km && <span className="truncate font-khmer text-xs text-ink-2">{p!.name_km}</span>}
                                <span className="ml-auto shrink-0 font-mono text-[11px] text-ink-3">#{p!.code}</span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>

            {probe.status === "ok" && (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2 text-xs">
                    <span className="font-mono text-[11px] text-ink-3">
                        {probe.ms !== undefined ? `${probe.ms.toFixed(0)}ms round-trip` : ""}
                    </span>
                    {onDrillDown && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    onDrillDown(zonePath(probe.lat, probe.lon, "summary"), {
                                        lat: probe.lat.toFixed(6),
                                        lng: probe.lon.toFixed(6),
                                        level: "all",
                                    })
                                }
                                className={cx(linkBtn, "text-accent")}
                            >
                                <Icon name="code" className="size-3" />
                                <span>Open request →</span>
                            </button>
                            {commune?.code && (
                                <button
                                    type="button"
                                    onClick={() => onDrillDown(`/api/admin/hierarchy/${commune.code}`, { id: String(commune.code) })}
                                    className={cx(linkBtn, "text-water hover:text-accent")}
                                >
                                    Hierarchy →
                                </button>
                            )}
                            {district?.code && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onDrillDown(`/api/boundaries/communes?district_code=${district.code}`, {
                                            district_code: String(district.code),
                                        })
                                    }
                                    className={cx(linkBtn, "text-ink-2 hover:text-ink")}
                                >
                                    <Icon name="polygon" className="size-3" />
                                    <span>Communes →</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function PlaygroundMap({
    geojson,
    markers,
    className,
    title,
    selectedCode,
    onSelectFeature,
    onDrillDown,
    enableLookup = true,
}: PlaygroundMapProps) {
    const { dark } = useTheme();
    const [inspected, setInspected] = useState<SelectedMapItem | null>(null);
    const [probe, setProbe] = useState<Probe | null>(null);
    const [basemapId, setBasemapId] = useState<BasemapId>(readStoredBasemap);
    const [locating, setLocating] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [coordInput, setCoordInput] = useState("");
    const [coordError, setCoordError] = useState<string | null>(null);
    // Boundary overlays are independent of the basemap. A fresh map (no response data) starts with provinces on.
    const [overlays, setOverlays] = useState<OverlayState>(() => ({
        province: !geojson && !(markers && markers.length > 0),
        district: false,
        commune: false,
    }));
    const [overlayStatus, setOverlayStatus] = useState<OverlayStatus>({});
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [nativeFs, setNativeFs] = useState(false);
    const [pseudoFs, setPseudoFs] = useState(false); // CSS fallback (e.g. iOS Safari has no element fullscreen)
    const fullscreen = nativeFs || pseudoFs;
    const mapRef = useRef<L.Map | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const basemap = BASEMAPS.find((b) => b.id === basemapId) ?? BASEMAPS[0];

    useEffect(() => () => abortRef.current?.abort(), []);

    // Track native fullscreen (also catches Esc / browser UI exits)
    useEffect(() => {
        const onChange = () => setNativeFs(!!containerRef.current && document.fullscreenElement === containerRef.current);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    // Esc exits the CSS fallback; lock page scroll while it's active
    useEffect(() => {
        if (!pseudoFs) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPseudoFs(false);
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [pseudoFs]);

    // Leaflet must re-measure after the container size changes
    useEffect(() => {
        const id = setTimeout(() => mapRef.current?.invalidateSize({ pan: false }), 60);
        return () => clearTimeout(id);
    }, [fullscreen]);

    const toggleFullscreen = useCallback(async () => {
        const el = containerRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => undefined);
            return;
        }
        if (pseudoFs) {
            setPseudoFs(false);
            return;
        }
        if (document.fullscreenEnabled && typeof el.requestFullscreen === "function") {
            try {
                await el.requestFullscreen();
                return;
            } catch {
                // fall through to CSS fallback
            }
        }
        setPseudoFs(true);
    }, [pseudoFs]);

    const toggleOverlay = useCallback((level: OverlayLevel) => {
        setOverlays((cur) => ({ ...cur, [level]: !cur[level] }));
    }, []);

    const handleOverlayStatus = useCallback((level: OverlayLevel, status: "loading" | "ready" | "error") => {
        setOverlayStatus((cur) => (cur[level] === status ? cur : { ...cur, [level]: status }));
    }, []);

    useEffect(() => {
        if (!notice) return;
        const id = setTimeout(() => setNotice(null), 3500);
        return () => clearTimeout(id);
    }, [notice]);

    const handleMapReady = useCallback((map: L.Map) => {
        mapRef.current = map;
    }, []);

    const handleFeatureClick = useCallback(
        (item: SelectedMapItem) => {
            setInspected(item);
            onSelectFeature?.(item);
        },
        [onSelectFeature],
    );

    const handleFeatureHover = useCallback((item: SelectedMapItem | null) => {
        if (item) setInspected((cur) => cur ?? item);
    }, []);

    const lookup = useCallback(async (lat: number, lon: number, label?: string) => {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setProbe({ lat, lon, label, status: "loading" });
        setCoordInput(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        setCoordError(null);

        const t0 = performance.now();
        try {
            const zone = await apiGet<ZoneCollection>(zonePath(lat, lon, "geojson"), undefined, ctrl.signal);
            if (ctrl.signal.aborted) return;
            const ms = performance.now() - t0;
            const ok = zone && zone.type === "FeatureCollection" && zone.features.length > 0;
            setProbe({ lat, lon, label, status: ok ? "ok" : "miss", zone: ok ? zone : undefined, ms });
        } catch (err) {
            if (ctrl.signal.aborted) return;
            const status = (err as { status?: number }).status;
            if (status === 404) {
                setProbe({ lat, lon, label, status: "miss" });
            } else {
                setProbe({ lat, lon, label, status: "error", error: (err as Error).message });
            }
        }
    }, []);

    const handlePick = useCallback((lat: number, lon: number) => lookup(lat, lon), [lookup]);

    const handleLandmark = useCallback(
        (l: Landmark) => {
            mapRef.current?.flyTo([l.lat, l.lon], l.zoom, { duration: 1.2 });
            lookup(l.lat, l.lon, l.name);
        },
        [lookup],
    );

    const handleLocate = useCallback(() => {
        if (!("geolocation" in navigator)) {
            setNotice("Geolocation is not available in this browser.");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocating(false);
                const { latitude, longitude } = pos.coords;
                const inCambodia = L.latLngBounds(MAX_BOUNDS).contains([latitude, longitude]);
                if (!inCambodia) {
                    setNotice("Your location is outside Cambodia — click anywhere on the map instead.");
                    return;
                }
                mapRef.current?.flyTo([latitude, longitude], 15, { duration: 1.2 });
                lookup(latitude, longitude, "My location");
            },
            (err) => {
                setLocating(false);
                setNotice(err.code === err.PERMISSION_DENIED ? "Location permission denied." : "Could not get your location.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
    }, [lookup]);

    const handleCoordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseLatLng(coordInput);
        if ("error" in parsed) {
            setCoordError(parsed.error);
            return;
        }
        const zoom = Math.max(mapRef.current?.getZoom() ?? 0, 14);
        mapRef.current?.flyTo([parsed.lat, parsed.lon], zoom, { duration: 1 });
        lookup(parsed.lat, parsed.lon, "Entered coordinates");
    };

    const changeBasemap = useCallback((id: BasemapId) => {
        setBasemapId(id);
        storeBasemap(id);
    }, []);

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

    const themeKey = dark ? "dark" : "light";

    // Legend: levels currently drawn (response layer + point lookup)
    const levelsShown = new Set<BoundaryLevel>();
    if (geojson && typeof geojson === "object") {
        const g = geojson as any;
        const feats: any[] = Array.isArray(g.features) ? g.features : g.type === "Feature" ? [g] : [];
        for (const f of feats) {
            const l = levelOf(f?.properties);
            if (l) levelsShown.add(l);
        }
    }
    for (const l of OVERLAY_LEVELS) {
        if (overlays[l]) levelsShown.add(l);
    }
    for (const f of probe?.zone?.features ?? []) {
        const l = levelOf(f.properties);
        if (l) levelsShown.add(l);
    }
    const legend = LEVEL_ORDER.filter((l) => levelsShown.has(l));

    return (
        <div
            ref={containerRef}
            className={cx(
                "relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card [&:fullscreen]:rounded-none [&:fullscreen]:border-0",
                pseudoFs ? "fixed! inset-0 z-2000 h-dvh! w-screen! rounded-none border-0" : className || "h-135 w-full",
            )}
        >
            {/* Top Floating Badge Bar */}
            <div className="pointer-events-none absolute top-3 left-3 z-500 flex max-w-[calc(100%-4.5rem)] flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-card backdrop-blur-md">
                    <span className="size-2 rounded-full bg-accent animate-pulse" />
                    <span>{title || "Map Preview"}</span>
                    {featuresCount > 0 && (
                        <span className="ml-1 rounded bg-surface-2 px-1.5 py-0.2 text-[10.5px] font-mono text-ink-3">
                            {featuresCount} {featuresCount === 1 ? "feature" : "features"}
                        </span>
                    )}
                </div>
                {legend.length > 0 && (
                    <div
                        className="inline-flex items-center gap-2.5 rounded-lg border border-line bg-surface/90 px-2.5 py-1.5 shadow-card backdrop-blur-md"
                        aria-label="Boundary level legend"
                    >
                        {legend.map((l) => (
                            <span key={l} className="inline-flex items-center gap-1.5 text-[11px] font-medium capitalize text-ink-2">
                                <span
                                    className="size-2.5 rounded-xs border-[1.5px]"
                                    style={{
                                        borderColor: levelColor(l),
                                        backgroundColor: `color-mix(in srgb, ${levelColor(l)} 30%, transparent)`,
                                    }}
                                />
                                {l}
                            </span>
                        ))}
                    </div>
                )}
                {enableLookup && (
                    <form
                        onSubmit={handleCoordSubmit}
                        className="pointer-events-auto basis-full"
                        aria-label="Look up coordinates"
                    >
                        <div
                            className={cx(
                                "flex w-full max-w-80 items-center gap-1 rounded-xl border bg-surface/90 p-1 pl-2.5 shadow-card backdrop-blur-md transition-colors focus-within:border-accent",
                                coordError ? "border-warn" : "border-line",
                            )}
                        >
                            <Icon name="pin" className="size-3.5 shrink-0 text-accent" />
                            <input
                                type="text"
                                inputMode="decimal"
                                value={coordInput}
                                onChange={(e) => {
                                    setCoordInput(e.target.value);
                                    if (coordError) setCoordError(null);
                                }}
                                placeholder="lat, lng — e.g. 11.5564, 104.9282"
                                aria-label="Latitude, longitude"
                                aria-invalid={!!coordError}
                                spellCheck={false}
                                autoComplete="off"
                                className="min-w-0 flex-1 bg-transparent px-1 py-1 font-mono text-xs text-ink outline-none placeholder:font-sans placeholder:text-ink-3"
                            />
                            <button
                                type="submit"
                                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-semibold text-bg transition-all hover:bg-[color-mix(in_srgb,var(--og-ink)_85%,var(--og-accent))]"
                            >
                                <Icon name="search" className="size-3" />
                                Go
                            </button>
                        </div>
                        <div className={cx("mt-1 px-1 text-[11px]", coordError ? "text-warn" : "text-ink-3 max-sm:hidden")}>
                            {coordError ?? (probe ? "" : "…or click anywhere on the map")}
                        </div>
                    </form>
                )}
            </div>

            {notice && (
                <div className="absolute left-1/2 top-14 z-600 -translate-x-1/2 rounded-lg glass-panel px-3 py-1.5 text-xs text-ink shadow-glass">
                    {notice}
                </div>
            )}

            <MapContainer
                bounds={KH_BOUNDS}
                minZoom={6}
                maxBounds={MAX_BOUNDS}
                zoomControl={false}
                className={cx(
                    "h-full w-full",
                    // leaflet.css is unlayered, so the utility needs !important to beat `.leaflet-grab`
                    enableLookup && "[&.leaflet-grab]:cursor-crosshair!",
                    dark && basemapId === "streets" && "og-map og-map-dark",
                )}
                attributionControl={false}
            >
                {basemap.url && (
                    <TileLayer
                        key={basemap.id}
                        url={basemap.url}
                        maxZoom={basemap.maxZoom}
                        maxNativeZoom={basemap.maxNativeZoom}
                        subdomains={basemap.subdomains ?? "abc"}
                    />
                )}
                {basemap.overlayUrl && <TileLayer key={`${basemap.id}-labels`} url={basemap.overlayUrl} maxZoom={basemap.maxZoom} />}
                {OVERLAY_LEVELS.map((level) => (
                    <OverlayLevelLayer
                        key={level}
                        level={level}
                        on={overlays[level]}
                        themeKey={themeKey}
                        onStatus={handleOverlayStatus}
                    />
                ))}
                <MapRef onReady={handleMapReady} />
                <MapControls
                    basemap={basemapId}
                    onBasemap={changeBasemap}
                    enableLookup={enableLookup}
                    onLocate={handleLocate}
                    locating={locating}
                    onLandmark={handleLandmark}
                    overlays={overlays}
                    overlayStatus={overlayStatus}
                    onToggleOverlay={toggleOverlay}
                    fullscreen={fullscreen}
                    onToggleFullscreen={toggleFullscreen}
                />
                <ScaleControl />
                <MapUpdater
                    geojson={geojson}
                    markers={markers}
                    selectedCode={selectedCode}
                    onFeatureClick={handleFeatureClick}
                    onFeatureHover={handleFeatureHover}
                    themeKey={themeKey}
                />
                <ProbeLayer probe={probe} themeKey={themeKey} />
                <MapInteraction enableLookup={enableLookup} onPick={handlePick} />
            </MapContainer>

            {/* Floating HUD: point lookup takes precedence over feature inspection */}
            {probe ? (
                <ProbeCard probe={probe} onClose={() => setProbe(null)} onDrillDown={onDrillDown} />
            ) : inspected ? (
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-500 rounded-2xl glass-panel p-4 shadow-glass-lg transition-all">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {inspected.level && <span className={lvl(inspected.level)}>{inspected.level}</span>}
                                {inspected.code && (
                                    <span className="font-mono text-xs font-semibold text-ink-3">#{inspected.code}</span>
                                )}
                                {inspected.administrative_unit && (
                                    <span className="rounded-md glass-pill px-1.75 py-0.5 text-[10.5px] text-ink-2 border border-line/60">
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
                            className="grid size-6 place-items-center rounded-lg glass-pill text-ink-3 hover:text-ink cursor-pointer transition-all"
                            title="Close"
                        >
                            <Icon name="x" className="size-3" />
                        </button>
                    </div>

                    {onDrillDown && inspected.code && (
                        <div className="mt-2.5 pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-ink-3 text-[11px]">Explore deeper:</span>
                            <div className="flex flex-wrap items-center gap-2">
                                {(inspected.level === "province" || String(inspected.code).length === 2) && (
                                    <button
                                        type="button"
                                        onClick={() => onDrillDown(`/api/boundaries/districts?province_code=${inspected.code}`, { province_code: String(inspected.code) })}
                                        className="cursor-pointer font-semibold rounded-lg glass-pill px-2.5 py-1 text-accent text-[11px] flex items-center gap-1 transition-all"
                                    >
                                        <Icon name="polygon" className="size-3" />
                                        <span>Districts Boundary →</span>
                                    </button>
                                )}
                                {(inspected.level === "district" || String(inspected.code).length === 4) && (
                                    <button
                                        type="button"
                                        onClick={() => onDrillDown(`/api/boundaries/communes?district_code=${inspected.code}`, { district_code: String(inspected.code) })}
                                        className="cursor-pointer font-semibold rounded-lg glass-pill px-2.5 py-1 text-accent text-[11px] flex items-center gap-1 transition-all"
                                    >
                                        <Icon name="polygon" className="size-3" />
                                        <span>Communes Boundary →</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onDrillDown(`/api/boundaries/item/${inspected.code}`, { code: String(inspected.code) })}
                                    className="cursor-pointer font-semibold rounded-lg glass-pill px-2.5 py-1 text-ink-2 hover:text-ink text-[11px] transition-all"
                                >
                                    Polygon →
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDrillDown(`/api/admin/hierarchy/${inspected.code}`, { id: String(inspected.code) })}
                                    className="cursor-pointer font-semibold rounded-lg glass-pill px-2.5 py-1 text-water hover:text-accent text-[11px] transition-all"
                                >
                                    Hierarchy →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Attribution follows the active basemap */}
            <div className="pointer-events-none absolute bottom-2 right-2 z-500 max-w-[60%] truncate rounded bg-bg/85 px-2 py-0.5 text-[10px] text-ink-3 backdrop-blur">
                {basemap.attribution}
            </div>
        </div>
    );
}
