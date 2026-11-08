import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { type Endpoint } from "../docs/endpoints";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCES, type HeroProvince } from "../home/cambodiaMap";
import { type RequestLog } from "../../lib/api";
import { PROVINCE_STATS } from "./provinceStats";
import { EndpointSelector } from "./EndpointSelector";
import { type AtlasCategory, type AtlasTier } from "./AtlasTopBar";
import { AtlasPlaceChips, type PlaceChipItem } from "./AtlasPlaceChips";

export type NetworkGraphMode = "hairball" | "chord" | "hierarchical";

interface AtlasNetworkMapProps {
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
    onOpenRaw: () => void;
    onOpenTable: () => void;
    onOpenParams: () => void;
    onToggleViewMode: () => void;
    viewMode: "atlas" | "classic";
    category?: AtlasCategory;
    onSelectCategory?: (cat: AtlasCategory) => void;
    tier?: AtlasTier;
    onSelectTier?: (tier: AtlasTier) => void;
    placeChips?: PlaceChipItem[];
    onSelectPlaceChip?: (chip: PlaceChipItem) => void;
    onDrillDown?: (path: string, params?: Record<string, string>) => void;
    highlightedCodes?: Set<string>;
    recentQueries?: string[];
    onSelectRecentQuery?: (query: string) => void;
    geocodeMarker?: { x: number; y: number; lat: number; lon: number; label: string } | null;
    autoTour?: boolean;
    onToggleAutoTour?: () => void;
    theme: string;
    onToggleTheme: () => void;
    lang: string;
    onToggleLang: () => void;
}

// Major connected hubs with their metrics and role titles
const NETWORK_CONNECTIONS: Record<string, { label: string; metric: string; colorGrad: string }> = {
    "17": { label: "Siem Reap (Angkor Hub)", metric: "12 D", colorGrad: "grad-amber" },
    "02": { label: "Battambang (Agri Basin)", metric: "14 D", colorGrad: "grad-purple" },
    "18": { label: "Preah Sihanouk (Maritime)", metric: "5 D", colorGrad: "grad-magenta" },
    "07": { label: "Kampot (Coastal Enclave)", metric: "9 D", colorGrad: "grad-orange" },
    "03": { label: "Kampong Cham (Mekong)", metric: "10 D", colorGrad: "grad-rose" },
    "10": { label: "Kratie (Riverine Delta)", metric: "6 D", colorGrad: "grad-purple" },
    "16": { label: "Ratanakiri (Highland Plateaus)", metric: "6 D", colorGrad: "grad-amber" },
    "11": { label: "Mondulkiri (Pine Ridge)", metric: "5 D", colorGrad: "grad-magenta" },
    "19": { label: "Stung Treng (Upper Mekong)", metric: "5 D", colorGrad: "grad-purple" },
    "13": { label: "Preah Vihear (Sacred Ridge)", metric: "5 D", colorGrad: "grad-orange" },
    "20": { label: "Svay Rieng (Trade Border)", metric: "9 D", colorGrad: "grad-rose" },
    "08": { label: "Kandal (Capital Belt)", metric: "13 D", colorGrad: "grad-amber" },
};

export function AtlasNetworkMap({
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
    onOpenRaw,
    onOpenTable,
    onOpenParams,
    onToggleViewMode,
    category = "ALL",
    onSelectCategory,
    tier = "all",
    onSelectTier,
    placeChips = [],
    onSelectPlaceChip,
    onDrillDown,
    highlightedCodes = new Set(),
    recentQueries = [],
    onSelectRecentQuery,
    geocodeMarker,
    autoTour = false,
    onToggleAutoTour,
    theme,
    onToggleTheme,
    lang,
    onToggleLang,
}: AtlasNetworkMapProps) {
    const [graphMode, setGraphMode] = useState<NetworkGraphMode>("hairball");
    const [legendCollapsed, setLegendCollapsed] = useState(false);
    const [hoveredCode, setHoveredCode] = useState<string | null>(null);

    const latency = log ? `${log.ms.toFixed(1)}ms` : "0.2ms";
    const status = log ? `${log.status} ${log.statusText || "OK"}` : "200 OK";

    // Radiant Epicenter Centroid (Active province)
    const epicenter = activeProvince;

    // Connected beams from epicenter to major regional hubs
    const networkRays = useMemo(() => {
        return Object.entries(NETWORK_CONNECTIONS)
            .filter(([code]) => code !== epicenter.code)
            .map(([code, meta]) => {
                const target = PROVINCES.find((p) => p.code === code);
                if (!target) return null;

                const mx = (epicenter.cx + target.cx) / 2;
                const my = (epicenter.cy + target.cy) / 2;

                // Pill angle in degrees
                const dx = target.cx - epicenter.cx;
                const dy = target.cy - epicenter.cy;
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                return {
                    code,
                    target,
                    meta,
                    d: `M ${epicenter.cx} ${epicenter.cy} L ${target.cx} ${target.cy}`,
                    mx,
                    my,
                    angle: angle > 90 || angle < -90 ? angle + 180 : angle,
                };
            })
            .filter(Boolean) as Array<{
            code: string;
            target: HeroProvince;
            meta: { label: string; metric: string; colorGrad: string };
            d: string;
            mx: number;
            my: number;
            angle: number;
        }>;
    }, [epicenter]);

    // Chord perimeter circle connections
    const chordRays = useMemo(() => {
        if (graphMode !== "chord") return [];
        const hubs = PROVINCES.slice(0, 14);
        const rays: Array<{ d: string; color: string }> = [];
        for (let i = 0; i < hubs.length; i++) {
            const p1 = hubs[i];
            const p2 = hubs[(i + 4) % hubs.length];
            const qx = (p1.cx + p2.cx) / 2 + (epicenter.cx - 500) * 0.1;
            const qy = (p1.cy + p2.cy) / 2 + (epicenter.cy - 416) * 0.1;
            rays.push({
                d: `M ${p1.cx} ${p1.cy} Q ${qx} ${qy} ${p2.cx} ${p2.cy}`,
                color: i % 3 === 0 ? "#a855f7" : i % 2 === 0 ? "#ec4899" : "#f59e0b",
            });
        }
        return rays;
    }, [graphMode, epicenter]);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#090710] text-slate-100 font-sans select-none flex flex-col scheme-dark">
            {/* Top Atmospheric Radial Vignette */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_90%_70%_at_50%_45%,rgba(168,85,247,0.06),transparent_80%)]" />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_25%_65%,rgba(244,63,94,0.07),transparent_50%)]" />

            {/* ============================================================== */}
            {/* 1. TOP MINIMALIST COMMAND & QUERY STRIP                         */}
            {/* ============================================================== */}
            <header className="relative z-30 flex items-center justify-between border-b border-white/10 bg-[#0d0917]/90 px-4 py-2.5 backdrop-blur-2xl shadow-xl">
                {/* Left: Brand + Spatial Query Bar */}
                <div className="flex items-center gap-3">
                    <Link
                        to="/"
                        title="Back to Home"
                        className="flex items-center gap-2 group no-underline"
                    >
                        <div className="relative flex size-7.5 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-amber-500 p-0.5 shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                            <img src="/logo.jpg" alt="Logo" className="size-full rounded-[10px] object-cover" />
                        </div>
                        <div className="hidden sm:block">
                            <span className="font-display text-xs font-black tracking-wider text-white uppercase group-hover:text-purple-300 transition-colors">
                                OpenGeo Network
                            </span>
                            <span className="ml-1.5 rounded bg-purple-500/20 px-1 py-0.2 font-mono text-[9px] text-purple-300 font-bold border border-purple-500/30">
                                v1.3
                            </span>
                        </div>
                    </Link>

                    {/* In-Place Endpoint Popover Selector */}
                    <div className="w-56 sm:w-68">
                        <EndpointSelector
                            endpoints={endpoints}
                            selected={selectedEndpoint}
                            onSelect={onSelectEndpoint}
                            variant="compact"
                        />
                    </div>

                    {/* URL Input Bar & Run */}
                    <div className="hidden md:flex items-center gap-1 rounded-xl border border-white/10 bg-[#080511] p-1 font-mono text-xs">
                        <input
                            type="text"
                            value={customUrl}
                            onChange={(e) => onUrlChange(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onSend()}
                            placeholder="/api/admin/..."
                            className="w-56 lg:w-72 bg-transparent px-2 text-purple-300 focus:outline-none text-[11px]"
                        />
                        <button
                            type="button"
                            onClick={onSend}
                            disabled={pending}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-500 via-rose-500 to-amber-500 px-3 py-1 text-[11px] font-black text-white hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                        >
                            {pending ? <span className="animate-spin text-xs">↻</span> : <span>RUN</span>}
                        </button>
                    </div>

                    {/* Quick Recent Queries chips */}
                    {recentQueries.length > 0 && onSelectRecentQuery && (
                        <div className="hidden 2xl:flex items-center gap-1 font-mono">
                            {recentQueries.slice(0, 2).map((rq) => (
                                <button
                                    key={rq}
                                    type="button"
                                    onClick={() => onSelectRecentQuery(rq)}
                                    className="truncate max-w-[130px] rounded px-1.5 py-0.5 text-[9.5px] bg-white/5 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                                >
                                    {rq.replace("/api/", "")}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Telemetry & Controls */}
                <div className="flex items-center gap-2 font-mono text-xs">
                    {/* Auto-Tour Toggle */}
                    {onToggleAutoTour && (
                        <button
                            type="button"
                            onClick={onToggleAutoTour}
                            title={autoTour ? "Pause Tour" : "Start Auto-Tour"}
                            className={`hidden sm:inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                                autoTour
                                    ? "border-amber-400/50 bg-amber-500/20 text-amber-300 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                                    : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                            }`}
                        >
                            <span>🌐</span>
                            <span>{autoTour ? "Orbiting" : "Tour"}</span>
                        </button>
                    )}

                    {/* Live Latency & Status Pill */}
                    <div className="hidden lg:flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px]">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-400">EDGE:</span>
                        <span className="font-bold text-amber-300">{latency}</span>
                        <span className="text-slate-600">·</span>
                        <span className="font-bold text-emerald-400">{status}</span>
                    </div>

                    {/* Category Filter Pills */}
                    {onSelectCategory && (
                        <div className="hidden xl:flex items-center gap-1 rounded-xl bg-black/40 p-0.5 border border-white/5 font-mono text-[10px]">
                            {(["ALL", "ADMIN", "BOUNDARIES", "GEOCODE", "SYSTEM"] as AtlasCategory[]).map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => onSelectCategory(cat)}
                                    className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                                        category === cat
                                            ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                                            : "text-slate-400 hover:text-white"
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* View Switchers */}
                    <button
                        type="button"
                        onClick={onOpenRaw}
                        title="View Raw JSON response"
                        className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px]"
                    >
                        <Icon name="code" className="size-3" />
                        <span>JSON</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenTable}
                        title="View Data Table"
                        className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px]"
                    >
                        <Icon name="table" className="size-3" />
                        <span>Table</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenParams}
                        title="Tune Request Parameters"
                        className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px]"
                    >
                        <span>Params</span>
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-0.5" />

                    {/* Language Switch */}
                    <button
                        type="button"
                        onClick={onToggleLang}
                        title="Toggle Khmer / English"
                        className="inline-flex h-7.5 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        {lang === "km" ? "ខ្មែរ" : "EN"}
                    </button>

                    {/* Theme Switch */}
                    <button
                        type="button"
                        onClick={onToggleTheme}
                        title="Toggle Theme"
                        className="inline-flex size-7.5 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <Icon name={theme === "dark" ? "sun" : "moon"} className="size-3.5" />
                    </button>

                    {/* Classic Console Switch */}
                    <button
                        type="button"
                        onClick={onToggleViewMode}
                        title="Switch to Classic Mode"
                        className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2.5 text-xs text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer font-bold"
                    >
                        <span>Classic</span>
                    </button>
                </div>
            </header>

            {/* ============================================================== */}
            {/* 2. MAIN FULL-CANVAS NETWORK MAP STAGE                          */}
            {/* ============================================================== */}
            <main className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center p-2 sm:p-4">
                <svg
                    viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                    className="h-full w-full max-h-[920px] select-none overflow-visible"
                    aria-label="Interactive Cambodia Spatial Network Map"
                >
                    <defs>
                        {/* Radiant Sunburst Glow Filter */}
                        <filter id="epicenter-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="16" result="blur1" />
                            <feGaussianBlur stdDeviation="8" result="blur2" />
                            <feMerge>
                                <feMergeNode in="blur1" />
                                <feMergeNode in="blur2" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        {/* Ray Beam Glow Filters */}
                        <filter id="beam-glow" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="6" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        {/* Gradient Beams Definitions (Purple -> Magenta -> Coral -> Amber -> Gold) */}
                        <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="30%" stopColor="#f59e0b" />
                            <stop offset="70%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#7c3aed" />
                        </linearGradient>

                        <linearGradient id="grad-magenta" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="25%" stopColor="#f43f5e" />
                            <stop offset="75%" stopColor="#d946ef" />
                            <stop offset="100%" stopColor="#9333ea" />
                        </linearGradient>

                        <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="20%" stopColor="#fde047" />
                            <stop offset="65%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#ea580c" />
                        </linearGradient>

                        <linearGradient id="grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="40%" stopColor="#fb923c" />
                            <stop offset="80%" stopColor="#f43f5e" />
                            <stop offset="100%" stopColor="#c026d3" />
                        </linearGradient>

                        <linearGradient id="grad-rose" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fde047" />
                            <stop offset="35%" stopColor="#fb7185" />
                            <stop offset="80%" stopColor="#e11d48" />
                            <stop offset="100%" stopColor="#881337" />
                        </linearGradient>

                        {/* Sunburst Core Radial Gradient */}
                        <radialGradient id="sunburst-radial" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                            <stop offset="20%" stopColor="#fef08a" stopOpacity="0.95" />
                            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
                            <stop offset="80%" stopColor="#e11d48" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {/* ============================================================== */}
                    {/* A. 25 PROVINCIAL BOUNDARY POLYGONS (DARK PLUM CHOROPLETH)       */}
                    {/* ============================================================== */}
                    <g id="province-polygons">
                        {PROVINCES.map((p) => {
                            const isEpicenter = p.code === epicenter.code;
                            const isHovered = p.code === hoveredCode;
                            const isHighlighted = highlightedCodes.has(p.code);

                            return (
                                <path
                                    key={p.code}
                                    d={p.d}
                                    vectorEffect="non-scaling-stroke"
                                    onClick={() => onSelectProvince(p)}
                                    onMouseEnter={() => setHoveredCode(p.code)}
                                    onMouseLeave={() => setHoveredCode(null)}
                                    fill={
                                        isEpicenter
                                            ? "#2a1538"
                                            : isHighlighted
                                            ? "#3b174a"
                                            : isHovered
                                            ? "#211630"
                                            : "#130f1d"
                                    }
                                    stroke={
                                        isEpicenter
                                            ? "#f59e0b"
                                            : isHighlighted
                                            ? "#d946ef"
                                            : isHovered
                                            ? "#a855f7"
                                            : "#ffffff"
                                    }
                                    strokeWidth={isEpicenter ? 2 : isHighlighted ? 1.8 : isHovered ? 1.5 : 0.8}
                                    strokeOpacity={isEpicenter ? 0.9 : isHighlighted ? 0.85 : isHovered ? 0.6 : 0.12}
                                    className="cursor-pointer transition-colors duration-200"
                                >
                                    <title>{`${p.en} (${p.km}) · NCDD #${p.code}`}</title>
                                </path>
                            );
                        })}
                    </g>

                    {/* ============================================================== */}
                    {/* B. RADIATING LUMINOUS BEAMS / RAYS (HAIRBALL OR CHORD MODE)    */}
                    {/* ============================================================== */}
                    {graphMode === "hairball" && (
                        <g id="hairball-rays" className="pointer-events-none">
                            {networkRays.map((ray) => (
                                <g key={`ray-${ray.code}`}>
                                    {/* Soft Ambient Glow Underlay */}
                                    <path
                                        d={ray.d}
                                        fill="none"
                                        stroke={`url(#${ray.meta.colorGrad})`}
                                        strokeWidth="10"
                                        strokeOpacity="0.25"
                                        strokeLinecap="round"
                                        filter="url(#beam-glow)"
                                    />
                                    {/* Main Gradient Beam */}
                                    <path
                                        d={ray.d}
                                        fill="none"
                                        stroke={`url(#${ray.meta.colorGrad})`}
                                        strokeWidth="4"
                                        strokeOpacity="0.85"
                                        strokeLinecap="round"
                                    />
                                    {/* Core Bright Filament Line */}
                                    <path
                                        d={ray.d}
                                        fill="none"
                                        stroke="#ffffff"
                                        strokeWidth="1.2"
                                        strokeOpacity="0.7"
                                        strokeLinecap="round"
                                    />

                                    {/* Floating Metric Pill badge on the ray */}
                                    <g transform={`translate(${ray.mx}, ${ray.my}) rotate(${ray.angle})`}>
                                        <rect
                                            x="-15"
                                            y="-8"
                                            width="30"
                                            height="16"
                                            rx="8"
                                            ry="8"
                                            fill="#0c0915"
                                            stroke="#ffffff"
                                            strokeWidth="1.2"
                                            strokeOpacity="0.75"
                                            filter="drop-shadow(0 2px 6px rgba(0,0,0,0.8))"
                                        />
                                        <text
                                            x="0"
                                            y="3.5"
                                            textAnchor="middle"
                                            className="fill-white font-mono text-[8.5px] font-black"
                                        >
                                            {ray.meta.metric}
                                        </text>
                                    </g>
                                </g>
                            ))}
                        </g>
                    )}

                    {/* Alternate Chord Rays Mode */}
                    {graphMode === "chord" && (
                        <g id="chord-rays" className="pointer-events-none">
                            {chordRays.map((cr, idx) => (
                                <path
                                    key={idx}
                                    d={cr.d}
                                    fill="none"
                                    stroke={cr.color}
                                    strokeWidth="2.5"
                                    strokeOpacity="0.5"
                                />
                            ))}
                        </g>
                    )}

                    {/* ============================================================== */}
                    {/* C. TARGET NODE HALO RINGS & LABELS (MATCHING REFERENCE UI)    */}
                    {/* ============================================================== */}
                    <g id="target-nodes">
                        {networkRays.map((ray) => {
                            const p = ray.target;
                            const stats = PROVINCE_STATS[p.code];
                            return (
                                <g
                                    key={`node-${p.code}`}
                                    className="cursor-pointer group"
                                    onClick={() => onSelectProvince(p)}
                                    onMouseEnter={() => setHoveredCode(p.code)}
                                    onMouseLeave={() => setHoveredCode(null)}
                                >
                                    {/* Outer Translucent Halo Ring (Red/Amber) */}
                                    <circle
                                        cx={p.cx}
                                        cy={p.cy}
                                        r="28"
                                        fill="#e11d48"
                                        fillOpacity="0.08"
                                        stroke="#f43f5e"
                                        strokeWidth="1"
                                        strokeOpacity="0.35"
                                    />
                                    <circle
                                        cx={p.cx}
                                        cy={p.cy}
                                        r="14"
                                        fill="#f59e0b"
                                        fillOpacity="0.15"
                                        stroke="#f59e0b"
                                        strokeWidth="1.2"
                                        strokeOpacity="0.5"
                                    />

                                    {/* Center White Core Dot */}
                                    <circle
                                        cx={p.cx}
                                        cy={p.cy}
                                        r="3.5"
                                        fill="#ffffff"
                                        filter="drop-shadow(0 0 6px #ffffff)"
                                    />

                                    {/* Dark Floating Name Badge Pinned Above/Beside Node */}
                                    <g transform={`translate(${p.cx - 60}, ${p.cy - 34})`} className="pointer-events-none">
                                        <rect
                                            width="120"
                                            height="22"
                                            rx="5"
                                            fill="#0c0916"
                                            fillOpacity="0.92"
                                            stroke="#ffffff"
                                            strokeWidth="0.8"
                                            strokeOpacity="0.25"
                                            filter="drop-shadow(0 4px 10px rgba(0,0,0,0.8))"
                                        />
                                        <text
                                            x="60"
                                            y="11"
                                            textAnchor="middle"
                                            className="fill-slate-100 font-sans text-[8.5px] font-bold"
                                        >
                                            {p.en}
                                        </text>
                                        <text
                                            x="60"
                                            y="19"
                                            textAnchor="middle"
                                            className="fill-purple-300 font-mono text-[7px]"
                                        >
                                            {stats?.districts || 8} Districts · {stats?.communes || 60} Communes
                                        </text>
                                    </g>
                                </g>
                            );
                        })}
                    </g>

                    {/* ============================================================== */}
                    {/* D. BACKGROUND SCATTERED PROVINCIAL CENTROIDS                    */}
                    {/* ============================================================== */}
                    <g id="background-nodes">
                        {PROVINCES.map((p) => {
                            if (p.code === epicenter.code || NETWORK_CONNECTIONS[p.code]) return null;
                            return (
                                <g
                                    key={`bg-node-${p.code}`}
                                    className="cursor-pointer"
                                    onClick={() => onSelectProvince(p)}
                                    onMouseEnter={() => setHoveredCode(p.code)}
                                    onMouseLeave={() => setHoveredCode(null)}
                                >
                                    {/* Tiny white centroid dot */}
                                    <circle
                                        cx={p.cx}
                                        cy={p.cy}
                                        r="2.5"
                                        fill="#e2e8f0"
                                        fillOpacity="0.6"
                                    />
                                    {/* Faint micro label */}
                                    <text
                                        x={p.cx}
                                        y={p.cy + 9}
                                        textAnchor="middle"
                                        className="fill-slate-500 font-mono text-[7px] pointer-events-none"
                                    >
                                        {p.en}
                                    </text>
                                </g>
                            );
                        })}
                    </g>

                    {/* ============================================================== */}
                    {/* E. CENTRAL RADIANT SUNBURST EPICENTER (THE FOCAL EXPLOSION)     */}
                    {/* ============================================================== */}
                    <g id="epicenter-star" className="cursor-pointer" onClick={() => onSelectProvince(epicenter)}>
                        {/* Outer Wide Concentric Pulsing Ring */}
                        <circle
                            cx={epicenter.cx}
                            cy={epicenter.cy}
                            r="52"
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                            strokeDasharray="4 6"
                            strokeOpacity="0.4"
                            className="animate-spin origin-center"
                            style={{ transformOrigin: `${epicenter.cx}px ${epicenter.cy}px`, animationDuration: "20s" }}
                        />

                        {/* Large Warm Orange Atmospheric Glow */}
                        <circle
                            cx={epicenter.cx}
                            cy={epicenter.cy}
                            r="42"
                            fill="url(#sunburst-radial)"
                            filter="url(#epicenter-glow)"
                        />

                        {/* Middle Bright Yellow Ring */}
                        <circle
                            cx={epicenter.cx}
                            cy={epicenter.cy}
                            r="18"
                            fill="#f59e0b"
                            fillOpacity="0.8"
                            filter="url(#epicenter-glow)"
                        />

                        {/* White-Hot Radiant Core Dot */}
                        <circle
                            cx={epicenter.cx}
                            cy={epicenter.cy}
                            r="7"
                            fill="#ffffff"
                            filter="drop-shadow(0 0 16px #ffffff)"
                        />

                        {/* Central Epicenter Label Box */}
                        <g transform={`translate(${epicenter.cx - 65}, ${epicenter.cy + 22})`} className="pointer-events-none">
                            <rect
                                width="130"
                                height="26"
                                rx="6"
                                fill="#0a0713"
                                stroke="#f59e0b"
                                strokeWidth="1.2"
                                filter="drop-shadow(0 4px 12px rgba(245,158,11,0.5))"
                            />
                            <text
                                x="65"
                                y="12"
                                textAnchor="middle"
                                className="fill-amber-300 font-sans text-[9px] font-black uppercase tracking-wider"
                            >
                                {epicenter.en}
                            </text>
                            <text
                                x="65"
                                y="21"
                                textAnchor="middle"
                                className="fill-slate-300 font-mono text-[7.5px]"
                            >
                                {epicenter.km} · Primary Epicenter
                            </text>
                        </g>
                    </g>

                    {/* F. Geocode Reticle Target Marker */}
                    {geocodeMarker && (
                        <g className="pointer-events-none" style={{ transformOrigin: `${geocodeMarker.x}px ${geocodeMarker.y}px` }}>
                            <circle cx={geocodeMarker.x} cy={geocodeMarker.y} r="22" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="6 4" className="animate-spin" />
                            <circle cx={geocodeMarker.x} cy={geocodeMarker.y} r="4" fill="#f43f5e" className="animate-ping" />
                            <circle cx={geocodeMarker.x} cy={geocodeMarker.y} r="3" fill="#ffffff" />
                            <text x={geocodeMarker.x} y={geocodeMarker.y + 32} textAnchor="middle" className="fill-rose-300 font-mono text-[9px] font-bold">
                                {geocodeMarker.label}
                            </text>
                        </g>
                    )}
                </svg>

                {/* ============================================================== */}
                {/* 3. BOTTOM-RIGHT LEGEND & GRAPH CONTROLS CARD (EXACT REF MATCH) */}
                {/* ============================================================== */}
                <aside
                    aria-label="Network Map Legend"
                    className="absolute bottom-5 right-5 z-40 w-64 rounded-2xl border border-white/10 bg-[#0c0915]/95 p-3.5 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] font-sans select-none"
                >
                    {/* Header: LEGEND + Collapse Toggle */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="font-display text-xs font-black tracking-widest text-white uppercase">
                            LEGEND
                        </span>
                        <button
                            type="button"
                            onClick={() => setLegendCollapsed(!legendCollapsed)}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                        >
                            {legendCollapsed ? "⌄" : "⌃"}
                        </button>
                    </div>

                    {!legendCollapsed && (
                        <div className="mt-2.5 space-y-3 font-mono text-[11px]">
                            {/* Section 1: Connections Density Gradient Bar */}
                            <div>
                                <div className="text-[10px] text-slate-400 mb-1.5 font-semibold">Connections</div>
                                <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 via-rose-500 via-orange-500 to-yellow-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                                <div className="flex items-center justify-between mt-1 text-[8.5px] text-slate-500 font-bold">
                                    <span>0</span>
                                    <span>20</span>
                                    <span>40</span>
                                    <span>60</span>
                                    <span>80</span>
                                    <span>100</span>
                                </div>
                            </div>

                            {/* Section 2: Network Graph Selector Radio Buttons */}
                            <div className="border-t border-white/5 pt-2">
                                <div className="text-[10px] text-slate-400 mb-1.5 font-semibold">Network Graph</div>
                                <div className="space-y-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setGraphMode("hairball")}
                                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left transition-colors cursor-pointer ${
                                            graphMode === "hairball"
                                                ? "bg-purple-500/20 text-white font-bold border border-purple-500/30"
                                                : "text-slate-400 hover:text-slate-200"
                                        }`}
                                    >
                                        <span className={`size-2 rounded-full ${graphMode === "hairball" ? "bg-amber-400 shadow-[0_0_6px_#f59e0b]" : "border border-slate-500"}`} />
                                        <span>Hairball Diagram</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setGraphMode("chord")}
                                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left transition-colors cursor-pointer ${
                                            graphMode === "chord"
                                                ? "bg-purple-500/20 text-white font-bold border border-purple-500/30"
                                                : "text-slate-400 hover:text-slate-200"
                                        }`}
                                    >
                                        <span className={`size-2 rounded-full ${graphMode === "chord" ? "bg-amber-400 shadow-[0_0_6px_#f59e0b]" : "border border-slate-500"}`} />
                                        <span>Chord Diagram</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setGraphMode("hierarchical")}
                                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left transition-colors cursor-pointer ${
                                            graphMode === "hierarchical"
                                                ? "bg-purple-500/20 text-white font-bold border border-purple-500/30"
                                                : "text-slate-400 hover:text-slate-200"
                                        }`}
                                    >
                                        <span className={`size-2 rounded-full ${graphMode === "hierarchical" ? "bg-amber-400 shadow-[0_0_6px_#f59e0b]" : "border border-slate-500"}`} />
                                        <span>Hierarchical Network</span>
                                    </button>
                                </div>
                            </div>

                            {/* Section 3: Administrative Tier Hierarchy Switch */}
                            {onSelectTier && (
                                <div className="border-t border-white/5 pt-2">
                                    <div className="text-[10px] text-slate-400 mb-1 font-semibold">Hierarchy Filter</div>
                                    <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                                        {[
                                            { id: "all", label: "All Tiers" },
                                            { id: "province", label: "Provinces (25)" },
                                            { id: "district", label: "Districts (210)" },
                                            { id: "commune", label: "Communes (1.6k)" },
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => onSelectTier(t.id as any)}
                                                className={`px-1.5 py-0.5 rounded text-left transition-colors cursor-pointer ${
                                                    tier === t.id
                                                        ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                                                        : "text-slate-400 hover:text-white"
                                                }`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </aside>

                {/* Circular Focus Orb Lens Button next to Legend */}
                <button
                    type="button"
                    onClick={() => onSelectProvince(PROVINCES.find((p) => p.code === "12") || PROVINCES[0])}
                    title="Reset Focus to Phnom Penh Capital"
                    className="absolute bottom-5 right-72 z-40 size-10 rounded-full border border-white/20 bg-[#0d0917]/90 flex items-center justify-center text-amber-300 hover:scale-105 hover:border-amber-400 transition-all cursor-pointer shadow-[0_0_16px_rgba(0,0,0,0.8)]"
                >
                    <span className="size-4 rounded-full border-2 border-amber-400/80 animate-ping absolute" />
                    <span className="size-3 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                </button>

                {/* Floating Response Place Chips Strip (Centered Bottom) */}
                {placeChips.length > 0 && onSelectPlaceChip && onDrillDown && (
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 w-[min(90%,680px)] hidden sm:block">
                        <AtlasPlaceChips
                            items={placeChips}
                            activeCode={epicenter.code}
                            onSelectPlace={onSelectPlaceChip}
                            onDrillDown={onDrillDown}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
