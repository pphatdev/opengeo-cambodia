import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { cx } from "../../components/ui";
import { useI18n } from "../../i18n";
import { apiGet } from "../../lib/api";
import type { AdminItem, ApiEnvelope } from "../../lib/types";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCES, type HeroProvince } from "./cambodiaMap";

/**
 * Provinces with no international border or coastline. Their outlines are fully masked out by the
 * country-rim mask, so skipping them just saves animating invisible strokes (the mask, not this list,
 * guarantees light only shows on the outer edge).
 */
const INTERIOR_PROVINCES = new Set(["03", "04", "05", "06", "12", "17"]);
const RIM_PROVINCES = PROVINCES.filter((p) => !INTERIOR_PROVINCES.has(p.code));

/** Per-border comet speed / phase / direction, so the lights don't march in step */
function cometTiming(i: number): CSSProperties {
    return {
        animationDuration: `${6 + ((i * 7) % 5)}s`,
        animationDelay: `-${((i * 1.37) % 6).toFixed(2)}s`,
        animationDirection: i % 2 ? "reverse" : "normal",
    };
}

/** Fired when a province is clicked; the Explorer listens and selects it. */
export const SELECT_PROVINCE_EVENT = "og:select-province";

// A tour that moves around the country rather than in code order
const TOUR = ["12", "17", "02", "07", "11", "13", "09", "16", "03", "18", "06", "21"];
const TOUR_MS = 3400;

interface Live {
    path: string;
    status: number;
    server: string;
}

// One easing for every movement so the pin, card and highlight feel like one motion
const EASE = "ease-[cubic-bezier(.22,1,.36,1)]";

/**
 * The card itself stays mounted (so it can glide); only its contents are keyed,
 * which cross-fades the text when the province changes.
 */
function Callout({ province, info, className, style }: { province: HeroProvince; info?: Live; className?: string; style?: CSSProperties }) {
    const { t } = useI18n();
    return (
        <div className={cx("pointer-events-none rounded-2xl glass-panel p-4 shadow-glass-lg transition-all", className)} style={style}>
            <div key={province.code} className="animate-fade-up">
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="rounded-full bg-accent-soft/90 border border-accent/25 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-accent km:font-khmer km:normal-case km:tracking-normal km:text-[11px]">
                    {t("hero.provinceTag")}
                </span>
                <span className="font-mono text-[11px] text-ink-3">#{province.code}</span>
            </div>
            <div className="font-khmer text-[19px] font-semibold leading-snug text-ink">{province.km}</div>
            <div className="text-[13px] text-ink-2">{province.en}</div>
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-code/95 border border-code-line/60 px-2.5 py-1.5 font-mono text-[10.5px] text-code-dim backdrop-blur-sm">
                <span className="truncate"><span className="text-j-str">GET</span> {info?.path ?? `/api/admin/item/${province.id}`}</span>
                <span className="flex-none">
                    {info ? (<><span className={info.status < 400 ? "text-j-str" : "text-j-err"}>{info.status}</span> · {info.server}</>) : "…"}
                </span>
            </div>
            <Link
                to={`/playground?ep=admin-districts&id=${province.id}`}
                className="pointer-events-auto mt-2.5 flex items-center justify-between rounded-lg glass-pill px-3 py-1.5 font-mono text-[10.5px] font-semibold text-accent hover:border-accent hover:text-accent transition-all no-underline"
            >
                <span>{t("playground.testInPlayground")}</span>
                <span>→</span>
            </Link>
            </div>
        </div>
    );
}

export function HeroMap() {
    const { t, lang } = useI18n();
    // Unique SVG ids (gradient / filters) in case the map renders more than once
    const uid = "hm" + useId().replace(/[^a-zA-Z0-9]/g, "");
    const [activeCode, setActiveCode] = useState(TOUR[0]);
    const [paused, setPaused] = useState(false);
    // Off-screen: stop the tour (and its API calls) and freeze the decorative CSS animations
    const [onScreen, setOnScreen] = useState(true);
    const figureRef = useRef<HTMLElement | null>(null);
    useEffect(() => {
        const el = figureRef.current;
        if (!el || typeof IntersectionObserver === "undefined") return;
        const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "100px" });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    const [live, setLive] = useState<Record<string, Live>>({});
    const resumeTimer = useRef<number | undefined>(undefined);
    const reducedMotion = useRef(typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

    const active = PROVINCES.find((p) => p.code === activeCode) ?? PROVINCES[0];

    // Auto-tour (not under reduced motion, not while the visitor is pointing at the map)
    useEffect(() => {
        if (paused || !onScreen || reducedMotion.current) return;
        const id = window.setInterval(() => {
            setActiveCode((c) => TOUR[(TOUR.indexOf(c) + 1) % TOUR.length]);
        }, TOUR_MS);
        return () => window.clearInterval(id);
    }, [paused, onScreen]);

    // Real request for the highlighted province, so the timing shown is genuine (cached per province)
    useEffect(() => {
        if (live[active.code]) return;
        const ctrl = new AbortController();
        const path = `/api/admin/item/${active.id}`;
        let entry: Live | null = null;
        apiGet<ApiEnvelope<AdminItem>>(path, (l) => (entry = { path, status: l.status, server: l.server ?? `${l.ms.toFixed(1)}ms` }), ctrl.signal)
            .catch(() => {})
            .finally(() => {
                if (entry) setLive((prev) => ({ ...prev, [active.code]: entry! }));
            });
        return () => ctrl.abort();
    }, [active, live]);

    const hover = useCallback((p: HeroProvince) => {
        window.clearTimeout(resumeTimer.current);
        setPaused(true);
        setActiveCode(p.code);
    }, []);
    const leave = useCallback(() => {
        window.clearTimeout(resumeTimer.current);
        resumeTimer.current = window.setTimeout(() => setPaused(false), 1500);
    }, []);
    useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

    const select = (p: HeroProvince) => {
        window.dispatchEvent(new CustomEvent(SELECT_PROVINCE_EVENT, { detail: { id: p.id } }));
        document.getElementById("explore")?.scrollIntoView({ behavior: reducedMotion.current ? "auto" : "smooth" });
    };

    // Callout sits beside the pin, on whichever side has room
    const leftPct = (active.cx / MAP_WIDTH) * 100;
    const topPct = (active.cy / MAP_HEIGHT) * 100;
    const flip = leftPct > 55;
    const info = live[active.code];

    return (
        <figure ref={figureRef} className={cx("relative m-0 w-full select-none", !onScreen && "og-paused")} onMouseLeave={leave}>
            <div className="relative pt-5 pb-5" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT + 80}` }}>
                {/* Corner coordinates: the dataset's bounding box, like a map sheet's margin */}
                <span className="absolute left-0 top-0 rounded-md glass-pill px-2 py-0.5 font-mono text-[10.5px] tracking-wide text-ink-3" aria-hidden="true">14.7°N · 102.3°E</span>
                <span className="absolute bottom-0 right-0 rounded-md glass-pill px-2 py-0.5 font-mono text-[10.5px] tracking-wide text-ink-3" aria-hidden="true">10.4°N · 107.7°E</span>

                {/* Breathing halo around the country silhouette. Its own layer: the CSS blur is rasterised once and only
                    opacity animates (compositor-only), instead of re-running an SVG blur filter every frame. */}
                <div
                    aria-hidden="true"
                    className="animate-intro-fade pointer-events-none absolute inset-x-0 top-5 h-[calc(100%-40px)]"
                    style={{ "--d": "600ms" } as CSSProperties}
                >
                    <div className="animate-map-aura size-full will-change-[opacity]">
                        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="size-full overflow-visible blur-2xl">
                            <defs>
                                <linearGradient id={`${uid}-halo`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={MAP_WIDTH} y2={MAP_HEIGHT}>
                                    <stop offset="0" className="[stop-color:var(--og-water)]" />
                                    <stop offset="0.55" className="[stop-color:var(--og-accent)]" />
                                    <stop offset="1" className="[stop-color:var(--og-ok)]" />
                                </linearGradient>
                            </defs>
                            <g fill={`url(#${uid}-halo)`}>
                                {PROVINCES.map((p) => <path key={p.code} d={p.d} />)}
                            </g>
                        </svg>
                    </div>
                </div>

                <svg
                    viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                    className="absolute inset-x-0 top-5 h-[calc(100%-40px)] w-full overflow-visible"
                    role="img"
                    aria-label={t("hero.mapAlt")}
                >
                    <defs>
                        {/* Light colour shifts across the country: water (west) → accent → ok (east) */}
                        <linearGradient id={`${uid}-light`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={MAP_WIDTH} y2={MAP_HEIGHT}>
                            <stop offset="0" className="[stop-color:var(--og-water)]" />
                            <stop offset="0.55" className="[stop-color:var(--og-accent)]" />
                            <stop offset="1" className="[stop-color:var(--og-ok)]" />
                        </linearGradient>
                        {/* Country-outline-only mask: everything outside the country is visible, the inside is hidden.
                            Interior province borders lie fully inside, so only light on the outer edge remains. */}
                        <mask id={`${uid}-rim`} maskUnits="userSpaceOnUse" x={-50} y={-50} width={MAP_WIDTH + 100} height={MAP_HEIGHT + 100}>
                            <rect x={-50} y={-50} width={MAP_WIDTH + 100} height={MAP_HEIGHT + 100} fill="white" />
                            <g fill="black">
                                {PROVINCES.map((p) => <path key={p.code} d={p.d} />)}
                            </g>
                        </mask>
                    </defs>

                    {/* Soft shadow of the whole country */}
                    <g className="fill-ink/4 translate-x-1.5 translate-y-2" aria-hidden="true">
                        {PROVINCES.map((p) => <path key={p.code} d={p.d} />)}
                    </g>
                    {PROVINCES.map((p) => {
                        const on = p.code === active.code;
                        return (
                            <path
                                key={p.code}
                                d={p.d}
                                vectorEffect="non-scaling-stroke"
                                onMouseEnter={() => hover(p)}
                                onClick={() => select(p)}
                                className={cx(
                                    "cursor-pointer stroke-[1.2] transition-[fill,stroke,filter] duration-300",
                                    on ? "fill-accent/22 stroke-accent drop-shadow-[0_0_8px_var(--og-accent)]" : "fill-surface/85 stroke-line-2 hover:fill-accent/12 hover:stroke-accent/50",
                                )}
                            >
                                <title>{lang === "km" ? `${p.km} · ${p.en}` : `${p.en} · ${p.km}`}</title>
                            </path>
                        );
                    })}
                    {/* Rim light travelling around the country's outer edge only (the mask hides every interior
                        province border). Only provinces that touch the national border can show light, so the
                        rest are skipped. Starts after the hero intro. */}
                    <g
                        className="animate-intro-fade pointer-events-none motion-reduce:hidden"
                        style={{ "--d": "1100ms" } as CSSProperties}
                        mask={`url(#${uid}-rim)`}
                        aria-hidden="true"
                    >
                        {/* No SVG filter: the glow is a wide translucent stroke under a thin crisp one with the same
                            timing (only the outer half of each stroke survives the mask) */}
                        {(["glow", "core"] as const).map((layer) => (
                            <g
                                key={layer}
                                fill="none"
                                stroke={`url(#${uid}-light)`}
                                strokeWidth={layer === "glow" ? 14 : 5}
                                strokeOpacity={layer === "glow" ? 0.3 : 1}
                                strokeLinecap="round"
                            >
                                {RIM_PROVINCES.map((p, i) => (
                                    <path key={p.code} d={p.d} pathLength={100} className="animate-border-run" style={cometTiming(i)} />
                                ))}
                            </g>
                        ))}
                    </g>

                    {/* Active province "lifts" off the map: a raised copy scaled from its own centre.
                        Keyed so the lift replays for each province. */}
                    <path
                        key={active.code}
                        d={active.d}
                        vectorEffect="non-scaling-stroke"
                        className="animate-lift pointer-events-none fill-accent/25 stroke-accent stroke-2 transform-fill origin-center drop-shadow-[0_8px_20px_color-mix(in_srgb,var(--og-accent)_45%,transparent)]"
                    />
                </svg>

                {/* Moving layer: covers exactly the drawn map area, and its translate(x%, y%) is
                    relative to its own (= the map's) size, so it lands its origin on the centroid.
                    Transform-only movement is GPU-composited and glides between provinces. */}
                <div
                    className={cx("pointer-events-none absolute inset-x-0 bottom-5 top-5 z-10 transition-transform duration-700 will-change-transform", EASE)}
                    style={{ transform: `translate(${leftPct}%, ${topPct}%)` }}
                    aria-hidden="true"
                >
                    {/* Pin at the layer's origin with refractive liquid aura */}
                    <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
                        <span className="absolute -inset-1 animate-ping rounded-full bg-accent/40 motion-reduce:hidden" />
                        <span className="relative block size-3.5 rounded-full border-2 border-surface bg-accent shadow-[0_0_12px_var(--og-accent)]" />
                    </span>

                    {/* Callout beside the pin (sm and up); side switch animates too */}
                    <Callout
                        province={active}
                        info={info}
                        className={cx(
                            "absolute left-0 top-0 w-[min(250px,62%)] -translate-y-1/2 transition-transform duration-700 max-sm:hidden",
                            EASE,
                            flip ? "-translate-x-[calc(100%+18px)]" : "translate-x-4.5",
                        )}
                    />
                </div>
            </div>

            {/* Phones: no room beside the pin, so the same card sits under the map */}
            <Callout province={active} info={info} className="mt-1 sm:hidden" />

            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
                <span className="inline-flex items-center gap-1.5 rounded-full glass-pill px-2.5 py-1">
                    <span className="size-1.5 rounded-full bg-ok shadow-[0_0_8px_var(--og-ok)] animate-pulse" />
                    {t("hero.liveTag")}
                </span>
                <span className="rounded-full glass-pill px-2.5 py-1">{t("hero.clickHint")}</span>
            </figcaption>
        </figure>
    );
}
