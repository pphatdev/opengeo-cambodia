import { Icon } from "../../components/Icon";
import { type RequestLog } from "../../lib/api";

export type AtlasCategory = "ALL" | "ADMIN" | "BOUNDARIES" | "GEOCODE" | "SYSTEM";

interface AtlasTopBarProps {
    category: AtlasCategory;
    onSelectCategory: (cat: AtlasCategory) => void;
    log?: RequestLog | null;
    viewMode: "atlas" | "classic";
    onToggleViewMode: () => void;
}

export function AtlasTopBar({
    category,
    onSelectCategory,
    log,
    viewMode,
    onToggleViewMode,
}: AtlasTopBarProps) {
    const latency = log ? `${log.ms.toFixed(1)}ms` : "0.2ms";
    const status = log ? `${log.status} ${log.statusText || "OK"}` : "200 OK";

    return (
        <header
            aria-label="Atlas Command Header"
            className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#07090e]/90 px-6 py-3.5 backdrop-blur-xl"
        >
            {/* Left: Branding & Matrix Icon */}
            <div className="flex items-center gap-3">
                {/* 6-dot matrix icon */}
                <div className="grid grid-cols-3 gap-1 size-5 p-0.5 text-cyan-400 opacity-80" aria-hidden="true">
                    <span className="size-1 rounded-full bg-cyan-400" />
                    <span className="size-1 rounded-full bg-cyan-400" />
                    <span className="size-1 rounded-full bg-cyan-400" />
                    <span className="size-1 rounded-full bg-cyan-400" />
                    <span className="size-1 rounded-full bg-cyan-400" />
                    <span className="size-1 rounded-full bg-cyan-400" />
                </div>

                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-extrabold tracking-widest text-white uppercase">
                            Atlas Control
                        </span>
                        <span className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.2 font-mono text-[9px] font-bold text-cyan-300">
                            v1.3
                        </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 tracking-wider">
                        CAMBODIA ADMINISTRATIVE & SPATIAL API
                    </div>
                </div>
            </div>

            {/* Center: Category Filter Pills (matching ALL, EARTH, ORBITAL, LUNAR in image) */}
            <nav aria-label="Endpoint Categories" className="flex items-center rounded-xl border border-white/10 bg-[#0d121d]/90 p-1 shadow-inner">
                {(["ALL", "ADMIN", "BOUNDARIES", "GEOCODE", "SYSTEM"] as AtlasCategory[]).map((cat) => {
                    const isActive = category === cat;
                    return (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => onSelectCategory(cat)}
                            className={`rounded-lg px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                                isActive
                                    ? "bg-white/15 text-white shadow-sm border border-white/10 font-bold"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            {cat}
                        </button>
                    );
                })}
            </nav>

            {/* Right: Telemetry & Controls */}
            <div className="flex items-center gap-3 font-mono text-xs">
                {/* Sun-Exposed / Shadow / Latency pill */}
                <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-slate-300">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-slate-400">LATENCY:</span>
                    <span className="font-bold text-cyan-300">{latency}</span>
                    <span className="text-slate-600">·</span>
                    <span className="font-bold text-emerald-400">{status}</span>
                </div>

                {/* View Switch: Atlas vs Classic */}
                <button
                    type="button"
                    onClick={onToggleViewMode}
                    title="Switch to Classic console view"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                    <Icon name="layers" className="size-3 text-cyan-400" />
                    <span>{viewMode === "atlas" ? "Classic" : "Atlas"}</span>
                </button>

                {/* Home / Docs Link */}
                <a
                    href="/"
                    title="Back to OpenGeo Home"
                    className="inline-flex size-7.5 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                    <Icon name="ext" className="size-3.5" />
                </a>
            </div>
        </header>
    );
}
