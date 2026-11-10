import { useState } from "react";
import { Nav } from "../../components/Nav";
import { useSeo } from "../../components/Seo";
import { useI18n } from "../../i18n";
import { PROD_ORIGIN } from "../../lib/api";
import { COVERS } from "../../lib/covers";
import { Sidebar } from "./Sidebar";
import {
    IntroductionSection,
    QuickstartSection,
    ConceptsSection,
    ResponsesSection,
    RateLimitsSection,
    BestPracticesSection,
    EndpointsSection,
    ModelsSection,
    DownloadsSection,
    LlmsSection,
    SourceSection,
} from "./sections";

export default function Docs() {
    const { t, lang } = useI18n();
    const [menuOpen, setMenuOpen] = useState(false);

    useSeo({
        title: t("meta.docsTitle"),
        description: t("meta.docsDesc"),
        canonical: lang === "km" ? `${PROD_ORIGIN}/docs?lang=km` : `${PROD_ORIGIN}/docs`,
        type: "article",
        image: COVERS.docs,
    });

    return (
        <div className="leading-[1.7] [--font-display:var(--font-docs-display)]">
            <Nav variant="docs" menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} />
            <div className="mx-auto grid max-w-340 grid-cols-[minmax(0,1fr)] gap-0 px-6 max-sm:px-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
                <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
                <main className="min-w-0 pb-10 pt-8 lg:pt-12 [&>section]:pb-7">
                    <IntroductionSection />
                    <QuickstartSection />
                    <ConceptsSection />
                    <ResponsesSection />
                    <RateLimitsSection />
                    <BestPracticesSection />
                    <EndpointsSection />
                    <ModelsSection />
                    <DownloadsSection />
                    <LlmsSection />
                    <SourceSection />
                </main>
            </div>
        </div>
    );
}
