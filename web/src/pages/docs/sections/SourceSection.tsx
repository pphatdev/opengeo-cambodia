import sourceMd from "../content/11-source.md?raw";
import { Link } from "react-router";
import { useI18n } from "../../../i18n";
import { Markdown } from "../Markdown";

export function SourceSection() {
    const { t } = useI18n();

    return (
        <section id="source">
            <Markdown content={sourceMd} />
            <div className="mt-14 flex flex-wrap justify-between gap-3 border-t border-line pt-6 text-[13.5px] text-ink-3">
                <span>OpenGeo Cambodia · <span className="font-khmer">ទិន្នន័យភូមិសាស្ត្រកម្ពុជា</span></span>
                <Link className="text-ink-2" to="/">{t("docs.backToExplorer")}</Link>
            </div>
        </section>
    );
}
