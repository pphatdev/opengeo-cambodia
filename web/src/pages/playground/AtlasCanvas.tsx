import { useCallback, useMemo, useRef, useState, type MouseEvent } from "react";
import { cx } from "../../components/ui";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCES, type HeroProvince } from "../home/cambodiaMap";

interface AtlasCanvasProps {
    activeProvince: HeroProvince;
    highlightedCodes?: Set<string>;
    geocodeMarker?: { x: number; y: number; lat: number; lon: number; label: string } | null;
    networkEnabled?: boolean;
    onSelectProvince: (province: HeroProvince) => void;
    onToggleNetwork?: () => void;
}

// Generate static stars for high-tech deep space backdrop
const STARS = Array.from({ length: 48 }, (_, i) => ({
    x: ((i * 37) % 96) + 2,
    y: ((i * 73) % 94) + 3,
    size: i % 3 === 0 ? 2 : 1,
    opacity: 0.15 + (i % 5) * 0.12,
}));

// Key provincial hubs for orbital arcs radiating from Phnom Penh (12)
const HUB_CODES = ["17", "02", "18", "03", "19", "07", "11", "13", "16", "21", "24", "08"];

export function AtlasCanvas({
    activeProvince,
    highlightedCodes = new Set(),
    geocodeMarker,
    networkEnabled = true,
    onSelectProvince,
    onToggleNetwork,
}: AtlasCanvasProps) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const [hoveredCode, setHoveredCode] = useState<string | null>(null);

    // Search input state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);

    // Right-rail mode: "ncdd" vs "name"
    const [railMode, setRailMode] = useState<"ncdd" | "name">("ncdd");

    // Zoom handlers
    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2.5));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.8));
    const handleReset = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // Pan drag handlers
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        // Don't drag if clicking UI overlays
        const target = e.target as HTMLElement;
        if (target.closest(".canvas-overlay")) return;
        isDragging.current = true;
        dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;
        setPan({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y,
        });
    }, [pan]);

    const onMouseUp = () => {
        isDragging.current = false;
    };

    // Phnom Penh Hub Centroid
    const pp = useMemo(() => PROVINCES.find((p) => p.code === "12") ?? PROVINCES[0], []);

    // Arcs connecting Phnom Penh to hubs with snaking curves
    const arcs = useMemo(() => {
        return PROVINCES.filter((p) => p.code !== "12" && (HUB_CODES.includes(p.code) || p.code === activeProvince.code)).map((p) => {
            const mx = (pp.cx + p.cx) / 2;
            const my = (pp.cy + p.cy) / 2;
            const dx = p.cx - pp.cx;
            const dy = p.cy - pp.cy;
            // Perpendicular offset for curved trajectory
            const qx = mx - dy * 0.14;
            const qy = my + dx * 0.14;
            const isActive = p.code === activeProvince.code;

            // Route colors based on region
            const color = p.code === "17" ? "#f59e0b" : p.code === "18" ? "#14b8a6" : p.code === "02" ? "#10b981" : "#06b6d4";

            return {
                code: p.code,
                d: `M ${pp.cx} ${pp.cy} Q ${qx} ${qy} ${p.cx} ${p.cy}`,
                isActive,
                color,
            };
        });
    }, [pp, activeProvince]);

    // Filtered search list
    const searchMatches = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return PROVINCES.filter((p) => p.en.toLowerCase().includes(q) || p.km.includes(q) || p.code === q);
    }, [searchQuery]);

    return (
        <div
            className="relative h-full w-full select-none overflow-hidden rounded-2xl bg-[#060911]"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
        >
            {/* Atmospheric Background Ambient Glows */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.15),transparent_70%)]" />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_85%_15%,rgba(245,158,11,0.12),transparent_50%)]" />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_80%,rgba(6,182,212,0.12),transparent_50%)]" />

            {/* Subtle Horizon Atmospheric Curve */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[140%] h-48 rounded-[100%] border-b border-cyan-400/20 shadow-[0_15px_60px_rgba(6,182,212,0.12)] pointer-events-none" />

            {/* Starfield */}
            <div className="absolute inset-0 pointer-events-none">
                {STARS.map((star, idx) => (
                    <div
                        key={idx}
                        className="absolute rounded-full bg-cyan-200"
                        style={{
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            opacity: star.opacity,
                        }}
                    />
                ))}
            </div>

            {/* High-Tech Vector Stage */}
            <div
                className="relative h-full w-full flex items-center justify-center transition-transform duration-100 ease-out"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                }}
            >
                <svg
                    viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                    className="h-full w-full max-h-[840px] overflow-visible"
                    aria-label="Atlas Command Map of Cambodia"
                >
                    <defs>
                        {/* Neon Glow Filters */}
                        <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="6" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <filter id="neon-glow-rose" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="8" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        {/* Geodesic Dome Glow Radiants */}
                        <radialGradient id="dome-glow-pp" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                            <stop offset="60%" stopColor="#0284c7" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="dome-glow-sr" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
                            <stop offset="60%" stopColor="#d97706" stopOpacity="0.14" />
                            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="dome-glow-shv" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.32" />
                            <stop offset="60%" stopColor="#0d9488" stopOpacity="0.14" />
                            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
                        </radialGradient>

                        {/* Lake Gradient */}
                        <radialGradient id="lake-grad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#0e2338" stopOpacity="0.9" />
                            <stop offset="85%" stopColor="#091422" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
                        </radialGradient>
                    </defs>

                    {/* Ambient Country Backdrop Halo */}
                    <g className="fill-cyan-500/5 stroke-cyan-500/10 stroke-1" aria-hidden="true">
                        {PROVINCES.map((p) => (
                            <path key={`halo-${p.code}`} d={p.d} />
                        ))}
                    </g>

                    {/* Tonle Sap Lake Natural Water Body (Central Cambodia) */}
                    <g className="pointer-events-none" aria-hidden="true">
                        <path
                            d="M 285 275 Q 330 300 365 340 Q 405 390 440 455 Q 425 475 385 455 Q 325 385 275 325 Q 255 290 285 275 Z"
                            fill="url(#lake-grad)"
                            stroke="#06b6d4"
                            strokeWidth="1.2"
                            strokeOpacity="0.4"
                        />
                        {/* Tonle Sap Lake Micro Label */}
                        <text
                            x="355"
                            y="390"
                            className="fill-cyan-300/40 font-mono text-[8.5px] tracking-widest pointer-events-none"
                            transform="rotate(-35 355 390)"
                        >
                            TONLE SAP LAKE
                        </text>
                    </g>

                    {/* Mekong River Main Artery (Entering from Stung Treng -> Kratie -> Kampong Cham -> Phnom Penh) */}
                    <g className="pointer-events-none" aria-hidden="true">
                        <path
                            d="M 735 150 Q 720 220 705 280 Q 695 330 685 390 Q 660 450 580 480 Q 520 530 485 580 L 478 605 Q 498 660 538 730"
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="2.8"
                            strokeOpacity="0.45"
                            strokeLinecap="round"
                        />
                        {/* Bassac River Split from Phnom Penh */}
                        <path
                            d="M 478 605 Q 482 660 505 740"
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth="1.8"
                            strokeOpacity="0.35"
                            strokeLinecap="round"
                        />
                    </g>

                    {/* Orbital & Snaking Transmission Energy Conduits */}
                    {networkEnabled && (
                        <g className="pointer-events-none" aria-hidden="true">
                            {arcs.map((arc) => (
                                <g key={`arc-${arc.code}`}>
                                    {/* Static Glow Trace */}
                                    <path
                                        d={arc.d}
                                        fill="none"
                                        stroke={arc.isActive ? "#f43f5e" : arc.color}
                                        strokeWidth={arc.isActive ? 2 : 1.2}
                                        strokeOpacity={arc.isActive ? 0.7 : 0.3}
                                    />
                                    {/* Animated Traveling Dashes */}
                                    <path
                                        d={arc.d}
                                        fill="none"
                                        stroke={arc.isActive ? "#ffffff" : arc.color}
                                        strokeWidth={arc.isActive ? 2.5 : 1.5}
                                        strokeDasharray="4 8"
                                        strokeOpacity={arc.isActive ? 1 : 0.7}
                                        className="animate-atlas-dash"
                                    />
                                </g>
                            ))}
                        </g>
                    )}

                    {/* 25 Province Vector Polygons */}
                    {PROVINCES.map((p) => {
                        const isActive = p.code === activeProvince.code;
                        const isHovered = p.code === hoveredCode;
                        const isHighlighted = highlightedCodes.has(p.code);

                        return (
                            <path
                                key={p.code}
                                d={p.d}
                                vectorEffect="non-scaling-stroke"
                                onMouseEnter={() => setHoveredCode(p.code)}
                                onMouseLeave={() => setHoveredCode(null)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectProvince(p);
                                }}
                                className={cx(
                                    "cursor-pointer transition-all duration-300",
                                    isActive
                                        ? "fill-rose-500/20 stroke-rose-400 stroke-[2.2] filter-[drop-shadow(0_0_12px_rgba(244,63,94,0.6))]"
                                        : isHovered
                                        ? "fill-cyan-500/25 stroke-cyan-300 stroke-[1.8] filter-[drop-shadow(0_0_8px_rgba(6,182,212,0.5))]"
                                        : isHighlighted
                                        ? "fill-cyan-900/35 stroke-cyan-400/80 stroke-[1.4]"
                                        : "fill-[#0a0e19]/85 stroke-cyan-500/25 hover:fill-cyan-950/40 hover:stroke-cyan-400 stroke-[1.1]",
                                )}
                            >
                                <title>{`${p.en} (${p.km}) · NCDD #${p.code}`}</title>
                            </path>
                        );
                    })}

                    {/* ============================================================== */}
                    {/* GEODESIC DOMES & 3D ILLUMINATED SKYLINE (CYBERNETIC COCKPIT)   */}
                    {/* ============================================================== */}

                    {/* 1. PHNOM PENH CAPITAL DOME & 3D SKYSCRAPERS (12) */}
                    <g className="cursor-pointer" onClick={() => onSelectProvince(pp)}>
                        {/* Radial Glow Hemisphere */}
                        <ellipse cx={pp.cx} cy={pp.cy - 10} rx="42" ry="24" fill="url(#dome-glow-pp)" />
                        <path
                            d={`M ${pp.cx - 40} ${pp.cy} A 40 40 0 0 1 ${pp.cx + 40} ${pp.cy} Z`}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="1.2"
                            strokeOpacity="0.6"
                        />
                        {/* Geodesic Wireframe Longitudinal Ribs */}
                        <path
                            d={`M ${pp.cx - 26} ${pp.cy} A 26 40 0 0 1 ${pp.cx + 26} ${pp.cy}`}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="0.8"
                            strokeOpacity="0.4"
                        />
                        <path
                            d={`M ${pp.cx - 12} ${pp.cy} A 12 40 0 0 1 ${pp.cx + 12} ${pp.cy}`}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="0.8"
                            strokeOpacity="0.4"
                        />
                        {/* Horizontal Latitudinal Arcs */}
                        <ellipse cx={pp.cx} cy={pp.cy - 16} rx="34" ry="9" fill="none" stroke="#06b6d4" strokeWidth="0.8" strokeOpacity="0.35" />
                        <ellipse cx={pp.cx} cy={pp.cy - 28} rx="22" ry="6" fill="none" stroke="#06b6d4" strokeWidth="0.8" strokeOpacity="0.35" />

                        {/* 3D Illuminated Cyan Skyscrapers Cluster Under Dome */}
                        <g className="filter-[drop-shadow(0_0_8px_rgba(6,182,212,0.8))]">
                            {/* Tower 1 (Left) */}
                            <polygon points={`${pp.cx - 12},${pp.cy - 4} ${pp.cx - 6},${pp.cy - 7} ${pp.cx - 6},${pp.cy - 22} ${pp.cx - 12},${pp.cy - 19}`} fill="#0e7490" opacity="0.8" />
                            <polygon points={`${pp.cx - 6},${pp.cy - 7} ${pp.cx - 1},${pp.cy - 5} ${pp.cx - 1},${pp.cy - 20} ${pp.cx - 6},${pp.cy - 22}`} fill="#06b6d4" opacity="0.9" />
                            <polygon points={`${pp.cx - 12},${pp.cy - 19} ${pp.cx - 6},${pp.cy - 22} ${pp.cx - 1},${pp.cy - 20} ${pp.cx - 7},${pp.cy - 17}`} fill="#67e8f9" />

                            {/* Tower 2 (Center Vattanac Capital Shape) */}
                            <polygon points={`${pp.cx - 3},${pp.cy - 2} ${pp.cx + 4},${pp.cy - 6} ${pp.cx + 4},${pp.cy - 30} ${pp.cx - 3},${pp.cy - 26}`} fill="#0891b2" opacity="0.85" />
                            <polygon points={`${pp.cx + 4},${pp.cy - 6} ${pp.cx + 10},${pp.cy - 3} ${pp.cx + 10},${pp.cy - 27} ${pp.cx + 4},${pp.cy - 30}`} fill="#22d3ee" opacity="0.95" />
                            <polygon points={`${pp.cx - 3},${pp.cy - 26} ${pp.cx + 4},${pp.cy - 30} ${pp.cx + 10},${pp.cy - 27} ${pp.cx + 3},${pp.cy - 23}`} fill="#a5f3fc" />

                            {/* Tower 3 (Right) */}
                            <polygon points={`${pp.cx + 8},${pp.cy - 2} ${pp.cx + 14},${pp.cy - 5} ${pp.cx + 14},${pp.cy - 18} ${pp.cx + 8},${pp.cy - 15}`} fill="#0e7490" opacity="0.8" />
                            <polygon points={`${pp.cx + 14},${pp.cy - 5} ${pp.cx + 18},${pp.cy - 3} ${pp.cx + 18},${pp.cy - 16} ${pp.cx + 14},${pp.cy - 18}`} fill="#06b6d4" opacity="0.9" />
                            <polygon points={`${pp.cx + 8},${pp.cy - 15} ${pp.cx + 14},${pp.cy - 18} ${pp.cx + 18},${pp.cy - 16} ${pp.cx + 12},${pp.cy - 13}`} fill="#67e8f9" />
                        </g>

                        {/* Dome Apex Light Beacon */}
                        <circle cx={pp.cx} cy={pp.cy - 40} r="3" fill="#ffffff" filter="url(#neon-glow-cyan)" />
                    </g>

                    {/* 2. SIEM REAP CULTURAL ANGKOR DOME (17) */}
                    {(() => {
                        const sr = PROVINCES.find((p) => p.code === "17");
                        if (!sr) return null;
                        return (
                            <g className="cursor-pointer" onClick={() => onSelectProvince(sr)}>
                                <ellipse cx={sr.cx} cy={sr.cy - 8} rx="32" ry="18" fill="url(#dome-glow-sr)" />
                                <path
                                    d={`M ${sr.cx - 30} ${sr.cy} A 30 30 0 0 1 ${sr.cx + 30} ${sr.cy} Z`}
                                    fill="none"
                                    stroke="#f59e0b"
                                    strokeWidth="1.2"
                                    strokeOpacity="0.6"
                                />
                                <ellipse cx={sr.cx} cy={sr.cy - 12} rx="24" ry="6" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.4" />
                                <ellipse cx={sr.cx} cy={sr.cy - 21} rx="15" ry="4" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.4" />
                                <circle cx={sr.cx} cy={sr.cy - 30} r="2.5" fill="#fef08a" />
                            </g>
                        );
                    })()}

                    {/* 3. PREAH SIHANOUK DEEPWATER MARITIME PORT DOME (18) */}
                    {(() => {
                        const shv = PROVINCES.find((p) => p.code === "18");
                        if (!shv) return null;
                        return (
                            <g className="cursor-pointer" onClick={() => onSelectProvince(shv)}>
                                <ellipse cx={shv.cx} cy={shv.cy - 6} rx="28" ry="16" fill="url(#dome-glow-shv)" />
                                <path
                                    d={`M ${shv.cx - 26} ${shv.cy} A 26 26 0 0 1 ${shv.cx + 26} ${shv.cy} Z`}
                                    fill="none"
                                    stroke="#14b8a6"
                                    strokeWidth="1.2"
                                    strokeOpacity="0.6"
                                />
                                <ellipse cx={shv.cx} cy={shv.cy - 10} rx="20" ry="5" fill="none" stroke="#14b8a6" strokeWidth="0.8" strokeOpacity="0.4" />
                                <circle cx={shv.cx} cy={shv.cy - 26} r="2.5" fill="#5eead4" />
                            </g>
                        );
                    })()}

                    {/* Centroid Radar Beacons for All Provinces */}
                    {PROVINCES.map((p) => {
                        const isActive = p.code === activeProvince.code;
                        const isHub = HUB_CODES.includes(p.code);
                        const isCapital = p.code === "12";

                        const color = isCapital
                            ? "#f43f5e"
                            : isActive
                            ? "#f43f5e"
                            : isHub
                            ? "#06b6d4"
                            : "#10b981";

                        return (
                            <g
                                key={`beacon-${p.code}`}
                                className="cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectProvince(p);
                                }}
                                onMouseEnter={() => setHoveredCode(p.code)}
                                onMouseLeave={() => setHoveredCode(null)}
                            >
                                {/* Expanding Radar Ring on Active or Capital */}
                                {(isActive || isCapital) && (
                                    <circle
                                        cx={p.cx}
                                        cy={p.cy}
                                        r="18"
                                        fill="none"
                                        stroke={color}
                                        strokeWidth="1.5"
                                        className="animate-atlas-radar origin-center"
                                        style={{ transformOrigin: `${p.cx}px ${p.cy}px` }}
                                    />
                                )}

                                {/* Outer Halo Ring */}
                                <circle
                                    cx={p.cx}
                                    cy={p.cy}
                                    r={isActive ? 8 : isHub ? 5.5 : 4}
                                    fill={color}
                                    fillOpacity={isActive ? 0.3 : 0.15}
                                    stroke={color}
                                    strokeWidth={isActive ? 2 : 1}
                                    strokeOpacity={0.8}
                                />

                                {/* Core Pulsing Dot */}
                                <circle
                                    cx={p.cx}
                                    cy={p.cy}
                                    r={isActive ? 4 : isCapital ? 3.5 : 2.5}
                                    fill={color}
                                    filter={isActive || isCapital ? "url(#neon-glow-rose)" : undefined}
                                />

                                {/* Micro Name Label on Key Hubs or Active */}
                                {(isActive || isHub) && (
                                    <text
                                        x={p.cx}
                                        y={p.cy - (isActive ? 14 : 9)}
                                        textAnchor="middle"
                                        className={cx(
                                            "font-mono font-bold tracking-wider pointer-events-none",
                                            isActive
                                                ? "fill-rose-300 text-[11px]"
                                                : "fill-cyan-300/80 text-[8.5px]",
                                        )}
                                    >
                                        {p.en.toUpperCase()}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* ============================================================== */}
                    {/* FLOATING NODE METRIC BADGES (GENERATION & EFFICIENCY STYLE)    */}
                    {/* ============================================================== */}
                    <g className="pointer-events-none" aria-hidden="true">
                        {/* 1. Phnom Penh Badge */}
                        <g transform={`translate(${pp.cx - 70}, ${pp.cy - 72})`}>
                            <rect width="140" height="26" rx="6" fill="#080d19" fillOpacity="0.9" stroke="#06b6d4" strokeWidth="0.8" />
                            <text x="8" y="12" className="fill-cyan-400 font-mono text-[8.5px] font-bold">⚡ 14 Khans · 105 Sangkats</text>
                            <text x="8" y="21" className="fill-slate-400 font-mono text-[7.5px]">Phnom Penh Capital Hub · 100%</text>
                        </g>

                        {/* 2. Siem Reap Badge */}
                        {(() => {
                            const sr = PROVINCES.find((p) => p.code === "17");
                            if (!sr) return null;
                            return (
                                <g transform={`translate(${sr.cx - 65}, ${sr.cy - 56})`}>
                                    <rect width="130" height="24" rx="6" fill="#080d19" fillOpacity="0.9" stroke="#f59e0b" strokeWidth="0.8" />
                                    <text x="8" y="11" className="fill-amber-400 font-mono text-[8px] font-bold">⚡ 12 Districts · 100 Communes</text>
                                    <text x="8" y="19" className="fill-slate-400 font-mono text-[7.5px]">Siem Reap Angkor · 92% Eff</text>
                                </g>
                            );
                        })()}

                        {/* 3. Preah Sihanouk Badge */}
                        {(() => {
                            const shv = PROVINCES.find((p) => p.code === "18");
                            if (!shv) return null;
                            return (
                                <g transform={`translate(${shv.cx - 60}, ${shv.cy - 50})`}>
                                    <rect width="120" height="24" rx="6" fill="#080d19" fillOpacity="0.9" stroke="#14b8a6" strokeWidth="0.8" />
                                    <text x="8" y="11" className="fill-teal-300 font-mono text-[8px] font-bold">⚡ 5 Districts · 29 Communes</text>
                                    <text x="8" y="19" className="fill-slate-400 font-mono text-[7.5px]">Deepwater Port · 88% Eff</text>
                                </g>
                            );
                        })()}
                    </g>

                    {/* Geocode Target Reticle */}
                    {geocodeMarker && (
                        <g
                            className="pointer-events-none"
                            style={{ transformOrigin: `${geocodeMarker.x}px ${geocodeMarker.y}px` }}
                        >
                            <circle
                                cx={geocodeMarker.x}
                                cy={geocodeMarker.y}
                                r="22"
                                fill="none"
                                stroke="#f43f5e"
                                strokeWidth="1.5"
                                strokeDasharray="6 4"
                                className="animate-spin"
                            />
                            <circle
                                cx={geocodeMarker.x}
                                cy={geocodeMarker.y}
                                r="4"
                                fill="#f43f5e"
                                className="animate-ping"
                            />
                            <circle cx={geocodeMarker.x} cy={geocodeMarker.y} r="3" fill="#ffffff" />
                        </g>
                    )}
                </svg>
            </div>

            {/* ============================================================== */}
            {/* FLOATING TOP-RIGHT SEARCH BAR (DOWNTOWN SEARCH PILL)           */}
            {/* ============================================================== */}
            <div className="absolute top-4 right-38 z-30 canvas-overlay">
                <div className="relative">
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#090e1a]/90 px-3 py-1.5 backdrop-blur-xl shadow-2xl font-mono text-xs">
                        <span className="text-slate-400">📍</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSearchOpen(true);
                            }}
                            onFocus={() => setSearchOpen(true)}
                            placeholder={`Downtown ${activeProvince.en}...`}
                            className="w-38 sm:w-48 bg-transparent text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none"
                        />
                        <span className="text-slate-500 text-[11px]">🔍</span>
                    </div>

                    {/* Live search dropdown matches */}
                    {searchOpen && searchMatches.length > 0 && (
                        <div className="absolute left-0 top-10 w-full rounded-xl border border-white/10 bg-[#0d121e] p-1 shadow-2xl backdrop-blur-xl max-h-52 overflow-y-auto scrollbar-thin z-40">
                            {searchMatches.map((match) => (
                                <button
                                    key={match.code}
                                    type="button"
                                    onClick={() => {
                                        onSelectProvince(match);
                                        setSearchQuery("");
                                        setSearchOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-200 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors cursor-pointer"
                                >
                                    <span>{match.en} ({match.km})</span>
                                    <span className="font-mono text-[10px] text-slate-500">#{match.code}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ============================================================== */}
            {/* RIGHT VERTICAL RAIL: NCDD CODE / PROVINCE SELECTOR STRIP       */}
            {/* ============================================================== */}
            <aside
                aria-label="NCDD Administrative Selector"
                className="absolute top-4 right-4 bottom-16 z-20 w-28 sm:w-32 flex flex-col rounded-2xl border border-white/10 bg-[#080d1a]/85 p-2 shadow-2xl backdrop-blur-xl canvas-overlay font-mono select-none"
            >
                {/* Header Switch Pill */}
                <div className="flex items-center justify-between rounded-lg bg-black/40 p-0.5 mb-2 text-[9px] border border-white/5">
                    <button
                        type="button"
                        onClick={() => setRailMode("ncdd")}
                        className={`flex-1 py-0.5 rounded text-center transition-colors cursor-pointer ${
                            railMode === "ncdd"
                                ? "bg-cyan-500/30 text-cyan-300 font-bold"
                                : "text-slate-500 hover:text-slate-300"
                        }`}
                    >
                        By NCDD
                    </button>
                    <button
                        type="button"
                        onClick={() => setRailMode("name")}
                        className={`flex-1 py-0.5 rounded text-center transition-colors cursor-pointer ${
                            railMode === "name"
                                ? "bg-cyan-500/30 text-cyan-300 font-bold"
                                : "text-slate-500 hover:text-slate-300"
                        }`}
                    >
                        By Name
                    </button>
                </div>

                {/* Scrollable list of 25 provinces formatted like ZIP code strip */}
                <div className="flex-1 overflow-y-auto scrollbar-none space-y-1 text-center text-xs">
                    {PROVINCES.map((p) => {
                        const isSelected = p.code === activeProvince.code;
                        return (
                            <button
                                key={p.code}
                                type="button"
                                onClick={() => onSelectProvince(p)}
                                className={`w-full py-1 px-1.5 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                                    isSelected
                                        ? "bg-cyan-500/25 text-cyan-300 font-black shadow-[0_0_10px_rgba(6,182,212,0.4)] border border-cyan-500/40"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <span className="truncate text-[11px]">
                                    {railMode === "ncdd" ? `NCDD ${p.code}` : p.en}
                                </span>
                                {isSelected && (
                                    <span className="size-1.5 rounded-full bg-cyan-400 animate-ping shadow-[0_0_6px_#06b6d4]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* Bottom-Right Floating Map Tool Strip */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0d121d]/85 p-1 shadow-2xl backdrop-blur-xl canvas-overlay">
                <button
                    type="button"
                    onClick={handleZoomIn}
                    title="Zoom in"
                    className="flex size-7 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                    <span className="text-base font-bold leading-none">+</span>
                </button>
                <button
                    type="button"
                    onClick={handleZoomOut}
                    title="Zoom out"
                    className="flex size-7 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                    <span className="text-base font-bold leading-none">−</span>
                </button>
                <div className="h-4 w-px bg-white/10 my-0.5" />
                <button
                    type="button"
                    onClick={handleReset}
                    title="Reset view"
                    className="flex size-7 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                    <span className="text-xs font-mono">⌖</span>
                </button>
                {onToggleNetwork && (
                    <button
                        type="button"
                        onClick={onToggleNetwork}
                        title={networkEnabled ? "Hide network arcs" : "Show network arcs"}
                        className={cx(
                            "flex size-7 items-center justify-center rounded-lg transition-colors cursor-pointer",
                            networkEnabled ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:bg-white/10 hover:text-white",
                        )}
                    >
                        <span className="text-xs">⚡</span>
                    </button>
                )}
            </div>
        </div>
    );
}
