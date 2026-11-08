import { useState } from "react";
import { Icon } from "../../components/Icon";
import { fmtBytes, type RequestLog } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { type HeroProvince } from "../home/cambodiaMap";
import { PROVINCE_STATS } from "./provinceStats";

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
    const { copy, toast } = useToast();
    const [copiedCurl, setCopiedCurl] = useState(false);

    const stats = PROVINCE_STATS[province.code] || {
        districts: 8,
        communes: 65,
        villages: 500,
        region: "central",
        color: "#06b6d4",
        descriptionEn: "Cambodian provincial administrative hub",
        descriptionKm: "រដ្ឋបាលខេត្តនៃព្រះរាជាណាចក្រកម្ពុជា",
    };

    const isOk = !log || log.status < 400;
    const latency = log ? `${log.ms.toFixed(1)} ms` : "0.2 ms";
    const statusText = log ? `${log.status} ${log.statusText || "OK"}` : "200 OK";

    const handleCopyCurl = () => {
        copy(`curl "https://opengeo-cambodia.pphat.me${endpointPath}"`);
        setCopiedCurl(true);
        toast("cURL command copied");
        setTimeout(() => setCopiedCurl(false), 2000);
    };

    const handleDownloadJson = () => {
        if (!log?.body) {
            toast("No response data to download yet");
            return;
        }
        try {
            const jsonStr = JSON.stringify(log.body, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const cleanName = endpointPath.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^_+|_+$/g, "") || "response";
            a.href = url;
            a.download = `${cleanName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast("JSON downloaded");
        } catch {
            toast("Download failed");
        }
    };

    return (
        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0d121d]/90 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            {/* Ambient Corner Glow */}
            <div
                className="absolute -top-12 -right-12 size-28 rounded-full blur-2xl pointer-events-none"
                style={{ backgroundColor: `${stats.color}20` }}
            />

            {/* Top Bar: Title & Status Badge */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                            className="size-2 rounded-full animate-pulse"
                            style={{ backgroundColor: stats.color }}
                        />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                            Spatial Telemetry · #{province.code}
                        </span>
                    </div>
                    <h2 className="m-0 font-display text-base font-bold text-white leading-tight">
                        {province.en}
                    </h2>
                    <div className="font-khmer text-xs text-slate-300">
                        {province.km}
                    </div>
                </div>

                {/* Status Badge */}
                <div className="flex flex-col items-end">
                    <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                        {log ? `${log.status} OK` : "ACTIVE"}
                    </span>
                    <span className="mt-1 font-mono text-[10px] text-cyan-400">
                        {latency}
                    </span>
                </div>
            </div>

            {/* Description note */}
            <div className="mb-2.5 rounded-lg border border-white/5 bg-[#080b13]/60 px-2.5 py-1.5 text-[11px] text-slate-400 leading-snug">
                {stats.descriptionEn}
            </div>

            {/* Administrative Breakdown Matrix */}
            <div className="grid grid-cols-3 gap-1.5 mb-2.5 font-mono text-center">
                <div className="rounded-xl border border-white/5 bg-[#080b13]/80 p-2">
                    <div className="text-[10px] text-slate-500 uppercase">Districts</div>
                    <div className="text-sm font-bold text-cyan-400">{stats.districts}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#080b13]/80 p-2">
                    <div className="text-[10px] text-slate-500 uppercase">Communes</div>
                    <div className="text-sm font-bold text-emerald-400">{stats.communes}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#080b13]/80 p-2">
                    <div className="text-[10px] text-slate-500 uppercase">Villages</div>
                    <div className="text-sm font-bold text-amber-400">{stats.villages}</div>
                </div>
            </div>

            {/* Specs Grid */}
            <div className="space-y-1.5 rounded-xl border border-white/5 bg-[#080b13]/80 p-2.5 font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-slate-400">
                        <span>📍</span> CENTROID:
                    </span>
                    <span className="font-semibold text-white">
                        {`${(province.cy / 80).toFixed(4)}°N, ${(province.cx / 80).toFixed(4)}°E`}
                    </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-slate-400">
                        <span>⏱️</span> DELAY:
                    </span>
                    <span className={isOk ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                        {latency} · {statusText}
                    </span>
                </div>

                {log && (
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 text-slate-400">
                            <span>📦</span> PAYLOAD:
                        </span>
                        <span className="text-cyan-300 font-semibold">
                            {fmtBytes(log.size)}
                        </span>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-1.5">
                {onDrillDown && (
                    <button
                        type="button"
                        onClick={() => onDrillDown(`/api/admin/provinces/${province.id}/districts`, { id: String(province.id) })}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400 cursor-pointer transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    >
                        <Icon name="search" className="size-3" />
                        <span>EXPLORE ({stats.districts}D)</span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleCopyCurl}
                    title="Copy cURL command"
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                    {copiedCurl ? <Icon name="check" className="size-3 text-emerald-400" /> : <Icon name="copy" className="size-3" />}
                    <span>CURL</span>
                </button>

                {onOpenRaw && (
                    <button
                        type="button"
                        onClick={onOpenRaw}
                        title="View Raw JSON response"
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
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

                <button
                    type="button"
                    onClick={handleDownloadJson}
                    title="Download response as JSON file"
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                    <Icon name="download" className="size-3" />
                </button>
            </div>
        </div>
    );
}
