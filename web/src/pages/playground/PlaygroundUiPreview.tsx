import { useState } from "react";
import { Icon } from "../../components/Icon";
import { cx, lvl } from "../../components/ui";
import type { RequestLog } from "../../lib/api";
import { PlaygroundMap, type MapMarker } from "./PlaygroundMap";

interface PlaygroundUiPreviewProps {
    log: RequestLog;
    onDrillDown?: (path: string, params?: Record<string, string>) => void;
}

export function PlaygroundUiPreview({ log, onDrillDown }: PlaygroundUiPreviewProps) {
    const [filterText, setFilterText] = useState("");
    const [subTab, setSubTab] = useState<"table" | "query">("table");

    const body = log.body as any;

    if (!body || typeof body !== "object") {
        return (
            <div className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-ink-3">
                No visual preview available for this response format.
            </div>
        );
    }

    // 1. Detect GeoJSON FeatureCollection or Feature
    const isFc = body.type === "FeatureCollection" && Array.isArray(body.features);
    const isFeature = body.type === "Feature" && body.geometry;

    if (isFc || isFeature) {
        const features: any[] = isFc ? body.features : [body];
        const count = features.length;

        return (
            <div className="space-y-4">
                {/* GeoJSON Summary Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                    <div className="flex items-center gap-2.5">
                        <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-xs font-semibold text-accent">
                            {body.type}
                        </span>
                        <span className="text-sm font-semibold text-ink">
                            {count} {count === 1 ? "Boundary Polygon" : "Boundary Polygons"}
                        </span>
                    </div>
                    {body.bbox && (
                        <div className="font-mono text-xs text-ink-3">
                            bbox: [{body.bbox.map((n: number) => n.toFixed(2)).join(", ")}]
                        </div>
                    )}
                </div>

                {/* Leaflet Map */}
                <PlaygroundMap geojson={body} className="h-[460px] w-full" />

                {/* Features List Table (collapsible or preview) */}
                {count > 0 && (
                    <div className="overflow-hidden rounded-xl border border-line bg-surface">
                        <div className="border-b border-line bg-surface-2 px-4 py-2.5 text-xs font-semibold text-ink">
                            Features in Geometry ({count})
                        </div>
                        <div className="max-h-60 overflow-y-auto divide-y divide-line/60">
                            {features.slice(0, 100).map((f: any, idx: number) => {
                                const p = f.properties || {};
                                const code = p.code || p.id || String(idx + 1);
                                const nameEn = p.name_en || p.name || `Feature ${idx + 1}`;
                                const nameKm = p.name_km || "";
                                const level = p.level || "";

                                return (
                                    <div
                                        key={code}
                                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-surface-2/60"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-medium text-ink-3">{code}</span>
                                            <span className="font-semibold text-ink">{nameEn}</span>
                                            {nameKm && <span className="font-khmer text-ink-2">({nameKm})</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {level && <span className={lvl(level)}>{level}</span>}
                                            {onDrillDown && p.code && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDrillDown(`/api/boundaries/item/${p.code}`, { code: p.code })}
                                                    className="rounded border border-line px-2 py-1 text-[11px] font-medium text-ink-2 hover:border-line-2 hover:text-ink"
                                                >
                                                    Inspect
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 2. Detect Geocode Reverse or Forward Search Result
    const isGeocodeResult =
        (body.data && (body.data.formatted_address || body.data.display_name)) ||
        (Array.isArray(body.data) && body.data[0] && (body.data[0].display_name || body.data[0].lat));

    if (isGeocodeResult) {
        const items: any[] = Array.isArray(body.data) ? body.data : [body.data];
        const markers: MapMarker[] = [];
        for (const item of items) {
            const lat = Number(item.lat ?? item.coordinates?.lat);
            const lon = Number(item.lon ?? item.coordinates?.lon);
            if (!isNaN(lat) && !isNaN(lon)) {
                markers.push({
                    lat,
                    lon,
                    title: item.display_name || item.formatted_address || "Geocoded Location",
                    subtitle: item.hierarchy ? Object.values(item.hierarchy).filter(Boolean).join(", ") : undefined,
                });
            }
        }

        return (
            <div className="space-y-4">
                <div className="rounded-xl border border-line bg-surface p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="rounded-md bg-water-soft px-2 py-0.5 font-mono text-xs font-semibold text-water">
                            Geocoding
                        </span>
                        <span className="text-sm font-semibold text-ink">
                            {items.length} {items.length === 1 ? "Result Matched" : "Results Matched"}
                        </span>
                    </div>

                    {markers.length > 0 && (
                        <div className="mb-4">
                            <PlaygroundMap markers={markers} className="h-[360px] w-full" />
                        </div>
                    )}

                    <div className="space-y-3">
                        {items.map((item, idx) => {
                            const displayName = item.display_name || item.formatted_address || "Location";
                            const h = item.hierarchy || {};
                            const lat = item.lat ?? item.coordinates?.lat;
                            const lon = item.lon ?? item.coordinates?.lon;

                            return (
                                <div key={idx} className="rounded-lg border border-line/70 bg-surface-2 p-3.5">
                                    <h4 className="m-0 text-sm font-semibold text-ink">{displayName}</h4>

                                    {/* Hierarchy badges */}
                                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                        {h.country && (
                                            <span className="rounded bg-surface px-2 py-0.5 text-xs text-ink-2 border border-line">
                                                {h.country}
                                            </span>
                                        )}
                                        {h.province && (
                                            <span className={lvl("province")}>
                                                {h.province}
                                            </span>
                                        )}
                                        {h.district && (
                                            <span className={lvl("district")}>
                                                {h.district}
                                            </span>
                                        )}
                                        {h.commune && (
                                            <span className={lvl("commune")}>
                                                {h.commune}
                                            </span>
                                        )}
                                        {h.village && (
                                            <span className={lvl("village")}>
                                                {h.village}
                                            </span>
                                        )}
                                    </div>

                                    {lat && lon && (
                                        <div className="mt-2 flex items-center gap-2 font-mono text-xs text-ink-3">
                                            <Icon name="pin" className="size-3 text-accent" />
                                            <span>{Number(lat).toFixed(5)}, {Number(lon).toFixed(5)}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // 3. Detect Full Hierarchy Resolution (/api/admin/hierarchy/:id or /api/boundaries/hierarchy/:code)
    const isHierarchy =
        body.data &&
        typeof body.data === "object" &&
        !Array.isArray(body.data) &&
        ("province" in body.data || "district" in body.data || "commune" in body.data);

    if (isHierarchy) {
        const h = body.data;
        const tiers = [
            { level: "province", data: h.province },
            { level: "district", data: h.district },
            { level: "commune", data: h.commune },
            { level: "village", data: h.village },
        ].filter((t) => t.data != null);

        // Check if data items are GeoJSON features (for boundary hierarchy)
        const hasFeatures = tiers.some((t) => t.data?.type === "Feature");

        return (
            <div className="space-y-4">
                <div className="rounded-xl border border-line bg-surface p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-xs font-semibold text-accent">
                                Hierarchy
                            </span>
                            <span className="text-sm font-semibold text-ink">
                                4-Tier Administrative Path
                            </span>
                        </div>
                    </div>

                    {hasFeatures && (
                        <div className="mb-5">
                            <PlaygroundMap
                                geojson={{
                                    type: "FeatureCollection",
                                    features: tiers.map((t) => t.data).filter((d) => d?.type === "Feature"),
                                }}
                                className="h-[360px] w-full"
                            />
                        </div>
                    )}

                    {/* Vertical Connected Tree */}
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-line">
                        {tiers.map((tier) => {
                            const d = tier.data?.properties || tier.data;
                            const nameEn = d.name_en || d.name || "";
                            const nameKm = d.name_km || "";
                            const code = d.code || d.id || "";
                            const unit = d.administrative_unit || d.type_km || "";

                            return (
                                <div key={tier.level} className="relative rounded-lg border border-line bg-surface-2 p-3.5 shadow-sm">
                                    <div className="absolute -left-[27px] top-4 size-3 rounded-full border-2 border-surface bg-accent" />
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={lvl(tier.level)}>{tier.level}</span>
                                            <span className="font-mono text-xs font-semibold text-ink-3">#{code}</span>
                                        </div>
                                        {unit && (
                                            <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-2 border border-line">
                                                {unit}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-2 flex items-baseline gap-2">
                                        <h4 className="m-0 text-base font-bold text-ink">{nameEn}</h4>
                                        {nameKm && <span className="font-khmer text-sm font-medium text-ink-2">({nameKm})</span>}
                                    </div>

                                    {onDrillDown && code && (
                                        <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-line/60">
                                            <button
                                                type="button"
                                                onClick={() => onDrillDown(`/api/admin/item/${code}`, { id: String(code) })}
                                                className="text-[11px] font-medium text-accent hover:underline cursor-pointer"
                                            >
                                                Inspect {tier.level} →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // 4. Detect Administrative Records Array (e.g. list of provinces, districts, communes, search)
    const isList = Array.isArray(body.data);

    if (isList) {
        const items: any[] = body.data;
        const totalCount = body.count ?? items.length;

        const filtered = items.filter((item) => {
            if (!filterText) return true;
            const q = filterText.toLowerCase();
            return (
                String(item.id ?? "").toLowerCase().includes(q) ||
                String(item.code ?? "").toLowerCase().includes(q) ||
                String(item.name_en ?? "").toLowerCase().includes(q) ||
                String(item.name_km ?? "").toLowerCase().includes(q) ||
                String(item.administrative_unit ?? "").toLowerCase().includes(q)
            );
        });

        return (
            <div className="space-y-4">
                {/* Search / Filter toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
                    <div className="flex items-center gap-2">
                        {/* Tab switcher: Table vs Query */}
                        <div className="inline-flex h-8 items-center rounded-lg border border-line bg-surface-2 p-0.5">
                            <button
                                type="button"
                                onClick={() => setSubTab("table")}
                                className={cx(
                                    "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                                    subTab === "table" ? "bg-surface text-ink font-semibold shadow-xs" : "text-ink-3 hover:text-ink"
                                )}
                            >
                                <span>Table</span>
                                <span className="rounded bg-ok/15 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-ok">
                                    {totalCount}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSubTab("query")}
                                className={cx(
                                    "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                                    subTab === "query" ? "bg-surface text-ink font-semibold shadow-xs" : "text-ink-3 hover:text-ink"
                                )}
                            >
                                <Icon name="code" className="size-3.5" />
                                <span>Query</span>
                            </button>
                        </div>

                        {subTab === "table" && (
                            <span className="text-xs text-ink-3">
                                {filtered.length} of {totalCount} shown
                            </span>
                        )}
                    </div>

                    {subTab === "table" && (
                        <div className="relative min-w-50 flex-1 sm:max-w-xs">
                            <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-3" />
                            <input
                                type="text"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                placeholder="Filter records…"
                                className="h-8 w-full rounded-lg border border-line bg-surface-2 pl-8 pr-3 text-xs text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
                            />
                        </div>
                    )}
                </div>

                {/* Sub-tab Content: Query vs Data Table */}
                {subTab === "query" ? (
                    <div className="rounded-xl border border-line bg-surface p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-xs font-bold text-accent">
                                    GET
                                </span>
                                <span className="font-mono text-xs font-semibold text-ink">
                                    {log.path}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-xs text-ink-3">
                                <span className="text-ok font-semibold">{log.status} {log.statusText}</span>
                                <span>·</span>
                                <span>{log.ms.toFixed(2)}ms</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold text-ink-3">
                                <span>cURL</span>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(`curl "https://api.opengeo-cambodia.org${log.path}"`)}
                                    className="cursor-pointer text-[11px] font-mono text-accent hover:underline flex items-center gap-1"
                                >
                                    <Icon name="copy" className="size-3" />
                                    <span>Copy</span>
                                </button>
                            </div>
                            <pre className="m-0 rounded-lg border border-line bg-surface-2 p-3 font-mono text-xs text-ink overflow-x-auto">
                                curl &quot;https://api.opengeo-cambodia.org{log.path}&quot;
                            </pre>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="rounded-lg border border-line bg-surface-2 p-2.5">
                                <div className="font-mono text-[11px] text-ink-3">Request URL</div>
                                <div className="mt-1 font-mono text-xs text-ink truncate select-all">
                                    https://api.opengeo-cambodia.org{log.path}
                                </div>
                            </div>
                            <div className="rounded-lg border border-line bg-surface-2 p-2.5">
                                <div className="font-mono text-[11px] text-ink-3">Accept Header</div>
                                <div className="mt-1 font-mono text-xs text-ink">
                                    application/json
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Data Table */
                    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-line bg-surface-2 text-ink-3">
                                <th className="px-3.5 py-2.5 font-mono font-semibold">ID / Code</th>
                                <th className="px-3.5 py-2.5 font-semibold">Name (English)</th>
                                <th className="px-3.5 py-2.5 font-semibold">Name (Khmer)</th>
                                <th className="px-3.5 py-2.5 font-semibold">Unit</th>
                                <th className="px-3.5 py-2.5 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line/60">
                            {filtered.slice(0, 150).map((row, idx) => {
                                const id = row.id ?? row.code ?? idx;
                                const code = row.code ?? row.id ?? "";
                                const nameEn = row.name_en || row.name || "-";
                                const nameKm = row.name_km || "-";
                                const unit = row.administrative_unit || row.type_km || row.level || "-";
                                const level = row.level;

                                return (
                                    <tr key={id} className="hover:bg-surface-2/60 transition-colors">
                                        <td className="px-3.5 py-2.5 font-mono font-medium text-ink-3">
                                            {code}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-medium text-ink">
                                            {nameEn}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-khmer text-ink-2">
                                            {nameKm}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            <span className={level ? lvl(level) : "rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-3"}>
                                                {unit}
                                            </span>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right">
                                            {onDrillDown && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (level === "province" || !level) {
                                                            onDrillDown(`/api/admin/provinces/${id}/districts`, { id: String(id) });
                                                        } else if (level === "district") {
                                                            onDrillDown(`/api/admin/districts/${id}/communes`, { id: String(id) });
                                                        } else if (level === "commune") {
                                                            onDrillDown(`/api/admin/communes/${id}/villages`, { id: String(id) });
                                                        } else {
                                                            onDrillDown(`/api/admin/hierarchy/${id}`, { id: String(id) });
                                                        }
                                                    }}
                                                    className="cursor-pointer rounded border border-line px-2 py-0.5 text-[11px] font-medium text-accent hover:border-accent"
                                                >
                                                    Drill down
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
        );
    }

    // 5. Detect Single Administrative Item (/api/admin/item/:id)
    const isSingleItem = body.data && typeof body.data === "object" && (body.data.name_en || body.data.name_km);

    if (isSingleItem) {
        const item = body.data;
        const level = item.level;

        return (
            <div className="space-y-4">
                <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
                        <div className="flex items-center gap-2.5">
                            {level && <span className={lvl(level)}>{level}</span>}
                            <span className="font-mono text-sm font-bold text-ink">ID: {item.id}</span>
                            {item.code && <span className="font-mono text-xs text-ink-3">Code: {item.code}</span>}
                        </div>
                        {item.administrative_unit && (
                            <span className="rounded bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink border border-line">
                                {item.administrative_unit}
                            </span>
                        )}
                    </div>

                    <div className="my-4">
                        <h2 className="m-0 text-2xl font-bold text-ink">{item.name_en}</h2>
                        {item.name_km && <p className="m-0 mt-1 font-khmer text-lg text-ink-2">{item.name_km}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-2">
                        {Object.entries(item)
                            .filter(([k]) => !k.startsWith("_") && !["name_en", "name_km"].includes(k))
                            .map(([key, val]) => (
                                <div key={key} className="rounded-lg border border-line bg-surface-2 p-2.5">
                                    <div className="font-mono text-[11px] text-ink-3">{key}</div>
                                    <div className="mt-0.5 font-mono text-xs font-semibold text-ink truncate">
                                        {String(val ?? "-")}
                                    </div>
                                </div>
                            ))}
                    </div>

                    {onDrillDown && (
                        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                            <button
                                type="button"
                                onClick={() => onDrillDown(`/api/admin/hierarchy/${item.id}`, { id: String(item.id) })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:border-line-2 cursor-pointer"
                            >
                                <Icon name="layers" />
                                Resolve Full Hierarchy
                            </button>
                            <button
                                type="button"
                                onClick={() => onDrillDown(`/api/boundaries/item/${item.code || item.id}`, { code: String(item.code || item.id) })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:border-line-2 cursor-pointer"
                            >
                                <Icon name="polygon" />
                                View Boundary Polygon
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 6. Detect System Stats or Health Check
    const isStats =
        (body.data && (body.data.provinces || body.data.districts)) ||
        body.status === "ok" ||
        body.uptime != null;

    if (isStats) {
        const stats = body.data || body;
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {stats.provinces != null && (
                        <div className="rounded-xl border border-line bg-surface p-4 text-center">
                            <div className="font-mono text-2xl font-bold text-accent">{Number(stats.provinces).toLocaleString()}</div>
                            <div className="mt-1 text-xs font-medium text-ink-3">Provinces</div>
                        </div>
                    )}
                    {stats.districts != null && (
                        <div className="rounded-xl border border-line bg-surface p-4 text-center">
                            <div className="font-mono text-2xl font-bold text-water">{Number(stats.districts).toLocaleString()}</div>
                            <div className="mt-1 text-xs font-medium text-ink-3">Districts</div>
                        </div>
                    )}
                    {stats.communes != null && (
                        <div className="rounded-xl border border-line bg-surface p-4 text-center">
                            <div className="font-mono text-2xl font-bold text-warn">{Number(stats.communes).toLocaleString()}</div>
                            <div className="mt-1 text-xs font-medium text-ink-3">Communes</div>
                        </div>
                    )}
                    {stats.villages != null && (
                        <div className="rounded-xl border border-line bg-surface p-4 text-center">
                            <div className="font-mono text-2xl font-bold text-ok">{Number(stats.villages).toLocaleString()}</div>
                            <div className="mt-1 text-xs font-medium text-ink-3">Villages</div>
                        </div>
                    )}
                    {stats.status && (
                        <div className="rounded-xl border border-line bg-surface p-4 text-center">
                            <div className="font-mono text-xl font-bold text-ok uppercase">{stats.status}</div>
                            <div className="mt-1 text-xs font-medium text-ink-3">Status</div>
                        </div>
                    )}
                    {stats.uptime != null && (
                        <div className="rounded-xl border border-line bg-surface p-4 text-center">
                            <div className="font-mono text-xl font-bold text-ink">{Math.round(stats.uptime)} s</div>
                            <div className="mt-1 text-xs font-medium text-ink-3">Uptime</div>
                        </div>
                    )}
                    {stats.version && (
                        <div className="rounded-xl border border-line bg-surface p-4 text-center">
                            <div className="font-mono text-xl font-bold text-ink">{stats.version}</div>
                            <div className="mt-1 text-xs font-medium text-ink-3">Version</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 7. Generic Fallback Key-Value Card
    return (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="border-b border-line bg-surface-2 px-4 py-2.5 text-xs font-semibold text-ink">
                Response Summary
            </div>
            <div className="divide-y divide-line/60 p-4 font-sans text-xs">
                {Object.entries(body).map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-4 py-2">
                        <span className="font-mono font-medium text-ink-3">{k}</span>
                        <span className="font-mono text-ink text-right max-w-sm truncate">
                            {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
