import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { cx } from "../../components/ui";
import { type RequestLog } from "../../lib/api";
import { type HeroProvince, PROVINCES } from "../home/cambodiaMap";
import { PROVINCE_STATS } from "./provinceStats";

const KH_BOUNDS: L.LatLngBoundsExpression = [
    [10.35, 102.3],
    [14.75, 107.65],
];
const MAX_BOUNDS: L.LatLngBoundsExpression = [
    [8.5, 100.5],
    [16.5, 109.5],
];

export type BasemapMode = "dark" | "satellite" | "osm";

interface AtlasRealMapProps {
    activeProvince: HeroProvince;
    highlightedCodes?: Set<string>;
    geocodeMarker?: { x: number; y: number; lat: number; lon: number; label: string } | null;
    networkEnabled?: boolean;
    onSelectProvince: (province: HeroProvince) => void;
    onToggleNetwork?: () => void;
    log?: RequestLog | null;
}

// GPS coordinates for Cambodia's 25 provincial centroids
export const PROVINCE_COORDINATES: Record<string, [number, number]> = {
    "01": [13.5859, 102.9737], // Banteay Meanchey
    "02": [13.0957, 103.2022], // Battambang
    "03": [11.9924, 105.4645], // Kampong Cham
    "04": [12.2500, 104.6667], // Kampong Chhnang
    "05": [11.4532, 104.5209], // Kampong Speu
    "06": [12.7111, 104.8887], // Kampong Thom
    "07": [10.6104, 104.1815], // Kampot
    "08": [11.4588, 105.0000], // Kandal
    "09": [11.6153, 102.9838], // Koh Kong
    "10": [12.4881, 106.0188], // Kratie
    "11": [12.4558, 107.1881], // Mondulkiri
    "12": [11.5564, 104.9282], // Phnom Penh
    "13": [13.8073, 104.9810], // Preah Vihear
    "14": [11.4851, 105.3253], // Prey Veng
    "15": [12.5333, 103.9167], // Pursat
    "16": [13.7394, 106.9873], // Ratanakiri
    "17": [13.3671, 103.8448], // Siem Reap
    "18": [10.6275, 103.5222], // Preah Sihanouk
    "19": [13.5259, 105.9683], // Stung Treng
    "20": [11.0879, 105.7993], // Svay Rieng
    "21": [10.9908, 104.7850], // Takeo
    "22": [14.1818, 103.5176], // Otdar Meanchey
    "23": [10.4828, 104.2949], // Kep
    "24": [12.8489, 102.6093], // Pailin
    "25": [11.9141, 105.6565], // Tboung Khmum
};

// Key regional hubs connecting to Phnom Penh
const HUB_CODES = ["17", "02", "18", "03", "19", "07", "11", "13", "16", "21", "24", "08"];

/** Leaflet map controller subcomponent for camera navigation & overlays */
function RealMapController({
    activeProvince,
    networkEnabled,
    onSelectProvince,
    geocodeMarker,
    log,
}: {
    activeProvince: HeroProvince;
    networkEnabled: boolean;
    onSelectProvince: (p: HeroProvince) => void;
    geocodeMarker?: { x: number; y: number; lat: number; lon: number; label: string } | null;
    log?: RequestLog | null;
}) {
    const map = useMap();
    const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const arcsLayerRef = useRef<L.LayerGroup | null>(null);
    const dynamicQueryLayerRef = useRef<L.LayerGroup | null>(null);

    // Initial boundary GeoJSON loading
    useEffect(() => {
        let isMounted = true;

        fetch("/boundaries/province.geojson")
            .then((res) => res.json())
            .then((geojson) => {
                if (!isMounted) return;

                if (boundaryLayerRef.current) {
                    map.removeLayer(boundaryLayerRef.current);
                }

                const layer = L.geoJSON(geojson, {
                    style: (feature) => {
                        const code = String(
                            feature?.properties?.ADM1_PCODE ||
                            feature?.properties?.code ||
                            feature?.properties?.id ||
                            ""
                        ).replace(/\D/g, "").slice(-2);

                        const isActive = code === activeProvince.code;
                        return {
                            color: isActive ? "#f43f5e" : "#06b6d4",
                            weight: isActive ? 2.5 : 1.2,
                            opacity: isActive ? 0.95 : 0.45,
                            fillColor: isActive ? "#f43f5e" : "#06b6d4",
                            fillOpacity: isActive ? 0.22 : 0.04,
                            className: "transition-all duration-300",
                        };
                    },
                    onEachFeature: (feature, l) => {
                        const pName = feature.properties?.ADM1_EN || feature.properties?.name_en || "Province";
                        const pKm = feature.properties?.ADM1_KM || feature.properties?.name_km || "";
                        const rawCode = String(
                            feature.properties?.ADM1_PCODE ||
                            feature.properties?.code ||
                            feature.properties?.id ||
                            ""
                        ).replace(/\D/g, "").slice(-2);

                        l.bindTooltip(
                            `<div class="font-mono text-xs font-bold text-cyan-300 bg-[#070b14] px-2 py-1 rounded border border-cyan-500/40 shadow-xl">
                                <span>${pName}</span> <span class="text-slate-400 font-khmer text-[10px]">(${pKm})</span>
                            </div>`,
                            { sticky: true, className: "og-real-tip", direction: "top", opacity: 0.95 }
                        );

                        l.on("mouseover", () => {
                            (l as L.Path).setStyle({
                                fillOpacity: 0.28,
                                weight: 2.2,
                                color: "#38bdf8",
                            });
                        });

                        l.on("mouseout", () => {
                            const isCur = rawCode === activeProvince.code;
                            (l as L.Path).setStyle({
                                fillOpacity: isCur ? 0.22 : 0.04,
                                weight: isCur ? 2.5 : 1.2,
                                color: isCur ? "#f43f5e" : "#06b6d4",
                            });
                        });

                        l.on("click", (e) => {
                            L.DomEvent.stop(e);
                            const matched = PROVINCES.find((p) => p.code === rawCode || p.en.toLowerCase() === pName.toLowerCase());
                            if (matched) {
                                onSelectProvince(matched);
                            }
                        });
                    },
                });

                layer.addTo(map);
                boundaryLayerRef.current = layer;
            })
            .catch(() => {
                // Ignore fetch errors
            });

        return () => {
            isMounted = false;
            if (boundaryLayerRef.current) {
                map.removeLayer(boundaryLayerRef.current);
            }
        };
    }, [map, activeProvince.code, onSelectProvince]);

    // Update boundary styling when activeProvince changes
    useEffect(() => {
        if (!boundaryLayerRef.current) return;
        boundaryLayerRef.current.eachLayer((l: any) => {
            const rawCode = String(
                l.feature?.properties?.ADM1_PCODE ||
                l.feature?.properties?.code ||
                l.feature?.properties?.id ||
                ""
            ).replace(/\D/g, "").slice(-2);

            const isActive = rawCode === activeProvince.code;
            l.setStyle({
                color: isActive ? "#f43f5e" : "#06b6d4",
                weight: isActive ? 2.8 : 1.2,
                opacity: isActive ? 1 : 0.45,
                fillColor: isActive ? "#f43f5e" : "#06b6d4",
                fillOpacity: isActive ? 0.22 : 0.04,
            });
            if (isActive) {
                l.bringToFront();
            }
        });
    }, [activeProvince]);

    // Fly camera smoothly to active province coordinates
    useEffect(() => {
        const coords = PROVINCE_COORDINATES[activeProvince.code];
        if (coords) {
            map.flyTo(coords, Math.max(map.getZoom(), 9), {
                duration: 1.4,
                easeLinearity: 0.25,
            });
        }
    }, [activeProvince, map]);

    // Render Hub Beacons, Geodesic Domes & Transmission Lines
    useEffect(() => {
        if (markersLayerRef.current) map.removeLayer(markersLayerRef.current);
        if (arcsLayerRef.current) map.removeLayer(arcsLayerRef.current);

        const markersGroup = L.layerGroup();
        const arcsGroup = L.layerGroup();

        const ppCoords = PROVINCE_COORDINATES["12"] ?? [11.5564, 104.9282];

        // 1. Provincial Centroid Beacon Markers
        PROVINCES.forEach((p) => {
            const coords = PROVINCE_COORDINATES[p.code];
            if (!coords) return;

            const isCapital = p.code === "12";
            const isActive = p.code === activeProvince.code;
            const isHub = HUB_CODES.includes(p.code);

            const color = isCapital ? "#f43f5e" : isActive ? "#f43f5e" : isHub ? "#06b6d4" : "#10b981";

            // Custom HTML Cyber Beacon Icon
            const iconHtml = `
                <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
                    ${(isActive || isCapital) ? `<div class="absolute size-9 rounded-full border border-[${color}] animate-ping opacity-75"></div>` : ""}
                    <div class="size-3.5 rounded-full ring-2 ring-[#070a13] shadow-[0_0_12px_${color}]" style="background-color: ${color};"></div>
                    <div class="absolute -bottom-5 whitespace-nowrap rounded bg-[#070b14]/90 px-1.5 py-0.2 font-mono text-[9px] font-bold text-slate-200 border border-white/10 shadow-lg pointer-events-none">
                        ${p.en.toUpperCase()}
                    </div>
                </div>
            `;

            const icon = L.divIcon({
                html: iconHtml,
                className: "cyber-beacon-icon",
                iconSize: [24, 24],
            });

            const marker = L.marker(coords, { icon });
            marker.on("click", (e) => {
                L.DomEvent.stop(e);
                onSelectProvince(p);
            });

            marker.addTo(markersGroup);

            // 2. Transmission Conduits from Phnom Penh
            if (networkEnabled && !isCapital && (isHub || isActive)) {
                // Create a curved route between Phnom Penh and this hub
                const [lat1, lon1] = ppCoords;
                const [lat2, lon2] = coords;
                const midLat = (lat1 + lat2) / 2 + (lon2 - lon1) * 0.12;
                const midLon = (lon1 + lon2) / 2 - (lat2 - lat1) * 0.12;

                const curvePoints: L.LatLngExpression[] = [
                    [lat1, lon1],
                    [midLat, midLon],
                    [lat2, lon2],
                ];

                const arcPoly = L.polyline(curvePoints, {
                    color: isActive ? "#f43f5e" : "#06b6d4",
                    weight: isActive ? 2.5 : 1.5,
                    opacity: isActive ? 0.85 : 0.45,
                    dashArray: "6, 8",
                    className: "animate-pulse",
                });

                arcPoly.addTo(arcsGroup);
            }
        });

        markersGroup.addTo(map);
        arcsGroup.addTo(map);

        markersLayerRef.current = markersGroup;
        arcsLayerRef.current = arcsGroup;

        return () => {
            if (markersLayerRef.current) map.removeLayer(markersLayerRef.current);
            if (arcsLayerRef.current) map.removeLayer(arcsLayerRef.current);
        };
    }, [map, activeProvince, networkEnabled, onSelectProvince]);

    // Handle Geocode Marker or Dynamic Features from API Response
    useEffect(() => {
        if (dynamicQueryLayerRef.current) {
            map.removeLayer(dynamicQueryLayerRef.current);
            dynamicQueryLayerRef.current = null;
        }

        const group = L.layerGroup();

        // 1. Geocode Target Marker
        if (geocodeMarker) {
            const geocodeIcon = L.divIcon({
                html: `
                    <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
                        <div class="absolute size-10 rounded-full border-2 border-rose-500 animate-spin border-dashed"></div>
                        <div class="size-3 rounded-full bg-rose-500 shadow-[0_0_14px_#f43f5e]"></div>
                        <div class="absolute top-6 whitespace-nowrap rounded bg-black/90 px-2 py-0.5 font-mono text-[9px] font-bold text-rose-300 border border-rose-500/50">
                            ${geocodeMarker.label || "Target"} (${geocodeMarker.lat.toFixed(3)}, ${geocodeMarker.lon.toFixed(3)})
                        </div>
                    </div>
                `,
                className: "geocode-target-icon",
                iconSize: [24, 24],
            });

            L.marker([geocodeMarker.lat, geocodeMarker.lon], { icon: geocodeIcon }).addTo(group);
            map.flyTo([geocodeMarker.lat, geocodeMarker.lon], 13, { duration: 1.2 });
        }

        // 2. If API body contains GeoJSON features (e.g. boundary or geocode endpoints)
        const body = log?.body as any;
        if (body && typeof body === "object") {
            if (body.type === "FeatureCollection" && Array.isArray(body.features)) {
                try {
                    const geoLayer = L.geoJSON(body, {
                        style: {
                            color: "#38bdf8",
                            weight: 2,
                            opacity: 0.9,
                            fillColor: "#0284c7",
                            fillOpacity: 0.2,
                        },
                    });
                    geoLayer.addTo(group);
                    const b = geoLayer.getBounds();
                    if (b.isValid()) {
                        map.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
                    }
                } catch {
                    // Ignore parsing error
                }
            } else if (Array.isArray(body) && body.length > 0 && body[0]?.lat && body[0]?.lon) {
                // Marker list
                body.slice(0, 50).forEach((item: any) => {
                    const markerIcon = L.divIcon({
                        html: `<div class="size-2.5 rounded-full bg-cyan-400 ring-2 ring-black shadow-[0_0_8px_#06b6d4]"></div>`,
                        className: "api-point-icon",
                        iconSize: [12, 12],
                    });
                    L.marker([item.lat, item.lon], { icon: markerIcon })
                        .bindTooltip(`<div class="font-mono text-xs">${item.name_en || item.name || "Item"}</div>`)
                        .addTo(group);
                });
            }
        }

        group.addTo(map);
        dynamicQueryLayerRef.current = group;

        return () => {
            if (dynamicQueryLayerRef.current) {
                map.removeLayer(dynamicQueryLayerRef.current);
            }
        };
    }, [map, geocodeMarker, log]);

    return null;
}

export function AtlasRealMap({
    activeProvince,
    networkEnabled = true,
    onSelectProvince,
    onToggleNetwork,
    geocodeMarker,
    log,
}: AtlasRealMapProps) {
    const [basemap, setBasemap] = useState<BasemapMode>("dark");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [railMode, setRailMode] = useState<"ncdd" | "name">("ncdd");

    // Filtered search list
    const searchMatches = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return PROVINCES.filter((p) => p.en.toLowerCase().includes(q) || p.km.includes(q) || p.code === q);
    }, [searchQuery]);

    // Basemap tile URL selection
    const tileUrl = useMemo(() => {
        if (basemap === "satellite") {
            return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
        }
        if (basemap === "osm") {
            return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
        }
        // CartoDB Dark Matter (authentic dark geographic tiles)
        return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    }, [basemap]);

    const activeStats = PROVINCE_STATS[activeProvince.code] ?? PROVINCE_STATS["12"];

    return (
        <div className="relative h-full w-full select-none overflow-hidden rounded-2xl bg-[#060911]">
            {/* Real Interactive Leaflet Map Container */}
            <MapContainer
                bounds={KH_BOUNDS}
                minZoom={6}
                maxBounds={MAX_BOUNDS}
                zoomControl={false}
                attributionControl={false}
                className={cx(
                    "h-full w-full relative z-0",
                    basemap === "dark" && "og-real-map-dark",
                    basemap === "satellite" && "og-real-map-sat"
                )}
            >
                <TileLayer
                    url={tileUrl}
                    subdomains={basemap === "dark" ? ["a", "b", "c", "d"] : []}
                    maxZoom={19}
                />

                <RealMapController
                    activeProvince={activeProvince}
                    networkEnabled={networkEnabled}
                    onSelectProvince={onSelectProvince}
                    geocodeMarker={geocodeMarker}
                    log={log}
                />
            </MapContainer>

            {/* Atmospheric Dual Glowing Borders (Ambient Light matching reference) */}
            <div className="absolute top-0 right-0 size-80 bg-amber-500/10 blur-[90px] pointer-events-none z-10" />
            <div className="absolute bottom-0 left-0 size-80 bg-cyan-500/12 blur-[90px] pointer-events-none z-10" />

            {/* ============================================================== */}
            {/* TOP-RIGHT SEARCH BAR (DOWNTOWN FOCUS PILL)                     */}
            {/* ============================================================== */}
            <div className="absolute top-4 right-38 z-500">
                <div className="relative">
                    <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#090e1a]/95 px-3 py-1.5 backdrop-blur-xl shadow-2xl font-mono text-xs">
                        <span className="text-cyan-400">📍</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSearchOpen(true);
                            }}
                            onFocus={() => setSearchOpen(true)}
                            placeholder={`Downtown ${activeProvince.en}...`}
                            className="w-38 sm:w-48 bg-transparent text-slate-100 placeholder:text-slate-500 text-xs focus:outline-none"
                        />
                        <span className="text-slate-500 text-[11px]">🔍</span>
                    </div>

                    {/* Live search dropdown matches */}
                    {searchOpen && searchMatches.length > 0 && (
                        <div className="absolute left-0 top-10 w-full rounded-xl border border-white/15 bg-[#0d121e] p-1 shadow-2xl backdrop-blur-xl max-h-52 overflow-y-auto scrollbar-thin z-500">
                            {searchMatches.map((match) => (
                                <button
                                    key={match.code}
                                    type="button"
                                    onClick={() => {
                                        onSelectProvince(match);
                                        setSearchQuery("");
                                        setSearchOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-200 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors cursor-pointer"
                                >
                                    <span>{match.en} ({match.km})</span>
                                    <span className="font-mono text-[10px] text-slate-500">#{match.code}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ============================================================== */}
            {/* FLOATING ACTIVE PROVINCE TELEMETRY PILL (TOP-LEFT OF MAP)       */}
            {/* ============================================================== */}
            <div className="absolute top-4 left-4 z-500 hidden sm:flex items-center gap-2 rounded-xl border border-white/15 bg-[#090e1a]/90 px-3 py-1.5 backdrop-blur-xl shadow-xl font-mono text-xs">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white">{activeProvince.en}</span>
                <span className="text-slate-500">·</span>
                <span className="text-cyan-400 font-semibold">{activeStats.districts} Districts</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300">{activeStats.communes} Communes</span>
            </div>

            {/* ============================================================== */}
            {/* RIGHT VERTICAL RAIL: NCDD SELECTOR STRIP (MATCHING ZIP CODE)   */}
            {/* ============================================================== */}
            <aside
                aria-label="NCDD Administrative Selector"
                className="absolute top-4 right-4 bottom-16 z-500 w-28 sm:w-32 flex flex-col rounded-2xl border border-white/15 bg-[#080d1a]/90 p-2 shadow-2xl backdrop-blur-xl font-mono select-none"
            >
                {/* Header Switch Pill */}
                <div className="flex items-center justify-between rounded-lg bg-black/50 p-0.5 mb-2 text-[9px] border border-white/5">
                    <button
                        type="button"
                        onClick={() => setRailMode("ncdd")}
                        className={`flex-1 py-0.5 rounded text-center transition-colors cursor-pointer ${
                            railMode === "ncdd"
                                ? "bg-cyan-500/30 text-cyan-300 font-bold"
                                : "text-slate-500 hover:text-slate-300"
                        }`}
                    >
                        By NCDD
                    </button>
                    <button
                        type="button"
                        onClick={() => setRailMode("name")}
                        className={`flex-1 py-0.5 rounded text-center transition-colors cursor-pointer ${
                            railMode === "name"
                                ? "bg-cyan-500/30 text-cyan-300 font-bold"
                                : "text-slate-500 hover:text-slate-300"
                        }`}
                    >
                        By Name
                    </button>
                </div>

                {/* Scrollable list of 25 provinces formatted like ZIP code strip */}
                <div className="flex-1 overflow-y-auto scrollbar-none space-y-1 text-center text-xs">
                    {PROVINCES.map((p) => {
                        const isSelected = p.code === activeProvince.code;
                        return (
                            <button
                                key={p.code}
                                type="button"
                                onClick={() => onSelectProvince(p)}
                                className={`w-full py-1 px-1.5 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                                    isSelected
                                        ? "bg-cyan-500/25 text-cyan-300 font-black shadow-[0_0_10px_rgba(6,182,212,0.4)] border border-cyan-500/40"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <span className="truncate text-[11px]">
                                    {railMode === "ncdd" ? `NCDD ${p.code}` : p.en}
                                </span>
                                {isSelected && (
                                    <span className="size-1.5 rounded-full bg-cyan-400 animate-ping shadow-[0_0_6px_#06b6d4]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* ============================================================== */}
            {/* BOTTOM-RIGHT FLOATING MAP CONTROLS & BASEMAP SWITCHER          */}
            {/* ============================================================== */}
            <div className="absolute bottom-4 right-4 z-500 flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0d121d]/90 p-1 shadow-2xl backdrop-blur-xl">
                {/* Basemap Switcher */}
                <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 font-mono text-[10px]">
                    <button
                        type="button"
                        onClick={() => setBasemap("dark")}
                        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            basemap === "dark" ? "bg-cyan-500/30 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                        }`}
                        title="Dark Matter Map"
                    >
                        Dark
                    </button>
                    <button
                        type="button"
                        onClick={() => setBasemap("satellite")}
                        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            basemap === "satellite" ? "bg-cyan-500/30 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                        }`}
                        title="Satellite Terrain (Night Vision)"
                    >
                        Satellite
                    </button>
                    <button
                        type="button"
                        onClick={() => setBasemap("osm")}
                        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            basemap === "osm" ? "bg-cyan-500/30 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                        }`}
                        title="OpenStreetMap"
                    >
                        OSM
                    </button>
                </div>

                <div className="h-4 w-px bg-white/10 my-0.5" />

                {/* Network Arcs Toggle */}
                {onToggleNetwork && (
                    <button
                        type="button"
                        onClick={onToggleNetwork}
                        title={networkEnabled ? "Hide network arcs" : "Show network arcs"}
                        className={cx(
                            "flex size-7 items-center justify-center rounded-lg transition-colors cursor-pointer",
                            networkEnabled ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:bg-white/10 hover:text-white",
                        )}
                    >
                        <span className="text-xs">⚡</span>
                    </button>
                )}
            </div>
        </div>
    );
}
