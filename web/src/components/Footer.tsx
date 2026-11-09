import type { ReactNode } from "react";
import { Link } from "react-router";
import { useI18n } from "../i18n";
import { REPO_URL } from "./Nav";
import { cx, wrap } from "./ui";

/**
 * Edge-to-edge "OPEN GEO CAMBODIA" wordmark. SVG `textLength` stretches the letter
 * spacing so the text always spans exactly the content width, at any screen size.
 * Decorative only — the brand name is already in the footer for screen readers.
 */
function Wordmark() {
    return (
        <div className="pointer-events-none mt-12 select-none leading-none" aria-hidden="true">
            {/* Set like the logo: Montserrat ExtraBold caps, "OPEN GEO" in the cyan → mint gradient, "CAMBODIA" in ink.
                Sizes come from measuring the real font (100px → 1194.5 wide, cap height 70): at 83px the natural
                width is ~991, so textLength only nudges the spacing and never squeezes glyphs together. */}
            <svg viewBox="0 0 1000 62" preserveAspectRatio="xMidYMax meet" focusable="false" className="block h-auto w-full overflow-visible">
                <defs>
                    {/* User-space gradient so it spans exactly "OPEN GEO" (0 → ~470), like the logo */}
                    <linearGradient id="wm-brand" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="470" y2="0">
                        <stop offset="0" className="[stop-color:var(--og-water)]" />
                        <stop offset="1" className="[stop-color:var(--og-accent)]" />
                    </linearGradient>
                    <linearGradient id="wm-ink" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" className="[stop-color:var(--og-ink)]" stopOpacity="0.95" />
                        <stop offset="1" className="[stop-color:var(--og-ink)]" stopOpacity="0.55" />
                    </linearGradient>
                </defs>
                <text x="0" y="60" textLength="1000" lengthAdjust="spacing" className="font-display text-[83px] font-extrabold">
                    <tspan fill="url(#wm-brand)">OPEN GEO</tspan> <tspan fill="none" strokeWidth={1.2} className="stroke-ink-2">CAMBODIA</tspan>
                </text>
            </svg>
        </div>
    );
}

function Column({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div>
            <h5 className="mb-3 mt-0 text-xs uppercase tracking-[.08em] text-ink-2 km:normal-case km:tracking-normal km:text-[13px]">{title}</h5>
            <ul className="m-0 grid list-none gap-2 p-0 [&_a]:text-ink-3 [&_a]:no-underline [&_a:hover]:text-ink">{children}</ul>
        </div>
    );
}

export function Footer() {
    const { t, rt, lang } = useI18n();
    return (
        <footer className="scheme-dark relative overflow-hidden bg-bg pt-16 text-[13.5px] text-ink-3 border-t border-line/60">
            {/* Luminous ambient glow pool */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 size-180 rounded-full bg-accent/8 blur-[120px]" />
                <div className="bg-dot-grid absolute inset-0 opacity-20" />
            </div>
            <div className={cx(wrap, "relative")}>
                <div className="grid grid-cols-1 gap-8 border-b border-line pb-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                    <div>
                        <Link className="flex items-center gap-2.5 font-semibold text-ink no-underline" to={lang === "km" ? "/?lang=km" : "/"}>
                            <img src="/logo.jpg" alt="" width={30} height={30} className="size-7.5 rounded-lg object-cover" />
                            <span className="font-sans">OpenGeo Cambodia</span>
                        </Link>
                        <p className="mb-0 mt-3.5 max-w-[30em] [&_a]:text-ink-2 [&_a]:underline">{rt("footer.about")}</p>
                    </div>
                    <Column title={t("footer.product")}>
                        <li><Link to={lang === "km" ? "/#explore?lang=km" : "/#explore"}>{t("footer.explorer")}</Link></li>
                        <li><Link to={lang === "km" ? "/docs?lang=km" : "/docs"}>{t("footer.documentation")}</Link></li>
                        <li><a href="/api/info" rel="nofollow">{t("footer.apiIndex")}</a></li>
                        <li><a href="/health" rel="nofollow">{t("footer.status")}</a></li>
                    </Column>
                    <Column title={t("footer.resources")}>
                        <li><a href="/llms.txt" rel="nofollow">llms.txt</a></li>
                        <li><a href="/llms-full.txt" rel="nofollow">llms-full.txt</a></li>
                        <li><a href="/opengeo-cambodia.postman_collection.json" rel="nofollow">Postman</a></li>
                        <li><Link to={lang === "km" ? "/docs?lang=km#downloads" : "/docs#downloads"}>{t("footer.downloads")}</Link></li>
                    </Column>
                    <Column title={t("footer.project")}>
                        <li><a href={REPO_URL} target="_blank" rel="noopener noreferrer">{t("footer.github")}</a></li>
                        <li><a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">{t("footer.issue")}</a></li>
                        <li><a href="https://data.mef.gov.kh/" target="_blank" rel="noopener noreferrer">{t("footer.dataSource")}</a></li>
                    </Column>
                </div>
                <Wordmark />
                <div className="flex flex-wrap justify-between gap-4 py-6">
                    <span>{t("footer.builtBy")} <a className="text-ink-2" href="https://github.com/pphatdev" target="_blank" rel="noopener noreferrer">pphatdev</a></span>
                    <span className="font-khmer">{t("footer.tagline")}</span>
                </div>
            </div>
        </footer>
    );
}
