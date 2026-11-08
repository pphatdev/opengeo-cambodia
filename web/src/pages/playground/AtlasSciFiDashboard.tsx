import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { type Endpoint } from "../docs/endpoints";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCES, type HeroProvince } from "../home/cambodiaMap";
import { type RequestLog } from "../../lib/api";
import { PROVINCE_STATS } from "./provinceStats";
import { EndpointSelector } from "./EndpointSelector";
import { type AtlasCategory, type AtlasTier } from "./AtlasTopBar";
import { type PlaceChipItem } from "./AtlasPlaceChips";

export interface AtlasSciFiDashboardProps {
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

interface ServerRow {
    ip: string;
    endpointPath: string;
    statusLabel: string;
    statusType: "overload" | "blue" | "offline" | "cyan" | "up";
    loadPercent: number;
}

const SERVER_LIST: ServerRow[] = [
    { ip: "20.128.178.66:", endpointPath: "/api/v1/provinces", statusLabel: "Overload", statusType: "overload", loadPercent: 88 },
    { ip: "137.22.105.166:", endpointPath: "/api/v1/districts", statusLabel: "67%", statusType: "blue", loadPercent: 67 },
    { ip: "233.159.178.83:", endpointPath: "/api/v1/communes", statusLabel: "Overload", statusType: "overload", loadPercent: 94 },
    { ip: "35.201.94.168:", endpointPath: "/api/v1/villages", statusLabel: "Offline", statusType: "offline", loadPercent: 0 },
    { ip: "204.151.57.91:", endpointPath: "/api/v1/postcodes", statusLabel: "12.44%", statusType: "cyan", loadPercent: 12 },
    { ip: "104.28.19.44:", endpointPath: "/api/v1/lookup", statusLabel: "200 OK", statusType: "up", loadPercent: 42 },
];

// Node beacons distributed across Cambodia
interface BeaconNode {
    id: string;
    code: string;
    name: string;
    cx: number;
    cy: number;
    status: "active" | "offline" | "overload" | "unactive";
}

const BEACON_NODES: BeaconNode[] = [
    { id: "node-pp", code: "12", name: "Phnom Penh Hub", cx: 535, cy: 546, status: "active" },
    { id: "node-sr", code: "17", name: "Siem Reap Gateway", cx: 340, cy: 260, status: "active" },
    { id: "node-bb", code: "02", name: "Battambang Relay", cx: 180, cy: 330, status: "active" },
    { id: "node-shv", code: "18", name: "Sihanoukville Deep Sea", cx: 320, cy: 690, status: "active" },
    { id: "node-kk", code: "09", name: "Koh Kong Coastal", cx: 210, cy: 590, status: "offline" },
    { id: "node-bm", code: "01", name: "Poipet Border", cx: 120, cy: 200, status: "overload" },
    { id: "node-kc", code: "03", name: "Kampong Cham East", cx: 620, cy: 490, status: "overload" },
    { id: "node-st", code: "19", name: "Stung Treng Mekong", cx: 720, cy: 240, status: "unactive" },
    { id: "node-rat", code: "16", name: "Ratanakiri Highland", cx: 880, cy: 210, status: "active" },
    { id: "node-kpt", code: "07", name: "Kampot Bokor", cx: 410, cy: 690, status: "active" },
    { id: "node-kdl", code: "08", name: "Kandal Perimeter", cx: 520, cy: 590, status: "active" },
    { id: "node-pvh", code: "13", name: "Preah Vihear Temple", cx: 510, cy: 160, status: "unactive" },
    { id: "node-mdk", code: "11", name: "Mondulkiri Pine", cx: 850, cy: 450, status: "active" },
    { id: "node-kpc", code: "04", name: "Kampong Chhnang Basin", cx: 430, cy: 470, status: "active" },
    { id: "node-svy", code: "20", name: "Svay Rieng Bavet", cx: 710, cy: 620, status: "active" },
    { id: "node-tk", code: "21", name: "Takeo Cradle", cx: 480, cy: 640, status: "active" },
    { id: "node-kps", code: "05", name: "Kampong Speu Range", cx: 390, cy: 570, status: "active" },
    { id: "node-pbg", code: "15", name: "Prey Veng Plain", cx: 640, cy: 570, status: "active" },
];

export function AtlasSciFiDashboard({
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
    theme: _theme,
    lang,
    onToggleLang,
}: AtlasSciFiDashboardProps) {
    const [hoveredProvince, setHoveredProvince] = useState<HeroProvince | null>(null);
    const [hoveredDonutIdx, setHoveredDonutIdx] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    // Active province stats
    const activeStats = PROVINCE_STATS[activeProvince.code];

    // Copy cURL command
    const handleCopyCurl = () => {
        const fullUrl = `https://cambodia.opengeo.cloud${customUrl}`;
        const cmd = `curl -s "${fullUrl}"`;
        navigator.clipboard.writeText(cmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Auto-update request rate metric for active province
    const provinceRequestRate = useMemo(() => {
        const base = 350 + (parseInt(activeProvince.code, 10) * 17) % 280;
        return base;
    }, [activeProvince.code]);

    // Data used segments definition (matching reference screenshot)
    const donutSegments = useMemo(() => [
        { pct: 34, id: "#1253", label: "Communes", angle: -70, span: 110, color: "#00e5ff" },
        { pct: 10, id: "#7683", label: "Coordinates", angle: 45, span: 35, color: "#0284c7" },
        { pct: 3, id: "#7485", label: "Geo Cache", angle: 85, span: 12, color: "#38bdf8" },
        { pct: 6, id: "#6732", label: "Boundaries", angle: 102, span: 22, color: "#06b6d4" },
        { pct: 7, id: "#3673", label: "Postcodes", angle: 130, span: 26, color: "#0ea5e9" },
        { pct: 13, id: "#6799", label: "Districts", angle: 162, span: 45, color: "#60a5fa" },
        { pct: 27, id: "#1452", label: "Villages", angle: 213, span: 72, color: "#818cf8" },
    ], []);

    // SVG Elbow Callout path calculation for active province
    const calloutGeometry = useMemo(() => {
        const x0 = activeProvince.cx;
        const y0 = activeProvince.cy;

        // Position callout box to the left of the province
        const boxWidth = 140;
        const boxHeight = 54;
        
        // Compute ideal anchor position to keep it inside view
        const anchorX = Math.max(20, Math.min(x0 - 180, 260));
        const anchorY = Math.max(340, Math.min(y0 - 20, 560));

        // Elbow connector line: Start at (x0, y0), line to (anchorX + boxWidth, y0), vertical/diagonal to box
        const path = `M ${x0} ${y0} L ${anchorX + boxWidth + 20} ${y0} L ${anchorX + boxWidth} ${anchorY + boxHeight / 2}`;

        return { x0, y0, anchorX, anchorY, boxWidth, boxHeight, path };
    }, [activeProvince]);

    return (
        <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-[#050c18] text-sky-100 select-none font-sans">
            {/* Background High-Tech Subtle Grid Overlay */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(0, 229, 255, 0.08) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0, 229, 255, 0.08) 1px, transparent 1px)
                    `,
                    backgroundSize: "40px 40px"
                }}
            />

            {/* Glowing Corner Accents (Outer HUD Frame) */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-30" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-30" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-cyan-400 pointer-events-none z-30" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-cyan-400 pointer-events-none z-30" />

            {/* ============================================================== */}
            {/* 1. TOP CONTROL HUD BAR */}
            {/* ============================================================== */}
            <header className="relative z-20 flex items-center justify-between px-5 py-2.5 bg-[#061224]/90 backdrop-blur-md border-b border-cyan-900/60 shadow-lg shadow-black/40">
                {/* Brand & Status Badge */}
                <div className="flex items-center gap-3">
                    <Link
                        to="/"
                        className="flex items-center gap-2 group text-white hover:text-cyan-300 transition-colors"
                        title="Back to Documentation"
                    >
                        <div className="w-8 h-8 rounded border border-cyan-500/50 bg-cyan-950/60 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 group-hover:shadow-[0_0_12px_rgba(0,229,255,0.6)] transition-all">
                            <span className="font-mono text-sm font-bold tracking-tighter">⚡</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-mono font-bold text-xs tracking-wider uppercase text-cyan-300">
                                [ OPENGEO COMMAND ]
                            </span>
                            <span className="text-[10px] text-cyan-500/80 font-mono tracking-tight">
                                CAMBODIA GEOINT ATLAS
                            </span>
                        </div>
                    </Link>

                    {/* Latency / Active Beacon indicator */}
                    <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#091b35] border border-cyan-800/40 text-[11px] font-mono text-cyan-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>ONLINE: 99.99%</span>
                        <span className="text-cyan-600">|</span>
                        <span>{log?.status === 200 ? `${log.ms}ms` : "12ms"}</span>
                    </div>
                </div>

                {/* Center: Live URL Bar & Execution Controls */}
                <div className="flex items-center gap-2 flex-1 max-w-2xl mx-4">
                    {/* Endpoint Selector Dropdown */}
                    <div className="w-56 shrink-0">
                        <EndpointSelector
                            endpoints={endpoints}
                            selected={selectedEndpoint}
                            onSelect={onSelectEndpoint}
                            variant="compact"
                        />
                    </div>

                    {/* Interactive URL Input Bar */}
                    <div className="relative flex-1 flex items-center bg-[#07172e] border border-cyan-600/40 focus-within:border-cyan-400 rounded px-2.5 py-1 text-xs font-mono transition-all">
                        <span className="text-emerald-400 font-bold mr-2 text-[11px] shrink-0">GET</span>
                        <input
                            type="text"
                            value={customUrl}
                            onChange={(e) => onUrlChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !pending) onSend();
                            }}
                            className="bg-transparent text-cyan-200 w-full outline-none placeholder-cyan-700/60 font-mono text-xs"
                            placeholder="/api/v1/provinces"
                        />
                        <button
                            type="button"
                            onClick={handleCopyCurl}
                            className="text-cyan-500 hover:text-cyan-200 ml-1.5 transition-colors p-1"
                            title="Copy cURL command"
                        >
                            <Icon name={copied ? "check" : "copy"} className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* RUN QUERY Execution Button */}
                    <button
                        type="button"
                        onClick={onSend}
                        disabled={pending}
                        className={`px-4 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
                            pending
                                ? "bg-cyan-900/40 text-cyan-500 border border-cyan-800/50 cursor-wait"
                                : "bg-cyan-500/20 hover:bg-cyan-500/30 active:bg-cyan-500/40 text-cyan-300 border border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_20px_rgba(0,229,255,0.6)]"
                        }`}
                    >
                        {pending ? (
                            <>
                                <span className="w-3 h-3 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
                                <span>EXECUTING</span>
                            </>
                        ) : (
                            <>
                                <span className="text-cyan-400">▶</span>
                                <span>RUN</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Right Action Tools: Raw JSON, Table, Language & View Toggle */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onOpenRaw}
                        className="px-2.5 py-1 rounded bg-[#091b35] hover:bg-[#0c2447] text-cyan-300 hover:text-cyan-100 border border-cyan-800/60 hover:border-cyan-500 text-[11px] font-mono transition-all flex items-center gap-1"
                        title="Open Raw JSON Drawer"
                    >
                        <Icon name="code" className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden lg:inline">JSON</span>
                    </button>
                    <button
                        type="button"
                        onClick={onOpenTable}
                        className="px-2.5 py-1 rounded bg-[#091b35] hover:bg-[#0c2447] text-cyan-300 hover:text-cyan-100 border border-cyan-800/60 hover:border-cyan-500 text-[11px] font-mono transition-all flex items-center gap-1"
                        title="Open Structured Table Drawer"
                    >
                        <Icon name="table" className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden lg:inline">TABLE</span>
                    </button>
                    <button
                        type="button"
                        onClick={onOpenParams}
                        className="px-2.5 py-1 rounded bg-[#091b35] hover:bg-[#0c2447] text-cyan-300 hover:text-cyan-100 border border-cyan-800/60 hover:border-cyan-500 text-[11px] font-mono transition-all flex items-center gap-1"
                        title="Edit Query Parameters"
                    >
                        <span className="text-cyan-400">⚙</span>
                        <span className="hidden lg:inline">PARAMS</span>
                    </button>
                    <button
                        type="button"
                        onClick={onToggleLang}
                        className="px-2 py-1 rounded bg-[#091b35] hover:bg-[#0c2447] text-cyan-300 hover:text-cyan-100 border border-cyan-800/60 text-[11px] font-mono transition-all"
                        title="Toggle Language"
                    >
                        {lang === "km" ? "ភាសាខ្មែរ" : "EN"}
                    </button>
                    <button
                        type="button"
                        onClick={onToggleViewMode}
                        className="px-2.5 py-1 rounded bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-600/50 hover:border-cyan-400 text-[11px] font-mono transition-all"
                        title="Switch to Classic Two-Column Console"
                    >
                        CLASSIC
                    </button>
                </div>
            </header>

            {/* ============================================================== */}
            {/* 2. MAIN COCKPIT BODY (3-ZONE TACTICAL BLUEPRINT) */}
            {/* ============================================================== */}
            <main className="relative flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
                {/* ---------------------------------------------------------- */}
                {/* ZONE A: LEFT PANEL [ SERVERS ] & STATUS SCALE */}
                {/* ---------------------------------------------------------- */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0 z-10">
                    {/* [ SERVERS ] Card (HUD Bracket Box) */}
                    <div className="relative flex flex-col flex-1 p-3.5 bg-[#071325]/85 border border-cyan-900/60 rounded backdrop-blur-md overflow-hidden">
                        {/* HUD Header */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-900/40">
                            <span className="font-mono text-xs font-bold tracking-widest text-cyan-300 uppercase">
                                [ SERVERS ]
                            </span>
                            {/* Dotted HUD Crosshair Target Marker */}
                            <div className="w-4 h-4 border border-dashed border-cyan-500/50 flex items-center justify-center text-[10px] text-cyan-400">
                                ❖
                            </div>
                        </div>

                        {/* Server / Endpoints Table Rows */}
                        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
                            {SERVER_LIST.map((srv, idx) => {
                                const isMatched = selectedEndpoint.path.includes(srv.endpointPath.replace("/api/v1/", ""));
                                return (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between px-2.5 py-1.5 rounded transition-all text-xs font-mono group cursor-pointer ${
                                            isMatched
                                                ? "bg-cyan-950/70 border border-cyan-500/60 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                                                : "bg-[#091a33]/60 hover:bg-[#0c2447] border border-cyan-900/30"
                                        }`}
                                        onClick={() => {
                                            const found = endpoints.find(e => e.path === srv.endpointPath || e.path.startsWith(srv.endpointPath));
                                            if (found) {
                                                onSelectEndpoint(found);
                                                onUrlChange(srv.endpointPath);
                                            }
                                        }}
                                    >
                                        <div className="flex flex-col min-w-0 pr-1">
                                            <span className="text-[11px] text-cyan-400 font-mono tracking-tight truncate">
                                                {srv.ip}
                                            </span>
                                            <span className="text-[10px] text-sky-300/70 truncate">
                                                {srv.endpointPath.replace("/api/v1", "")}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* Status Badge Tag */}
                                            {srv.statusType === "overload" && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                                    {srv.statusLabel}
                                                </span>
                                            )}
                                            {srv.statusType === "blue" && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/40">
                                                    {srv.statusLabel}
                                                </span>
                                            )}
                                            {srv.statusType === "offline" && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                                    {srv.statusLabel}
                                                </span>
                                            )}
                                            {srv.statusType === "cyan" && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                                    {srv.statusLabel}
                                                </span>
                                            )}
                                            {srv.statusType === "up" && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                    {srv.statusLabel}
                                                </span>
                                            )}

                                            {/* Direct Run Action Arrow */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const found = endpoints.find(ep => ep.path === srv.endpointPath || ep.path.startsWith(srv.endpointPath));
                                                    if (found) {
                                                        onSelectEndpoint(found);
                                                        onUrlChange(srv.endpointPath);
                                                        setTimeout(() => onSend(), 50);
                                                    }
                                                }}
                                                className="w-5 h-5 flex items-center justify-center rounded text-cyan-400 hover:text-white hover:bg-cyan-500/30 transition-all font-mono"
                                                title={`Execute ${srv.endpointPath}`}
                                            >
                                                →
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Ghosted Monospace Telemetry Code Stream (Matches Reference Background) */}
                        <div className="relative mt-auto pt-3 border-t border-cyan-900/30 text-[9px] font-mono text-cyan-700/50 leading-relaxed overflow-hidden select-none pointer-events-none max-h-24">
                            <div>0x7FFE0492: CAM_GEO_ROUTER_ACTIVE</div>
                            <div>PING: [103.216.50.12] OK 0.18ms</div>
                            <div>ENCODING: UTF-8 (KHMER UNICODE COMPLIANT)</div>
                            <div>POLYGON_INDEX: R-TREE 25 PROVINCES 210 DISTRICTS</div>
                            <div>CACHE: HIT_RATIO 98.4% LATCHES: 4922</div>
                        </div>
                    </div>

                    {/* Bottom-Left Status Scale & Indicators (Matches Reference Screenshot) */}
                    <div className="flex items-end justify-between px-3 py-2 bg-[#071325]/70 border border-cyan-900/50 rounded backdrop-blur-md">
                        {/* Percentage Scale */}
                        <div className="flex flex-col gap-0.5 font-mono text-[9px] text-cyan-500/80">
                            <span>100%</span>
                            <span>75%</span>
                            <span>50%</span>
                            <span>25%</span>
                        </div>

                        {/* Status Dots Stacked Legend */}
                        <div className="flex flex-col gap-1 font-mono text-[10px]">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,229,255,0.8)]" />
                                <span className="text-cyan-200">Up</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                                <span className="text-rose-300">Offline</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                                <span className="text-amber-200">Overload</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-500" />
                                <span className="text-slate-400">Unactive</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse shadow-[0_0_8px_rgba(0,229,255,1)]" />
                                <span className="text-cyan-100 font-semibold">Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* ZONE B: CENTER TACTICAL BLUEPRINT MAP & GAUGES */}
                {/* ---------------------------------------------------------- */}
                <div className="col-span-12 lg:col-span-6 relative flex flex-col justify-between p-2 min-h-[460px] z-0">
                    {/* SVG Map Canvas */}
                    <div className="relative flex-1 w-full h-full flex items-center justify-center">
                        <svg
                            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                            className="w-full h-full max-h-[70vh] filter drop-shadow-[0_0_25px_rgba(0,229,255,0.1)]"
                        >
                            <defs>
                                {/* Glow Filter for Active Province */}
                                <filter id="active-province-glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="6" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>

                                {/* Beacon Glow Filter */}
                                <filter id="beacon-glow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feColorMatrix type="matrix" values="0 0 0 0 0   0 1 0 0 0   0 0 1 0 0  0 0 0 2 0" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>

                                {/* Cyan Linear Gradient for Active Fill */}
                                <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#00b4d8" stopOpacity="0.95" />
                                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.85" />
                                </linearGradient>
                            </defs>

                            {/* 1. Base Provinces Polygons */}
                            <g id="provinces-layer">
                                {PROVINCES.map((prov) => {
                                    const isActive = prov.code === activeProvince.code;
                                    const isHovered = hoveredProvince?.code === prov.code;

                                    return (
                                        <path
                                            key={prov.code}
                                            d={prov.d}
                                            onClick={() => {
                                                onSelectProvince(prov);
                                                onUrlChange(`/api/v1/provinces/${prov.code}`);
                                            }}
                                            onMouseEnter={() => setHoveredProvince(prov)}
                                            onMouseLeave={() => setHoveredProvince(null)}
                                            className="cursor-pointer transition-all duration-300"
                                            fill={
                                                isActive
                                                    ? "url(#activeGrad)"
                                                    : isHovered
                                                    ? "#0d2b52"
                                                    : "#091c33"
                                            }
                                            stroke={
                                                isActive
                                                    ? "#ffffff"
                                                    : isHovered
                                                    ? "#00e5ff"
                                                    : "#0e3a63"
                                            }
                                            strokeWidth={isActive ? 2.5 : isHovered ? 1.8 : 1.2}
                                            filter={isActive ? "url(#active-province-glow)" : undefined}
                                        />
                                    );
                                })}
                            </g>

                            {/* 2. Scattered Node Beacons Across Cambodia (Cyan, Offline Rose, Overload Amber) */}
                            <g id="beacon-nodes-layer">
                                {BEACON_NODES.map((node) => {
                                    const isTarget = node.code === activeProvince.code;
                                    return (
                                        <g key={node.id} className="cursor-pointer" onClick={() => {
                                            const p = PROVINCES.find(pr => pr.code === node.code);
                                            if (p) onSelectProvince(p);
                                        }}>
                                            {/* Concentric pulsing radar ring if active */}
                                            {node.status === "active" && (
                                                <circle
                                                    cx={node.cx}
                                                    cy={node.cy}
                                                    r={isTarget ? 14 : 9}
                                                    fill="none"
                                                    stroke="#00e5ff"
                                                    strokeWidth={1}
                                                    className="animate-ping opacity-60"
                                                />
                                            )}

                                            {/* Beacon core dot */}
                                            <circle
                                                cx={node.cx}
                                                cy={node.cy}
                                                r={isTarget ? 5 : 3.5}
                                                fill={
                                                    node.status === "active"
                                                        ? "#00e5ff"
                                                        : node.status === "offline"
                                                        ? "#f43f5e"
                                                        : node.status === "overload"
                                                        ? "#fbbf24"
                                                        : "#64748b"
                                                }
                                                stroke="#050c18"
                                                strokeWidth={1.5}
                                                filter="url(#beacon-glow)"
                                            />
                                        </g>
                                    );
                                })}
                            </g>

                            {/* 3. Elbow Callout Line pointing to Active Province (Exact Match with Reference) */}
                            <g id="callout-pointer-layer">
                                {/* Centroid anchor dot on the active province */}
                                <circle
                                    cx={calloutGeometry.x0}
                                    cy={calloutGeometry.y0}
                                    r={4}
                                    fill="#ffffff"
                                    stroke="#00e5ff"
                                    strokeWidth={2}
                                />
                                <circle
                                    cx={calloutGeometry.x0}
                                    cy={calloutGeometry.y0}
                                    r={10}
                                    fill="none"
                                    stroke="#00e5ff"
                                    strokeWidth={1}
                                    className="animate-pulse"
                                />

                                {/* Angled elbow connecting line */}
                                <path
                                    d={calloutGeometry.path}
                                    fill="none"
                                    stroke="#00e5ff"
                                    strokeWidth={1.6}
                                    strokeDasharray="4 2"
                                />
                            </g>
                        </svg>

                        {/* Floating Callout Badge Card (Anchored to Elbow Connector) */}
                        <div
                            className="absolute z-20 flex flex-col p-2.5 rounded bg-[#061426]/90 border border-cyan-400 backdrop-blur-md shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all pointer-events-auto"
                            style={{
                                left: `${(calloutGeometry.anchorX / MAP_WIDTH) * 100}%`,
                                top: `${(calloutGeometry.anchorY / MAP_HEIGHT) * 100}%`,
                                minWidth: "150px"
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-cyan-400 text-sm">⚏</span>
                                <span className="font-mono text-lg font-bold text-white tracking-tight">
                                    {provinceRequestRate}
                                </span>
                            </div>
                            <span className="font-mono text-[10px] text-cyan-300 uppercase tracking-wider">
                                Request / Min
                            </span>
                            <div className="mt-1 pt-1 border-t border-cyan-800/50 flex items-center justify-between text-[10px] font-mono">
                                <span className="text-white font-semibold">
                                    {lang === "km" ? activeProvince.km : activeProvince.en}
                                </span>
                                <span className="text-cyan-400">
                                    {activeStats?.districts ?? 9} Dist
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Lower-Center 4 Circular Micro Meters (Matches Reference Dials) */}
                    <div className="flex items-center justify-center gap-6 py-2 mt-auto z-10">
                        {/* Dial 1: 68 CPU 1 / Provinces */}
                        <div className="flex flex-col items-center">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="#09203a" strokeWidth="3" />
                                    <circle
                                        cx="18" cy="18" r="14" fill="none" stroke="#00e5ff" strokeWidth="3"
                                        strokeDasharray="88" strokeDashoffset={88 - 88 * 0.68}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute font-mono text-[11px] font-bold text-white">68</span>
                            </div>
                            <span className="font-mono text-[9px] text-cyan-400 uppercase mt-0.5">CPU 1</span>
                        </div>

                        {/* Dial 2: 55 CPU 2 / Districts */}
                        <div className="flex flex-col items-center">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="#09203a" strokeWidth="3" />
                                    <circle
                                        cx="18" cy="18" r="14" fill="none" stroke="#00e5ff" strokeWidth="3"
                                        strokeDasharray="88" strokeDashoffset={88 - 88 * 0.55}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute font-mono text-[11px] font-bold text-white">55</span>
                            </div>
                            <span className="font-mono text-[9px] text-cyan-400 uppercase mt-0.5">CPU 2</span>
                        </div>

                        {/* Dial 3: 79 CPU 3 / Communes */}
                        <div className="flex flex-col items-center">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="#09203a" strokeWidth="3" />
                                    <circle
                                        cx="18" cy="18" r="14" fill="none" stroke="#00e5ff" strokeWidth="3"
                                        strokeDasharray="88" strokeDashoffset={88 - 88 * 0.79}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute font-mono text-[11px] font-bold text-white">79</span>
                            </div>
                            <span className="font-mono text-[9px] text-cyan-400 uppercase mt-0.5">CPU 3</span>
                        </div>

                        {/* Dial 4: 68 CPU 4 / Villages */}
                        <div className="flex flex-col items-center">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="#09203a" strokeWidth="3" />
                                    <circle
                                        cx="18" cy="18" r="14" fill="none" stroke="#00e5ff" strokeWidth="3"
                                        strokeDasharray="88" strokeDashoffset={88 - 88 * 0.68}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute font-mono text-[11px] font-bold text-white">68</span>
                            </div>
                            <span className="font-mono text-[9px] text-cyan-400 uppercase mt-0.5">CPU 4</span>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* ZONE C: RIGHT HUD PANELS (DATA USED, STATS, ACTIVITY) */}
                {/* ---------------------------------------------------------- */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0 z-10">
                    {/* 1. [ DATA USED ] Radial Spoke Donut Ring */}
                    <div className="relative flex flex-col p-3 bg-[#071325]/85 border border-cyan-900/60 rounded backdrop-blur-md">
                        {/* HUD Header with Info Icon */}
                        <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-cyan-900/40">
                            <span className="font-mono text-xs font-bold tracking-widest text-cyan-300 uppercase">
                                [ DATA USED ]
                            </span>
                            <span className="text-cyan-500 text-xs font-mono">ⓘ</span>
                        </div>

                        {/* Donut Graphic Canvas with Leader Spokes */}
                        <div className="relative w-full h-44 flex items-center justify-center">
                            <svg viewBox="0 0 280 200" className="w-full h-full">
                                {/* Central 3D Database Cylinder Icon */}
                                <g transform="translate(140, 100)">
                                    <circle cx="0" cy="0" r="24" fill="#06182e" stroke="#00e5ff" strokeWidth="1.5" />
                                    {/* 3D Database Cylinders */}
                                    <ellipse cx="0" cy="-6" rx="10" ry="3.5" fill="none" stroke="#00e5ff" strokeWidth="1.2" />
                                    <path d="M -10 -6 V 0 C -10 2.5 10 2.5 10 0 V -6" fill="none" stroke="#00e5ff" strokeWidth="1.2" />
                                    <path d="M -10 0 V 6 C -10 8.5 10 8.5 10 6 V 0" fill="none" stroke="#00e5ff" strokeWidth="1.2" />
                                </g>

                                {/* Segmented Arcs & Spokes */}
                                {donutSegments.map((seg, i) => {
                                    const rad = (seg.angle * Math.PI) / 180;
                                    const rInner = 36;
                                    const rOuter = 52;
                                    const rSpoke = 80;

                                    // Spoke line end coordinates
                                    const spokeStartX = 140 + Math.cos(rad) * (rOuter + 3);
                                    const spokeStartY = 100 + Math.sin(rad) * (rOuter + 3);
                                    const spokeEndX = 140 + Math.cos(rad) * rSpoke;
                                    const spokeEndY = 100 + Math.sin(rad) * rSpoke;

                                    const isHovered = hoveredDonutIdx === i;

                                    return (
                                        <g key={seg.id} onMouseEnter={() => setHoveredDonutIdx(i)} onMouseLeave={() => setHoveredDonutIdx(null)}>
                                            {/* Donut Segment Arc */}
                                            <circle
                                                cx="140"
                                                cy="100"
                                                r={(rInner + rOuter) / 2}
                                                fill="none"
                                                stroke={seg.color}
                                                strokeWidth={isHovered ? 16 : 12}
                                                strokeDasharray={`${(seg.span / 360) * 2 * Math.PI * ((rInner + rOuter) / 2)} 1000`}
                                                transform={`rotate(${seg.angle} 140 100)`}
                                                className="transition-all duration-200 cursor-pointer"
                                                opacity={isHovered ? 1 : 0.85}
                                            />

                                            {/* Radiating Leader Spoke Line */}
                                            <line
                                                x1={spokeStartX}
                                                y1={spokeStartY}
                                                x2={spokeEndX}
                                                y2={spokeEndY}
                                                stroke="#00e5ff"
                                                strokeWidth="1"
                                                strokeDasharray="2 2"
                                                opacity={0.6}
                                            />

                                            {/* Percentage & ID Label Text */}
                                            <text
                                                x={spokeEndX + (Math.cos(rad) >= 0 ? 4 : -4)}
                                                y={spokeEndY + (Math.sin(rad) >= 0 ? 3 : -3)}
                                                textAnchor={Math.cos(rad) >= 0 ? "start" : "end"}
                                                className="font-mono text-[9px] fill-white font-bold"
                                            >
                                                {seg.pct}%
                                            </text>
                                            <text
                                                x={spokeEndX + (Math.cos(rad) >= 0 ? 4 : -4)}
                                                y={spokeEndY + (Math.sin(rad) >= 0 ? 11 : 5)}
                                                textAnchor={Math.cos(rad) >= 0 ? "start" : "end"}
                                                className="font-mono text-[7.5px] fill-cyan-400 font-semibold"
                                            >
                                                {seg.id}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>

                    {/* 2. [ GLOBAL STATISTICS ] Dual KPIs with Wave Sparklines */}
                    <div className="relative flex flex-col p-3 bg-[#071325]/85 border border-cyan-900/60 rounded backdrop-blur-md">
                        {/* HUD Header */}
                        <div className="pb-1.5 mb-1.5 border-b border-cyan-900/40">
                            <span className="font-mono text-xs font-bold tracking-widest text-cyan-300 uppercase">
                                [ GLOBAL STATISTICS ]
                            </span>
                        </div>

                        {/* Dual Cards Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Card 1: Requests (2357, 34.85% Down) */}
                            <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-cyan-500 uppercase">Requests</span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="font-mono text-xl font-bold text-white tracking-tight">2357</span>
                                    <span className="font-mono text-[9px] text-rose-400 font-semibold">34.85% ↓</span>
                                </div>
                                {/* Wave Sparkline 1 (Rose) */}
                                <div className="h-8 w-full mt-1">
                                    <svg viewBox="0 0 100 28" className="w-full h-full">
                                        <path
                                            d="M 0 16 Q 15 5, 28 14 T 55 18 T 75 10 T 100 20"
                                            fill="none"
                                            stroke="#f43f5e"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                            </div>

                            {/* Card 2: Latches / Cache (4922, 34.85% Up) */}
                            <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-cyan-500 uppercase">Latches</span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="font-mono text-xl font-bold text-white tracking-tight">4922</span>
                                    <span className="font-mono text-[9px] text-cyan-300 font-semibold">34.85% ↑</span>
                                </div>
                                {/* Wave Sparkline 2 (Cyan) */}
                                <div className="h-8 w-full mt-1">
                                    <svg viewBox="0 0 100 28" className="w-full h-full">
                                        <path
                                            d="M 0 20 Q 20 25, 38 12 T 65 19 T 85 8 T 100 12"
                                            fill="none"
                                            stroke="#00e5ff"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. [ ACTIVITY ] Telemetry Coordinate Wave Chart */}
                    <div className="relative flex flex-col flex-1 p-3 bg-[#071325]/85 border border-cyan-900/60 rounded backdrop-blur-md">
                        {/* HUD Header */}
                        <div className="pb-1.5 mb-1 border-b border-cyan-900/40">
                            <span className="font-mono text-xs font-bold tracking-widest text-cyan-300 uppercase">
                                [ ACTIVITY ]
                            </span>
                        </div>

                        {/* Coordinate Graph Area */}
                        <div className="relative flex-1 flex flex-col justify-between pt-1">
                            {/* Graphic Canvas with Axes */}
                            <div className="relative flex-1 flex items-stretch">
                                {/* Y-Axis Scale Labels */}
                                <div className="flex flex-col justify-between pr-2 font-mono text-[8px] text-cyan-600 select-none">
                                    <span>2300</span>
                                    <span>2200</span>
                                    <span>2100</span>
                                    <span>2000</span>
                                    <span>1900</span>
                                    <span>1800</span>
                                    <span>1700</span>
                                </div>

                                {/* Graph Area with Polyline & Marker */}
                                <div className="relative flex-1 h-full border-l border-b border-cyan-900/50">
                                    {/* Horizontal Dashed Grid Lines */}
                                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                                        <div className="border-b border-cyan-400 border-dashed" />
                                        <div className="border-b border-cyan-400 border-dashed" />
                                        <div className="border-b border-cyan-400 border-dashed" />
                                        <div className="border-b border-cyan-400 border-dashed" />
                                    </div>

                                    {/* Polyline Waveform SVG */}
                                    <svg viewBox="0 0 220 80" className="w-full h-full overflow-visible">
                                        <polyline
                                            points="0,52 15,40 28,60 42,48 55,68 70,35 85,45 100,28 115,55 130,42 145,30 160,25 175,40 190,52 205,52"
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        {/* Final Glowing Data Point */}
                                        <circle cx="205" cy="52" r="3.5" fill="#00e5ff" stroke="#ffffff" strokeWidth="1" />
                                    </svg>

                                    {/* 1982 Endpoint Badge Marker (Matches Reference UI) */}
                                    <div className="absolute right-0 bottom-4 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400 font-mono text-[9px] font-bold text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                                        1982
                                    </div>
                                </div>
                            </div>

                            {/* X-Axis Years / Timeline */}
                            <div className="flex justify-between pl-8 pt-1.5 font-mono text-[8px] text-cyan-600">
                                <span>2015</span>
                                <span>2016</span>
                                <span>2017</span>
                                <span>2018</span>
                                <span>2019</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* ============================================================== */}
            {/* 3. BOTTOM FULL-WIDTH TELEMETRY STATUS STRIP */}
            {/* ============================================================== */}
            <footer className="relative z-20 flex items-center justify-between px-6 py-2 bg-[#061224]/95 border-t border-cyan-900/60 font-mono text-xs">
                {/* 1. Total Users / Places */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex justify-between items-baseline text-[10px]">
                        <span className="text-cyan-400">Total Users</span>
                        <span className="text-white font-bold">1324</span>
                    </div>
                    <div className="w-full h-1 bg-[#091b35] rounded overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded" style={{ width: "78%" }} />
                    </div>
                </div>

                {/* 2. Active Users / Nodes */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex justify-between items-baseline text-[10px]">
                        <span className="text-cyan-400">Active Users</span>
                        <span className="text-white font-bold">833</span>
                    </div>
                    <div className="w-full h-1 bg-[#091b35] rounded overflow-hidden">
                        <div className="h-full bg-sky-400 rounded" style={{ width: "62%" }} />
                    </div>
                </div>

                {/* 3. Uptime */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex justify-between items-baseline text-[10px]">
                        <span className="text-cyan-400">Uptime</span>
                        <span className="text-white font-bold">15k hrs</span>
                    </div>
                    <div className="w-full h-1 bg-[#091b35] rounded overflow-hidden">
                        <div className="h-full bg-cyan-300 rounded" style={{ width: "95%" }} />
                    </div>
                </div>

                {/* 4. Activity / Cache */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex justify-between items-baseline text-[10px]">
                        <span className="text-cyan-400">Activity</span>
                        <span className="text-emerald-400 font-bold">34.85%</span>
                    </div>
                    <div className="w-full h-1 bg-[#091b35] rounded overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded" style={{ width: "35%" }} />
                    </div>
                </div>

                {/* 5. Pendings */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex justify-between items-baseline text-[10px]">
                        <span className="text-cyan-400">Pendings</span>
                        <span className="text-amber-400 font-bold">34.85%</span>
                    </div>
                    <div className="w-full h-1 bg-[#091b35] rounded overflow-hidden">
                        <div className="h-full bg-amber-400 rounded" style={{ width: "35%" }} />
                    </div>
                </div>
            </footer>
        </div>
    );
}
