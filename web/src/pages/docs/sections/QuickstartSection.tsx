import { useState, type ReactNode } from "react";
import quickstartMd from "../content/02-quickstart.md?raw";
import { Markdown } from "../Markdown";
import { Icon } from "../../../components/Icon";
import { codeCopy, codeTab } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { PROD_ORIGIN } from "../../../lib/api";
import { COMMENT, highlightCode } from "../../../lib/highlight";
import { useToast } from "../../../lib/toast";
import { CodeBox, P } from "../parts";

// Code samples stay in English: they're meant to be copied into real projects.
const QUICKSTART = {
    curl: `# 1. All 25 provinces
curl ${PROD_ORIGIN}/api/admin/provinces

# 2. Districts of Phnom Penh (id 12)
curl ${PROD_ORIGIN}/api/admin/provinces/12/districts

# 3. Communes of Chamkar Mon (id 1201), then villages of Tonle Basak (id 120101)
curl ${PROD_ORIGIN}/api/admin/districts/1201/communes
curl ${PROD_ORIGIN}/api/admin/communes/120101/villages`,
    js: `const API = "${PROD_ORIGIN}/api/admin";

async function get(path) {
  const res = await fetch(API + path);
  const body = await res.json();
  if (!body.success) throw new Error(body.error);
  return body.data;
}

const provinces = await get("/provinces");
const districts = await get(\`/provinces/\${provinces[11].id}/districts\`);
const communes  = await get(\`/districts/\${districts[0].id}/communes\`);

console.log(communes.map(c => \`\${c.name_en} (\${c.name_km})\`));`,
    py: `import requests

API = "${PROD_ORIGIN}/api/admin"

def get(path):
    body = requests.get(API + path, timeout=10).json()
    if not body["success"]:
        raise RuntimeError(body["error"])
    return body["data"]

provinces = get("/provinces")
districts = get(f"/provinces/{provinces[11]['id']}/districts")
for d in districts:
    print(d["code"], d["name_en"], d["name_km"])`,
};
const QS_LABELS = { curl: "curl", js: "JavaScript", py: "Python" } as const;

/** curl lines contain bare URLs; only treat whole-line `#` as comments. */
function highlightShell(text: string): ReactNode[] {
    return text.split("\n").flatMap((line, i, arr) => {
        const node = line.startsWith("#") ? <span className={COMMENT} key={i}>{line}</span> : line;
        return i < arr.length - 1 ? [node, "\n"] : [node];
    });
}

export function QuickstartTabs() {
    const { copy } = useToast();
    const { t } = useI18n();
    const [tab, setTab] = useState<keyof typeof QUICKSTART>("curl");
    return (
        <CodeBox
            head={<>
                {(Object.keys(QUICKSTART) as (keyof typeof QUICKSTART)[]).map((k) => (
                    <button key={k} className={codeTab} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}>{QS_LABELS[k]}</button>
                ))}
                <button className={codeCopy} type="button" onClick={() => copy(QUICKSTART[tab])}><Icon name="copy" />{t("common.copy")}</button>
            </>}
        >
            {tab === "curl" ? highlightShell(QUICKSTART.curl) : highlightCode(QUICKSTART[tab])}
        </CodeBox>
    );
}

export function QuickstartSection() {
    const { rt } = useI18n();

    return (
        <section id="quickstart">
            <Markdown content={quickstartMd} />
            <QuickstartTabs />
            <P>{rt("docs.quickOutro")}</P>
        </section>
    );
}
