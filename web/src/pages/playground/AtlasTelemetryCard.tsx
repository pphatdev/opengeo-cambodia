import { useState } from "react";
import { Icon } from "../../components/Icon";
import { fmtBytes, type RequestLog } from "../../lib/api";
import { PlaygroundRawPreview } from "./PlaygroundRawPreview";
import { PlaygroundUiPreview } from "./PlaygroundUiPreview";
import { PRESETS, type PlaygroundPreset } from "./presets";

interface AtlasTelemetryCardProps {
    log?: RequestLog | null;
    pending?: boolean;
    customUrl: string;
    onApplyPreset: (preset: PlaygroundPreset) => void;
    onDrillDown?: (path: string, params?: Record<string, string>) => void;
    onExpandDrawer?: (panel: "raw" | "table" | "presets") => void;
}

type TelemetryTab = "raw" | "table" | "presets";

export function AtlasTelemetryCard({
    log,
    pending,
    customUrl,
    onApplyPreset,
    onDrillDown,
    onExpandDrawer,
}: AtlasTelemetryCardProps) {
    const [activeTab, setActiveTab] = useState<TelemetryTab>("raw");

    const latency = log ? `${log.ms.toFixed(1)}ms` : "0.2ms";
    const status = log ? `${log.status} ${log.statusText || "OK"}` : "200 OK";
    const isOk = !log || log.status < 400;

    return (
        <div className="flex flex-col h-full rounded-2xl border border-white/10 bg-[#0d121d]/90 p-3.5 shadow-2xl backdrop-blur-xl overflow-hidden space-y-3">
            {/* Header: Title & Telemetry Metrics */}
            <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
                <div>
                    <h3 className="m-0 font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-300">
                        Response Telemetry
                    </h3>
                    <div className="font-mono text-[9px] text-slate-500">
                        CLOUDFLARE EDGE WORKER
                    </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span
                        className={`rounded-md px-2 py-0.5 font-bold ${
                            isOk
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border border-rose-500/30 bg-rose-500/10 text-rose-400"
                        }`}
                    >
                        {status}
                    </span>
                    <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-300 font-bold">
                        {latency}
                    </span>
                </div>
            </div>

            {/* Quick Metrics Bar (modeled after Smart City weather & air quality cards) */}
            <div className="grid grid-cols-3 gap-1.5 font-mono text-center">
                <div className="rounded-xl border border-white/5 bg-[#080b13]/80 p-2">
                    <div className="text-[9px] text-slate-500 uppercase">Payload</div>
                    <div className="text-xs font-bold text-white">
                        {log ? fmtBytes(log.size) : "128 KB"}
                    </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#080b13]/80 p-2">
                    <div className="text-[9px] text-slate-500 uppercase">Edge Time</div>
                    <div className="text-xs font-bold text-emerald-400">
                        {log?.server ? log.server : "< 1 ms"}
                    </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#080b13]/80 p-2">
                    <div className="text-[9px] text-slate-500 uppercase">Cache</div>
                    <div className="text-xs font-bold text-cyan-300">HIT (99.8%)</div>
                </div>
            </div>

            {/* In-Place Tab Selector */}
            <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-2">
                <div className="inline-flex rounded-xl border border-white/10 bg-[#080b13] p-0.5 font-mono text-xs">
                    <button
                        type="button"
                        onClick={() => setActiveTab("raw")}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                            activeTab === "raw"
                                ? "bg-white/15 text-white shadow-sm font-bold"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        JSON
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("table")}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                            activeTab === "table"
                                ? "bg-white/15 text-white shadow-sm font-bold"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        Table
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("presets")}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                            activeTab === "presets"
                                ? "bg-white/15 text-white shadow-sm font-bold"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        Presets
                    </button>
                </div>

                {onExpandDrawer && (
                    <button
                        type="button"
                        onClick={() => onExpandDrawer(activeTab)}
                        title="Expand into full drawer"
                        className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-xs"
                    >
                        <Icon name="ext" className="size-3" />
                    </button>
                )}
            </div>

            {/* In-Place Tab Content Container */}
            <div className="flex-1 overflow-y-auto max-h-[380px] scrollbar-thin">
                {pending ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <span className="size-7 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400 mb-2" />
                        <span className="font-mono text-xs text-slate-300">Executing Edge Request...</span>
                        <span className="font-mono text-[10px] text-slate-500 mt-1 truncate max-w-xs">{customUrl}</span>
                    </div>
                ) : activeTab === "raw" ? (
                    log ? (
                        <div className="rounded-xl overflow-hidden border border-white/5">
                            <PlaygroundRawPreview log={log} endpointPath={customUrl} />
                        </div>
                    ) : (
                        <div className="py-12 text-center text-xs text-slate-500 font-mono">
                            Ready to inspect. Run an API request to see JSON.
                        </div>
                    )
                ) : activeTab === "table" ? (
                    log ? (
                        <div className="rounded-xl overflow-hidden border border-white/5">
                            <PlaygroundUiPreview log={log} onDrillDown={onDrillDown} />
                        </div>
                    ) : (
                        <div className="py-12 text-center text-xs text-slate-500 font-mono">
                            Ready to inspect. Run an API request to view table data.
                        </div>
                    )
                ) : (
                    <div className="space-y-2">
                        {PRESETS.slice(0, 6).map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => onApplyPreset(p)}
                                className="flex w-full flex-col items-start gap-1 rounded-xl border border-white/5 bg-[#080b13] p-2.5 text-left hover:border-cyan-400/40 hover:bg-white/5 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-sans text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                                        {p.label.en}
                                    </span>
                                    <span className="font-mono text-[9px] text-emerald-400">
                                        {p.endpointId}
                                    </span>
                                </div>
                                <span className="font-mono text-[10px] text-slate-400 truncate w-full">
                                    {p.path}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

