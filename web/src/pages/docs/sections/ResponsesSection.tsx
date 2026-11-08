import { codeTab } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { highlightJson } from "../../../lib/highlight";
import { C, CodeBox, H2, P, Table } from "../parts";

export const JsonBlock = ({ label, children }: { label: string; children: string }) => (
    <CodeBox head={<span className={codeTab} aria-selected="true">{label}</span>}>{highlightJson(children)}</CodeBox>
);

export function ResponsesSection() {
    const { t, rt } = useI18n();

    return (
        <section id="responses">
            <H2 id="responses-h">{t("docs.responsesTitle")}</H2>
            <P>{rt("docs.responsesIntro")}</P>
            <JsonBlock label="200 OK">{`{
  "success": true,
  "data": [ /* records */ ],
  "meta": { "total": 1, "source": "local_cache" }   // search & list endpoints
}`}</JsonBlock>
            <JsonBlock label="4xx / 5xx">{`{
  "success": false,
  "data": null,
  "error": "Item not found"
}`}</JsonBlock>
            <Table
                head={[t("docs.thStatus"), t("docs.thMeaning")]}
                rows={[
                    [<C key="200">200</C>, t("docs.s200")],
                    [<C key="400">400</C>, rt("docs.s400")],
                    [<C key="404">404</C>, t("docs.s404")],
                    [<C key="405">405</C>, t("docs.s405")],
                    [<C key="429">429</C>, rt("docs.s429")],
                    [<C key="502">502</C>, t("docs.s502")],
                ]}
            />
        </section>
    );
}
