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

interface AdminTierRow {
    tierName: string;
    khmerName: string;
    subdivisionDetail: string;
    endpointPath: string;
    unitBadge: string;
    badgeStyle: "cyan" | "blue" | "emerald" | "amber";
    count: number;
}

const ADMIN_TIERS: AdminTierRow[] = [
    {
        tierName: "LEVEL 1: PROVINCES",
        khmerName: "រាជធានី-ខេត្ត",
        subdivisionDetail: "24 Khaet + 1 Reach Thani (Capital)",
        endpointPath: "/api/v1/provinces",
        unitBadge: "25 Units",
        badgeStyle: "cyan",
        count: 25,
    },
    {
        tierName: "LEVEL 2: DISTRICTS",
        khmerName: "ក្រុង-ស្រុក-ខណ្ឌ",
        subdivisionDetail: "196 Srok • 14 Khan • Krong",
        endpointPath: "/api/v1/districts",
        unitBadge: "210 Units",
        badgeStyle: "blue",
        count: 210,
    },
    {
        tierName: "LEVEL 3: COMMUNES",
        khmerName: "ឃុំ-សង្កាត់",
        subdivisionDetail: "1,411 Khum • 241 Sangkat",
        endpointPath: "/api/v1/communes",
        unitBadge: "1,652 Units",
        badgeStyle: "emerald",
        count: 1652,
    },
    {
        tierName: "LEVEL 4: VILLAGES",
        khmerName: "ភូមិ",
        subdivisionDetail: "Grassroots Phum & census tracts",
        endpointPath: "/api/v1/villages",
        unitBadge: "14,574 Units",
        badgeStyle: "amber",
        count: 14574,
    },
    {
        tierName: "POSTAL ZONES",
        khmerName: "លេខកូដប្រៃសណីយ៍",
        subdivisionDetail: "MPTC 5-digit postal zoning system",
        endpointPath: "/api/v1/postcodes",
        unitBadge: "1,652 Codes",
        badgeStyle: "cyan",
        count: 1652,
    },
    {
        tierName: "GEO BOUNDARIES",
        khmerName: "ព្រំប្រទល់ភូមិសាស្ត្រ",
        subdivisionDetail: "WGS84 EPSG:4326 GeoJSON polygons",
        endpointPath: "/api/v1/boundaries/provinces",
        unitBadge: "100% Mapped",
        badgeStyle: "emerald",
        count: 25,
    },
];

// Provincial Capital & Hub Beacons across Cambodia categorized by Geographic Region
interface ProvincialBeacon {
    id: string;
    code: string;
    name: string;
    khmerName: string;
    cx: number;
    cy: number;
    region: "capital" | "urban" | "coastal" | "highland" | "central";
}

const PROVINCIAL_BEACONS: ProvincialBeacon[] = [
    { id: "node-pp", code: "12", name: "Phnom Penh", khmerName: "រាជធានីភ្នំពេញ", cx: 535, cy: 546, region: "capital" },
    { id: "node-sr", code: "17", name: "Siem Reap", khmerName: "សៀមរាប", cx: 340, cy: 260, region: "urban" },
    { id: "node-bb", code: "02", name: "Battambang", khmerName: "បាត់ដំបង", cx: 180, cy: 330, region: "urban" },
    { id: "node-shv", code: "18", name: "Preah Sihanouk", khmerName: "ព្រះសីហនុ", cx: 320, cy: 690, region: "coastal" },
    { id: "node-kpt", code: "07", name: "Kampot", khmerName: "កំពត", cx: 410, cy: 690, region: "coastal" },
    { id: "node-kk", code: "09", name: "Koh Kong", khmerName: "កោះកុង", cx: 210, cy: 590, region: "coastal" },
    { id: "node-kep", code: "23", name: "Kep", khmerName: "កែប", cx: 440, cy: 720, region: "coastal" },
    { id: "node-kc", code: "03", name: "Kampong Cham", khmerName: "កំពង់ចាម", cx: 620, cy: 490, region: "central" },
    { id: "node-kdl", code: "08", name: "Kandal", khmerName: "កណ្តាល", cx: 520, cy: 590, region: "urban" },
    { id: "node-tk", code: "21", name: "Takeo", khmerName: "តាកែវ", cx: 480, cy: 640, region: "central" },
    { id: "node-svy", code: "20", name: "Svay Rieng", khmerName: "ស្វាយរៀង", cx: 710, cy: 620, region: "central" },
    { id: "node-pbg", code: "15", name: "Prey Veng", khmerName: "ព្រៃវែង", cx: 640, cy: 570, region: "central" },
    { id: "node-kpc", code: "04", name: "Kampong Chhnang", khmerName: "កំពង់ឆ្នាំង", cx: 430, cy: 470, region: "central" },
    { id: "node-kpt-s", code: "05", name: "Kampong Speu", khmerName: "កំពង់ស្ពឺ", cx: 390, cy: 570, region: "central" },
    { id: "node-ps", code: "14", name: "Pursat", khmerName: "ពោធិ៍សាត់", cx: 280, cy: 450, region: "central" },
    { id: "node-kpt-t", code: "06", name: "Kampong Thom", khmerName: "កំពង់ធំ", cx: 490, cy: 370, region: "central" },
    { id: "node-pvh", code: "13", name: "Preah Vihear", khmerName: "ព្រះវិហារ", cx: 510, cy: 160, region: "highland" },
    { id: "node-om", code: "22", name: "Oddar Meanchey", khmerName: "ឧត្តរមានជ័យ", cx: 280, cy: 130, region: "highland" },
    { id: "node-bm", code: "01", name: "Banteay Meanchey", khmerName: "បន្ទាយមានជ័យ", cx: 120, cy: 200, region: "central" },
    { id: "node-pl", code: "24", name: "Pailin", khmerName: "ប៉ៃលិន", cx: 90, cy: 370, region: "highland" },
    { id: "node-st", code: "19", name: "Stung Treng", khmerName: "ស្ទឹងត្រែង", cx: 720, cy: 240, region: "highland" },
    { id: "node-kt", code: "10", name: "Kratie", khmerName: "ក្រចេះ", cx: 690, cy: 400, region: "central" },
    { id: "node-rat", code: "16", name: "Ratanakiri", khmerName: "រតនគិរី", cx: 880, cy: 210, region: "highland" },
    { id: "node-mdk", code: "11", name: "Mondulkiri", khmerName: "មណ្ឌលគិរី", cx: 850, cy: 450, region: "highland" },
    { id: "node-tbk", code: "25", name: "Tboung Khmum", khmerName: "ត្បូងឃ្មុំ", cx: 700, cy: 510, region: "central" },
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
    log: _log,
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

    // Active province administrative metadata
    const activeStats = PROVINCE_STATS[activeProvince.code];

    // Copy cURL command
    const handleCopyCurl = () => {
        const fullUrl = `https://cambodia.opengeo.cloud${customUrl}`;
        const cmd = `curl -s "${fullUrl}"`;
        navigator.clipboard.writeText(cmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Cambodia administrative data breakdown for the radial segmented donut ring
    const administrativeBreakdown = useMemo(() => [
        { pct: 88.5, id: "#14574", label: "Villages (Phum)", angle: -70, span: 115, color: "#00e5ff", note: "14,574 census tracts" },
        { pct: 10.0, id: "#1652", label: "Communes (Khum/Sangkat)", angle: 50, span: 35, color: "#0284c7", note: "1,411 Khum • 241 Sangkat" },
        { pct: 1.3, id: "#210", label: "Districts (Srok/Khan)", angle: 90, span: 14, color: "#38bdf8", note: "196 Srok • 14 Khan" },
        { pct: 0.2, id: "#25", label: "Provinces (Khaet)", angle: 108, span: 10, color: "#f43f5e", note: "24 Khaet • 1 Capital" },
        { pct: 100, id: "#POST", label: "Postal Codes", angle: 124, span: 26, color: "#06b6d4", note: "1,652 5-digit codes" },
        { pct: 100, id: "#GEO", label: "GeoJSON Boundaries", angle: 156, span: 44, color: "#10b981", note: "WGS84 EPSG:4326" },
        { pct: 100, id: "#PLACES", label: "Total Places", angle: 206, span: 78, color: "#818cf8", note: "16,472 named entities" },
    ], []);

    // SVG Elbow Callout path calculation for active province
    const calloutGeometry = useMemo(() => {
        const x0 = activeProvince.cx;
        const y0 = activeProvince.cy;

        // Position callout box to the left or right of the province
        const boxWidth = 160;
        const boxHeight = 64;
        
        // Compute ideal anchor position to keep it inside view
        const anchorX = Math.max(15, Math.min(x0 - 200, 240));
        const anchorY = Math.max(320, Math.min(y0 - 20, 540));

        // Elbow connector line: Start at (x0, y0), line to (anchorX + boxWidth, y0), vertical/diagonal to box
        const path = `M ${x0} ${y0} L ${anchorX + boxWidth + 24} ${y0} L ${anchorX + boxWidth} ${anchorY + boxHeight / 2}`;

        return { x0, y0, anchorX, anchorY, boxWidth, boxHeight, path };
    }, [activeProvince]);

    return (
        <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-[#050c18] text-sky-100 select-none font-sans">
            {/* Background High-Tech Matrix Grid Overlay */}
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
                {/* Brand & Administrative Dataset Metadata */}
                <div className="flex items-center gap-3">
                    <Link
                        to="/"
                        className="flex items-center gap-2 group text-white hover:text-cyan-300 transition-colors"
                        title="Back to Documentation"
                    >
                        <div className="w-8 h-8 rounded border border-cyan-500/50 bg-cyan-950/60 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 group-hover:shadow-[0_0_12px_rgba(0,229,255,0.6)] transition-all">
                            <span className="font-mono text-sm font-bold">🏛</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-mono font-bold text-xs tracking-wider uppercase text-cyan-300">
                                [ OPENGEO COMMAND ]
                            </span>
                            <span className="text-[10px] text-cyan-500/80 font-mono tracking-tight">
                                CAMBODIA ADMINISTRATIVE ATLAS (25 KHAET • 210 SROK • 1,652 KHUM • 14,574 PHUM)
                            </span>
                        </div>
                    </Link>

                    {/* Active Province Selector pill */}
                    <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#091b35] border border-cyan-800/40 text-[11px] font-mono text-cyan-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="font-semibold text-white">
                            {lang === "km" ? activeProvince.km : activeProvince.en}
                        </span>
                        <span className="text-cyan-600">|</span>
                        <span>{activeStats?.districts ?? 9} Srok</span>
                        <span className="text-cyan-600">•</span>
                        <span>{activeStats?.communes ?? 65} Khum</span>
                        <span className="text-cyan-600">•</span>
                        <span>{activeStats?.villages ?? 645} Phum</span>
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
                                <span>LOADING</span>
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
            {/* 2. MAIN COCKPIT BODY (3-ZONE ADMINISTRATIVE BLUEPRINT) */}
            {/* ============================================================== */}
            <main className="relative flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
                {/* ---------------------------------------------------------- */}
                {/* ZONE A: LEFT PANEL [ ADMINISTRATIVE TIERS ] & REGIONAL CLASSIFICATION */}
                {/* ---------------------------------------------------------- */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0 z-10">
                    {/* [ ADMINISTRATIVE TIERS ] Card (HUD Bracket Box) */}
                    <div className="relative flex flex-col flex-1 p-3.5 bg-[#071325]/85 border border-cyan-900/60 rounded backdrop-blur-md overflow-hidden">
                        {/* HUD Header */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-900/40">
                            <span className="font-mono text-xs font-bold tracking-widest text-cyan-300 uppercase">
                                [ ADMINISTRATIVE TIERS ]
                            </span>
                            {/* Dotted HUD Crosshair Target Marker */}
                            <div className="w-4 h-4 border border-dashed border-cyan-500/50 flex items-center justify-center text-[10px] text-cyan-400">
                                ❖
                            </div>
                        </div>

                        {/* Administrative Tiers Table Rows */}
                        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
                            {ADMIN_TIERS.map((tier, idx) => {
                                const isMatched = selectedEndpoint.path.includes(tier.endpointPath.replace("/api/v1/", ""));
                                return (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between px-2.5 py-1.5 rounded transition-all text-xs font-mono group cursor-pointer ${
                                            isMatched
                                                ? "bg-cyan-950/70 border border-cyan-500/60 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                                                : "bg-[#091a33]/60 hover:bg-[#0c2447] border border-cyan-900/30"
                                        }`}
                                        onClick={() => {
                                            const found = endpoints.find(e => e.path === tier.endpointPath || e.path.startsWith(tier.endpointPath));
                                            if (found) {
                                                onSelectEndpoint(found);
                                                onUrlChange(tier.endpointPath);
                                            }
                                        }}
                                    >
                                        <div className="flex flex-col min-w-0 pr-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] text-cyan-300 font-bold font-mono tracking-tight truncate">
                                                    {tier.tierName}
                                                </span>
                                                <span className="text-[10px] text-cyan-500/70 truncate">
                                                    ({tier.khmerName})
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-sky-300/70 truncate">
                                                {tier.subdivisionDetail}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* Units Badge Pill */}
                                            {tier.badgeStyle === "cyan" && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                                    {tier.unitBadge}
                                                </span>
                                            )}
                                            {tier.badgeStyle === "blue" && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/40">
                                                    {tier.unitBadge}
                                                </span>
                                            )}
                                            {tier.badgeStyle === "emerald" && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                    {tier.unitBadge}
                                                </span>
                                            )}
                                            {tier.badgeStyle === "amber" && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                                    {tier.unitBadge}
                                                </span>
                                            )}

                                            {/* Action Arrow: Selects & Runs Endpoint */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const found = endpoints.find(ep => ep.path === tier.endpointPath || ep.path.startsWith(tier.endpointPath));
                                                    if (found) {
                                                        onSelectEndpoint(found);
                                                        onUrlChange(tier.endpointPath);
                                                        setTimeout(() => onSend(), 50);
                                                    }
                                                }}
                                                className="w-5 h-5 flex items-center justify-center rounded text-cyan-400 hover:text-white hover:bg-cyan-500/30 transition-all font-mono"
                                                title={`Query ${tier.endpointPath}`}
                                            >
                                                →
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Ghosted Administrative Reference Gazette (Cambodia Sub-Decrees & Standards) */}
                        <div className="relative mt-auto pt-3 border-t border-cyan-900/30 text-[9px] font-mono text-cyan-700/50 leading-relaxed overflow-hidden select-none pointer-events-none max-h-24">
                            <div>AUTHORITY: ROYAL GOVERNMENT OF CAMBODIA (RGC)</div>
                            <div>STATISTICS: NATIONAL INSTITUTE OF STATISTICS (NIS)</div>
                            <div>CODES: ISO 3166-2:KH (2-DIGIT PROVINCE CODES 01-25)</div>
                            <div>HIERARCHY: KHAET (L1) → SROK (L2) → KHUM (L3) → PHUM (L4)</div>
                            <div>COORDINATES: EPSG:4326 WGS84 DECIMAL DEGREES</div>
                        </div>
                    </div>

                    {/* Bottom-Left Hierarchy Scale & Regional Legend (Matches Reference Screenshot Structure) */}
                    <div className="flex items-end justify-between px-3 py-2 bg-[#071325]/70 border border-cyan-900/50 rounded backdrop-blur-md">
                        {/* Hierarchy Level Depth Scale */}
                        <div className="flex flex-col gap-0.5 font-mono text-[9px] text-cyan-500/80">
                            <span title="Level 1: 25 Provinces">L-1: 100%</span>
                            <span title="Level 2: 210 Districts">L-2: 75%</span>
                            <span title="Level 3: 1,652 Communes">L-3: 50%</span>
                            <span title="Level 4: 14,574 Villages">L-4: 25%</span>
                        </div>

                        {/* Geographic Regions Stacked Legend */}
                        <div className="flex flex-col gap-1 font-mono text-[10px]">
                            <div className="flex items-center gap-1.5" title="Phnom Penh Municipality">
                                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                                <span className="text-rose-200">Capital (ភ្នំពេញ)</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Coastal Provinces: Sihanoukville, Kampot, Koh Kong, Kep">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                                <span className="text-cyan-200">Coastal (ឆ្នេរសមុទ្រ)</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Urban Centers: Battambang, Siem Reap, Kandal">
                                <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                                <span className="text-sky-200">Urban Center (ទីក្រុង)</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Central Lowlands: Kampong Cham, Takeo, Prey Veng">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                                <span className="text-emerald-200">Central (វាលទំនាប)</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Highlands & Plateaus: Mondulkiri, Ratanakiri, Preah Vihear">
                                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                                <span className="text-amber-200">Highland (ខ្ពង់រាប)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* ZONE B: CENTER TACTICAL BLUEPRINT MAP & ADMINISTRATIVE GAUGES */}
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

                            {/* 2. Provincial Capital & Regional Hub Beacons Across Cambodia */}
                            <g id="beacon-nodes-layer">
                                {PROVINCIAL_BEACONS.map((beacon) => {
                                    const isTarget = beacon.code === activeProvince.code;
                                    const beaconColor =
                                        beacon.region === "capital"
                                            ? "#f43f5e"
                                            : beacon.region === "coastal"
                                            ? "#06b6d4"
                                            : beacon.region === "urban"
                                            ? "#3b82f6"
                                            : beacon.region === "central"
                                            ? "#10b981"
                                            : "#f59e0b";

                                    return (
                                        <g key={beacon.id} className="cursor-pointer" onClick={() => {
                                            const p = PROVINCES.find(pr => pr.code === beacon.code);
                                            if (p) onSelectProvince(p);
                                        }}>
                                            {/* Concentric pulsing radar ring if active */}
                                            {isTarget && (
                                                <circle
                                                    cx={beacon.cx}
                                                    cy={beacon.cy}
                                                    r={14}
                                                    fill="none"
                                                    stroke="#00e5ff"
                                                    strokeWidth={1}
                                                    className="animate-ping opacity-60"
                                                />
                                            )}

                                            {/* Beacon core dot */}
                                            <circle
                                                cx={beacon.cx}
                                                cy={beacon.cy}
                                                r={isTarget ? 5 : 3.5}
                                                fill={beaconColor}
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
                                minWidth: "165px"
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-cyan-400 text-sm">📍</span>
                                <span className="font-mono text-lg font-bold text-white tracking-tight">
                                    {activeStats?.villages?.toLocaleString() ?? 953}
                                </span>
                            </div>
                            <span className="font-mono text-[10px] text-cyan-300 uppercase tracking-wider">
                                Villages (Phum)
                            </span>
                            <div className="mt-1 pt-1 border-t border-cyan-800/50 flex flex-col gap-0.5 text-[10px] font-mono">
                                <div className="flex items-center justify-between">
                                    <span className="text-white font-semibold">
                                        {lang === "km" ? activeProvince.km : activeProvince.en}
                                    </span>
                                    <span className="text-cyan-400 font-bold">
                                        Code: {activeProvince.code}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-cyan-300/80">
                                    <span>{activeStats?.districts ?? 9} Srok</span>
                                    <span>•</span>
                                    <span>{activeStats?.communes ?? 65} Khum</span>
                                    <span>•</span>
                                    <span className="uppercase text-[9px] text-cyan-400 font-bold">{activeStats?.region ?? "CENTRAL"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lower-Center 4 Circular Micro Meters (Cambodia 4 Administrative Tiers) */}
                    <div className="flex items-center justify-center gap-6 py-2 mt-auto z-10">
                        {/* Dial 1: 25 Provinces (Level 1) */}
                        <div className="flex flex-col items-center" title="Level 1: 24 Provinces + 1 Capital City">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="#09203a" strokeWidth="3" />
                                    <circle
                                        cx="18" cy="18" r="14" fill="none" stroke="#00e5ff" strokeWidth="3"
                                        strokeDasharray="88" strokeDashoffset={88 - 88 * 1.0}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute font-mono text-[11px] font-bold text-white">25</span>
                            </div>
                            <span className="font-mono text-[9px] text-cyan-400 uppercase mt-0.5">PROVINCES</span>
                        </div>

                        {/* Dial 2: 210 Districts (Level 2) */}
                        <div className="flex flex-col items-center" title="Level 2: 196 Srok + 14 Khan">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="#09203a" strokeWidth="3" />
                                    <circle
                                        cx="18" cy="18" r="14" fill="none" stroke="#00e5ff" strokeWidth="3"
                                        strokeDasharray="88" strokeDashoffset={88 - 88 * 0.95}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute font-mono text-[11px] font-bold text-white">210</span>
                            </div>
                            <span className="font-mono text-[9px] text-cyan-400 uppercase mt-0.5">DISTRICTS</span>
                        </div>

                        {/* Dial 3: 1,652 Communes (Level 3) */}
                        <div className="flex flex-col items-center" title="Level 3: 1,411 Khum + 241 Sangkat">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="#09203a" strokeWidth="3" />
                                    <circle
                                        cx="18" cy="18" r="14" fill="none" stroke="#00e5ff" strokeWidth="3"
                                        strokeDasharray="88" strokeDashoffset={88 - 88 * 0.90}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute font-mono text-[11px] font-bold text-white">1.6K</span>
                            </div>
                            <span className="font-mono text-[9px] text-cyan-400 uppercase mt-0.5">COMMUNES</span>
                        </div>

                        {/* Dial 4: 14,574 Villages (Level 4) */}
                        <div className="flex flex-col items-center" title="Level 4: 14,574 Phum (Villages)">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="#09203a" strokeWidth="3" />
                                    <circle
                                        cx="18" cy="18" r="14" fill="none" stroke="#00e5ff" strokeWidth="3"
                                        strokeDasharray="88" strokeDashoffset={88 - 88 * 0.88}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute font-mono text-[11px] font-bold text-white">14.5K</span>
                            </div>
                            <span className="font-mono text-[9px] text-cyan-400 uppercase mt-0.5">VILLAGES</span>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* ZONE C: RIGHT HUD PANELS (DATA COMPOSITION, TOTALS, REGIONAL SPREAD) */}
                {/* ---------------------------------------------------------- */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0 z-10">
                    {/* 1. [ DATA COMPOSITION ] Radial Spoke Donut Ring */}
                    <div className="relative flex flex-col p-3 bg-[#071325]/85 border border-cyan-900/60 rounded backdrop-blur-md">
                        {/* HUD Header with Info Icon */}
                        <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-cyan-900/40">
                            <span className="font-mono text-xs font-bold tracking-widest text-cyan-300 uppercase">
                                [ DATA COMPOSITION ]
                            </span>
                            <span className="text-cyan-500 text-xs font-mono" title="Administrative Entity Distribution">ⓘ</span>
                        </div>

                        {/* Donut Graphic Canvas with Leader Spokes */}
                        <div className="relative w-full h-44 flex items-center justify-center">
                            <svg viewBox="0 0 280 200" className="w-full h-full">
                                {/* Central 3D Database / Geographic Cylinder Icon */}
                                <g transform="translate(140, 100)">
                                    <circle cx="0" cy="0" r="24" fill="#06182e" stroke="#00e5ff" strokeWidth="1.5" />
                                    {/* 3D Layers / Administrative Cylinders */}
                                    <ellipse cx="0" cy="-6" rx="10" ry="3.5" fill="none" stroke="#00e5ff" strokeWidth="1.2" />
                                    <path d="M -10 -6 V 0 C -10 2.5 10 2.5 10 0 V -6" fill="none" stroke="#00e5ff" strokeWidth="1.2" />
                                    <path d="M -10 0 V 6 C -10 8.5 10 8.5 10 6 V 0" fill="none" stroke="#00e5ff" strokeWidth="1.2" />
                                </g>

                                {/* Segmented Arcs & Spokes */}
                                {administrativeBreakdown.map((seg, i) => {
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

                                            {/* Percentage / Unit Value & ID Label Text */}
                                            <text
                                                x={spokeEndX + (Math.cos(rad) >= 0 ? 4 : -4)}
                                                y={spokeEndY + (Math.sin(rad) >= 0 ? 3 : -3)}
                                                textAnchor={Math.cos(rad) >= 0 ? "start" : "end"}
                                                className="font-mono text-[9px] fill-white font-bold"
                                            >
                                                {seg.pct < 100 ? `${seg.pct}%` : "100%"}
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

                    {/* 2. [ ADMINISTRATIVE TOTALS ] Dual KPIs with Wave Sparklines */}
                    <div className="relative flex flex-col p-3 bg-[#071325]/85 border border-cyan-900/60 rounded backdrop-blur-md">
                        {/* HUD Header */}
                        <div className="pb-1.5 mb-1.5 border-b border-cyan-900/40">
                            <span className="font-mono text-xs font-bold tracking-widest text-cyan-300 uppercase">
                                [ ADMINISTRATIVE TOTALS ]
                            </span>
                        </div>

                        {/* Dual Cards Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Card 1: Total Communes (1,652) */}
                            <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-cyan-500 uppercase">Communes</span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="font-mono text-xl font-bold text-white tracking-tight">1,652</span>
                                    <span className="font-mono text-[9px] text-cyan-300 font-semibold">100% ✓</span>
                                </div>
                                <span className="text-[9px] text-sky-400/80 font-mono">1,411 Khum • 241 Sangkat</span>
                                {/* Wave Sparkline 1 (Cyan) */}
                                <div className="h-8 w-full mt-1">
                                    <svg viewBox="0 0 100 28" className="w-full h-full">
                                        <path
                                            d="M 0 16 Q 15 5, 28 14 T 55 18 T 75 10 T 100 20"
                                            fill="none"
                                            stroke="#00e5ff"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                            </div>

                            {/* Card 2: Districts & Khan (210) */}
                            <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-cyan-500 uppercase">Districts</span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="font-mono text-xl font-bold text-white tracking-tight">210</span>
                                    <span className="font-mono text-[9px] text-emerald-400 font-semibold">25 Khaet</span>
                                </div>
                                <span className="text-[9px] text-emerald-400/80 font-mono">196 Srok • 14 Khan</span>
                                {/* Wave Sparkline 2 (Emerald) */}
                                <div className="h-8 w-full mt-1">
                                    <svg viewBox="0 0 100 28" className="w-full h-full">
                                        <path
                                            d="M 0 20 Q 20 25, 38 12 T 65 19 T 85 8 T 100 12"
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. [ REGIONAL DISTRIBUTION ] Regional Villages Spread */}
                    <div className="relative flex flex-col flex-1 p-3 bg-[#071325]/85 border border-cyan-900/60 rounded backdrop-blur-md">
                        {/* HUD Header */}
                        <div className="pb-1.5 mb-1 border-b border-cyan-900/40">
                            <span className="font-mono text-xs font-bold tracking-widest text-cyan-300 uppercase">
                                [ REGIONAL DISTRIBUTION ]
                            </span>
                        </div>

                        {/* Coordinate Graph Area */}
                        <div className="relative flex-1 flex flex-col justify-between pt-1">
                            {/* Graphic Canvas with Axes */}
                            <div className="relative flex-1 flex items-stretch">
                                {/* Y-Axis Scale Labels: Phum Count */}
                                <div className="flex flex-col justify-between pr-2 font-mono text-[8px] text-cyan-600 select-none">
                                    <span>3.5k</span>
                                    <span>3.0k</span>
                                    <span>2.5k</span>
                                    <span>2.0k</span>
                                    <span>1.5k</span>
                                    <span>1.0k</span>
                                    <span>500</span>
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

                                    {/* Polyline Waveform SVG: Distribution across 5 regions */}
                                    <svg viewBox="0 0 220 80" className="w-full h-full overflow-visible">
                                        <polyline
                                            points="0,58 25,48 55,62 85,32 115,22 145,28 175,44 205,44"
                                            fill="none"
                                            stroke="#00e5ff"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        {/* Final Glowing Data Point */}
                                        <circle cx="205" cy="44" r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                                    </svg>

                                    {/* 14,574 Total Villages Badge Marker */}
                                    <div className="absolute right-0 bottom-4 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400 font-mono text-[9px] font-bold text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                                        14,574
                                    </div>
                                </div>
                            </div>

                            {/* X-Axis Regions / Categories */}
                            <div className="flex justify-between pl-6 pt-1.5 font-mono text-[7.5px] text-cyan-500">
                                <span>CAPITAL</span>
                                <span>COASTAL</span>
                                <span>CENTRAL</span>
                                <span>HIGHLAND</span>
                                <span>URBAN</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* ============================================================== */}
            {/* 3. BOTTOM FULL-WIDTH ADMINISTRATIVE TELEMETRY STRIP */}
            {/* ============================================================== */}
            <footer className="relative z-20 flex items-center justify-between px-6 py-2 bg-[#061224]/95 border-t border-cyan-900/60 font-mono text-xs">
                {/* 1. Provinces */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex justify-between items-baseline text-[10px]">
                        <span className="text-cyan-400">Provinces (ខេត្ត)</span>
                        <span className="text-white font-bold">25 Khaet</span>
                    </div>
                    <div className="w-full h-1 bg-[#091b35] rounded overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded" style={{ width: "100%" }} />
                    </div>
                </div>

                {/* 2. Districts */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex justify-between items-baseline text-[10px]">
                        <span className="text-cyan-400">Districts (ស្រុក-ខណ្ឌ)</span>
                        <span className="text-white font-bold">210 Srok</span>
                    </div>
                    <div className="w-full h-1 bg-[#091b35] rounded overflow-hidden">
                        <div className="h-full bg-sky-400 rounded" style={{ width: "100%" }} />
                    </div>
                </div>

                {/* 3. Communes */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex justify-between items-baseline text-[10px]">
                        <span className="text-cyan-400">Communes (ឃុំ-សង្កាត់)</span>
                        <span className="text-white font-bold">1,652 Khum</span>
                    </div>
                    <div className="w-full h-1 bg-[#091b35] rounded overflow-hidden">
                        <div className="h-full bg-cyan-300 rounded" style={{ width: "100%" }} />
                    </div>
                </div>

                {/* 4. Villages */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex justify-between items-baseline text-[10px]">
                        <span className="text-cyan-400">Villages (ភូមិ)</span>
                        <span className="text-emerald-400 font-bold">14,574 Phum</span>
                    </div>
                    <div className="w-full h-1 bg-[#091b35] rounded overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded" style={{ width: "100%" }} />
                    </div>
                </div>

                {/* 5. Postal Codes */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex justify-between items-baseline text-[10px]">
                        <span className="text-cyan-400">Postal Codes</span>
                        <span className="text-amber-400 font-bold">1,652 Zones</span>
                    </div>
                    <div className="w-full h-1 bg-[#091b35] rounded overflow-hidden">
                        <div className="h-full bg-amber-400 rounded" style={{ width: "100%" }} />
                    </div>
                </div>
            </footer>
        </div>
    );
}
