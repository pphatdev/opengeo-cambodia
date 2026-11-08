import { useSeo } from "../../components/Seo";
import { Footer } from "../../components/Footer";
import { Nav } from "../../components/Nav";
import { wrap } from "../../components/ui";
import { useI18n } from "../../i18n";
import { PROD_ORIGIN } from "../../lib/api";
import { Explorer } from "./Explorer";
import { Hero } from "./Hero";
import { Cta, DataModel, Downloads, Quickstart, SectionHead } from "./Sections";

export function Home() {
    const { t } = useI18n();
    useSeo({
        title: t("meta.homeTitle"),
        description: t("meta.homeDesc"),
        canonical: `${PROD_ORIGIN}/`,
    });

    return (
        <div>
            <Nav />
            <main>
                <Hero />
                <section className="border-y border-line bg-surface-2/70 py-20 sm:py-24" id="explore">
                    <div className={wrap}>
                        <SectionHead kicker={t("explore.kicker")} title={t("explore.title")} intro={t("explore.intro")} />
                        <Explorer />
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
