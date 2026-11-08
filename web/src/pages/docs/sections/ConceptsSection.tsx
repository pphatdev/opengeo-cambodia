import { cx, lvl } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { C, Callout, H2, P, Table } from "../parts";

export function ConceptsSection() {
    const { t, rt } = useI18n();

    return (
        <section id="concepts">
            <H2 id="concepts-h">{t("docs.conceptsTitle")}</H2>
            <P>{rt("docs.conceptsIntro")}</P>
            <div className="mb-2 mt-4.5 flex flex-wrap font-mono text-[28px] font-medium" aria-label={t("docs.anatomyLabel")}>
                {([["12", "province", "border-accent"], ["01", "district", "border-water"], ["01", "commune", "border-warn"], ["01", "village", "border-ok"]] as const).map(([digits, level, color]) => (
                    <span key={level} className={cx("border-b-[3px] px-3 pb-1 pt-2 text-center", color)}>
                        {digits}
                        <small className="mt-1 block font-sans text-[11px] font-medium text-ink-3 km:font-khmer">{t(`level.${level}`)}</small>
                    </span>
                ))}
            </div>
            <Table
                head={[t("docs.thLevel"), t("docs.thKhmerTypes"), t("docs.thCode"), t("docs.thCount"), t("docs.thBoundaries")]}
                rows={[
                    [<span key="p" className={lvl("province")}>province</span>, <span key="pt" className="font-khmer">រាជធានី · ខេត្ត</span>, <C key="pc">12</C>, "25", t("docs.polygons", { n: 25 })],
                    [<span key="d" className={lvl("district")}>district</span>, <span key="dt" className="font-khmer">ក្រុង · ស្រុក · ខណ្ឌ</span>, <C key="dc">1201</C>, "210", t("docs.polygons", { n: 197 })],
                    [<span key="c" className={lvl("commune")}>commune</span>, <span key="ct" className="font-khmer">ឃុំ · សង្កាត់</span>, <C key="cc">120101</C>, "1,661", t("docs.polygons", { n: "1,633" })],
                    [<span key="v" className={lvl("village")}>village</span>, <span key="vt" className="font-khmer">ភូមិ</span>, <C key="vc">12010101</C>, "14,576", t("docs.pointsOnly")],
                ]}
            />
            <Callout icon="alert" tone="accent">{rt("docs.boundaryGap")}</Callout>
        </section>
    );
}
