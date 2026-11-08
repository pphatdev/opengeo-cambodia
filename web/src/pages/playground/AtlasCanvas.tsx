import { useCallback, useMemo, useRef, useState, type MouseEvent } from "react";
import { cx } from "../../components/ui";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCES, type HeroProvince } from "../home/cambodiaMap";
import { PROVINCE_STATS } from "./provinceStats";

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
    size: (i % 3 === 0 ? 2 : 1),
    opacity: 0.2 + ((i % 5) * 0.15),
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

    // Arcs connecting Phnom Penh to hubs
    const arcs = useMemo(() => {
        return PROVINCES.filter((p) => p.code !== "12" && (HUB_CODES.includes(p.code) || p.code === activeProvince.code)).map((p) => {
            const mx = (pp.cx + p.cx) / 2;
            const my = (pp.cy + p.cy) / 2;
            const dx = p.cx - pp.cx;
            const dy = p.cy - pp.cy;
            // Perpendicular offset for curved trajectory
            const qx = mx - dy * 0.12;
            const qy = my + dx * 0.12;
            const isActive = p.code === activeProvince.code;
            return {
                code: p.code,
                d: `M ${pp.cx} ${pp.cy} Q ${qx} ${qy} ${p.cx} ${p.cy}`,
                isActive,
            };
        });
    }, [pp, activeProvince]);

    return (
        <div
            className="relative h-full w-full select-none overflow-hidden rounded-2xl bg-[#06080d]"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
        >
            {/* Atmospheric Deep Space Gradient Backdrop */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.18),transparent_70%)]" />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_80%,rgba(244,63,94,0.06),transparent_60%)]" />

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
                    className="h-full w-full max-h-[820px] overflow-visible"
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

                        {/* Telemetry packet gradient */}
                        <linearGradient id="orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
                        </linearGradient>
                    </defs>

                    {/* Ambient Country Backdrop Halo */}
                    <g className="fill-cyan-500/5 stroke-cyan-500/10 stroke-1" aria-hidden="true">
                        {PROVINCES.map((p) => (
                            <path key={`halo-${p.code}`} d={p.d} />
                        ))}
                    </g>

                    {/* Orbital / Supply-Chain Trajectory Network Arcs */}
                    {networkEnabled && (
                        <g className="pointer-events-none" aria-hidden="true">
                            {arcs.map((arc) => (
                                <g key={`arc-${arc.code}`}>
                                    {/* Static Glow Trace */}
                                    <path
                                        d={arc.d}
                                        fill="none"
                                        stroke={arc.isActive ? "#f43f5e" : "#06b6d4"}
                                        strokeWidth={arc.isActive ? 1.8 : 1}
                                        strokeOpacity={arc.isActive ? 0.6 : 0.25}
                                    />
                                    {/* Animated Traveling Dashes */}
                                    <path
                                        d={arc.d}
                                        fill="none"
                                        stroke={arc.isActive ? "#f43f5e" : "#38bdf8"}
                                        strokeWidth={arc.isActive ? 2.2 : 1.4}
                                        strokeDasharray="4 8"
                                        strokeOpacity={arc.isActive ? 0.9 : 0.5}
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
                                        : "fill-[#0b101d]/80 stroke-cyan-500/25 hover:fill-cyan-950/40 hover:stroke-cyan-400 stroke-[1.1]",
                                )}
                            >
                                <title>{`${p.en} (${p.km}) · NCDD #${p.code}`}</title>
                            </path>
                        );
                    })}

                    {/* Centroid Radar Beacons for Provinces */}
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
                                        r="16"
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
                                        y={p.cy - (isActive ? 12 : 8)}
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

                    {/* Interactive Hover Micro-Tooltip */}
                    {hoveredCode && hoveredCode !== activeProvince.code && (() => {
                        const hp = PROVINCES.find((p) => p.code === hoveredCode);
                        const hs = PROVINCE_STATS[hoveredCode];
                        if (!hp || !hs) return null;
                        return (
                            <g key="hover-tooltip" className="pointer-events-none" aria-hidden="true">
                                <rect
                                    x={hp.cx - 65}
                                    y={hp.cy - 40}
                                    width="130"
                                    height="28"
                                    rx="8"
                                    fill="#0d121d"
                                    fillOpacity="0.95"
                                    stroke="#06b6d4"
                                    strokeWidth="1"
                                />
                                <text
                                    x={hp.cx}
                                    y={hp.cy - 26}
                                    textAnchor="middle"
                                    className="fill-white font-sans text-[10px] font-bold"
                                >
                                    {hp.en} ({hp.km})
                                </text>
                                <text
                                    x={hp.cx}
                                    y={hp.cy - 16}
                                    textAnchor="middle"
                                    className="fill-cyan-300 font-mono text-[8px]"
                                >
                                    {hs.districts}D · {hs.communes}C · Click to query
                                </text>
                            </g>
                        );
                    })()}

                    {/* Geocode Target Reticle (when geocode marker is present) */}
                    {geocodeMarker && (
                        <g
                            className="pointer-events-none"
                            style={{ transformOrigin: `${geocodeMarker.x}px ${geocodeMarker.y}px` }}
                        >
                            {/* Rotating Outer Target Ring */}
                            <circle
                                cx={geocodeMarker.x}
                                cy={geocodeMarker.y}
                                r="22"
                                fill="none"
                                stroke="#f43f5e"
                                strokeWidth="1.5"
                                strokeDasharray="6 4"
                                className="animate-spin"
                                style={{ animationDuration: "12s" }}
                            />
                            {/* Inner Target Crosshair */}
                            <line
                                x1={geocodeMarker.x - 26}
                                y1={geocodeMarker.y}
                                x2={geocodeMarker.x + 26}
                                y2={geocodeMarker.y}
                                stroke="#f43f5e"
                                strokeWidth="1"
                                strokeOpacity="0.8"
                            />
                            <line
                                x1={geocodeMarker.x}
                                y1={geocodeMarker.y - 26}
                                x2={geocodeMarker.x}
                                y2={geocodeMarker.y + 26}
                                stroke="#f43f5e"
                                strokeWidth="1"
                                strokeOpacity="0.8"
                            />
                            {/* Pulsing Target Core */}
                            <circle
                                cx={geocodeMarker.x}
                                cy={geocodeMarker.y}
                                r="4"
                                fill="#f43f5e"
                                className="animate-ping"
                            />
                            <circle
                                cx={geocodeMarker.x}
                                cy={geocodeMarker.y}
                                r="3"
                                fill="#ffffff"
                            />
                            {/* Coordinates Badge */}
                            <text
                                x={geocodeMarker.x}
                                y={geocodeMarker.y + 34}
                                textAnchor="middle"
                                className="fill-rose-400 font-mono text-[9px] font-bold"
                            >
                                {`${geocodeMarker.lat.toFixed(4)}°N · ${geocodeMarker.lon.toFixed(4)}°E`}
                            </text>
                        </g>
                    )}
                </svg>
            </div>

            {/* Bottom-Right Floating Map Tool Strip */}
            <div className="absolute bottom-5 right-5 z-20 flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-[#0d121d]/85 p-1 shadow-2xl backdrop-blur-xl">
                <button
                    type="button"
                    onClick={handleZoomIn}
                    title="Zoom in"
                    className="flex size-7.5 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                    <span className="text-base font-bold leading-none">+</span>
                </button>
                <button
                    type="button"
                    onClick={handleZoomOut}
                    title="Zoom out"
                    className="flex size-7.5 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                    <span className="text-base font-bold leading-none">−</span>
                </button>
                <div className="h-px w-5 bg-white/10 my-0.5" />
                <button
                    type="button"
                    onClick={handleReset}
                    title="Reset view"
                    className="flex size-7.5 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                    <span className="text-xs font-mono">⌖</span>
                </button>
                {onToggleNetwork && (
                    <button
                        type="button"
                        onClick={onToggleNetwork}
                        title={networkEnabled ? "Hide network arcs" : "Show network arcs"}
                        className={cx(
                            "flex size-7.5 items-center justify-center rounded-lg transition-colors cursor-pointer",
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
