import conceptsMd from "../content/03-concepts.md?raw";
import { Markdown } from "../Markdown";
import { cx } from "../../../components/ui";
import { useI18n } from "../../../i18n";

export function ConceptsSection() {
    const { t } = useI18n();

    return (
        <section id="concepts">
            <Markdown content={conceptsMd} />
            <div className="mb-6 mt-4 flex flex-wrap font-mono text-[28px] font-medium" aria-label={t("docs.anatomyLabel")}>
                {([["12", "province", "border-accent"], ["01", "district", "border-water"], ["01", "commune", "border-warn"], ["01", "village", "border-ok"]] as const).map(([digits, level, color]) => (
                    <span key={level} className={cx("border-b-[3px] px-3 pb-1 pt-2 text-center", color)}>
                        {digits}
                        <small className="mt-1 block font-sans text-[11px] font-medium text-ink-3 km:font-khmer">{t(`level.${level}`)}</small>
                    </span>
                ))}
            </div>
        </section>
    );
}
