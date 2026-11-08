import { useState } from "react";
import { Nav } from "../../components/Nav";
import { useSeo } from "../../components/Seo";
import { useI18n } from "../../i18n";
import { PROD_ORIGIN } from "../../lib/api";
import { Sidebar } from "./Sidebar";
import {
    IntroductionSection,
    QuickstartSection,
    ConceptsSection,
    ResponsesSection,
    RateLimitsSection,
    EndpointsSection,
    ModelsSection,
    DownloadsSection,
    LlmsSection,
    SourceSection,
} from "./sections";

export default function Docs() {
    const { t } = useI18n();
    const [menuOpen, setMenuOpen] = useState(false);

    useSeo({
        title: t("meta.docsTitle"),
        description: t("meta.docsDesc"),
        canonical: `${PROD_ORIGIN}/docs`,
        type: "article",
    });

    return (
        <div className="relative min-h-screen leading-[1.7] overflow-x-hidden">
            <div className="bg-liquid-glow pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-36 top-32 size-150 rounded-full bg-accent/10 blur-[100px]" aria-hidden="true" />
            <Nav variant="docs" menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} />
            <div className="relative mx-auto grid max-w-340 grid-cols-[minmax(0,1fr)] gap-0 px-6 max-sm:px-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
                <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
                <main className="min-w-0 pb-30 pt-8 lg:pt-12 [&>section]:pb-7">
                    <IntroductionSection />
                    <QuickstartSection />
                    <ConceptsSection />
                    <ResponsesSection />
                    <RateLimitsSection />
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
