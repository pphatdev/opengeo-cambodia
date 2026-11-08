import { Icon } from "../../components/Icon";
import { type RequestLog } from "../../lib/api";
import { type AtlasActivePanel } from "./AtlasDrawers";

export type AtlasCategory = "ALL" | "ADMIN" | "BOUNDARIES" | "GEOCODE" | "SYSTEM";

interface AtlasTopBarProps {
    category: AtlasCategory;
    onSelectCategory: (cat: AtlasCategory) => void;
    log?: RequestLog | null;
    viewMode: "atlas" | "classic";
    onToggleViewMode: () => void;
    activePanel: AtlasActivePanel;
    onTogglePanel: (panel: AtlasActivePanel) => void;
    lang: "en" | "km";
    onToggleLang: () => void;
    theme: string;
    onToggleTheme: () => void;
}

export function AtlasTopBar({
    category,
    onSelectCategory,
    log,
    viewMode,
    onToggleViewMode,
    activePanel,
    onTogglePanel,
    lang,
    onToggleLang,
    theme,
    onToggleTheme,
}: AtlasTopBarProps) {
    const latency = log ? `${log.ms.toFixed(1)}ms` : "0.2ms";
    const status = log ? `${log.status} ${log.statusText || "OK"}` : "200 OK";

    return (
        <header
            aria-label="Atlas Command Header"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#07090e]/95 px-5 py-3 backdrop-blur-xl z-40"
        >
            {/* Left: Branding & Matrix Icon */}
            <div className="flex items-center gap-3">
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
                    <div className="font-mono text-[10px] text-slate-400 tracking-wider hidden sm:block">
                        CAMBODIA ADMINISTRATIVE & SPATIAL API
                    </div>
                </div>
            </div>

            {/* Center: Category Filter Pills */}
            <nav aria-label="Endpoint Categories" className="flex items-center rounded-xl border border-white/10 bg-[#0d121d]/90 p-1 shadow-inner">
                {(["ALL", "ADMIN", "BOUNDARIES", "GEOCODE", "SYSTEM"] as AtlasCategory[]).map((cat) => {
                    const isActive = category === cat;
                    return (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => onSelectCategory(cat)}
                            className={`rounded-lg px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
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

            {/* Right: Drawer Triggers, Telemetry & Controls */}
            <div className="flex items-center gap-2 font-mono text-xs">
                {/* Quick Inspection Triggers */}
                <div className="hidden md:flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                    <button
                        type="button"
                        onClick={() => onTogglePanel(activePanel === "raw" ? "none" : "raw")}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                            activePanel === "raw" ? "bg-cyan-500/30 text-cyan-300 font-bold" : "text-slate-300 hover:text-white"
                        }`}
                        title="View Raw JSON payload"
                    >
                        <Icon name="code" className="size-3" />
                        <span>JSON</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onTogglePanel(activePanel === "table" ? "none" : "table")}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                            activePanel === "table" ? "bg-cyan-500/30 text-cyan-300 font-bold" : "text-slate-300 hover:text-white"
                        }`}
                        title="View Data Table"
                    >
                        <Icon name="table" className="size-3" />
                        <span>Table</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onTogglePanel(activePanel === "presets" ? "none" : "presets")}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                            activePanel === "presets" ? "bg-amber-500/30 text-amber-300 font-bold" : "text-slate-300 hover:text-white"
                        }`}
                        title="Quick Presets"
                    >
                        <Icon name="sparkles" className="size-3 text-amber-400" />
                        <span>Presets</span>
                    </button>
                </div>

                {/* Telemetry pill */}
                <div className="hidden lg:flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-slate-300">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-slate-400">LATENCY:</span>
                    <span className="font-bold text-cyan-300">{latency}</span>
                    <span className="text-slate-600">·</span>
                    <span className="font-bold text-emerald-400">{status}</span>
                </div>

                {/* Language Switch */}
                <button
                    type="button"
                    onClick={onToggleLang}
                    title="Toggle Language (Khmer / English)"
                    className="inline-flex h-7.5 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                    {lang === "km" ? "ខ្មែរ" : "EN"}
                </button>

                {/* Theme Toggle */}
                <button
                    type="button"
                    onClick={onToggleTheme}
                    title="Toggle Theme"
                    className="inline-flex size-7.5 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                    <Icon name={theme === "dark" ? "sun" : "moon"} className="size-3.5" />
                </button>

                {/* Docs Link */}
                <a
                    href="/docs"
                    title="API Documentation"
                    className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors no-underline"
                >
                    <Icon name="book" className="size-3" />
                    <span>Docs</span>
                </a>

                {/* View Switch: Atlas vs Classic */}
                <button
                    type="button"
                    onClick={onToggleViewMode}
                    title="Switch to Classic console view"
                    className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 text-xs text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                >
                    <Icon name="layers" className="size-3" />
                    <span>{viewMode === "atlas" ? "Classic" : "Atlas"}</span>
                </button>
            </div>
        </header>
    );
}
