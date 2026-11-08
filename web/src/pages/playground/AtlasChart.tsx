import { useMemo, useState } from "react";
import { PROVINCES, type HeroProvince } from "../home/cambodiaMap";

interface AtlasChartProps {
    activeProvinceCode?: string;
    onSelectProvince?: (p: HeroProvince) => void;
}

// Approximate districts & communes count per province for spatial telemetry scatter
const PROVINCE_STATS: Record<string, { districts: number; communes: number; color: string }> = {
    "01": { districts: 9, communes: 65, color: "#06b6d4" },
    "02": { districts: 14, communes: 103, color: "#3b82f6" },
    "03": { districts: 10, communes: 109, color: "#10b981" },
    "04": { districts: 8, communes: 71, color: "#f59e0b" },
    "05": { districts: 8, communes: 125, color: "#8b5cf6" },
    "06": { districts: 8, communes: 81, color: "#ec4899" },
    "07": { districts: 9, communes: 88, color: "#06b6d4" },
    "08": { districts: 13, communes: 127, color: "#3b82f6" },
    "09": { districts: 5, communes: 55, color: "#10b981" },
    "10": { districts: 6, communes: 37, color: "#f59e0b" },
    "11": { districts: 5, communes: 43, color: "#8b5cf6" },
    "12": { districts: 14, communes: 105, color: "#f43f5e" }, // Phnom Penh
    "13": { districts: 5, communes: 50, color: "#06b6d4" },
    "14": { districts: 8, communes: 66, color: "#3b82f6" },
    "15": { districts: 7, communes: 69, color: "#10b981" },
    "16": { districts: 6, communes: 46, color: "#f59e0b" },
    "17": { districts: 12, communes: 100, color: "#f43f5e" }, // Siem Reap
    "18": { districts: 5, communes: 29, color: "#8b5cf6" }, // Preah Sihanouk
    "19": { districts: 5, communes: 49, color: "#ec4899" },
    "20": { districts: 9, communes: 75, color: "#06b6d4" },
    "21": { districts: 10, communes: 116, color: "#3b82f6" },
    "22": { districts: 5, communes: 36, color: "#10b981" },
    "23": { districts: 4, communes: 18, color: "#f59e0b" },
    "24": { districts: 7, communes: 65, color: "#8b5cf6" },
    "25": { districts: 8, communes: 84, color: "#ec4899" },
};

export function AtlasChart({ activeProvinceCode, onSelectProvince }: AtlasChartProps) {
    const [hovered, setHovered] = useState<HeroProvince | null>(null);

    const items = useMemo(() => {
        return PROVINCES.map((p) => {
            const stat = PROVINCE_STATS[p.code] || { districts: 8, communes: 65, color: "#38bdf8" };
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

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d121d]/85 p-3.5 shadow-2xl backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Administrative Density Matrix
                </span>
                <span className="font-mono text-[10px] text-cyan-400">
                    {hovered ? `${hovered.en} · ${PROVINCE_STATS[hovered.code]?.districts}D / ${PROVINCE_STATS[hovered.code]?.communes}C` : "25 Nodes Mapped"}
                </span>
            </div>

            {/* 2D Coordinate Grid Canvas */}
            <div className="relative h-44 w-full rounded-xl border border-white/5 bg-[#080b12]/90 p-2">
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
                    {items.map(({ province, stat, x, y }) => {
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
                                        ? "size-4.5 ring-4 ring-rose-500/50 z-20 shadow-[0_0_12px_#f43f5e]"
                                        : isHover
                                        ? "size-4 ring-2 ring-white/50 z-10"
                                        : "opacity-80 hover:opacity-100"
                                }`}
                                title={`${province.en} (${province.km}): ${stat.districts} Districts, ${stat.communes} Communes`}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Micro Legend */}
            <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-rose-500" /> Capital / Urban
                </span>
                <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-cyan-400" /> Coastal / River
                </span>
                <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> Highland
                </span>
            </div>
        </div>
    );
}
