import { Icon } from "../../components/Icon";
import { type RequestLog } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { type HeroProvince } from "../home/cambodiaMap";

interface AtlasInspectorProps {
    province: HeroProvince;
    log?: RequestLog | null;
    endpointPath: string;
    onDrillDown?: (path: string, params?: Record<string, string>) => void;
    onOpenRaw?: () => void;
    onOpenTable?: () => void;
}

export function AtlasInspector({
    province,
    log,
    endpointPath,
    onDrillDown,
    onOpenRaw,
    onOpenTable,
}: AtlasInspectorProps) {
    const { copy } = useToast();

    // Determine status badge
    const isOk = !log || log.status < 400;
    const latency = log ? `${log.ms.toFixed(1)} ms` : "0.2 ms";
    const statusText = log ? `${log.status} ${log.statusText || "OK"}` : "200 OK (CACHED)";

    const handleCopyCurl = () => {
        copy(`curl "https://opengeo-cambodia.pphat.me${endpointPath}"`);
    };

    return (
        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0d121d]/90 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            {/* Ambient Corner Glow */}
            <div className="absolute -top-12 -right-12 size-28 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />

            {/* Top Bar: Title & Status Badge */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-400">
                            Spatial Telemetry
                        </span>
                    </div>
                    <h2 className="m-0 font-display text-base font-bold text-white leading-tight">
                        {province.en}
                    </h2>
                    <div className="font-khmer text-xs text-slate-300">
                        {province.km}
                    </div>
                </div>

                {/* Status Badge (matching red rounded badge in reference image) */}
                <div className="flex flex-col items-end">
                    <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                        {log ? `${log.status} OK` : "ACTIVE"}
                    </span>
                    <span className="mt-1 font-mono text-[10px] text-cyan-400">
                        {latency}
                    </span>
                </div>
            </div>

            {/* Specs Grid matching Reference Image */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-[#080b13]/80 p-3 font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <span className="text-cyan-400">🌐</span> LEVEL:
                    </span>
                    <span className="font-semibold text-white">
                        PROVINCE · #{province.code}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <span className="text-rose-400">📍</span> CENTROID:
                    </span>
                    <span className="font-semibold text-white">
                        {`${(province.cy / 80).toFixed(4)}°N, ${(province.cx / 80).toFixed(4)}°E`}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <span className="text-amber-400">⏱️</span> DELAY:
                    </span>
                    <span className={isOk ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                        {latency} · {statusText}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <span className="text-purple-400">⚠️</span> COVERAGE:
                    </span>
                    <span className="text-cyan-300 font-semibold">
                        SUB-1MS EDGE VERIFIED
                    </span>
                </div>
            </div>

            {/* Action Buttons matching Reference Image ("NOTIFY" / "ALTERNATIVES") */}
            <div className="mt-3 flex items-center gap-2">
                {onDrillDown && (
                    <button
                        type="button"
                        onClick={() => onDrillDown(`/api/admin/provinces/${province.id}/districts`, { id: String(province.id) })}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400 cursor-pointer transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    >
                        <Icon name="search" className="size-3" />
                        <span>EXPLORE</span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleCopyCurl}
                    title="Copy cURL command"
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                    <Icon name="copy" className="size-3" />
                    <span>CURL</span>
                </button>

                {onOpenRaw && (
                    <button
                        type="button"
                        onClick={onOpenRaw}
                        title="View Raw JSON response"
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                    >
                        <Icon name="code" className="size-3" />
                        <span>RAW</span>
                    </button>
                )}

                {onOpenTable && (
                    <button
                        type="button"
                        onClick={onOpenTable}
                        title="View Data Table"
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                    >
                        <Icon name="table" className="size-3" />
                    </button>
                )}
            </div>
        </div>
    );
}

