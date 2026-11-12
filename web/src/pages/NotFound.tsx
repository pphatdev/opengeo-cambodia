import { Link } from "react-router";
import { Footer } from "../components/Footer";
import { Nav } from "../components/Nav";
import { useSeo } from "../components/Seo";
import { btnGhost, btnPrimary, cx, displayH1, kicker, wrap } from "../components/ui";
import { useI18n } from "../i18n";

export function NotFound() {
    const { t } = useI18n();
    useSeo({
        title: t("meta.notFoundTitle"),
        description: t("meta.notFoundDesc"),
        noindex: true,
    });
    return (
        <div>
            <Nav />
            <main className={cx(wrap, "min-h-[60vh] pb-20 pt-30")}>
                <div className={kicker}>404</div>
                <h1 className={displayH1}>{t("notFound.titleA")} <em>{t("notFound.titleB")}</em></h1>
                <p className="mb-7 max-w-[34em] text-lg text-ink-2">{t("notFound.body")}</p>
                <div className="flex flex-wrap gap-3">
                    <Link className={btnPrimary} to="/#explore">{t("notFound.explorer")}</Link>
                    <Link className={btnGhost} to="/docs">{t("notFound.docs")}</Link>
                </div>
            </main>
            <Footer />
        </div>
    );
}
