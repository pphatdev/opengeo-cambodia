import { Icon } from "../../components/Icon";
import { type Endpoint } from "../docs/endpoints";
import { PROVINCES, type HeroProvince } from "../home/cambodiaMap";

interface AtlasHUDProps {
    selectedEndpoint: Endpoint;
    customUrl: string;
    onUrlChange: (url: string) => void;
    onSend: () => void;
    pending?: boolean;
    onOpenEndpoints: () => void;
    onSelectProvince: (p: HeroProvince) => void;
    activeProvinceCode: string;
}

const TOP_HUBS = [
    { code: "12", name: "Phnom Penh", role: "Capital City", districts: 14, communes: 105, status: "100%" },
    { code: "17", name: "Siem Reap", role: "Angkor Hub", districts: 12, communes: 100, status: "100%" },
    { code: "02", name: "Battambang", role: "Western Gateway", districts: 14, communes: 103, status: "100%" },
    { code: "18", name: "Preah Sihanouk", role: "Deep Sea Port", districts: 5, communes: 29, status: "100%" },
];

export function AtlasConsoleHUD({
    selectedEndpoint,
    customUrl,
    onUrlChange,
    onSend,
    pending,
    onOpenEndpoints,
}: Pick<AtlasHUDProps, "selectedEndpoint" | "customUrl" | "onUrlChange" | "onSend" | "pending" | "onOpenEndpoints">) {
    return (
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d121d]/90 p-4 shadow-2xl backdrop-blur-xl">
            {/* Header: Title & Timestamp (matches SUPPLY CHAIN MAP in image) */}
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <h3 className="m-0 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Spatial Query Console
                    </h3>
                    <div className="font-mono text-[10px] text-slate-500">
                        {new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()} · 100% OPERATIONAL
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
                className="mb-2.5 flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#080b13] p-2.5 text-left hover:border-cyan-500/40 transition-colors cursor-pointer group"
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
                className="flex items-center gap-2"
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
                <button
                    type="submit"
                    disabled={pending}
                    className="flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-3 font-mono text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] disabled:opacity-50"
                >
                    <Icon name="play" className="size-3" />
                    <span>{pending ? "RUNNING..." : "RUN"}</span>
                </button>
            </form>
        </div>
    );
}

export function AtlasHubsHUD({
    onSelectProvince,
    activeProvinceCode,
}: Pick<AtlasHUDProps, "onSelectProvince" | "activeProvinceCode">) {
    return (
        <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 bg-[#0d121d]/90 p-4 shadow-2xl backdrop-blur-xl">
            {/* Header: Title & Total Nodes Stat (matches KEY SUPPLIERS $219.789.567.00 in image) */}
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
                                    {hub.status}
                                </div>
                                <div className="font-mono text-[9px] text-slate-500">
                                    {hub.communes}C
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
