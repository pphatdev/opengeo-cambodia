import { useSeo } from "../../components/Seo";
import { Footer } from "../../components/Footer";
import { Nav } from "../../components/Nav";
import { Parallax, Reveal } from "../../components/Parallax";
import { cx, wrap } from "../../components/ui";
import { useI18n } from "../../i18n";
import { PROD_ORIGIN } from "../../lib/api";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCES } from "./cambodiaMap";
import { Explorer } from "./Explorer";
import { Hero } from "./Hero";
import { Cta, DataModel, Downloads, GlowEdge, Quickstart, SectionHead } from "./Sections";

export function Home() {
    const { t, lang } = useI18n();
    useSeo({
        title: t("meta.homeTitle"),
        description: t("meta.homeDesc"),
        canonical: lang === "km" ? `${PROD_ORIGIN}/?lang=km` : `${PROD_ORIGIN}/`,
    });

    return (
        <div>
            <Nav />
            <main>
                <Hero />
                <section className="relative overflow-hidden border-y border-line/60 bg-liquid-mesh py-20 sm:py-24 dark:border-transparent" id="explore">
                    <GlowEdge position="top" />
                    {/* Dark mode: soft spotlight pooled behind the explorer panel */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-1/4 hidden bg-[radial-gradient(ellipse_55%_50%_at_50%_55%,color-mix(in_srgb,var(--og-water)_12%,transparent),transparent_70%)] dark:block" />
                    {/* Parallax backdrop: oversized Cambodia outline + drifting light pools */}
                    <Parallax speed={0.28} minWidth={1024} className="pointer-events-none absolute -left-40 -top-24 w-[62%] opacity-[0.07]" aria-hidden="true">
                        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="h-auto w-full">
                            {PROVINCES.map((p) => (
                                <path key={p.code} d={p.d} className="fill-none stroke-ink dark:stroke-accent" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
                            ))}
                        </svg>
                    </Parallax>
                    <Parallax speed={0.45} className="pointer-events-none absolute -right-32 top-1/4" aria-hidden="true">
                        <div className="size-110 rounded-full bg-accent/10 blur-[90px]" />
                    </Parallax>
                    <Parallax speed={-0.18} className="pointer-events-none absolute -bottom-20 left-1/3" aria-hidden="true">
                        <div className="size-96 rounded-full bg-water/10 blur-[90px]" />
                    </Parallax>

                    <div className={cx(wrap, "relative")}>
                        <SectionHead kicker={t("explore.kicker")} title={t("explore.title")} intro={t("explore.intro")} />
                        <Reveal from="scale" delay={120}>
                            <Explorer />
                        </Reveal>
                    </div>
                </section>
                <DataModel />
                <Quickstart />
                <Downloads />
                <Cta />
            </main>
            <Footer />
        </div>
    );
}
