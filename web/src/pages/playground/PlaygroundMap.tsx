import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { cssVar, useTheme } from "../../lib/theme";

const KH_BOUNDS: L.LatLngBoundsExpression = [[10.35, 102.3], [14.75, 107.65]];
const MAX_BOUNDS: L.LatLngBoundsExpression = [[8.5, 100.5], [16.5, 109.5]];

export interface MapMarker {
    lat: number;
    lon: number;
    title?: string;
    subtitle?: string;
}

interface PlaygroundMapProps {
    geojson?: unknown;
    markers?: MapMarker[];
    className?: string;
}

function esc(s: unknown): string {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function MapUpdater({ geojson, markers }: { geojson?: unknown; markers?: MapMarker[] }) {
    const map = useMap();
    const geoJsonLayer = useRef<L.GeoJSON | null>(null);
    const markerLayers = useRef<L.LayerGroup | null>(null);

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

        const group = L.featureGroup();

        // 1. Render GeoJSON if present
        if (geojson && typeof geojson === "object") {
            try {
                const isFc = "type" in geojson && (geojson as { type: string }).type === "FeatureCollection";
                const isFeature = "type" in geojson && (geojson as { type: string }).type === "Feature";
                const isGeom = "type" in geojson && "coordinates" in geojson;

                if (isFc || isFeature || isGeom) {
                    const layer = L.geoJSON(geojson as any, {
                        style: () => ({
                            color: cssVar("--og-accent") || "#e11d48",
                            weight: 1.5,
                            opacity: 0.85,
                            fillColor: cssVar("--og-accent") || "#e11d48",
                            fillOpacity: 0.12,
                        }),
                        onEachFeature: (feature, featLayer) => {
                            const p = feature.properties || {};
                            const title = p.name_en || p.name || `Feature ${p.id || p.code || ""}`;
                            const sub = p.name_km || "";
                            const unit = p.administrative_unit || p.type_km || p.level || "";

                            // Hover tooltip
                            featLayer.bindTooltip(
                                `<div class="font-sans text-xs font-semibold">${esc(title)} ${sub ? `<span class="font-khmer font-normal opacity-80">(${esc(sub)})</span>` : ""}</div>`,
                                { sticky: true, className: "og-leaflet-tooltip" },
                            );

                            // Click popup with properties table
                            const rows = Object.entries(p)
                                .filter(([k]) => !k.startsWith("_") && k !== "bbox")
                                .slice(0, 10)
                                .map(
                                    ([k, v]) => `
                                    <div class="flex items-center justify-between gap-3 border-b border-line/40 py-1 text-xs">
                                        <span class="font-mono text-ink-3">${esc(k)}</span>
                                        <span class="font-medium text-ink max-w-[180px] truncate text-right">${esc(v)}</span>
                                    </div>`,
                                )
                                .join("");

                            featLayer.bindPopup(
                                `<div class="min-w-[200px] max-w-[280px] p-1 font-sans">
                                    <div class="mb-1.5 flex items-center justify-between gap-2">
                                        <h4 class="m-0 text-sm font-bold text-ink">${esc(title)}</h4>
                                        ${unit ? `<span class="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent">${esc(unit)}</span>` : ""}
                                    </div>
                                    ${sub ? `<p class="m-0 mb-2 font-khmer text-xs text-ink-2">${esc(sub)}</p>` : ""}
                                    <div class="space-y-0.5">${rows}</div>
                                </div>`,
                                { maxWidth: 320 },
                            );

                            featLayer.on({
                                mouseover: (e) => {
                                    const target = e.target;
                                    target.setStyle?.({
                                        weight: 2.5,
                                        fillOpacity: 0.28,
                                    });
                                },
                                mouseout: (e) => {
                                    layer.resetStyle(e.target);
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

                    if (m.title || m.subtitle) {
                        circle.bindPopup(
                            `<div class="p-1 font-sans">
                                ${m.title ? `<div class="text-xs font-semibold text-ink">${esc(m.title)}</div>` : ""}
                                ${m.subtitle ? `<div class="text-[11px] text-ink-3">${esc(m.subtitle)}</div>` : ""}
                                <div class="mt-1 font-mono text-[10px] text-accent">${m.lat.toFixed(5)}, ${m.lon.toFixed(5)}</div>
                            </div>`,
                        );
                    }
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
    }, [geojson, markers, map]);

    return null;
}

export function PlaygroundMap({ geojson, markers, className }: PlaygroundMapProps) {
    const { dark } = useTheme();

    return (
        <div className={`relative overflow-hidden rounded-xl border border-line bg-surface ${className || "h-[420px] w-full"}`}>
            <MapContainer
                bounds={KH_BOUNDS}
                minZoom={6}
                maxBounds={MAX_BOUNDS}
                className={`h-full w-full ${dark ? "og-map-dark" : ""}`}
                attributionControl={false}
            >
                <TileLayer
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                />
                <MapUpdater geojson={geojson} markers={markers} />
            </MapContainer>
            <div className="pointer-events-none absolute bottom-2 right-2 z-500 rounded bg-bg/85 px-2 py-0.5 text-[10px] text-ink-3 backdrop-blur">
                © OpenStreetMap
            </div>
        </div>
    );
}
