import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { Parallax } from "../../components/Parallax";
import { RollingNumber } from "../../components/RollingNumber";
import { btnGhost, btnPrimary, cx, displayH1, lvl, wrap } from "../../components/ui";
import { useI18n } from "../../i18n";
import { apiGet, fmt, PROD_ORIGIN } from "../../lib/api";
import { useToast } from "../../lib/toast";
import type { AdminStats, ApiEnvelope, Level } from "../../lib/types";
import { HeroMap } from "./HeroMap";

const HERO_ENDPOINTS = [
    {
        id: "provinces",
        label: "Provinces",
        labelKm: "រាជធានី-ខេត្ត",
        path: "/api/admin/provinces",
        playground: "/playground?ep=admin-provinces",
        desc: "25 provinces & capital",
    },
    {
        id: "search",
        label: "Search",
        labelKm: "ស្វែងរក",
        path: "/api/admin/search?q=Siem+Reap",
        playground: "/playground?ep=admin-search",
        desc: "Bilingual fuzzy search",
    },
    {
        id: "reverse",
        label: "Geocode",
        labelKm: "និយាមកា",
        path: "/api/boundaries/reverse?lat=11.5564&lon=104.9282",
        playground: "/playground?ep=boundaries-reverse",
        desc: "Point-in-polygon lookup",
    },
    {
        id: "hierarchy",
        label: "Hierarchy",
        labelKm: "ឋានានុក្រម",
        path: "/api/admin/hierarchy/12010101",
        playground: "/playground?ep=admin-hierarchy",
        desc: "Full ancestor chain",
    },
] as const;

// Subtitle shows the other language: Khmer unit types in English mode, English names in Khmer mode
const TIERS: {
    stat: keyof AdminStats;
    level: Level;
    km: string;
    en: string;
    fallback: number;
    barColor: string;
    dotColor: string;
}[] = [
    {
        stat: "provinces",
        level: "province",
        km: "រាជធានី / ខេត្ត",
        en: "Provinces",
        fallback: 25,
        barColor: "from-accent to-teal-400 shadow-[0_0_10px_var(--og-accent)]",
        dotColor: "bg-accent text-white border-accent",
    },
    {
        stat: "districts",
        level: "district",
        km: "ក្រុង / ស្រុក / ខណ្ឌ",
        en: "Districts",
        fallback: 210,
        barColor: "from-water to-sky-400 shadow-[0_0_10px_var(--og-water)]",
        dotColor: "bg-water text-white border-water",
    },
    {
        stat: "communes",
        level: "commune",
        km: "ឃុំ / សង្កាត់",
        en: "Communes",
        fallback: 1661,
        barColor: "from-warn to-amber-400 shadow-[0_0_10px_var(--og-warn)]",
        dotColor: "bg-warn text-white border-warn",
    },
    {
        stat: "villages",
        level: "village",
        km: "ភូមិ",
        en: "Villages",
        fallback: 14576,
        barColor: "from-ok to-emerald-400 shadow-[0_0_10px_var(--og-ok)]",
        dotColor: "bg-ok text-white border-ok",
    },
];

// Example admin code split per level: each tier appends two digits to its parent's code
const CODE_PARTS = ["12", "01", "01", "01"];
// Top of the log-scale bars, a little above the village count so the last bar isn't flush
const MAX_SCALE = 20000;

/** Intro stagger delay for the CSS animate-intro* utilities */
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function Hero() {
    const { copy } = useToast();
    const { t, rt, lang } = useI18n();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [activeEpIdx, setActiveEpIdx] = useState(0);

    const activeEp = HERO_ENDPOINTS[activeEpIdx];
    const activeCommand = `curl "${PROD_ORIGIN}${activeEp.path}"`;

    useEffect(() => {
        const ctrl = new AbortController();
        apiGet<ApiEnvelope<AdminStats>>("/api/admin/stats", undefined, ctrl.signal)
            .then((j) => setStats(j.data))
            .catch(() => {});
        return () => ctrl.abort();
    }, []);

    return (
        <section className="relative overflow-hidden pb-16 pt-8 sm:pt-12">
            {/* Parallax depth stack: each background plane drifts at its own speed (oversized so edges never show) */}
            <Parallax origin="scroll" speed={0.32} className="bg-dot-grid animate-intro-fade pointer-events-none absolute -inset-y-48 inset-x-0 opacity-60" aria-hidden="true" />
            <Parallax origin="scroll" speed={0.18} className="bg-liquid-glow animate-intro-fade pointer-events-none absolute -inset-y-32 inset-x-0 opacity-80" style={d(150)} aria-hidden="true" />
            {/* Luminous fluid ambient lighting orbs */}
            <Parallax origin="scroll" speed={0.5} x={0.04} minWidth={1024} className="pointer-events-none absolute -right-36 top-10" aria-hidden="true">
                <div className="size-160 animate-intro-bloom rounded-full bg-accent/15 blur-[100px]" style={d(100)} />
            </Parallax>
            <Parallax origin="scroll" speed={-0.22} minWidth={1024} className="pointer-events-none absolute -left-20 top-36" aria-hidden="true">
                <div className="size-120 animate-intro-bloom rounded-full bg-water/15 blur-[90px]" style={d(300)} />
            </Parallax>
            <Parallax origin="scroll" speed={0.7} minWidth={1024} className="pointer-events-none absolute left-[38%] top-[62%]" aria-hidden="true">
                <div className="size-72 animate-intro-bloom rounded-full bg-ok/10 blur-[80px]" style={d(500)} />
            </Parallax>

            <div className={cx(wrap, "relative")}>
                {/* Foreground lifts slightly faster than the page and fades as the hero scrolls away */}
                <Parallax origin="scroll" speed={-0.06} fade className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1.06fr)] lg:gap-12">
                    {/* Map on top for small screens, right column for desktop */}
                    <div className="min-w-0 animate-intro-settle lg:col-start-2 lg:row-start-1" style={d(250)}>
                        <HeroMap />
                    </div>

                    {/* Text content below map for small screens, left column for desktop */}
                    <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                        <div style={d(80)} className="animate-intro inline-flex flex-wrap items-center gap-2 rounded-full glass-pill py-1 pl-1.5 pr-3.5 text-[12.5px] font-medium text-ink-2 shadow-xs">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
                                <span className="relative flex size-1.75 items-center justify-center">
                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
                                    <span className="relative inline-flex size-1.75 rounded-full bg-accent" />
                                </span>
                                v1.13
                            </span>
                            <span>{t("hero.eyebrow")}</span>
                        </div>

                        <h1 className={displayH1}>
                            <span className="animate-intro inline-block" style={d(180)}>{t("hero.titleA")}</span>{" "}
                            <em className="animate-intro inline-block" style={d(320)}>
                                {/* Brand gradient with a single light sweep once the words have landed */}
                                <span className="animate-brand-sweep" style={d(900)}>{t("hero.titleB")}</span>
                            </em>
                        </h1>

                        <p style={d(440)} className="animate-intro rich mb-7 mt-0 max-w-[36em] text-sm sm:text-[17px] leading-relaxed text-ink-2">
                            {rt("hero.lede", { total: fmt(stats?.total ?? 16472) })}
                        </p>

                        <div style={d(540)} className="animate-intro flex flex-wrap items-center gap-3">
                            <a className={btnPrimary} href="#explore">
                                {t("hero.explore")} <Icon name="arrow" />
                            </a>
                            <Link className={btnGhost} to="/playground">
                                <Icon name="play" /> {t("nav.playground")}
                            </Link>
                            <Link className={btnGhost} to="/map">
                                <Icon name="map" /> {t("nav.map")}
                            </Link>
                            <Link className={btnGhost} to="/docs">
                                <Icon name="book" /> {t("hero.docs")}
                            </Link>
                        </div>

                        {/* Interactive multi-endpoint quick-switch terminal */}
                        <div
                            style={d(640)}
                            className="animate-intro mt-7 max-w-145 overflow-hidden rounded-2xl border border-code-line/85 bg-code/95 text-code-ink shadow-[0_20px_45px_-18px_rgba(0,0,0,.65),inset_0_1px_1px_0_rgba(255,255,255,.08)] backdrop-blur-md"
                        >
                            {/* Terminal top bar with macOS dots + endpoint switcher tabs */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-code-line/80 bg-white/[0.02] px-3.5 py-2">
                                <div className="flex items-center gap-1.5" aria-hidden="true">
                                    <span className="size-2.5 rounded-full bg-rose-500/75" />
                                    <span className="size-2.5 rounded-full bg-amber-400/75" />
                                    <span className="size-2.5 rounded-full bg-emerald-400/75" />
                                </div>
                                <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Quick API Endpoints">
                                    {HERO_ENDPOINTS.map((ep, idx) => {
                                        const isSelected = idx === activeEpIdx;
                                        return (
                                            <button
                                                key={ep.id}
                                                type="button"
                                                role="tab"
                                                aria-selected={isSelected}
                                                onClick={() => setActiveEpIdx(idx)}
                                                className={cx(
                                                    "cursor-pointer rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium transition-all",
                                                    lang === "km" && "font-khmer text-[11.5px]",
                                                    isSelected
                                                        ? "border-accent/40 bg-accent/15 text-accent shadow-[0_0_12px_-3px_var(--og-accent)]"
                                                        : "border-transparent bg-transparent text-code-dim hover:bg-white/5 hover:text-code-ink",
                                                )}
                                            >
                                                {lang === "km" ? ep.labelKm : ep.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Command line row */}
                            <div className="flex items-center gap-2 py-2.5 pl-3.5 pr-2.5">
                                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400 select-none">
                                    GET
                                </span>
                                <code className="scrollbar-thin min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12.5px]">
                                    <span className="text-code-faint">{PROD_ORIGIN}</span>
                                    <span className="text-j-key font-medium">{activeEp.path}</span>
                                </code>
                                <div className="flex flex-none items-center gap-1.5">
                                    <Link
                                        to={activeEp.playground}
                                        title={t("playground.testInPlayground")}
                                        className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 font-mono text-[11px] font-medium text-code-dim no-underline hover:border-accent/40 hover:bg-accent/15 hover:text-accent transition-all"
                                    >
                                        <Icon name="play" className="size-3" />
                                        <span className="max-sm:hidden">Run</span>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => copy(activeCommand)}
                                        className="inline-flex h-7.5 flex-none cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-code-tab px-2.5 text-xs font-medium text-code-hi shadow-xs hover:border-white/20 hover:bg-code-line/80 hover:text-white transition-all km:font-khmer [&_svg]:size-3.25"
                                    >
                                        <Icon name="copy" />
                                        <span>{t("common.copy")}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Telemetry & trust badges */}
                        <div style={d(740)} className="animate-intro mt-5 flex flex-wrap items-center gap-2.5 text-[12.5px] text-ink-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1 [&_svg]:size-3.5 [&_svg]:text-ok">
                                <Icon name="check" />
                                {t("hero.noSignup")}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1 [&_svg]:size-3.5 [&_svg]:text-ok">
                                <Icon name="check" />
                                {t("hero.cors")}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1 [&_svg]:size-3.5 [&_svg]:text-ok">
                                <Icon name="zap" />
                                {t("hero.edge")}
                            </span>
                        </div>
                    </div>
                </Parallax>

                {/* The 4-tier administrative hierarchy as a bento cascade */}
                <div
                    style={d(820)}
                    className="animate-intro mt-13 overflow-hidden rounded-2xl glass-panel shadow-glass-lg"
                    aria-label={t("hero.datasetSize")}
                >
                    <ol className="m-0 grid list-none grid-cols-2 p-0 lg:grid-cols-4">
                        {TIERS.map((tier, i) => {
                            const value = Number(stats?.[tier.stat] ?? tier.fallback);
                            const prev = TIERS[i - 1];
                            const ratio = prev ? value / Number(stats?.[prev.stat] ?? prev.fallback) : 0;
                            return (
                                <li
                                    key={tier.stat}
                                    style={d(920 + i * 90)}
                                    className={cx(
                                        "group/tier animate-intro relative flex flex-col min-w-0 gap-3 px-4 py-4.5 sm:px-6 sm:py-5.5 transition-colors hover:bg-surface-2/40",
                                        i % 2 === 1 && "border-l border-line/60",
                                        i === 2 && "lg:border-l lg:border-line/60",
                                        i >= 2 && "border-t border-line/60 lg:border-t-0",
                                    )}
                                >
                                    {/* Arrow sitting on the shared border: this tier nests inside the one to its left */}
                                    {i > 0 && (
                                        <span
                                            aria-hidden="true"
                                            className="absolute -left-2.75 top-1/2 z-1 hidden size-5.5 -translate-y-1/2 place-items-center rounded-full glass-pill text-ink-3 lg:grid [&_svg]:size-3"
                                        >
                                            <Icon name="arrow" />
                                        </span>
                                    )}

                                    {/* Top row: Level badge + NCDD code segment breakdown + ratio */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className={lvl(tier.level)}>
                                            T{i + 1} · {t(`level.${tier.level}`)}
                                        </span>
                                        <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-ink-3">
                                            <span aria-hidden="true" className="inline-flex items-center gap-0.5 rounded-md border border-line/70 bg-surface/80 px-1.5 py-0.5 tracking-wide">
                                                {CODE_PARTS.slice(0, i + 1).map((part, j) => (
                                                    <span
                                                        key={j}
                                                        className={cx(
                                                            j === i ? "font-bold text-ink underline decoration-accent/70 underline-offset-2" : "text-ink-3",
                                                        )}
                                                    >
                                                        {part}
                                                    </span>
                                                ))}
                                            </span>
                                            {prev && (
                                                <span
                                                    className="select-none rounded-full border border-line px-1.5 py-px tabular-nums text-[10px]"
                                                    title={`≈ ${ratio.toFixed(1)} per ${prev.en.slice(0, -1).toLowerCase()}`}
                                                >
                                                    ×{ratio.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <RollingNumber
                                        value={value}
                                        stagger={90 + i * 15}
                                        className="font-display text-[30px] font-bold leading-none tracking-tight sm:text-[38px] xl:text-[44px]"
                                    />

                                    <div className="min-w-0">
                                        <span className="block truncate text-[13.5px] font-semibold sm:text-sm">
                                            {lang === "km" ? tier.km : tier.en}
                                        </span>
                                        <span className={cx("block truncate text-[11.5px] leading-snug text-ink-3 sm:text-[12.5px]", lang !== "km" && "font-khmer")}>
                                            {lang === "km" ? tier.en : tier.km}
                                        </span>
                                    </div>

                                    {/* Log-scale bar so 25 → 14,576 still reads as a steady progression */}
                                    <div aria-hidden="true" className="mt-auto h-1.5 overflow-hidden rounded-full bg-surface-2/80 p-px shadow-inner">
                                        <div
                                            className={cx("h-full rounded-full bg-linear-to-r transition-all duration-1000", tier.barColor)}
                                            style={{ width: `${(Math.log10(value) / Math.log10(MAX_SCALE)) * 100}%` }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ol>

                    {/* Telemetry footer strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 bg-surface/40 px-4 py-2.5 font-mono text-[10.5px] text-ink-3 sm:px-6 sm:text-[11px] km:font-khmer km:text-xs">
                        <span className="inline-flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-accent" />
                            <span>{t("hero.hierarchyNote")} · 12 → 1201 → 120101 → 12010101</span>
                        </span>
                        <div className="flex flex-wrap items-center gap-3 font-mono text-[10.5px]">
                            <span className="rounded-md border border-line/60 bg-surface/70 px-2 py-0.5 text-ink-2">
                                Σ {fmt(stats?.total ?? 16472)} {lang === "km" ? "ឯកតា" : "units"}
                            </span>
                            <span className="rounded-md border border-ok/30 bg-ok/10 px-2 py-0.5 text-ok">
                                O(1) Edge Index
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
