import { useMemo, useState } from "react";
import { PROVINCES, type HeroProvince } from "../home/cambodiaMap";
import { PROVINCE_STATS } from "./provinceStats";

interface AtlasChartProps {
    activeProvinceCode?: string;
    onSelectProvince?: (p: HeroProvince) => void;
}

type ChartRegionFilter = "ALL" | "URBAN" | "COASTAL" | "HIGHLAND";

export function AtlasChart({ activeProvinceCode, onSelectProvince }: AtlasChartProps) {
    const [hovered, setHovered] = useState<HeroProvince | null>(null);
    const [filter, setFilter] = useState<ChartRegionFilter>("ALL");

    const items = useMemo(() => {
        return PROVINCES.map((p) => {
            const stat = PROVINCE_STATS[p.code] || {
                districts: 8,
                communes: 65,
                villages: 500,
                color: "#38bdf8",
                region: "central",
            };
            // Scale districts (4-15) to X (10% to 90%)
            const x = ((stat.districts - 3) / 13) * 100;
            // Scale communes (15-130) to Y (10% to 90%)
            const y = 100 - ((stat.communes - 15) / 115) * 100;
            return {
                province: p,
                stat,
                x,
                y,
            };
        });
    }, []);

    const filteredItems = useMemo(() => {
        if (filter === "ALL") return items;
        return items.filter((it) => {
            if (filter === "URBAN") return it.stat.region === "capital" || it.stat.region === "urban";
            if (filter === "COASTAL") return it.stat.region === "coastal";
            if (filter === "HIGHLAND") return it.stat.region === "highland";
            return true;
        });
    }, [items, filter]);

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d121d]/90 p-3 shadow-2xl backdrop-blur-xl">
            {/* Header: Title & Filter Tabs */}
            <div className="mb-2 flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    Density Matrix
                </span>

                <div className="flex items-center gap-1 font-mono text-[8.5px]">
                    {(["ALL", "URBAN", "COASTAL", "HIGHLAND"] as ChartRegionFilter[]).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            className={`rounded px-1.5 py-0.5 uppercase cursor-pointer transition-colors ${
                                filter === f
                                    ? "bg-white/20 text-white font-bold"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2D Coordinate Grid Canvas */}
            <div className="relative h-44 w-full rounded-xl border border-white/5 bg-[#080b12]/90 p-2 overflow-hidden">
                {/* Horizontal Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none opacity-20">
                    <div className="border-b border-cyan-500/40 w-full" />
                    <div className="border-b border-cyan-500/40 w-full" />
                    <div className="border-b border-cyan-500/40 w-full" />
                    <div className="border-b border-cyan-500/40 w-full" />
                </div>
                {/* Vertical Grid Lines */}
                <div className="absolute inset-0 flex justify-between p-3 pointer-events-none opacity-20">
                    <div className="border-r border-cyan-500/40 h-full" />
                    <div className="border-r border-cyan-500/40 h-full" />
                    <div className="border-r border-cyan-500/40 h-full" />
                    <div className="border-r border-cyan-500/40 h-full" />
                </div>

                {/* Axis Labels */}
                <span className="absolute left-1.5 top-1 font-mono text-[8px] text-slate-500">130 Communes</span>
                <span className="absolute left-1.5 bottom-1 font-mono text-[8px] text-slate-500">15</span>
                <span className="absolute right-2 bottom-1 font-mono text-[8px] text-slate-500">15 Districts</span>

                {/* Plotted Scatter Nodes */}
                <div className="relative h-full w-full">
                    {filteredItems.map(({ province, stat, x, y }) => {
                        const isActive = activeProvinceCode === province.code;
                        const isHover = hovered?.code === province.code;
                        return (
                            <button
                                key={province.code}
                                type="button"
                                onClick={() => onSelectProvince?.(province)}
                                onMouseEnter={() => setHovered(province)}
                                onMouseLeave={() => setHovered(null)}
                                style={{
                                    left: `${x}%`,
                                    top: `${y}%`,
                                    backgroundColor: stat.color,
                                    borderColor: isActive || isHover ? "#ffffff" : "transparent",
                                }}
                                className={`absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border cursor-pointer transition-all ${
                                    isActive
                                        ? "size-4.5 ring-4 ring-rose-500/60 z-20 shadow-[0_0_12px_#f43f5e]"
                                        : isHover
                                        ? "size-4 ring-2 ring-white/60 z-10"
                                        : "opacity-80 hover:opacity-100"
                                }`}
                                title={`${province.en} (${province.km}): ${stat.districts} Districts, ${stat.communes} Communes`}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Micro Hover Caption or Legend */}
            <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-slate-400">
                {hovered ? (
                    <span className="text-cyan-300 font-bold truncate">
                        {hovered.en}: {PROVINCE_STATS[hovered.code]?.districts}D / {PROVINCE_STATS[hovered.code]?.communes}C
                    </span>
                ) : (
                    <span className="text-slate-500">
                        {filteredItems.length} of 25 Nodes Shown
                    </span>
                )}
                <span className="text-[8.5px] text-slate-500">
                    Click dot to inspect
                </span>
            </div>
        </div>
    );
}
