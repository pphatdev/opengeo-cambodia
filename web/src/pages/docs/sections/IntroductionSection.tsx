import introMd from "../content/01-introduction.md?raw";
import { Markdown } from "../Markdown";
import { Icon } from "../../../components/Icon";
import { cx, kicker } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { PROD_ORIGIN } from "../../../lib/api";
import { useToast } from "../../../lib/toast";
import { Callout } from "../parts";

export const fact = "rounded-xl border border-line bg-surface p-4 [&_b]:mb-0.5 [&_b]:block [&_b]:text-sm [&_span]:text-[13px] [&_span]:text-ink-3";

export function IntroductionSection() {
    const { copy } = useToast();
    const { t, rt } = useI18n();

    const isLocal = typeof location !== "undefined" && location.origin !== PROD_ORIGIN;

    return (
        <section id="introduction">
            <div className={kicker}>{t("docs.kicker")}</div>
            <Markdown content={introMd} />
            <div className="mb-4.5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-ink-3 km:font-khmer km:normal-case km:tracking-normal">{t("docs.baseUrl")}</span>
                <code className="font-mono text-sm">{PROD_ORIGIN}</code>
                <button
                    className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-line bg-surface-2 px-2.5 py-1.25 text-[12.5px] font-medium text-ink-2 hover:text-ink km:font-khmer [&_svg]:size-3.25"
                    type="button"
                    onClick={() => copy(PROD_ORIGIN)}
                >
                    <Icon name="copy" />{t("common.copy")}
                </button>
                {isLocal && <span className="rich basis-full text-[12.5px] text-ink-3">{rt("docs.localNote", { origin: location.origin })}</span>}
            </div>
            <div className="mb-2.5 mt-5.5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className={fact}><b>{t("docs.factAuthTitle")}</b><span>{t("docs.factAuthBody")}</span></div>
                <div className={fact}><b>{t("docs.factJsonTitle")}</b><span>{t("docs.factJsonBody")}</span></div>
                <div className={cx(fact, "rich")}><b>{t("docs.factReadTitle")}</b><span>{rt("docs.factReadBody")}</span></div>
            </div>
            <Callout icon="info" tone="info">{rt("docs.tryCallout")}</Callout>
        </section>
    );
}
