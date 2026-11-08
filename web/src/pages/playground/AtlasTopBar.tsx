import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { fmtBytes, type RequestLog } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { type AtlasActivePanel } from "./AtlasDrawers";

export type AtlasCategory = "ALL" | "ADMIN" | "BOUNDARIES" | "GEOCODE" | "SYSTEM";

interface AtlasTopBarProps {
    category: AtlasCategory;
    onSelectCategory: (cat: AtlasCategory) => void;
    log?: RequestLog | null;
    customUrl: string;
    viewMode: "atlas" | "classic";
    onToggleViewMode: () => void;
    activePanel: AtlasActivePanel;
    onTogglePanel: (panel: AtlasActivePanel) => void;
    lang: "en" | "km";
    onToggleLang: () => void;
    theme: string;
    onToggleTheme: () => void;
    autoTour?: boolean;
    onToggleAutoTour?: () => void;
    itemCount?: number;
}

const CATEGORY_COUNTS: Record<AtlasCategory, number> = {
    ALL: 23,
    ADMIN: 7,
    BOUNDARIES: 5,
    GEOCODE: 2,
    SYSTEM: 3,
};

export function AtlasTopBar({
    category,
    onSelectCategory,
    log,
    customUrl,
    viewMode,
    onToggleViewMode,
    activePanel,
    onTogglePanel,
    lang,
    onToggleLang,
    theme,
    onToggleTheme,
    autoTour = false,
    onToggleAutoTour,
    itemCount,
}: AtlasTopBarProps) {
    const { copy, toast } = useToast();
    const [copiedCurl, setCopiedCurl] = useState(false);

    const latency = log ? `${log.ms.toFixed(1)}ms` : "0.2ms";
    const status = log ? `${log.status} ${log.statusText || "OK"}` : "200 OK";
    const payloadSize = log?.size ? fmtBytes(log.size) : null;

    const handleCopyCurl = () => {
        const fullUrl = `https://opengeo-cambodia.pphat.me${customUrl.startsWith("/") ? customUrl : `/${customUrl}`}`;
        copy(`curl "${fullUrl}"`);
        setCopiedCurl(true);
        toast("cURL command copied");
        setTimeout(() => setCopiedCurl(false), 2000);
    };

    return (
        <header
            aria-label="Atlas Command Header"
            className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#07090e]/90 px-4 py-2.5 backdrop-blur-2xl z-40 shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
        >
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent pointer-events-none" />

            {/* Left: Brand, Title & Live Status */}
            <div className="flex items-center gap-3">
                <Link
                    to="/"
                    title="Back to OpenGeo Cambodia Home"
                    className="flex items-center gap-2.5 no-underline group"
                >
                    <div className="relative">
                        <img
                            src="/logo.jpg"
                            alt="OpenGeo"
                            className="size-7 rounded-lg object-cover ring-1 ring-cyan-500/40 group-hover:ring-cyan-400 group-hover:scale-105 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-[#07090e]" />
                    </div>

                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-display text-sm font-extrabold tracking-wider text-white uppercase group-hover:text-cyan-300 transition-colors">
                                Atlas Control
                            </span>
                            <span className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.2 font-mono text-[9px] font-bold text-cyan-300">
                                v1.3
                            </span>
                        </div>
                        <div className="font-mono text-[9.5px] text-slate-400 tracking-wider hidden sm:block">
                            OPENGEO // SPATIAL OS
                        </div>
                    </div>
                </Link>

                <div className="h-5 w-px bg-white/10 hidden md:block" />

                {/* Command Palette Trigger (Cmd+K) */}
                <button
                    type="button"
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent("open-endpoint-selector"));
                    }}
                    title="Search endpoints & places (Cmd + K)"
                    className="hidden md:flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d121d] px-3 py-1.5 text-xs text-slate-400 hover:border-cyan-400/50 hover:text-white transition-all cursor-pointer shadow-inner group"
                >
                    <Icon name="search" className="size-3 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="font-sans text-[11px]">Search endpoints...</span>
                    <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.2 font-mono text-[9px] text-slate-300">
                        ⌘K
                    </kbd>
                </button>
            </div>

            {/* Center: Category Filter Pills */}
            <nav
                aria-label="Endpoint Categories"
                className="flex items-center rounded-xl border border-white/10 bg-[#0d121d]/90 p-1 shadow-inner overflow-x-auto scrollbar-none"
            >
                {(["ALL", "ADMIN", "BOUNDARIES", "GEOCODE", "SYSTEM"] as AtlasCategory[]).map((cat) => {
                    const isActive = category === cat;
                    const count = CATEGORY_COUNTS[cat];
                    return (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => onSelectCategory(cat)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                                isActive
                                    ? "bg-white/15 text-white shadow-sm border border-white/10 font-bold"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <span>{cat}</span>
                            <span
                                className={`rounded px-1 text-[9px] ${
                                    isActive ? "bg-cyan-500/30 text-cyan-300 font-bold" : "text-slate-500"
                                }`}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* Right: Auto-Tour, Drawers, Telemetry & Controls */}
            <div className="flex items-center gap-2 font-mono text-xs">
                {/* Auto-Tour / Orbit Toggle Button */}
                {onToggleAutoTour && (
                    <button
                        type="button"
                        onClick={onToggleAutoTour}
                        title={autoTour ? "Pause Cambodia Tour" : "Start Auto-Tour Cambodia"}
                        className={`hidden lg:inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                            autoTour
                                ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] animate-pulse"
                                : "border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                        }`}
                    >
                        <span className={`text-xs ${autoTour ? "animate-spin" : ""}`}>🌐</span>
                        <span>{autoTour ? "Orbiting" : "Tour"}</span>
                    </button>
                )}

                {/* Quick Inspection Triggers */}
                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                    <button
                        type="button"
                        onClick={() => onTogglePanel(activePanel === "raw" ? "none" : "raw")}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium cursor-pointer transition-colors ${
                            activePanel === "raw"
                                ? "bg-cyan-500/30 text-cyan-300 font-bold shadow-sm"
                                : "text-slate-300 hover:text-white"
                        }`}
                        title="View Raw JSON payload"
                    >
                        <Icon name="code" className="size-3" />
                        <span>JSON</span>
                        {payloadSize && (
                            <span className="ml-0.5 rounded bg-white/10 px-1 text-[9px] text-cyan-400">
                                {payloadSize}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => onTogglePanel(activePanel === "table" ? "none" : "table")}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium cursor-pointer transition-colors ${
                            activePanel === "table"
                                ? "bg-cyan-500/30 text-cyan-300 font-bold shadow-sm"
                                : "text-slate-300 hover:text-white"
                        }`}
                        title="View Data Table"
                    >
                        <Icon name="table" className="size-3" />
                        <span>Table</span>
                        {itemCount != null && itemCount > 0 && (
                            <span className="ml-0.5 rounded bg-white/10 px-1 text-[9px] text-emerald-400">
                                {itemCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => onTogglePanel(activePanel === "presets" ? "none" : "presets")}
                        className={`hidden sm:inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium cursor-pointer transition-colors ${
                            activePanel === "presets"
                                ? "bg-amber-500/30 text-amber-300 font-bold shadow-sm"
                                : "text-slate-300 hover:text-white"
                        }`}
                        title="Quick Presets"
                    >
                        <Icon name="sparkles" className="size-3 text-amber-400" />
                        <span>Presets</span>
                    </button>
                </div>

                {/* Telemetry pill */}
                <div className="hidden xl:flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-slate-300">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-slate-400">LATENCY:</span>
                    <span className="font-bold text-cyan-300">{latency}</span>
                    <span className="text-slate-600">·</span>
                    <span className="font-bold text-emerald-400">{status}</span>
                </div>

                {/* Quick Copy cURL Button */}
                <button
                    type="button"
                    onClick={handleCopyCurl}
                    title="Copy cURL command for this request"
                    className="inline-flex size-7.5 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                    {copiedCurl ? (
                        <Icon name="check" className="size-3.5 text-emerald-400" />
                    ) : (
                        <Icon name="copy" className="size-3.5" />
                    )}
                </button>

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
                    className="hidden sm:inline-flex h-7.5 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors no-underline"
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
                    <span className="hidden sm:inline">{viewMode === "atlas" ? "Classic" : "Atlas"}</span>
                </button>
            </div>
        </header>
    );
}
