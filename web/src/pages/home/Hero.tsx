import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { Parallax, Reveal } from "../../components/Parallax";
import { RollingNumber } from "../../components/RollingNumber";
import { btnGhost, btnPrimary, cx, displayH1, wrap } from "../../components/ui";
import { useI18n } from "../../i18n";
import { apiGet, fmt, PROD_ORIGIN } from "../../lib/api";
import { useToast } from "../../lib/toast";
import type { AdminStats, ApiEnvelope } from "../../lib/types";
import { HeroMap } from "./HeroMap";

const COMMAND = `curl ${PROD_ORIGIN}/api/admin/provinces`;

// Subtitle shows the other language: Khmer unit types in English mode, English names in Khmer mode
const TIERS: { stat: keyof AdminStats; km: string; en: string; fallback: number }[] = [
    { stat: "provinces", km: "រាជធានី / ខេត្ត", en: "Provinces", fallback: 25 },
    { stat: "districts", km: "ក្រុង / ស្រុក / ខណ្ឌ", en: "Districts", fallback: 210 },
    { stat: "communes", km: "ឃុំ / សង្កាត់", en: "Communes", fallback: 1661 },
    { stat: "villages", km: "ភូមិ", en: "Villages", fallback: 14576 },
];

// Example admin code split per level: each tier appends two digits to its parent's code
const CODE_PARTS = ["12", "01", "01", "01"];
// Top of the log-scale bars, a little above the village count so the last bar isn't flush
const MAX_SCALE = 20000;

export function Hero() {
    const { copy } = useToast();
    const { t, rt, lang } = useI18n();
    const [stats, setStats] = useState<AdminStats | null>(null);

    useEffect(() => {
        const ctrl = new AbortController();
        apiGet<ApiEnvelope<AdminStats>>("/api/admin/stats", undefined, ctrl.signal)
            .then((j) => setStats(j.data))
            .catch(() => {});
        return () => ctrl.abort();
    }, []);

    return (
        <section className="relative overflow-hidden pb-14 pt-10">
            {/* Parallax depth stack: each background plane drifts at its own speed (oversized so edges never show) */}
            <Parallax origin="scroll" speed={0.32} className="bg-dot-grid pointer-events-none absolute -inset-y-48 inset-x-0 opacity-60" aria-hidden="true" />
            <Parallax origin="scroll" speed={0.18} className="bg-liquid-glow pointer-events-none absolute -inset-y-32 inset-x-0 opacity-80" aria-hidden="true" />
            {/* Luminous fluid ambient lighting orbs */}
            <Parallax origin="scroll" speed={0.5} x={0.04} minWidth={1024} className="pointer-events-none absolute -right-36 top-10" aria-hidden="true">
                <div className="size-160 rounded-full bg-accent/15 blur-[100px]" />
            </Parallax>
            <Parallax origin="scroll" speed={-0.22} minWidth={1024} className="pointer-events-none absolute -left-20 top-36" aria-hidden="true">
                <div className="size-120 rounded-full bg-water/15 blur-[90px]" />
            </Parallax>
            <Parallax origin="scroll" speed={0.7} minWidth={1024} className="pointer-events-none absolute left-[38%] top-[62%]" aria-hidden="true">
                <div className="size-72 rounded-full bg-ok/10 blur-[80px]" />
            </Parallax>

            <div className={cx(wrap, "relative")}>
                {/* Foreground lifts slightly faster than the page and fades as the hero scrolls away */}
                <Parallax origin="scroll" speed={-0.08} fade className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-14">
                    {/* Map on top for small screens, right column for desktop */}
                    <Reveal from="scale" className="min-w-0 lg:col-start-2 lg:row-start-1">
                        <HeroMap />
                    </Reveal>

                    {/* Text content below map for small screens, left column for desktop */}
                    <Reveal from="left" className="min-w-0 lg:col-start-1 lg:row-start-1">
                        <span className="inline-flex items-center gap-2 rounded-full glass-pill py-1.25 pl-2 pr-3.5 text-[12.5px] font-medium text-ink-2 shadow-xs">
                            <span className="relative flex size-2 items-center justify-center">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
                                <span className="relative inline-flex size-2 rounded-full bg-accent" />
                            </span>
                            {t("hero.eyebrow")}
                        </span>
                        <h1 className={displayH1}>{t("hero.titleA")} <em>{t("hero.titleB")}</em></h1>
                        <p className="rich mb-7 mt-0 max-w-[34em] text-sm sm:text-lg text-ink-2">{rt("hero.lede", { total: fmt(stats?.total ?? 16472) })}</p>
                        <div className="flex flex-wrap gap-3">
                            <a className={btnPrimary} href="#explore">{t("hero.explore")} <Icon name="arrow" /></a>
                            <Link className={btnGhost} to="/playground"><Icon name="play" /> {t("nav.playground")}</Link>
                            <Link className={btnGhost} to="/docs"><Icon name="book" /> {t("hero.docs")}</Link>
                        </div>

                        {/* One-line quickstart with liquid glass terminal */}
                        <div className="mt-6 flex max-w-136 items-center gap-2 rounded-xl border border-code-line/80 bg-code/95 py-2 pl-3.5 pr-2 text-code-ink shadow-[0_14px_35px_-16px_rgba(0,0,0,.6),inset_0_1px_1px_0_rgba(255,255,255,.08)] backdrop-blur-md">
                            <code className="scrollbar-thin min-w-0 flex-1 overflow-x-hidden whitespace-nowrap font-mono text-[12.5px]">
                                <span className="select-none text-code-faint">$ </span>curl <span className="text-j-key">{PROD_ORIGIN}/api/admin/provinces</span>
                            </code>
                            <button
                                type="button"
                                onClick={() => copy(COMMAND)}
                                className="inline-flex h-8 flex-none cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-code-tab px-3 text-xs font-medium text-code-hi shadow-xs hover:border-white/20 hover:bg-code-line/80 hover:text-white transition-all km:font-khmer [&_svg]:size-3.25"
                            >
                                <Icon name="copy" />{t("common.copy")}
                            </button>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-4.5 text-[13px] text-ink-3 [&_svg]:size-3.75 [&_svg]:text-ok">
                            <span className="inline-flex items-center gap-1.5"><Icon name="check" />{t("hero.noSignup")}</span>
                            <span className="inline-flex items-center gap-1.5"><Icon name="check" />{t("hero.cors")}</span>
                            <span className="inline-flex items-center gap-1.5"><Icon name="check" />{t("hero.edge")}</span>
                        </div>
                    </Reveal>
                </Parallax>

                {/* The hierarchy as a cascade: each tier nests inside the previous one */}
                <Reveal delay={150} className="mt-12 overflow-hidden rounded-2xl glass-panel shadow-glass-lg" aria-label={t("hero.datasetSize")}>
                    <ol className="m-0 grid list-none grid-cols-2 p-0 lg:grid-cols-4">
                        {TIERS.map((tier, i) => {
                            const value = Number(stats?.[tier.stat] ?? tier.fallback);
                            const prev = TIERS[i - 1];
                            const ratio = prev ? value / Number(stats?.[prev.stat] ?? prev.fallback) : 0;
                            return (
                                <li
                                    key={tier.stat}
                                    className={cx(
                                        "relative flex flex-col min-w-0 gap-3 px-4 py-4 sm:px-6 sm:py-5",
                                        i % 2 === 1 && "border-l border-line/60",
                                        i === 2 && "lg:border-l lg:border-line/60",
                                        i >= 2 && "border-t border-line/60 lg:border-t-0",
                                    )}
                                >
                                    {/* Arrow sitting on the shared border: this tier nests inside the one to its left */}
                                    {i > 0 && (
                                        <span aria-hidden="true" className="absolute -left-2.75 top-1/2 z-1 hidden size-5.5 -translate-y-1/2 place-items-center rounded-full glass-pill text-ink-3 lg:grid [&_svg]:size-3">
                                            <Icon name="arrow" />
                                        </span>
                                    )}

                                    {/* Example code for this level (new segment emphasised) + avg children per parent */}
                                    <div className="flex items-center justify-between gap-2 font-mono text-[10.5px] text-ink-3 sm:text-[11px]">
                                        <span aria-hidden="true" className="select-none tracking-wide">
                                            {CODE_PARTS.slice(0, i + 1).map((part, j) => (
                                                <span key={j} className={j === i ? "font-semibold text-ink" : undefined}>{part}</span>
                                            ))}
                                        </span>
                                        {prev && (
                                            <span className="select-none rounded-full border border-line px-1.75 py-px tabular-nums" title={`≈ ${ratio.toFixed(1)} per ${prev.en.slice(0, -1).toLowerCase()}`}>
                                                ×{ratio.toFixed(1)}
                                            </span>
                                        )}
                                    </div>

                                    <RollingNumber
                                        value={value}
                                        stagger={90 + i * 15}
                                        className="font-display text-[28px] font-bold leading-none tracking-tight sm:text-[36px] xl:text-[42px]"
                                    />

                                    <div className="min-w-0">
                                        <span className="block truncate text-[13px] font-semibold sm:text-sm">{lang === "km" ? tier.km : tier.en}</span>
                                        <span className={cx("block truncate text-[11.5px] leading-snug text-ink-3 sm:text-[12.5px]", lang !== "km" && "font-khmer")}>{lang === "km" ? tier.en : tier.km}</span>
                                    </div>

                                    {/* Log-scale bar so 25 → 14,576 still reads as a steady progression */}
                                    <div aria-hidden="true" className="mt-auto h-1.5 overflow-hidden rounded-full bg-surface-2/80 p-px shadow-inner">
                                        <div className="h-full rounded-full bg-linear-to-r from-accent via-water to-emerald-400 shadow-[0_0_8px_var(--og-accent)] transition-all duration-1000" style={{ width: `${(Math.log10(value) / Math.log10(MAX_SCALE)) * 100}%` }} />
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                    <p className="m-0 border-t border-line px-4 py-2.5 font-mono text-[10.5px] text-ink-3 sm:px-6 sm:text-[11px] km:font-khmer km:text-xs">{t("hero.hierarchyNote")} · 12 → 1201 → 120101 → 12010101</p>
                </Reveal>
            </div>
        </section>
    );
}
