import { useState, useMemo } from "react";
import { lvl } from "../../components/ui";

export interface PlaceChipItem {
    id: string | number;
    code: string;
    name_en: string;
    name_km?: string;
    level?: string;
    province_code?: string;
    district_code?: string;
    commune_code?: string;
}

interface AtlasPlaceChipsProps {
    items: PlaceChipItem[];
    activeCode?: string;
    onSelectPlace: (item: PlaceChipItem) => void;
    onDrillDown?: (path: string, params?: Record<string, string>) => void;
}

export function AtlasPlaceChips({
    items,
    activeCode,
    onSelectPlace,
    onDrillDown,
}: AtlasPlaceChipsProps) {
    const [filterQuery, setFilterQuery] = useState("");
    const [collapsed, setCollapsed] = useState(false);

    const filtered = useMemo(() => {
        if (!filterQuery.trim()) return items;
        const q = filterQuery.toLowerCase().trim();
        return items.filter(
            (it) =>
                it.name_en.toLowerCase().includes(q) ||
                (it.name_km && it.name_km.includes(q)) ||
                it.code.includes(q),
        );
    }, [items, filterQuery]);

    if (!items || items.length === 0) return null;

    const firstLevel = items[0]?.level || "item";

    return (
        <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d121d]/90 p-2.5 shadow-2xl backdrop-blur-xl">
            {/* Top Toolbar */}
            <div className="mb-2 flex items-center justify-between gap-3 px-1 text-xs">
                <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-white">
                        Response Places ({items.length})
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-[9px] uppercase text-cyan-300">
                        {firstLevel}s
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mini inline search */}
                    {items.length > 5 && (
                        <div className="relative">
                            <input
                                type="text"
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                placeholder="Filter places..."
                                className="h-6 w-28 rounded-lg border border-white/10 bg-[#080b13] px-2 font-mono text-[10px] text-white placeholder:text-slate-500 focus:w-40 focus:border-cyan-400 transition-all focus:outline-none"
                            />
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setCollapsed((c) => !c)}
                        title={collapsed ? "Expand place chips" : "Collapse place chips"}
                        className="flex size-6 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-xs"
                    >
                        {collapsed ? "▲" : "▼"}
                    </button>
                </div>
            </div>

            {/* Chips Scroll Strip */}
            {!collapsed && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {filtered.map((item) => {
                        const isSelected = activeCode === String(item.code) || activeCode === String(item.id);
                        return (
                            <div
                                key={String(item.code || item.id)}
                                className={`shrink-0 flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs transition-all ${
                                    isSelected
                                        ? "border-rose-400/80 bg-rose-500/20 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)] font-bold"
                                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 text-slate-200"
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelectPlace(item)}
                                    className="flex items-center gap-1.5 cursor-pointer text-left"
                                >
                                    {item.level && <span className={lvl(item.level)}>{item.level}</span>}
                                    <span className="font-sans text-xs">{item.name_en}</span>
                                    {item.name_km && (
                                        <span className="font-khmer text-slate-400 text-[11px] font-normal">
                                            ({item.name_km})
                                        </span>
                                    )}
                                    <span className="font-mono text-[10px] text-slate-500">#{item.code}</span>
                                </button>

                                {/* Drill down arrow button if applicable */}
                                {onDrillDown && item.level === "province" && (
                                    <button
                                        type="button"
                                        onClick={() => onDrillDown(`/api/admin/provinces/${item.id}/districts`, { id: String(item.id) })}
                                        title={`Explore districts of ${item.name_en}`}
                                        className="ml-1 rounded px-1 text-[10px] text-cyan-400 hover:bg-cyan-500/20 cursor-pointer"
                                    >
                                        →
                                    </button>
                                )}
                                {onDrillDown && item.level === "district" && (
                                    <button
                                        type="button"
                                        onClick={() => onDrillDown(`/api/admin/districts/${item.code || item.id}/communes`, { id: String(item.code || item.id) })}
                                        title={`Explore communes of ${item.name_en}`}
                                        className="ml-1 rounded px-1 text-[10px] text-cyan-400 hover:bg-cyan-500/20 cursor-pointer"
                                    >
                                        →
                                    </button>
                                )}
                                {onDrillDown && item.level === "commune" && (
                                    <button
                                        type="button"
                                        onClick={() => onDrillDown(`/api/admin/communes/${item.code || item.id}/villages`, { id: String(item.code || item.id) })}
                                        title={`Explore villages of ${item.name_en}`}
                                        className="ml-1 rounded px-1 text-[10px] text-cyan-400 hover:bg-cyan-500/20 cursor-pointer"
                                    >
                                        →
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
