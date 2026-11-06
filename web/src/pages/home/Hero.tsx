import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
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
        <section className="relative overflow-hidden pb-12 pt-10 sm:pt-16">
            <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
            {/* Warm glow behind the map */}
            <div className="pointer-events-none absolute -right-40 top-10 size-[640px] rounded-full bg-accent/10 blur-3xl max-lg:hidden" aria-hidden="true" />

            <div className={cx(wrap, "relative")}>
                <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-14">
                    <div className="min-w-0">
                        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-[5px] pl-1.5 pr-3 text-[13px] font-medium text-ink-2">
                            <span className="grid size-5 place-items-center rounded-full bg-accent-soft text-accent">
                                <span className="size-[7px] rounded-full bg-current shadow-[0_0_0_3px_color-mix(in_srgb,currentColor_25%,transparent)]" />
                            </span>
                            {t("hero.eyebrow")}
                        </span>
                        <h1 className={displayH1}>{t("hero.titleA")} <em>{t("hero.titleB")}</em></h1>
                        <p className="rich mb-7 mt-0 max-w-[34em] text-lg text-ink-2">{rt("hero.lede", { total: fmt(stats?.total ?? 16472) })}</p>
                        <div className="flex flex-wrap gap-3">
                            <a className={btnPrimary} href="#explore">{t("hero.explore")} <Icon name="arrow" /></a>
                            <Link className={btnGhost} to="/docs"><Icon name="book" /> {t("hero.docs")}</Link>
                        </div>

                        {/* One-line quickstart */}
                        <div className="mt-6 flex max-w-[34rem] items-center gap-2 rounded-[10px] border border-code-line bg-code py-1.5 pl-3.5 pr-1.5 text-code-ink shadow-[0_12px_30px_-18px_rgba(0,0,0,.5)]">
                            <code className="scrollbar-thin min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12.5px]">
                                <span className="select-none text-code-faint">$ </span>curl <span className="text-j-key">{PROD_ORIGIN}/api/admin/provinces</span>
                            </code>
                            <button
                                type="button"
                                onClick={() => copy(COMMAND)}
                                className="inline-flex h-8 flex-none cursor-pointer items-center gap-1.5 rounded-md border-0 bg-code-tab px-2.5 text-xs font-medium text-code-hi hover:bg-[#30343b] km:font-khmer [&_svg]:size-[13px]"
                            >
                                <Icon name="copy" />{t("common.copy")}
                            </button>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-[18px] text-[13px] text-ink-3 [&_svg]:size-[15px] [&_svg]:text-ok">
                            <span className="inline-flex items-center gap-1.5"><Icon name="check" />{t("hero.noSignup")}</span>
                            <span className="inline-flex items-center gap-1.5"><Icon name="check" />{t("hero.cors")}</span>
                            <span className="inline-flex items-center gap-1.5"><Icon name="check" />{t("hero.edge")}</span>
                        </div>
                    </div>

                    <div className="min-w-0">
                        <HeroMap />
                    </div>
                </div>

                {/* The hierarchy as a cascade: each tier nests inside the previous one */}
                <div className="mt-12 rounded-[14px] border border-line bg-surface/80 backdrop-blur-sm" aria-label={t("hero.datasetSize")}>
                    <ol className="m-0 grid list-none grid-cols-2 p-0 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
                        {TIERS.map((tier, i) => (
                            <Fragment key={tier.stat}>
                                {i > 0 && (
                                    <li aria-hidden="true" className="hidden items-center text-line-2 lg:flex">
                                        <Icon name="arrow" className="size-5" />
                                    </li>
                                )}
                                <li className={cx("flex items-baseline gap-3 px-6 py-5", i % 2 === 1 && "max-lg:border-l max-lg:border-line", i >= 2 && "max-lg:border-t max-lg:border-line")}>
                                    <span className="font-serif text-[38px] leading-none tracking-[-.02em] tabular-nums sm:text-[46px]">{fmt(Number(stats?.[tier.stat] ?? tier.fallback))}</span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold">{lang === "km" ? tier.km : tier.en}</span>
                                        <span className={cx("block truncate text-[12.5px] text-ink-3", lang !== "km" && "font-khmer")}>{lang === "km" ? tier.en : tier.km}</span>
                                    </span>
                                </li>
                            </Fragment>
                        ))}
                    </ol>
                    <p className="m-0 border-t border-line px-6 py-2.5 font-mono text-[11px] text-ink-3 km:font-khmer km:text-xs">{t("hero.hierarchyNote")} · 12 → 1201 → 120101 → 12010101</p>
                </div>
            </div>
        </section>
    );
}
