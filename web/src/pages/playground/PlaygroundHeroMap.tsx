import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "../../components/Icon";
import { cx } from "../../components/ui";
import { useI18n } from "../../i18n";
import { apiGet } from "../../lib/api";
import type { AdminItem, ApiEnvelope } from "../../lib/types";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCES, type HeroProvince } from "../home/cambodiaMap";

const TOUR = ["12", "17", "02", "07", "11", "13", "09", "16", "03", "18", "06", "21"];
const TOUR_MS = 3600;

interface LiveInfo {
    path: string;
    status: number;
    server: string;
}

const EASE = "ease-[cubic-bezier(.22,1,.36,1)]";

interface PlaygroundHeroMapProps {
    activeProvinceCode?: string;
    onSelectProvince: (province: HeroProvince) => void;
}

function Callout({
    province,
    info,
    className,
    style,
    onTest,
}: {
    province: HeroProvince;
    info?: LiveInfo;
    className?: string;
    style?: CSSProperties;
    onTest: (p: HeroProvince) => void;
}) {
    const { t } = useI18n();

    return (
        <div
            className={cx(
                "pointer-events-auto rounded-xl border border-line bg-surface/95 p-3.5 shadow-card backdrop-blur transition-all",
                className,
            )}
            style={style}
        >
            <div key={province.code} className="animate-fade-up">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-accent km:font-khmer km:normal-case km:tracking-normal km:text-[11px]">
                        {t("hero.provinceTag")}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">#{province.code}</span>
                </div>
                <div className="font-khmer text-lg font-semibold leading-snug text-ink">{province.km}</div>
                <div className="text-xs text-ink-2">{province.en}</div>

                {/* Live API Timing Badge */}
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-md bg-code px-2 py-1.5 font-mono text-[10.5px] text-code-dim">
                    <span className="truncate">
                        <span className="text-j-str">GET</span> {info?.path ?? `/api/admin/provinces/${province.id}/districts`}
                    </span>
                    <span className="flex-none">
                        {info ? (
                            <>
                                <span className={info.status < 400 ? "text-j-str" : "text-j-err"}>{info.status}</span> · {info.server}
                            </>
                        ) : (
                            "…"
                        )}
                    </span>
                </div>

                {/* Test in Playground Action Button */}
                <button
                    type="button"
                    onClick={() => onTest(province)}
                    className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-bg hover:bg-[color-mix(in_srgb,var(--og-ink)_85%,var(--og-accent))] cursor-pointer transition-colors"
                >
                    <Icon name="play" className="size-3" />
                    <span>{t("playground.testInPlayground")}</span>
                </button>
            </div>
        </div>
    );
}

export function PlaygroundHeroMap({ activeProvinceCode, onSelectProvince }: PlaygroundHeroMapProps) {
    const { t, lang } = useI18n();
    const [activeCode, setActiveCode] = useState(activeProvinceCode || TOUR[0]);
    const [paused, setPaused] = useState(false);
    const [live, setLive] = useState<Record<string, LiveInfo>>({});
    const resumeTimer = useRef<number | undefined>(undefined);
    const reducedMotion = useRef(typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

    // Sync if external province code changes
    useEffect(() => {
        if (activeProvinceCode && PROVINCES.some((p) => p.code === activeProvinceCode)) {
            setActiveCode(activeProvinceCode);
            setPaused(true);
        }
    }, [activeProvinceCode]);

    const active = PROVINCES.find((p) => p.code === activeCode) ?? PROVINCES[0];

    // Auto-tour
    useEffect(() => {
        if (paused || reducedMotion.current) return;
        const id = window.setInterval(() => {
            setActiveCode((c) => TOUR[(TOUR.indexOf(c) + 1) % TOUR.length]);
        }, TOUR_MS);
        return () => window.clearInterval(id);
    }, [paused]);

    // Live endpoint probe for genuine timing
    useEffect(() => {
        if (live[active.code]) return;
        const ctrl = new AbortController();
        const path = `/api/admin/provinces/${active.id}/districts`;
        let entry: LiveInfo | null = null;
        apiGet<ApiEnvelope<AdminItem[]>>(path, (l) => {
            entry = { path, status: l.status, server: l.server ?? `${l.ms.toFixed(1)}ms` };
        }, ctrl.signal)
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
        resumeTimer.current = window.setTimeout(() => setPaused(false), 2000);
    }, []);

    useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

    const leftPct = (active.cx / MAP_WIDTH) * 100;
    const topPct = (active.cy / MAP_HEIGHT) * 100;
    const flip = leftPct > 55;
    const info = live[active.code];

    return (
        <figure className="relative m-0 w-full select-none" onMouseLeave={leave}>
            <div className="relative pt-4 pb-4" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT + 60}` }}>
                {/* Lat/Lon frame bounds */}
                <span className="absolute left-0 top-0 font-mono text-[10px] tracking-wide text-ink-3">14.7°N · 102.3°E</span>
                <span className="absolute bottom-0 right-0 font-mono text-[10px] tracking-wide text-ink-3">10.4°N · 107.7°E</span>

                <svg
                    viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                    className="absolute inset-x-0 top-4 h-[calc(100%-32px)] w-full overflow-visible"
                    role="img"
                    aria-label="Interactive map of Cambodia provinces"
                >
                    {/* Country soft drop shadow */}
                    <g className="fill-ink/5 translate-x-1.5 translate-y-2" aria-hidden="true">
                        {PROVINCES.map((p) => (
                            <path key={p.code} d={p.d} />
                        ))}
                    </g>

                    {/* All Province Polygons */}
                    {PROVINCES.map((p) => {
                        const on = p.code === active.code;
                        return (
                            <path
                                key={p.code}
                                d={p.d}
                                vectorEffect="non-scaling-stroke"
                                onMouseEnter={() => hover(p)}
                                onClick={() => onSelectProvince(p)}
                                className={cx(
                                    "cursor-pointer stroke-[1.1] transition-[fill,stroke] duration-300",
                                    on
                                        ? "fill-accent/15 stroke-accent"
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
                        className="animate-lift pointer-events-none fill-accent/12 stroke-accent stroke-[1.8] transform-fill origin-center drop-shadow-[0_8px_16px_color-mix(in_srgb,var(--og-accent)_35%,transparent)]"
                    />
                </svg>

                {/* Gliding centroid indicator & callout */}
                <div
                    className={cx("pointer-events-none absolute inset-x-0 bottom-4 top-4 z-10 transition-transform duration-700 will-change-transform", EASE)}
                    style={{ transform: `translate(${leftPct}%, ${topPct}%)` }}
                    aria-hidden="true"
                >
                    {/* Glowing Centroid Pin */}
                    <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
                        <span className="absolute inset-0 animate-ping rounded-full bg-accent/40 motion-reduce:hidden" />
                        <span className="relative block size-3 rounded-full border-2 border-bg bg-accent shadow-sm" />
                    </span>

                    {/* Gliding callout beside pin (desktop / tablet) */}
                    <Callout
                        province={active}
                        info={info}
                        onTest={onSelectProvince}
                        className={cx(
                            "absolute left-0 top-0 w-[min(260px,65%)] -translate-y-1/2 transition-transform duration-700 max-sm:hidden",
                            EASE,
                            flip ? "-translate-x-[calc(100%+18px)]" : "translate-x-4.5",
                        )}
                    />
                </div>
            </div>

            {/* Mobile Callout */}
            <Callout province={active} info={info} onTest={onSelectProvince} className="mt-2 sm:hidden" />

            <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
                <span className="inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-ok shadow-[0_0_0_3px_color-mix(in_srgb,var(--og-ok)_25%,transparent)]" />
                    <span>{t("hero.liveTag")}</span>
                </span>
                <span>{t("playground.clickToTest")}</span>
            </figcaption>
        </figure>
    );
}
