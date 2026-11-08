import { useI18n } from "../../../i18n";
import { C, H2 } from "../parts";

export function LlmsSection() {
    const { t } = useI18n();

    return (
        <section id="llms">
            <H2 id="llms-h">{t("docs.llmsTitle")}</H2>
            <ul className="rich mb-3.5 mt-0 pl-5 text-ink-2 [&_li]:mb-1">
                <li><a href="/llms.txt"><C>/llms.txt</C></a>: {t("docs.llmsShort")}</li>
                <li><a href="/llms-full.txt"><C>/llms-full.txt</C></a>: {t("docs.llmsFull")}</li>
                <li><a href="/opengeo-cambodia.postman_collection.json"><C>Postman collection</C></a>: {t("docs.llmsPostman")}</li>
                <li><a href="/api/info"><C>/api/info</C></a>: {t("docs.llmsInfo")}</li>
            </ul>
        </section>
    );
}
