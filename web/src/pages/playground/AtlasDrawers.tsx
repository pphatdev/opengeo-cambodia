import { Combobox } from "../../components/Combobox";
import { useI18n } from "../../i18n";
import { type RequestLog } from "../../lib/api";
import { type Endpoint } from "../docs/endpoints";
import { EndpointSelector } from "./EndpointSelector";
import { PlaygroundRawPreview } from "./PlaygroundRawPreview";
import { PlaygroundUiPreview } from "./PlaygroundUiPreview";
import { PRESETS, type PlaygroundPreset } from "./presets";

export type AtlasActivePanel = "none" | "endpoints" | "params" | "raw" | "table" | "presets";

interface AtlasDrawersProps {
    activePanel: AtlasActivePanel;
    onClose: () => void;
    endpoints: Endpoint[];
    selectedEndpoint: Endpoint;
    onSelectEndpoint: (ep: Endpoint) => void;
    paramValues: Record<string, string>;
    onParamChange: (name: string, value: string) => void;
    onResetParams: () => void;
    log?: RequestLog | null;
    customUrl: string;
    onApplyPreset: (preset: PlaygroundPreset) => void;
    onDrillDown?: (path: string, params?: Record<string, string>) => void;
}

export function AtlasDrawers({
    activePanel,
    onClose,
    endpoints,
    selectedEndpoint,
    onSelectEndpoint,
    paramValues,
    onParamChange,
    onResetParams,
    log,
    customUrl,
    onApplyPreset,
    onDrillDown,
}: AtlasDrawersProps) {
    const { tx } = useI18n();

    if (activePanel === "none") return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
            {/* Backdrop click to close */}
            <div className="flex-1" onClick={onClose} />

            {/* Slide-over Container */}
            <div className="relative flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#0a0e17] text-slate-100 shadow-2xl overflow-hidden">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-white/10 bg-[#0d121d] px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                        <h2 className="m-0 font-display text-sm font-bold uppercase tracking-wider text-white">
                            {activePanel === "endpoints" && "API Endpoints Catalog"}
                            {activePanel === "params" && "Request Parameters"}
                            {activePanel === "raw" && "Raw JSON Response"}
                            {activePanel === "table" && "Structured Data Table"}
                            {activePanel === "presets" && "Quick Query Presets"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        title="Close panel (Esc)"
                        className="flex size-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    {/* 1. Endpoints Catalog */}
                    {activePanel === "endpoints" && (
                        <div className="space-y-4">
                            <EndpointSelector
                                endpoints={endpoints}
                                selected={selectedEndpoint}
                                onSelect={(ep) => {
                                    onSelectEndpoint(ep);
                                    onClose();
                                }}
                            />
                        </div>
                    )}

                    {/* 2. Request Parameters Form */}
                    {activePanel === "params" && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-xs text-slate-400">
                                    Configuring: <strong className="text-white">{selectedEndpoint.path}</strong>
                                </span>
                                {selectedEndpoint.params?.length ? (
                                    <button
                                        type="button"
                                        onClick={onResetParams}
                                        className="font-mono text-xs text-cyan-400 hover:underline cursor-pointer"
                                    >
                                        Reset defaults
                                    </button>
                                ) : null}
                            </div>

                            {(!selectedEndpoint.params || selectedEndpoint.params.length === 0) ? (
                                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
                                    This endpoint does not require any parameters.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {selectedEndpoint.params.map((p) => {
                                        const val = paramValues[p.name] ?? "";
                                        return (
                                            <div
                                                key={p.name}
                                                className="space-y-1.5 rounded-xl border border-white/10 bg-[#0d121d] p-3.5"
                                            >
                                                <div className="flex items-center justify-between text-xs">
                                                    <label
                                                        htmlFor={`drawer-param-${p.name}`}
                                                        className="font-mono font-bold text-white flex items-center gap-1.5"
                                                    >
                                                        <span>{p.name}</span>
                                                        {p.required ? (
                                                            <span className="text-rose-400 text-[10px] uppercase tracking-wider font-bold">
                                                                Required
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500 text-[10px]">
                                                                Optional
                                                            </span>
                                                        )}
                                                    </label>
                                                    <span className="font-mono text-[10px] text-cyan-400">
                                                        {p.in} · {p.type}
                                                    </span>
                                                </div>

                                                {p.options ? (
                                                    <Combobox
                                                        id={`drawer-param-${p.name}`}
                                                        size="sm"
                                                        searchable={false}
                                                        value={val}
                                                        placeholder={p.name}
                                                        options={p.options.map((o) => ({ value: o, label: o || "None (Default)" }))}
                                                        onChange={(newVal) => onParamChange(p.name, newVal ?? "")}
                                                    />
                                                ) : (
                                                    <input
                                                        id={`drawer-param-${p.name}`}
                                                        type="text"
                                                        value={val}
                                                        placeholder={p.example ? `e.g. ${p.example}` : p.name}
                                                        onChange={(e) => onParamChange(p.name, e.target.value)}
                                                        className="h-8.5 w-full rounded-lg border border-white/10 bg-[#080b13] px-3 font-mono text-xs text-white focus:border-cyan-500/50 focus:outline-none"
                                                    />
                                                )}

                                                <div className="text-[11px] text-slate-400">
                                                    {tx(p.description)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. Raw JSON Inspector */}
                    {activePanel === "raw" && (
                        <div className="space-y-4">
                            {log ? (
                                <PlaygroundRawPreview
                                    log={log}
                                    endpointPath={customUrl}
                                />
                            ) : (
                                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
                                    No response data yet. Execute a request first.
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. Structured Data Table Inspector */}
                    {activePanel === "table" && (
                        <div className="space-y-4">
                            {log ? (
                                <PlaygroundUiPreview
                                    log={log}
                                    onDrillDown={onDrillDown}
                                />
                            ) : (
                                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
                                    No response data yet. Execute a request first.
                                </div>
                            )}
                        </div>
                    )}

                    {/* 5. Quick Query Presets */}
                    {activePanel === "presets" && (
                        <div className="grid grid-cols-1 gap-3">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                        onApplyPreset(p);
                                        onClose();
                                    }}
                                    className="flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-[#0d121d] p-3 text-left hover:border-cyan-400/50 hover:bg-white/5 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-sans text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                                            {tx(p.label)}
                                        </span>
                                        <span className="font-mono text-[10px] text-emerald-400">
                                            {p.endpointId}
                                        </span>
                                    </div>
                                    <span className="font-mono text-[11px] text-slate-400 truncate w-full">
                                        {p.path}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
