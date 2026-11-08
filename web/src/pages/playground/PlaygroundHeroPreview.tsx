import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { cx, lvl } from "../../components/ui";
import { useI18n } from "../../i18n";
import { fmtBytes, type RequestLog } from "../../lib/api";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCES, type HeroProvince } from "../home/cambodiaMap";

const EASE = "ease-[cubic-bezier(.22,1,.36,1)]";
const TOUR = ["12", "17", "02", "07", "11", "13", "09", "16", "03", "18", "06", "21"];
const TOUR_MS = 4000;

interface PlaceChipItem {
    id: string | number;
    code: string;
    name_en: string;
    name_km?: string;
    level?: string;
}

interface PlaygroundHeroPreviewProps {
    log?: RequestLog | null;
    endpointPath: string;
    onDrillDown?: (path: string, params?: Record<string, string>) => void;
    onSwitchTab?: (tab: "table" | "raw") => void;
}

/** Convert GPS (lat, lon) to SVG viewBox (x, y) */
function latLonToSvg(lat: number, lon: number): [number, number] {
    const minLat = 10.35, maxLat = 14.75;
    const minLon = 102.3, maxLon = 107.65;
    const x = ((lon - minLon) / (maxLon - minLon)) * MAP_WIDTH;
    const y = ((maxLat - lat) / (maxLat - minLat)) * MAP_HEIGHT;
    return [Math.max(20, Math.min(MAP_WIDTH - 20, x)), Math.max(20, Math.min(MAP_HEIGHT - 20, y))];
}

/** Extract parent province code (01-25) from any code or id */
function extractProvinceCode(raw: unknown): string | null {
    if (!raw) return null;
    const s = String(raw).trim();
    if (/^\d+$/.test(s)) {
        if (s.length <= 2) {
            return s.padStart(2, "0");
        }
        return s.slice(0, 2);
    }
    return null;
}

export function PlaygroundHeroPreview({
    log,
    endpointPath,
    onDrillDown,
    onSwitchTab,
}: PlaygroundHeroPreviewProps) {
    const { t, lang } = useI18n();
    const [paused, setPaused] = useState(false);
    const resumeTimer = useRef<number | undefined>(undefined);
    const reducedMotion = useRef(typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

    const body = log?.body as any;

    // Detect province code from endpoint path or response data
    const inferredProvinceCode = useMemo(() => {
        // 1. From path params: e.g. /api/admin/provinces/12/districts or /api/boundaries/provinces/12
        const pMatch = endpointPath.match(/\/(?:provinces|districts|communes|item|hierarchy)\/(\d+)/);
        if (pMatch) {
            return extractProvinceCode(pMatch[1]);
        }

        // 2. From query param: ?province_code=12
        const qMatch = endpointPath.match(/province_code=(\d+)/);
        if (qMatch) {
            return extractProvinceCode(qMatch[1]);
        }

        // 3. From single item data in response
        if (body?.data && typeof body.data === "object" && !Array.isArray(body.data)) {
            if (body.data.province?.code) return extractProvinceCode(body.data.province.code);
            if (body.data.code) return extractProvinceCode(body.data.code);
            if (body.data.id) return extractProvinceCode(body.data.id);
        }

        // 4. From list item in response
        if (Array.isArray(body?.data) && body.data[0]) {
            const first = body.data[0];
            if (first.province_code) return extractProvinceCode(first.province_code);
            if (first.code) return extractProvinceCode(first.code);
            if (first.id) return extractProvinceCode(first.id);
        }

        // 5. From GeoJSON feature properties
        if (body?.features?.[0]?.properties) {
            const p = body.features[0].properties;
            if (p.province_code) return extractProvinceCode(p.province_code);
            if (p.code) return extractProvinceCode(p.code);
        }
        if (body?.properties) {
            if (body.properties.province_code) return extractProvinceCode(body.properties.province_code);
            if (body.properties.code) return extractProvinceCode(body.properties.code);
        }

        return null;
    }, [endpointPath, body]);

    // Active province on the Hero Map
    const [activeCode, setActiveCode] = useState<string>(inferredProvinceCode || TOUR[0]);

    // Keep active province in sync when request changes
    useEffect(() => {
        if (inferredProvinceCode && PROVINCES.some((p) => p.code === inferredProvinceCode)) {
            setActiveCode(inferredProvinceCode);
            setPaused(true);
        }
    }, [inferredProvinceCode]);

    // Set of highlighted province codes (e.g. all 25 for /provinces, or matched ones)
    const highlightedProvinceCodes = useMemo<Set<string>>(() => {
        const set = new Set<string>();
        if (Array.isArray(body?.data)) {
            body.data.forEach((item: any) => {
                const code = extractProvinceCode(item.code || item.id || item.province_code);
                if (code) set.add(code);
            });
        } else if (Array.isArray(body?.features)) {
            body.features.forEach((feat: any) => {
                const code = extractProvinceCode(feat.properties?.code || feat.properties?.id);
                if (code) set.add(code);
            });
        }
        return set;
    }, [body]);

    // Detect geocode coordinate marker
    const geocodeMarker = useMemo<{ x: number; y: number; lat: number; lon: number; label: string } | null>(() => {
        let lat: number | undefined;
        let lon: number | undefined;
        let label = "Geocoded Location";

        if (body?.data?.lat && body?.data?.lon) {
            lat = Number(body.data.lat);
            lon = Number(body.data.lon);
            label = body.data.display_name || body.data.formatted_address || label;
        } else if (body?.data?.coordinates?.lat && body?.data?.coordinates?.lon) {
            lat = Number(body.data.coordinates.lat);
            lon = Number(body.data.coordinates.lon);
            label = body.data.display_name || body.data.formatted_address || label;
        } else if (Array.isArray(body?.data) && body.data[0]?.lat && body.data[0]?.lon) {
            lat = Number(body.data[0].lat);
            lon = Number(body.data[0].lon);
            label = body.data[0].display_name || label;
        }

        if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
            const [x, y] = latLonToSvg(lat, lon);
            return { x, y, lat, lon, label };
        }
        return null;
    }, [body]);

    // Auto-tour when not paused and not fixed on a specific province
    useEffect(() => {
        if (paused || reducedMotion.current || inferredProvinceCode) return;
        const id = window.setInterval(() => {
            setActiveCode((c) => TOUR[(TOUR.indexOf(c) + 1) % TOUR.length]);
        }, TOUR_MS);
        return () => window.clearInterval(id);
    }, [paused, inferredProvinceCode]);

    const active = PROVINCES.find((p) => p.code === activeCode) ?? PROVINCES[0];

    const hover = useCallback((p: HeroProvince) => {
        window.clearTimeout(resumeTimer.current);
        setPaused(true);
        setActiveCode(p.code);
    }, []);

    const leave = useCallback(() => {
        if (inferredProvinceCode) return;
        window.clearTimeout(resumeTimer.current);
        resumeTimer.current = window.setTimeout(() => setPaused(false), 2500);
    }, [inferredProvinceCode]);

    useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

    // Pin & Callout positioning
    // If geocode marker is present, anchor callout to the marker; otherwise anchor to province centroid
    const pinX = geocodeMarker ? geocodeMarker.x : active.cx;
    const pinY = geocodeMarker ? geocodeMarker.y : active.cy;
    const leftPct = (pinX / MAP_WIDTH) * 100;
    const topPct = (pinY / MAP_HEIGHT) * 100;
    const flip = leftPct > 55;

    // Detailed context for the Callout
    const calloutSummary = useMemo(() => {
        // If districts response
        if (endpointPath.includes("/districts") && Array.isArray(body?.data)) {
            return `${body.data.length} districts in ${active.en}`;
        }
        // If communes response
        if (endpointPath.includes("/communes") && Array.isArray(body?.data)) {
            return `${body.data.length} communes returned`;
        }
        // If hierarchy response
        if (body?.data && typeof body.data === "object" && body.data.province) {
            const h = body.data;
            return [h.province?.name_en, h.district?.name_en, h.commune?.name_en, h.village?.name_en].filter(Boolean).join(" → ");
        }
        // If single item
        if (body?.data?.name_en) {
            return `${body.data.administrative_unit || body.data.level || "Place"} #${body.data.code || body.data.id}`;
        }
        // If geocode
        if (geocodeMarker) {
            return `${geocodeMarker.lat.toFixed(5)}, ${geocodeMarker.lon.toFixed(5)}`;
        }
        // Default
        return `NCDD #${active.code} · ${active.en}`;
    }, [endpointPath, body, active, geocodeMarker]);

    // Place chips for fast navigation
    const [placeSearch, setPlaceSearch] = useState("");
    const [placesView, setPlacesView] = useState<"grid" | "flow">("grid");
    const [showAllPlaces, setShowAllPlaces] = useState(false);

    const placeChips = useMemo<PlaceChipItem[]>(() => {
        if (Array.isArray(body?.data)) {
            return body.data.map((item: any) => ({
                id: item.id ?? item.code,
                code: String(item.code ?? item.id ?? ""),
                name_en: item.name_en || item.name || "Place",
                name_km: item.name_km,
                level: item.level || item.administrative_unit,
            }));
        }
        if (Array.isArray(body?.features)) {
            return body.features.map((f: any) => ({
                id: f.properties?.code ?? f.properties?.id,
                code: String(f.properties?.code ?? f.properties?.id ?? ""),
                name_en: f.properties?.name_en || f.properties?.name || "Feature",
                name_km: f.properties?.name_km,
                level: f.properties?.level || "boundary",
            }));
        }
        return [];
    }, [body]);

    const filteredPlaces = useMemo(() => {
        if (!placeSearch.trim()) return placeChips;
        const q = placeSearch.toLowerCase().trim();
        return placeChips.filter((p: PlaceChipItem) =>
            p.name_en.toLowerCase().includes(q) ||
            (p.name_km && p.name_km.includes(q)) ||
            p.code.includes(q)
        );
    }, [placeChips, placeSearch]);

    const displayedPlaces = useMemo(() => {
        if (showAllPlaces || filteredPlaces.length <= 16) return filteredPlaces;
        return filteredPlaces.slice(0, 16);
    }, [filteredPlaces, showAllPlaces]);

    const getDrillDownPath = (chip: any) => {
        const lvlLower = (chip.level || "").toLowerCase();
        if (lvlLower === "province") {
            return `/api/admin/provinces/${chip.id}/districts`;
        }
        if (lvlLower === "district" || lvlLower === "srok" || lvlLower === "khan" || lvlLower === "krong") {
            return `/api/admin/districts/${chip.code}/communes`;
        }
        if (lvlLower === "commune" || lvlLower === "khum" || lvlLower === "sangkat") {
            return `/api/admin/communes/${chip.code}/villages`;
        }
        return null;
    };

    return (
        <div>
            {/* The Hero Map Canvas Container */}
            <div className="relative overflow-hidden rounded">
                {/* Top Overlay Bar */}
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-ink-2">
                            {highlightedProvinceCodes.size > 0
                                ? `${highlightedProvinceCodes.size} Provinces Highlighted`
                                : `Active: ${active.en} (${active.km})`}
                        </span>
                    </div>

                    {log ? (
                        <div className="flex items-center gap-2 font-mono text-xs text-ink-3">
                            <span className={log.status < 400 ? "text-ok font-bold" : "text-warn font-bold"}>
                                {log.status}
                            </span>
                            <span>·</span>
                            <span>{log.ms.toFixed(2)}ms</span>
                            <span>·</span>
                            <span>{fmtBytes(log.size)}</span>
                        </div>
                    ) : (
                        <div className="flex text-xs items-center gap-2 py-1! px-2 border leading-none border-teal-500 bg-teal-100 rounded-full">
                            <span className="relative flex size-2">
                                <span className="absolute inset-0 animate-ping rounded-full bg-ok opacity-75 motion-reduce:hidden" />
                                <span className="relative block size-2 rounded-full bg-ok" />
                            </span>
                            <span>Live</span>
                        </div>
                    )}
                </div>

                {/* SVG Cambodia Hero Map (Constrained compact size) */}
                <figure className="relative m-0 w-full max-w-190 mx-auto select-none" onMouseLeave={leave}>
                    <div className="relative pt-2 pb-2" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT + 20}` }}>
                        {/* Coordinates frame markers */}
                        <span className="absolute left-0 top-0 font-mono text-[10px] tracking-wide text-ink-3">14.7°N · 102.3°E</span>
                        <span className="absolute bottom-0 right-0 font-mono text-[10px] tracking-wide text-ink-3">10.4°N · 107.7°E</span>

                        <svg
                            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                            className="absolute inset-x-0 top-4 h-[calc(100%-32px)] w-full overflow-visible"
                            role="img"
                            aria-label="Cambodia Administrative Hero Map"
                        >
                            {/* Country Soft Drop Shadow */}
                            <g className="fill-ink/5 translate-x-1.5 translate-y-2" aria-hidden="true">
                                {PROVINCES.map((p) => (
                                    <path key={p.code} d={p.d} />
                                ))}
                            </g>

                            {/* 25 Province Vector Paths */}
                            {PROVINCES.map((p) => {
                                const isCurrent = p.code === active.code;
                                const isHighlighted = highlightedProvinceCodes.has(p.code);

                                return (
                                    <path
                                        key={p.code}
                                        d={p.d}
                                        vectorEffect="non-scaling-stroke"
                                        onMouseEnter={() => hover(p)}
                                        onClick={() => {
                                            setActiveCode(p.code);
                                            setPaused(true);
                                            if (onDrillDown) {
                                                onDrillDown(`/api/admin/provinces/${p.id}/districts`, { id: String(p.id) });
                                            }
                                        }}
                                        className={cx(
                                            "cursor-pointer stroke-[1.1] transition-all duration-300",
                                            isCurrent
                                                ? "fill-accent/20 stroke-accent"
                                                : isHighlighted
                                                    ? "fill-water/20 stroke-water hover:fill-water/30"
                                                    : "fill-surface stroke-line-2 hover:fill-surface-2",
                                        )}
                                    >
                                        <title>{lang === "km" ? `${p.km} · ${p.en}` : `${p.en} · ${p.km}`}</title>
                                    </path>
                                );
                            })}

                            {/* Active Raised Lifted Polygon */}
                            <path
                                key={active.code}
                                d={active.d}
                                vectorEffect="non-scaling-stroke"
                                className="animate-lift pointer-events-none fill-accent/15 stroke-accent stroke-2 transform-fill origin-center drop-shadow-[0_10px_20px_color-mix(in_srgb,var(--og-accent)_35%,transparent)]"
                            />
                        </svg>

                        {/* Gliding centroid indicator & callout */}
                        <div
                            className={cx("pointer-events-none absolute inset-x-0 bottom-4 top-4 z-10 transition-transform duration-700 will-change-transform", EASE)}
                            style={{ transform: `translate(${leftPct}%, ${topPct}%)` }}
                            aria-hidden="true"
                        >
                            {/* Centroid Pin */}
                            <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
                                <span className="absolute inset-0 animate-ping rounded-full bg-accent/40 motion-reduce:hidden" />
                                <span className="relative block size-3.5 rounded-full border-2 border-bg bg-accent shadow-md" />
                            </span>

                            {/* Gliding Callout Card (desktop & tablet) */}
                            <div
                                className={cx(
                                    "pointer-events-auto absolute left-0 top-0 w-[min(280px,70%)] -translate-y-1/2 rounded-xl border border-line bg-surface/95 p-3.5 shadow-xl backdrop-blur transition-transform duration-700 max-sm:hidden",
                                    EASE,
                                    flip ? "-translate-x-[calc(100%+18px)]" : "translate-x-4.5",
                                )}
                            >
                                <div key={active.code + (geocodeMarker?.label || "")} className="animate-fade-up">
                                    <div className="mb-1.5 flex items-center justify-between gap-2">
                                        <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-accent km:font-khmer km:normal-case km:tracking-normal km:text-[11px]">
                                            {t("hero.provinceTag")}
                                        </span>
                                        <span className="font-mono text-[11px] text-ink-3">#{active.code}</span>
                                    </div>

                                    <div className="font-khmer text-lg font-bold leading-snug text-ink">{active.km}</div>
                                    <div className="text-xs font-medium text-ink-2">{active.en}</div>

                                    {/* Summary / Context */}
                                    <div className="mt-2 text-[11px] font-mono text-ink-3 truncate">
                                        {calloutSummary}
                                    </div>

                                    {/* Live Timing Badge */}
                                    <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-code px-2 py-1.5 font-mono text-[10.5px] text-code-dim">
                                        <span className="truncate text-code-text">{log ? endpointPath : `/api/admin/provinces/${active.id}/districts`}</span>
                                        <span className={!log || log.status < 400 ? "text-j-str font-bold" : "text-j-err font-bold"}>
                                            {log ? `${log.ms.toFixed(2)}ms` : "Live"}
                                        </span>
                                    </div>

                                    {/* Drill Down Action */}
                                    {onDrillDown && (
                                        <button
                                            type="button"
                                            onClick={() => onDrillDown(`/api/admin/provinces/${active.id}/districts`, { id: String(active.id) })}
                                            className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-bg hover:bg-[color-mix(in_srgb,var(--og-ink)_85%,var(--og-accent))] cursor-pointer transition-colors"
                                        >
                                            <Icon name="play" className="size-3" />
                                            <span>{log ? "Explore Districts →" : "Send Test Request →"}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Callout below map */}
                    <div className="mt-2 rounded-xl border border-line bg-surface p-3.5 sm:hidden">
                        <div className="flex items-center justify-between mb-1">
                            <span className={lvl("province")}>#{active.code}</span>
                            <span className="font-mono text-xs text-ok font-semibold">{log ? `${log.status} · ${log.ms.toFixed(2)}ms` : "Live Hero Map"}</span>
                        </div>
                        <div className="font-khmer text-base font-bold text-ink">{active.km} ({active.en})</div>
                        <div className="mt-1 text-xs text-ink-3 font-mono">{calloutSummary}</div>
                    </div>
                </figure>
            </div>

            {/* Redesigned Response Places Section */}
            {placeChips.length > 0 && (
                <div className="rounded-2xl border border-line bg-surface p-4 shadow-card space-y-3.5 transition-all">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                                <Icon name="layers" className="size-4" />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <h4 className="m-0 font-display text-xs font-bold uppercase tracking-wider text-ink">
                                        Response Places
                                    </h4>
                                    <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-2 border border-line/60">
                                        {filteredPlaces.length}
                                        {filteredPlaces.length !== placeChips.length && ` of ${placeChips.length}`}
                                    </span>
                                </div>
                                <span className="text-[11px] text-ink-3">
                                    Click any place to highlight on Hero Map, or drill down
                                </span>
                            </div>
                        </div>

                        {/* Search Filter & View Switcher */}
                        <div className="flex items-center gap-2">
                            {/* Fast Search Filter */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={placeSearch}
                                    onChange={(e) => setPlaceSearch(e.target.value)}
                                    placeholder="Filter places or code..."
                                    className="h-8 w-44 rounded-lg border border-line bg-surface-2 pl-7 pr-6 font-mono text-xs text-ink placeholder-ink-3 outline-none focus:border-accent transition-colors"
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 text-xs pointer-events-none">
                                    🔍
                                </span>
                                {placeSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setPlaceSearch("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 size-4 rounded-full bg-line text-ink-2 hover:text-ink text-[10px] flex items-center justify-center cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* View Mode Toggle: Grid vs Flow */}
                            <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setPlacesView("grid")}
                                    className={cx(
                                        "flex size-7 cursor-pointer items-center justify-center rounded-md text-xs transition-colors",
                                        placesView === "grid" ? "bg-surface text-ink font-bold shadow-xs" : "text-ink-3 hover:text-ink",
                                    )}
                                    title="Grid card view"
                                >
                                    ⊞
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPlacesView("flow")}
                                    className={cx(
                                        "flex size-7 cursor-pointer items-center justify-center rounded-md text-xs transition-colors",
                                        placesView === "flow" ? "bg-surface text-ink font-bold shadow-xs" : "text-ink-3 hover:text-ink",
                                    )}
                                    title="Flow tags view"
                                >
                                    ≡
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Places Content (Grid vs Flow) */}
                    {displayedPlaces.length === 0 ? (
                        <div className="py-6 text-center text-xs text-ink-3">
                            No places match &ldquo;{placeSearch}&rdquo;
                        </div>
                    ) : placesView === "grid" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {displayedPlaces.map((chip: any, idx: number) => {
                                const pCode = extractProvinceCode(chip.code || chip.id);
                                const isSelected = pCode === activeCode;
                                const drillPath = getDrillDownPath(chip);

                                return (
                                    <div
                                        key={chip.code || idx}
                                        onClick={() => {
                                            if (pCode) {
                                                setActiveCode(pCode);
                                                setPaused(true);
                                            }
                                        }}
                                        className={cx(
                                            "group relative flex flex-col justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-left select-none",
                                            isSelected
                                                ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30"
                                                : "border-line bg-surface-2/40 hover:bg-surface-2 hover:border-line-2 hover:shadow-xs",
                                        )}
                                    >
                                        {/* Top row: Code & Level */}
                                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                            <span className="font-mono text-[10px] text-ink-3 font-semibold group-hover:text-ink">
                                                #{chip.code}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {chip.level && (
                                                    <span className={lvl(chip.level)}>
                                                        {chip.level}
                                                    </span>
                                                )}
                                                {onDrillDown && drillPath && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDrillDown(drillPath, { id: chip.id, code: chip.code });
                                                        }}
                                                        className="size-5 rounded flex items-center justify-center text-ink-3 hover:text-bg hover:bg-ink text-[11px] transition-colors cursor-pointer"
                                                        title={`Explore ${chip.name_en}`}
                                                    >
                                                        →
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Names */}
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-semibold text-ink group-hover:text-accent transition-colors truncate">
                                                {chip.name_en}
                                            </span>
                                            {chip.name_km && (
                                                <span className="font-khmer text-[11px] text-ink-3 truncate">
                                                    {chip.name_km}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {displayedPlaces.map((chip: any, idx: number) => {
                                const pCode = extractProvinceCode(chip.code || chip.id);
                                const isSelected = pCode === activeCode;
                                const drillPath = getDrillDownPath(chip);

                                return (
                                    <div
                                        key={chip.code || idx}
                                        onClick={() => {
                                            if (pCode) {
                                                setActiveCode(pCode);
                                                setPaused(true);
                                            }
                                        }}
                                        className={cx(
                                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium cursor-pointer transition-all",
                                            isSelected
                                                ? "border-accent bg-accent/15 text-accent font-semibold shadow-xs"
                                                : "border-line bg-surface-2 text-ink-2 hover:border-line-2 hover:text-ink",
                                        )}
                                    >
                                        <span className="font-mono text-[10px] text-ink-3 font-semibold">#{chip.code}</span>
                                        {chip.level && <span className={lvl(chip.level)}>{chip.level}</span>}
                                        <span className="font-semibold text-ink">{chip.name_en}</span>
                                        {chip.name_km && (
                                            <span className="font-khmer text-ink-3 font-normal">
                                                ({chip.name_km})
                                            </span>
                                        )}
                                        {onDrillDown && drillPath && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDrillDown(drillPath, { id: chip.id, code: chip.code });
                                                }}
                                                className="ml-1 text-ink-3 hover:text-accent font-bold cursor-pointer"
                                                title={`Explore ${chip.name_en}`}
                                            >
                                                →
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer Controls: Pagination / Expand & Drill-down Tabs */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/40 text-xs text-ink-3">
                        {filteredPlaces.length > 16 ? (
                            <button
                                type="button"
                                onClick={() => setShowAllPlaces((s) => !s)}
                                className="cursor-pointer font-semibold text-accent hover:underline flex items-center gap-1"
                            >
                                <span>{showAllPlaces ? "Show fewer places ▲" : `Show all ${filteredPlaces.length} places ▼`}</span>
                            </button>
                        ) : (
                            <span>Showing {displayedPlaces.length} places</span>
                        )}

                        {onSwitchTab && (
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => onSwitchTab("table")}
                                    className="cursor-pointer font-medium text-water hover:underline flex items-center gap-1"
                                >
                                    <Icon name="table" className="size-3" />
                                    <span>View Data Table →</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onSwitchTab("raw")}
                                    className="cursor-pointer font-medium text-accent hover:underline flex items-center gap-1"
                                >
                                    <Icon name="code" className="size-3" />
                                    <span>View Raw JSON →</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
