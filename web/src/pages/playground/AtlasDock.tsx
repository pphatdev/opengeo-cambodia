import { Icon } from "../../components/Icon";
import { cx } from "../../components/ui";

export type AtlasActivePanel = "none" | "endpoints" | "params" | "raw" | "table" | "presets";

interface AtlasDockProps {
    activePanel: AtlasActivePanel;
    onTogglePanel: (panel: AtlasActivePanel) => void;
    onExecute: () => void;
    pending?: boolean;
    networkEnabled?: boolean;
    onToggleNetwork?: () => void;
    lang: "en" | "km";
    onToggleLang: () => void;
    theme: string;
    onToggleTheme: () => void;
}

export function AtlasDock({
    activePanel,
    onTogglePanel,
    onExecute,
    pending,
    networkEnabled,
    onToggleNetwork,
    lang,
    onToggleLang,
    theme,
    onToggleTheme,
}: AtlasDockProps) {
    return (
        <aside
            aria-label="Atlas Command Dock"
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#0d121d]/85 p-2 shadow-2xl backdrop-blur-xl"
        >
            {/* Top Brand Mark */}
            <div
                className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-rose-500 shadow-[0_0_15px_rgba(6,182,212,0.4)] text-white font-display font-black text-xs"
                title="OpenGeo Cambodia Atlas"
            >
                OG
            </div>

            <div className="h-px w-6 bg-white/10 my-1" />

            {/* Run / Execute Button (Rocket / Lightning) */}
            <button
                type="button"
                onClick={onExecute}
                disabled={pending}
                title="Execute Request (Cmd + Enter)"
                className={cx(
                    "group relative flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer",
                    pending
                        ? "bg-rose-500/20 text-rose-300 animate-pulse"
                        : "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] hover:scale-105 hover:bg-rose-400",
                )}
            >
                <Icon name="play" className="size-3.5" />
                <span className="absolute left-full ml-3 hidden rounded-md bg-[#0b101c] border border-white/10 px-2 py-1 text-[11px] font-mono text-white whitespace-nowrap group-hover:block z-50">
                    Run API Request (Cmd+Enter)
                </span>
            </button>

            {/* Endpoints Selector Button */}
            <button
                type="button"
                onClick={() => onTogglePanel(activePanel === "endpoints" ? "none" : "endpoints")}
                title="Browse Endpoints"
                className={cx(
                    "group relative flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer",
                    activePanel === "endpoints"
                        ? "bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                        : "text-slate-400 hover:bg-white/10 hover:text-white",
                )}
            >
                <Icon name="layers" className="size-4" />
                <span className="absolute left-full ml-3 hidden rounded-md bg-[#0b101c] border border-white/10 px-2 py-1 text-[11px] font-mono text-white whitespace-nowrap group-hover:block z-50">
                    Endpoints Catalog
                </span>
            </button>

            {/* Request Parameters Console */}
            <button
                type="button"
                onClick={() => onTogglePanel(activePanel === "params" ? "none" : "params")}
                title="Tune Parameters"
                className={cx(
                    "group relative flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer",
                    activePanel === "params"
                        ? "bg-purple-500/30 text-purple-300 border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                        : "text-slate-400 hover:bg-white/10 hover:text-white",
                )}
            >
                <Icon name="key" className="size-4" />
                <span className="absolute left-full ml-3 hidden rounded-md bg-[#0b101c] border border-white/10 px-2 py-1 text-[11px] font-mono text-white whitespace-nowrap group-hover:block z-50">
                    Query Parameters
                </span>
            </button>

            {/* Network Arcs Toggle */}
            {onToggleNetwork && (
                <button
                    type="button"
                    onClick={onToggleNetwork}
                    title="Toggle Orbital Lines"
                    className={cx(
                        "group relative flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer",
                        networkEnabled
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "text-slate-400 hover:bg-white/10 hover:text-white",
                    )}
                >
                    <span className="text-sm">🌐</span>
                    <span className="absolute left-full ml-3 hidden rounded-md bg-[#0b101c] border border-white/10 px-2 py-1 text-[11px] font-mono text-white whitespace-nowrap group-hover:block z-50">
                        {networkEnabled ? "Hide Orbital Arcs" : "Show Orbital Arcs"}
                    </span>
                </button>
            )}

            {/* Raw JSON Modal Trigger */}
            <button
                type="button"
                onClick={() => onTogglePanel(activePanel === "raw" ? "none" : "raw")}
                title="Inspect Raw JSON"
                className={cx(
                    "group relative flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer",
                    activePanel === "raw"
                        ? "bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                        : "text-slate-400 hover:bg-white/10 hover:text-white",
                )}
            >
                <Icon name="code" className="size-4" />
                <span className="absolute left-full ml-3 hidden rounded-md bg-[#0b101c] border border-white/10 px-2 py-1 text-[11px] font-mono text-white whitespace-nowrap group-hover:block z-50">
                    Raw JSON Inspector
                </span>
            </button>

            {/* Data Table Modal Trigger */}
            <button
                type="button"
                onClick={() => onTogglePanel(activePanel === "table" ? "none" : "table")}
                title="Inspect Data Table"
                className={cx(
                    "group relative flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer",
                    activePanel === "table"
                        ? "bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                        : "text-slate-400 hover:bg-white/10 hover:text-white",
                )}
            >
                <Icon name="table" className="size-4" />
                <span className="absolute left-full ml-3 hidden rounded-md bg-[#0b101c] border border-white/10 px-2 py-1 text-[11px] font-mono text-white whitespace-nowrap group-hover:block z-50">
                    Data Table Inspector
                </span>
            </button>

            {/* Presets Trigger */}
            <button
                type="button"
                onClick={() => onTogglePanel(activePanel === "presets" ? "none" : "presets")}
                title="Quick Presets"
                className={cx(
                    "group relative flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer",
                    activePanel === "presets"
                        ? "bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                        : "text-slate-400 hover:bg-white/10 hover:text-white",
                )}
            >
                <Icon name="sparkles" className="size-4" />
                <span className="absolute left-full ml-3 hidden rounded-md bg-[#0b101c] border border-white/10 px-2 py-1 text-[11px] font-mono text-white whitespace-nowrap group-hover:block z-50">
                    Quick Presets
                </span>
            </button>

            <div className="h-px w-6 bg-white/10 my-1" />

            {/* Docs Link */}
            <a
                href="/docs"
                title="Documentation"
                className="group relative flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            >
                <Icon name="book" className="size-4" />
                <span className="absolute left-full ml-3 hidden rounded-md bg-[#0b101c] border border-white/10 px-2 py-1 text-[11px] font-mono text-white whitespace-nowrap group-hover:block z-50">
                    API Docs
                </span>
            </a>

            {/* Language Toggle (EN / KM) */}
            <button
                type="button"
                onClick={onToggleLang}
                title="Toggle Language"
                className="group relative flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer font-mono text-xs font-bold"
            >
                {lang === "km" ? "ខ្មែរ" : "EN"}
                <span className="absolute left-full ml-3 hidden rounded-md bg-[#0b101c] border border-white/10 px-2 py-1 text-[11px] font-mono text-white whitespace-nowrap group-hover:block z-50">
                    Switch to {lang === "km" ? "English" : "Khmer"}
                </span>
            </button>

            {/* Theme Toggle */}
            <button
                type="button"
                onClick={onToggleTheme}
                title="Toggle Theme"
                className="group relative flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
                <Icon name={theme === "dark" ? "sun" : "moon"} className="size-4" />
                <span className="absolute left-full ml-3 hidden rounded-md bg-[#0b101c] border border-white/10 px-2 py-1 text-[11px] font-mono text-white whitespace-nowrap group-hover:block z-50">
                    Toggle Color Scheme
                </span>
            </button>
        </aside>
    );
}
