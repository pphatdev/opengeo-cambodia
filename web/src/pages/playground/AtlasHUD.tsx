import { Icon } from "../../components/Icon";
import { type Endpoint } from "../docs/endpoints";
import { PROVINCES, type HeroProvince } from "../home/cambodiaMap";
import { PROVINCE_STATS } from "./provinceStats";

interface AtlasHUDProps {
    selectedEndpoint: Endpoint;
    customUrl: string;
    onUrlChange: (url: string) => void;
    onSend: () => void;
    pending?: boolean;
    onOpenEndpoints: () => void;
    onOpenParams?: () => void;
    onSelectProvince: (p: HeroProvince) => void;
    activeProvinceCode: string;
    recentQueries?: string[];
    onSelectRecentQuery?: (path: string) => void;
}

const TOP_HUBS = [
    { code: "12", name: "Phnom Penh", role: "Capital City" },
    { code: "17", name: "Siem Reap", role: "Angkor Hub" },
    { code: "02", name: "Battambang", role: "Western Gateway" },
    { code: "18", name: "Preah Sihanouk", role: "Deep Sea Port" },
];

export function AtlasConsoleHUD({
    selectedEndpoint,
    customUrl,
    onUrlChange,
    onSend,
    pending,
    onOpenEndpoints,
    onOpenParams,
    recentQueries = [],
    onSelectRecentQuery,
}: Pick<
    AtlasHUDProps,
    | "selectedEndpoint"
    | "customUrl"
    | "onUrlChange"
    | "onSend"
    | "pending"
    | "onOpenEndpoints"
    | "onOpenParams"
    | "recentQueries"
    | "onSelectRecentQuery"
>) {
    return (
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d121d]/90 p-3.5 shadow-2xl backdrop-blur-xl">
            {/* Header: Title & Operational Status */}
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <h3 className="m-0 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Spatial Query Console
                    </h3>
                    <div className="font-mono text-[9.5px] text-slate-500">
                        {new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()} · SUB-1MS EDGE
                    </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>EDGE LIVE</span>
                </div>
            </div>

            {/* Endpoint Selector Trigger Button */}
            <button
                type="button"
                onClick={onOpenEndpoints}
                className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#080b13] p-2 text-left hover:border-cyan-500/40 transition-colors cursor-pointer group"
            >
                <div className="flex items-center gap-2 truncate">
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                        GET
                    </span>
                    <span className="font-mono text-xs text-white truncate group-hover:text-cyan-300 transition-colors">
                        {selectedEndpoint.path}
                    </span>
                </div>
                <Icon name="chevrons" className="size-3 text-slate-400 shrink-0" />
            </button>

            {/* Quick URL Input Bar + Run Button */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSend();
                }}
                className="flex items-center gap-1.5"
            >
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={customUrl}
                        onChange={(e) => onUrlChange(e.target.value)}
                        placeholder="/api/admin/provinces/..."
                        className="h-8.5 w-full rounded-xl border border-white/10 bg-[#080b13] px-3 font-mono text-xs text-cyan-300 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
                    />
                </div>

                {onOpenParams && selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                    <button
                        type="button"
                        onClick={onOpenParams}
                        title={`Configure ${selectedEndpoint.params.length} parameters`}
                        className="flex h-8.5 items-center gap-1 rounded-xl border border-purple-500/40 bg-purple-500/20 px-2.5 font-mono text-xs font-semibold text-purple-300 hover:bg-purple-500/30 transition-colors cursor-pointer shrink-0"
                    >
                        <Icon name="key" className="size-3" />
                        <span>({selectedEndpoint.params.length})</span>
                    </button>
                )}

                <button
                    type="submit"
                    disabled={pending}
                    className="flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-3 font-mono text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] disabled:opacity-50 shrink-0"
                >
                    <Icon name="play" className="size-3" />
                    <span>{pending ? "RUNNING..." : "RUN"}</span>
                </button>
            </form>

            {/* Recent Queries Bar (if any) */}
            {recentQueries.length > 0 && onSelectRecentQuery && (
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px] font-mono text-slate-400">
                    <span className="shrink-0 text-slate-500">Recent:</span>
                    {recentQueries.slice(0, 3).map((rq, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onSelectRecentQuery(rq)}
                            className="shrink-0 rounded-md border border-white/5 bg-white/5 px-1.5 py-0.5 text-slate-300 hover:bg-white/10 hover:text-cyan-300 transition-colors cursor-pointer truncate max-w-36"
                        >
                            {rq}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function AtlasHubsHUD({
    onSelectProvince,
    activeProvinceCode,
}: Pick<AtlasHUDProps, "onSelectProvince" | "activeProvinceCode">) {
    return (
        <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 bg-[#0d121d]/90 p-4 shadow-2xl backdrop-blur-xl">
            {/* Header: Title & Total Nodes Stat */}
            <div className="mb-3 flex items-start justify-between">
                <div>
                    <h3 className="m-0 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Key Spatial Hubs
                    </h3>
                    <div className="font-mono text-[9px] text-slate-500">
                        25 PROVINCES MAPPED
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-mono text-sm font-bold text-white tracking-tight">
                        14,576
                    </div>
                    <div className="font-mono text-[9px] text-cyan-400 uppercase">
                        Villages
                    </div>
                </div>
            </div>

            {/* Top Hubs List */}
            <div className="space-y-1.5">
                {TOP_HUBS.map((hub) => {
                    const isActive = activeProvinceCode === hub.code;
                    const stat = PROVINCE_STATS[hub.code] || { districts: 8, communes: 65 };

                    return (
                        <button
                            key={hub.code}
                            type="button"
                            onClick={() => {
                                const p = PROVINCES.find((prov) => prov.code === hub.code);
                                if (p) onSelectProvince(p);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition-all cursor-pointer ${
                                isActive
                                    ? "bg-rose-500/20 border border-rose-500/40 text-white shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                                    : "bg-white/5 hover:bg-white/10 text-slate-300"
                            }`}
                        >
                            <div>
                                <div className="font-sans text-xs font-semibold leading-tight">
                                    {hub.name}
                                </div>
                                <div className="font-mono text-[9px] text-slate-400">
                                    {hub.role}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-[10px] font-bold text-emerald-400">
                                    {stat.districts}D
                                </div>
                                <div className="font-mono text-[9px] text-slate-500">
                                    {stat.communes}C
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
