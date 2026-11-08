import { useState, useMemo } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { type Endpoint } from "../docs/endpoints";
import { type HeroProvince, PROVINCES } from "../home/cambodiaMap";
import { type RequestLog } from "../../lib/api";
import { PROVINCE_STATS } from "./provinceStats";
import { EndpointSelector } from "./EndpointSelector";

export type CockpitTab = "overview" | "console" | "hierarchy";

interface AtlasCockpitSidebarProps {
    activeTab: CockpitTab;
    onSelectTab: (tab: CockpitTab) => void;
    activeProvince: HeroProvince;
    onSelectProvince: (province: HeroProvince) => void;
    selectedEndpoint: Endpoint;
    endpoints: Endpoint[];
    onSelectEndpoint: (ep: Endpoint) => void;
    customUrl: string;
    onUrlChange: (url: string) => void;
    onSend: () => void;
    pending: boolean;
    log?: RequestLog | null;
    onOpenParams: () => void;
    onOpenRaw: () => void;
    onOpenTable: () => void;
    recentQueries?: string[];
    onSelectRecentQuery?: (query: string) => void;
    theme: string;
    onToggleTheme: () => void;
    lang: string;
    onToggleLang: () => void;
}

export function AtlasCockpitSidebar({
    activeTab,
    onSelectTab,
    activeProvince,
    onSelectProvince,
    selectedEndpoint,
    endpoints,
    onSelectEndpoint,
    customUrl,
    onUrlChange,
    onSend,
    pending,
    log,
    onOpenParams,
    onOpenRaw,
    onOpenTable,
    recentQueries = [],
    onSelectRecentQuery,
    theme,
    onToggleTheme,
    lang,
    onToggleLang,
}: AtlasCockpitSidebarProps) {
    const [locationMenuOpen, setLocationMenuOpen] = useState(false);
    const [sectorMenuOpen, setSectorMenuOpen] = useState(false);

    const stats = useMemo(() => PROVINCE_STATS[activeProvince.code] ?? PROVINCE_STATS["12"], [activeProvince]);

    const latency = log ? `${log.ms.toFixed(1)}ms` : "0.2ms";
    const status = log ? `${log.status} ${log.statusText || "OK"}` : "200 OK";

    return (
        <aside
            aria-label="Spatial Control Panel"
            className="flex h-full w-full max-w-[420px] flex-none border-r border-white/10 bg-[#070a13] text-slate-300 font-sans select-none overflow-hidden"
        >
            {/* 1. Ultra-Slim Far-Left Icon Dock (Rail) */}
            <nav
                aria-label="Primary Navigation Rail"
                className="w-13.5 flex-none flex flex-col items-center justify-between py-3.5 border-r border-white/10 bg-[#060810]"
            >
                {/* Top Brand Logo */}
                <div className="flex flex-col items-center gap-4">
                    <Link
                        to="/"
                        title="OpenGeo Cambodia Home"
                        className="group relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-[0_0_16px_rgba(6,182,212,0.25)]"
                    >
                        <img
                            src="/logo.jpg"
                            alt="OpenGeo"
                            className="size-7 rounded-lg object-cover ring-1 ring-cyan-400/50 group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4] ring-2 ring-[#060810]" />
                    </Link>

                    {/* Nav Action Icons */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onSelectTab("overview")}
                            title="Sector Overview"
                            className={`flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                                activeTab === "overview"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            <Icon name="layers" className="size-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => onSelectTab("console")}
                            title="Spatial API Console"
                            className={`flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                                activeTab === "console"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            <Icon name="code" className="size-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => onSelectTab("hierarchy")}
                            title="Administrative Hierarchy"
                            className={`flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                                activeTab === "hierarchy"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            <Icon name="table" className="size-4" />
                        </button>

                        <button
                            type="button"
                            onClick={onOpenTable}
                            title="View Data Table"
                            className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                        >
                            <Icon name="table" className="size-4" />
                        </button>

                        <button
                            type="button"
                            onClick={onOpenRaw}
                            title="View Raw JSON"
                            className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                        >
                            <Icon name="eye" className="size-4" />
                        </button>
                    </div>
                </div>

                {/* Bottom Profile & Setting Badges */}
                <div className="flex flex-col items-center gap-2.5">
                    {/* Language Switch */}
                    <button
                        type="button"
                        onClick={onToggleLang}
                        title="Toggle Language (KM / EN)"
                        className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[11px] font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                        {lang === "km" ? "ខ្មែរ" : "EN"}
                    </button>

                    {/* Theme Switch */}
                    <button
                        type="button"
                        onClick={onToggleTheme}
                        title="Toggle Dark/Light Mode"
                        className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <Icon name={theme === "dark" ? "sun" : "moon"} className="size-3.5" />
                    </button>

                    {/* OpenGeo Avatar badge */}
                    <div
                        title="OpenGeo Cambodia v1.3"
                        className="flex size-8 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-[10px] font-extrabold text-white shadow-[0_0_8px_rgba(6,182,212,0.4)] ring-1 ring-white/20"
                    >
                        OG
                    </div>
                </div>
            </nav>

            {/* 2. Main Dashboard Metrics & Console Column */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto scrollbar-thin p-3.5 space-y-3">
                {/* Header: Domain Title + Menu */}
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            <Icon name="sparkles" className="size-3.5" />
                        </span>
                        <div>
                            <h2 className="text-sm font-extrabold tracking-wide text-white font-display">
                                Spatial Sector
                            </h2>
                            <span className="font-mono text-[9px] text-cyan-400 font-semibold">
                                OPEN GEO CAMBODIA
                            </span>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setSectorMenuOpen(!sectorMenuOpen)}
                            title="Sector Options"
                            className="size-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                            <span className="text-base leading-none">⋮</span>
                        </button>
                        {sectorMenuOpen && (
                            <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-white/10 bg-[#0d121e] p-1.5 shadow-2xl backdrop-blur-xl font-mono text-xs">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenParams();
                                        setSectorMenuOpen(false);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
                                >
                                    Query Parameters
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenRaw();
                                        setSectorMenuOpen(false);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
                                >
                                    Raw JSON Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenTable();
                                        setSectorMenuOpen(false);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
                                >
                                    Structured Table
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub-Nav Tabs: Overview | Console | Hierarchy */}
                <div className="flex items-center gap-1 rounded-xl bg-[#0b0f19] p-1 border border-white/5 font-mono text-[11px]">
                    <button
                        type="button"
                        onClick={() => onSelectTab("overview")}
                        className={`flex-1 py-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            activeTab === "overview"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelectTab("console")}
                        className={`flex-1 py-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            activeTab === "console"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        Console
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelectTab("hierarchy")}
                        className={`flex-1 py-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            activeTab === "hierarchy"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        Hierarchy
                    </button>
                </div>

                {/* Dropdowns: Location Selector & Time/Version */}
                <div className="flex items-center gap-2 font-mono text-[11px]">
                    {/* Location Dropdown */}
                    <div className="relative flex-1">
                        <button
                            type="button"
                            onClick={() => setLocationMenuOpen(!locationMenuOpen)}
                            className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-[#0c121e] px-2.5 py-1.5 text-slate-200 hover:border-cyan-500/40 transition-colors cursor-pointer"
                        >
                            <span className="flex items-center gap-1.5 truncate">
                                <span>📍</span>
                                <strong className="truncate font-semibold">{activeProvince.en}</strong>
                            </span>
                            <span className="text-slate-500 text-[10px]">⌄</span>
                        </button>

                        {locationMenuOpen && (
                            <div className="absolute left-0 top-9 z-40 w-52 max-h-56 overflow-y-auto scrollbar-thin rounded-xl border border-white/10 bg-[#0d121e] p-1 shadow-2xl backdrop-blur-xl">
                                {PROVINCES.map((p) => (
                                    <button
                                        key={p.code}
                                        type="button"
                                        onClick={() => {
                                            onSelectProvince(p);
                                            setLocationMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                            p.code === activeProvince.code
                                                ? "bg-cyan-500/20 text-cyan-300 font-bold"
                                                : "text-slate-300 hover:bg-white/5"
                                        }`}
                                    >
                                        <span className="truncate">{p.en}</span>
                                        <span className="text-[10px] font-mono text-slate-500">#{p.code}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Version & Time Pill */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0c121e] px-2.5 py-1.5 text-slate-400 text-[11px]">
                        <span>v1.3.0</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-300 font-medium">UTC+7</span>
                    </div>
                </div>

                {/* ============================================================== */}
                {/* CARD 1: PRIMARY SPATIAL KPI (API EDGE LATENCY)                 */}
                {/* ============================================================== */}
                <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#0b1220]/90 to-[#070b14]/90 p-3.5 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#06b6d4]" />
                            <span>Spatial API Edge Latency</span>
                        </span>
                        <span className="font-mono text-[10px] text-emerald-400 font-bold">{status}</span>
                    </div>

                    {/* Primary Number */}
                    <div className="my-2 flex items-baseline gap-2">
                        <span className="text-cyan-400 text-lg">⚡</span>
                        <span className="text-3xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_16px_rgba(6,182,212,0.4)]">
                            {latency}
                        </span>
                        <span className="text-xs font-mono text-slate-400 font-semibold">avg edge</span>
                    </div>

                    {/* Sub-Metrics: Requests & Cache */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-2 font-mono text-[11px]">
                        <div>
                            <span className="text-slate-500 block text-[9px] uppercase">Cache Hit Rate</span>
                            <span className="font-bold text-slate-200">99.8%</span>
                            <span className="text-emerald-400 text-[10px] ml-1">▴</span>
                        </div>
                        <div className="text-right">
                            <span className="text-slate-500 block text-[9px] uppercase">Tier Rate Limits</span>
                            <span className="font-bold text-slate-200">Unlimited</span>
                            <span className="text-cyan-400 text-[10px] ml-1">▾</span>
                        </div>
                    </div>
                </div>

                {/* ============================================================== */}
                {/* CARD 2: ADMINISTRATIVE COVERAGE INDEX PROGRESS BAR             */}
                {/* ============================================================== */}
                <div className="rounded-2xl border border-white/5 bg-[#090d18] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300">
                            Administrative Coverage Index
                        </span>
                        <span className="font-mono text-xs font-black text-cyan-300">
                            100% Complete
                        </span>
                    </div>

                    {/* Glowing Teal-to-Cyan Progress Bar */}
                    <div className="relative h-2.5 w-full rounded-full bg-slate-800/80 overflow-hidden ring-1 ring-white/5">
                        <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
                    </div>

                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                        <span>4 Administrative Tiers</span>
                        <span>Official NCDD Standard</span>
                    </div>
                </div>

                {/* ============================================================== */}
                {/* CARD 3: 3-RING HIERARCHY DISTRIBUTION SUMMARY (CIRCULAR RINGS) */}
                {/* ============================================================== */}
                <div className="rounded-2xl border border-white/5 bg-[#090d18] p-3 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-white/5">
                        <span className="text-xs font-semibold text-slate-200 tracking-wide">
                            Hierarchy Distribution
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">25 Provinces</span>
                    </div>

                    {/* 3 Circular Donut Gauges */}
                    <div className="grid grid-cols-3 gap-2 py-1">
                        {/* Ring 1: Provinces */}
                        <div className="flex flex-col items-center">
                            <div className="relative size-14">
                                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-slate-800"
                                        strokeWidth="3.2"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="text-cyan-400"
                                        strokeDasharray="100, 100"
                                        strokeWidth="3.2"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-extrabold text-white">
                                    25
                                </div>
                            </div>
                            <span className="mt-1 text-[10px] font-mono text-cyan-300 font-semibold uppercase">
                                Provinces
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">100%</span>
                        </div>

                        {/* Ring 2: Districts */}
                        <div className="flex flex-col items-center">
                            <div className="relative size-14">
                                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-slate-800"
                                        strokeWidth="3.2"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="text-amber-400"
                                        strokeDasharray="89, 100"
                                        strokeWidth="3.2"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-extrabold text-white">
                                    210
                                </div>
                            </div>
                            <span className="mt-1 text-[10px] font-mono text-amber-300 font-semibold uppercase">
                                Districts
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">Khans/Krongs</span>
                        </div>

                        {/* Ring 3: Communes */}
                        <div className="flex flex-col items-center">
                            <div className="relative size-14">
                                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-slate-800"
                                        strokeWidth="3.2"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="text-emerald-400"
                                        strokeDasharray="78, 100"
                                        strokeWidth="3.2"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-extrabold text-white">
                                    1.6k
                                </div>
                            </div>
                            <span className="mt-1 text-[10px] font-mono text-emerald-300 font-semibold uppercase">
                                Communes
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">Sangkats</span>
                        </div>
                    </div>

                    {/* Bottom Summary Row */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-2 font-mono text-[10.5px]">
                        <span className="flex items-center gap-1.5 text-slate-300">
                            <span className="size-1.5 rounded-full bg-amber-400" />
                            <strong>14,576</strong> Villages
                        </span>
                        <span className="flex items-center gap-1.5 text-cyan-300">
                            <span className="size-1.5 rounded-full bg-cyan-400" />
                            <strong>100%</strong> Free Open Data
                        </span>
                    </div>
                </div>

                {/* ============================================================== */}
                {/* CARD 4: DUAL SPEEDOMETER ARC GAUGES                            */}
                {/* ============================================================== */}
                <div className="rounded-2xl border border-white/5 bg-[#090d18] p-3">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Gauge 1: P95 Latency (Amber Arc) */}
                        <div className="flex flex-col items-center rounded-xl bg-white/2 p-2">
                            <div className="relative w-24 h-13 overflow-hidden flex items-end justify-center">
                                <svg className="w-24 h-24" viewBox="0 0 100 100">
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke="#1e293b"
                                        strokeWidth="8"
                                        strokeDasharray="125 125"
                                        transform="rotate(-180 50 50)"
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth="8"
                                        strokeDasharray="80 125"
                                        strokeLinecap="round"
                                        transform="rotate(-180 50 50)"
                                    />
                                </svg>
                                <span className="absolute bottom-0 font-mono font-black text-sm text-amber-300">
                                    1.0 ↗
                                </span>
                            </div>
                            <span className="mt-1 text-[10px] font-mono text-slate-400 uppercase font-medium">
                                P95 Latency
                            </span>
                            <span className="font-mono text-[9px] text-slate-500">0.08ms compute</span>
                        </div>

                        {/* Gauge 2: Throughput (Cyan Arc) */}
                        <div className="flex flex-col items-center rounded-xl bg-white/2 p-2">
                            <div className="relative w-24 h-13 overflow-hidden flex items-end justify-center">
                                <svg className="w-24 h-24" viewBox="0 0 100 100">
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke="#1e293b"
                                        strokeWidth="8"
                                        strokeDasharray="125 125"
                                        transform="rotate(-180 50 50)"
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke="#06b6d4"
                                        strokeWidth="8"
                                        strokeDasharray="105 125"
                                        strokeLinecap="round"
                                        transform="rotate(-180 50 50)"
                                    />
                                </svg>
                                <span className="absolute bottom-0 font-mono font-black text-sm text-cyan-300">
                                    0.95
                                </span>
                            </div>
                            <span className="mt-1 text-[10px] font-mono text-slate-400 uppercase font-medium">
                                Edge kReq/s
                            </span>
                            <span className="font-mono text-[9px] text-slate-500">99.8% hit rate</span>
                        </div>
                    </div>
                </div>

                {/* ============================================================== */}
                {/* CARD 5: SPATIAL QUERY CONSOLE & RUN TRIGGER                    */}
                {/* ============================================================== */}
                <div className="rounded-2xl border border-cyan-500/30 bg-[#080d19] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-cyan-400" />
                            <span>Spatial Query Run</span>
                        </span>
                        <button
                            type="button"
                            onClick={onOpenParams}
                            title="Edit Parameters"
                            className="font-mono text-[10px] text-cyan-300 hover:underline cursor-pointer"
                        >
                            Params ⚙
                        </button>
                    </div>

                    {/* In-Place Compact Endpoint Dropdown */}
                    <div className="w-full">
                        <EndpointSelector
                            endpoints={endpoints}
                            selected={selectedEndpoint}
                            onSelect={onSelectEndpoint}
                            variant="compact"
                        />
                    </div>

                    {/* URL Bar & RUN Button */}
                    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#05070d] p-1">
                        <input
                            type="text"
                            value={customUrl}
                            onChange={(e) => onUrlChange(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onSend()}
                            aria-label="API request path"
                            className="flex-1 min-w-0 bg-transparent px-2 font-mono text-[11px] text-cyan-300 focus:outline-none"
                            placeholder="/api/admin/..."
                        />
                        <button
                            type="button"
                            onClick={onSend}
                            disabled={pending}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1 font-mono text-[11px] font-black text-white hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                        >
                            {pending ? (
                                <span className="animate-spin text-xs">↻</span>
                            ) : (
                                <span>RUN</span>
                            )}
                        </button>
                    </div>

                    {/* Recent Queries Quick Chips */}
                    {recentQueries.length > 0 && onSelectRecentQuery && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9px] font-mono text-slate-500 uppercase mr-0.5">Recent:</span>
                            {recentQueries.slice(0, 3).map((rq) => (
                                <button
                                    key={rq}
                                    type="button"
                                    onClick={() => onSelectRecentQuery(rq)}
                                    className="truncate max-w-[130px] rounded px-1.5 py-0.5 text-[9.5px] font-mono bg-white/5 text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                    {rq.replace("/api/", "")}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Active Selected Province Summary */}
                    <div className="flex items-center justify-between rounded-lg bg-white/3 px-2 py-1 font-mono text-[10px] text-slate-400">
                        <span className="truncate">
                            Focus: <strong className="text-slate-200">{activeProvince.en}</strong> (#{activeProvince.code})
                        </span>
                        <span className="text-cyan-400 font-bold">{stats.districts}D · {stats.communes}C</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
