import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { cx, lvl } from "../../components/ui";
import { apiGet, type RequestLog } from "../../lib/api";
import { PlaygroundMap, type MapMarker } from "./PlaygroundMap";

interface PlaygroundMapPreviewProps {
    log: RequestLog;
    endpointPath: string;
    onDrillDown?: (path: string, params?: Record<string, string>) => void;
    onSwitchTab?: (tab: "table" | "raw") => void;
}

// In-memory cache for boundary polygons so map loads instantly
const boundaryCache = new Map<string, unknown>();

export function PlaygroundMapPreview({
    log,
    endpointPath,
    onDrillDown,
    onSwitchTab,
}: PlaygroundMapPreviewProps) {
    const [mapGeojson, setMapGeojson] = useState<unknown | null>(null);
    const [mapMarkers, setMapMarkers] = useState<MapMarker[] | undefined>(undefined);
    const [loadingBoundaries, setLoadingBoundaries] = useState(false);
    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const [chipItems, setChipItems] = useState<any[]>([]);

    const body = log.body as any;

    useEffect(() => {
        let isCancelled = false;

        // Reset state on new request
        setMapGeojson(null);
        setMapMarkers(undefined);
        setSelectedCode(null);
        setChipItems([]);

        if (!body || typeof body !== "object") return;

        // 1. Direct GeoJSON (from /api/boundaries/* or similar)
        const isFc = body.type === "FeatureCollection" && Array.isArray(body.features);
        const isFeature = body.type === "Feature" && body.geometry;

        if (isFc || isFeature) {
            setMapGeojson(body);
            const features: any[] = isFc ? body.features : [body];
            setChipItems(features.map((f) => ({
                id: f.properties?.id ?? f.properties?.code,
                code: f.properties?.code ?? f.properties?.id,
                name_en: f.properties?.name_en || f.properties?.name || "Feature",
                name_km: f.properties?.name_km,
                administrative_unit: f.properties?.administrative_unit || f.properties?.type_km || f.properties?.level,
                level: f.properties?.level,
            })));
            return;
        }

        // 2. Direct Geocode Result (with coordinates)
        const isGeocode =
            (body.data && (body.data.lat || body.data.coordinates?.lat || body.data.display_name)) ||
            (Array.isArray(body.data) && body.data[0] && (body.data[0].lat || body.data[0].display_name));

        if (isGeocode) {
            const rawItems: any[] = Array.isArray(body.data) ? body.data : [body.data];
            const markers: MapMarker[] = [];
            rawItems.forEach((item) => {
                const lat = Number(item.lat ?? item.coordinates?.lat);
                const lon = Number(item.lon ?? item.coordinates?.lon);
                if (!isNaN(lat) && !isNaN(lon)) {
                    markers.push({
                        lat,
                        lon,
                        title: item.display_name || item.formatted_address || "Location",
                        subtitle: item.hierarchy ? Object.values(item.hierarchy).filter(Boolean).join(", ") : undefined,
                        properties: item,
                    });
                }
            });
            setMapMarkers(markers);
            setChipItems(rawItems.map((item, idx) => ({
                id: idx,
                code: String(idx + 1),
                name_en: item.display_name || item.formatted_address || "Location",
                name_km: item.hierarchy?.province || "",
                level: "geocode",
            })));
            return;
        }

        // 3. Administrative Endpoints -> Correlate with Boundary GeoJSON
        async function loadAssociatedBoundaries() {
            setLoadingBoundaries(true);
            try {
                let boundaryUrl: string | null = null;

                // Match endpoint pattern
                if (endpointPath.startsWith("/api/admin/provinces") && !endpointPath.includes("/districts")) {
                    boundaryUrl = "/api/boundaries/provinces";
                } else if (endpointPath.match(/\/api\/admin\/provinces\/(\d+)\/districts/)) {
                    const match = endpointPath.match(/\/api\/admin\/provinces\/(\d+)\/districts/);
                    const pCode = match ? match[1].padStart(2, "0") : "12";
                    boundaryUrl = `/api/boundaries/districts?province_code=${pCode}`;
                } else if (endpointPath.match(/\/api\/admin\/districts\/(\d+)\/communes/)) {
                    const match = endpointPath.match(/\/api\/admin\/districts\/(\d+)\/communes/);
                    const dCode = match ? match[1] : "1201";
                    boundaryUrl = `/api/boundaries/communes?district_code=${dCode}`;
                } else if (endpointPath.match(/\/api\/admin\/communes\/(\d+)\/villages/)) {
                    const match = endpointPath.match(/\/api\/admin\/communes\/(\d+)\/villages/);
                    const cCode = match ? match[1] : "120101";
                    boundaryUrl = `/api/boundaries/item/${cCode}`;
                } else if (endpointPath.match(/\/api\/admin\/hierarchy\/(\d+)/)) {
                    const match = endpointPath.match(/\/api\/admin\/hierarchy\/(\d+)/);
                    const hCode = match ? match[1] : "120101";
                    boundaryUrl = `/api/boundaries/hierarchy/${hCode}`;
                } else if (endpointPath.match(/\/api\/admin\/item\/(\d+)/)) {
                    const match = endpointPath.match(/\/api\/admin\/item\/(\d+)/);
                    const itemCode = match ? match[1] : "12";
                    boundaryUrl = `/api/boundaries/item/${itemCode}`;
                } else {
                    // Default fallback to provinces map
                    boundaryUrl = "/api/boundaries/provinces";
                }

                if (boundaryUrl) {
                    let geoData = boundaryCache.get(boundaryUrl);
                    if (!geoData) {
                        geoData = await apiGet(boundaryUrl);
                        boundaryCache.set(boundaryUrl, geoData);
                    }

                    if (!isCancelled) {
                        setMapGeojson(geoData);
                    }
                }
            } catch (err) {
                console.warn("[PlaygroundMapPreview] Could not load correlated boundaries", err);
            } finally {
                if (!isCancelled) setLoadingBoundaries(false);
            }
        }

        loadAssociatedBoundaries();

        // Extract chip items from array data
        if (Array.isArray(body.data)) {
            setChipItems(body.data.slice(0, 30).map((item: any) => ({
                id: item.id ?? item.code,
                code: String(item.code ?? item.id ?? ""),
                name_en: item.name_en || item.name || "Place",
                name_km: item.name_km,
                administrative_unit: item.administrative_unit || item.type_km || item.level,
                level: item.level,
            })));
        } else if (body.data && typeof body.data === "object") {
            const d = body.data;
            if (d.name_en || d.name_km) {
                setChipItems([{
                    id: d.id ?? d.code,
                    code: String(d.code ?? d.id ?? ""),
                    name_en: d.name_en || "Place",
                    name_km: d.name_km,
                    administrative_unit: d.administrative_unit,
                    level: d.level,
                }]);
            }
        }

        return () => {
            isCancelled = true;
        };
    }, [body, endpointPath]);

    const handleChipClick = (chip: any) => {
        setSelectedCode(chip.code);
    };

    return (
        <div className="space-y-3">
            {/* The Main Map Preview Studio */}
            <div className="relative">
                <PlaygroundMap
                    geojson={mapGeojson}
                    markers={mapMarkers}
                    className="h-[520px] sm:h-[580px] w-full"
                    title={
                        loadingBoundaries
                            ? "Loading Boundary Layer…"
                            : mapMarkers
                            ? "Geocoding Map Preview"
                            : "Geographic Map Preview"
                    }
                    selectedCode={selectedCode}
                    onDrillDown={onDrillDown}
                />

                {/* Loading indicator pill */}
                {loadingBoundaries && (
                    <div className="absolute top-14 left-3 z-500 flex items-center gap-2 rounded-lg border border-line bg-surface/90 px-3 py-1.5 text-xs text-ink-2 backdrop-blur shadow-sm">
                        <span className="size-3 animate-spin rounded-full border-2 border-line-2 border-t-accent" />
                        <span>Rendering geographic vector polygons…</span>
                    </div>
                )}
            </div>

            {/* Quick Feature Chips Strip (below map) */}
            {chipItems.length > 0 && (
                <div className="rounded-xl border border-line bg-surface p-3 shadow-card">
                    <div className="mb-2 flex items-center justify-between text-xs text-ink-3">
                        <span className="font-semibold uppercase tracking-wider text-[11px] text-ink flex items-center gap-1.5">
                            <Icon name="layers" className="size-3.5 text-accent" />
                            Mapped Places ({chipItems.length})
                        </span>
                        <span>Click a place to highlight on map</span>
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                        {chipItems.map((chip, idx) => {
                            const isSelected = selectedCode === chip.code;
                            return (
                                <button
                                    key={chip.code || idx}
                                    type="button"
                                    onClick={() => handleChipClick(chip)}
                                    className={cx(
                                        "shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors",
                                        isSelected
                                            ? "border-accent bg-accent-soft text-accent font-semibold shadow-sm"
                                            : "border-line bg-surface-2 text-ink-2 hover:border-line-2 hover:text-ink",
                                    )}
                                >
                                    {chip.level && <span className={lvl(chip.level)}>{chip.level}</span>}
                                    <span>{chip.name_en}</span>
                                    {chip.name_km && (
                                        <span className="font-khmer text-ink-3 font-normal">
                                            ({chip.name_km})
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick links to Table / Raw JSON */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-ink-3">
                <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-ok" />
                    <span>Map layer synchronized with API response</span>
                </div>
                {onSwitchTab && (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onSwitchTab("table")}
                            className="cursor-pointer font-medium text-water hover:underline"
                        >
                            View as Data Table →
                        </button>
                        <button
                            type="button"
                            onClick={() => onSwitchTab("raw")}
                            className="cursor-pointer font-medium text-accent hover:underline"
                        >
                            View Raw JSON →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
