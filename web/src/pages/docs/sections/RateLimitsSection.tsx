import { useI18n } from "../../../i18n";
import { C, H2, P, Table } from "../parts";

export function RateLimitsSection() {
    const { t, rt } = useI18n();

    return (
        <section id="rate-limits">
            <H2 id="rate-limits-h">{t("docs.limitsTitle")}</H2>
            <P>{t("docs.limitsIntro")}</P>
            <Table
                head={[t("docs.thEndpoints"), t("docs.thLimit"), t("docs.thWhy")]}
                rows={[
                    [<span key="admin"><C>/api/admin/*</C>, <C>/api/boundaries/*</C></span>, rt("docs.perMin", { n: "10,000" }), t("docs.whyAdmin")],
                    [<C key="search">/api/admin/search</C>, rt("docs.perMin", { n: "120" }), t("docs.whySearch")],
                    [<C key="geocode">/api/geocode/*</C>, rt("docs.perMin", { n: "30" }), t("docs.whyGeocode")],
                    [rt("docs.otherApi"), rt("docs.perMin", { n: "5,000" }), t("docs.whyOther")],
                ]}
            />
            <Table
                head={[t("docs.thHeader"), t("docs.thDescription")]}
                rows={[
                    [<C key="limit">X-RateLimit-Limit</C>, t("docs.hLimit")],
                    [<C key="remaining">X-RateLimit-Remaining</C>, t("docs.hRemaining")],
                    [<C key="reset">X-RateLimit-Reset</C>, t("docs.hReset")],
                    [<C key="time">X-Response-Time</C>, rt("docs.hTime")],
                    [<span key="cache"><C>Cache-Control</C> / <C>ETag</C></span>, rt("docs.hCache")],
                ]}
            />
            <P>{t("docs.limitsOutro")}</P>
        </section>
    );
}
