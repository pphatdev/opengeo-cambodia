import { Link } from "react-router";
import { REPO_URL } from "../../../components/Nav";
import { useI18n } from "../../../i18n";
import { H2, P } from "../parts";

export function SourceSection() {
    const { t, rt } = useI18n();

    return (
        <section id="source">
            <H2 id="source-h">{t("docs.sourceTitle")}</H2>
            <P>{rt("docs.sourceBody")}</P>
            <P>{rt("docs.licenseBody", { issues: `${REPO_URL}/issues` })}</P>
            <div className="mt-14 flex flex-wrap justify-between gap-3 border-t border-line pt-6 text-[13.5px] text-ink-3">
                <span>OpenGeo Cambodia · <span className="font-khmer">ទិន្នន័យភូមិសាស្ត្រកម្ពុជា</span></span>
                <Link className="text-ink-2" to="/">{t("docs.backToExplorer")}</Link>
            </div>
        </section>
    );
}
