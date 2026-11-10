import { Fragment, useState, type FormEvent } from "react";
import { Combobox } from "../../components/Combobox";
import { Icon } from "../../components/Icon";
import { codeCopy, codeTab, cx, focusRing } from "../../components/ui";
import { useI18n } from "../../i18n";
import { apiGet, fmtBytes, forDisplay, PROD_ORIGIN, type RequestLog } from "../../lib/api";
import { COMMENT, JsonView } from "../../lib/highlight";
import { useToast } from "../../lib/toast";
import { buildPath, displayPath, type Endpoint } from "./endpoints";
import { CodeBox, Table } from "./parts";

const tag = "whitespace-nowrap rounded-full border border-line px-[9px] py-0.5 font-mono text-[11px] font-medium text-ink-3 km:font-khmer";
const field = cx("h-[34px] w-full rounded-lg border border-line bg-surface px-2.5 font-mono text-[13px] text-ink", focusRing);

function PathLabel({ path }: { path: string }) {
    const parts = path.split(/(\{\w+\})/);
    return (
        <span className="break-all font-mono text-[15px] font-medium text-ink">
            {parts.map((p, i) => (p.startsWith("{") ? <span className="text-accent" key={i}>{p}</span> : <Fragment key={i}>{p}</Fragment>))}
        </span>
    );
}

export function EndpointCard({ ep }: { ep: Endpoint }) {
    const { copy, toast } = useToast();
    const { t, tx } = useI18n();
    const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries((ep.params ?? []).map((p) => [p.name, p.example ?? ""])));
    const [pending, setPending] = useState(false);
    const [result, setResult] = useState<{ log: RequestLog | null; error?: string } | null>(null);

    const url = PROD_ORIGIN + displayPath(ep, values);

    const send = async (e: FormEvent) => {
        e.preventDefault();
        if (ep.noTry) return;
        const path = buildPath(ep, values);
        if (!path) {
            toast(t("docs.fillPath"));
            return;
        }
        setPending(true);
        let entry: RequestLog | null = null;
        try {
            await apiGet(path, (l) => (entry = l));
            setResult({ log: entry });
        } catch (err) {
            // Non-2xx responses are still logged with their body — show them
            setResult(entry ? { log: entry } : { log: null, error: (err as Error).message });
        } finally {
            setPending(false);
        }
    };

    const log = result?.log;
    const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));

    return (
        <article className="mb-6.5 mt-4.5 scroll-mt-21 overflow-hidden rounded-[14px] border border-line bg-surface" id={`ep-${ep.id}`}>
            <div className="px-5 pb-3.5 pt-4.5">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-md bg-ok/15 px-2 py-0.75 font-mono text-[11px] font-semibold text-ok">GET</span>
                    <PathLabel path={ep.path} />
                    <span className="flex gap-1.5 sm:ml-auto">
                        {ep.tag && <span className={tag}>{tx(ep.tag)}</span>}
                        {ep.geo && <span className={tag}>GeoJSON</span>}
                    </span>
                </div>
                <h3 className="mb-1 mt-2.5 text-base font-semibold tracking-[-.01em]">{tx(ep.title)}</h3>
                <p className="m-0 text-sm text-ink-2">{tx(ep.description)}</p>
            </div>
            <div className="border-t border-line">
                {ep.params?.length ? (
                    <Table
                        flush
                        head={[t("docs.thParameter"), t("docs.thType"), t("docs.thDescription")]}
                        rows={ep.params.map((p) => [
                            <>
                                <code>{p.name}</code>
                                <span className={cx("ml-1.5 font-mono text-[10.5px] uppercase km:font-khmer km:normal-case", p.required ? "font-semibold text-accent" : "font-medium text-ink-3")}>
                                    {p.required ? t("docs.required") : t("docs.optional")}
                                </span>
                            </>,
                            <span className="font-mono text-xs text-water">{p.type} · {p.in}</span>,
                            tx(p.description),
                        ])}
                    />
                ) : null}
                <form className="bg-surface-2 pb-px" onSubmit={send}>
                    {(ep.params?.length || !ep.noTry) && (
                        <div className="flex flex-wrap items-end gap-2.5 px-5 py-3.5 max-sm:px-3.5">
                            {ep.params?.map((p) => (
                                <div className="grid min-w-30 flex-[1_1_140px] gap-0.75 sm:max-w-60" key={p.name}>
                                    <label htmlFor={`${ep.id}-${p.name}`} className="font-mono text-[11.5px] font-medium text-ink-3">{p.name}</label>
                                    {p.options ? (
                                        // Few fixed values: same popover, no search box (shadcn Select style)
                                        <Combobox
                                            id={`${ep.id}-${p.name}`}
                                            size="sm"
                                            searchable={false}
                                            value={values[p.name] ?? ""}
                                            onChange={(v) => set(p.name, v ?? "")}
                                            placeholder={t("docs.any")}
                                            triggerClassName="font-mono"
                                            itemClassName="font-mono text-[13px]"
                                            options={p.options.map((o) => ({ value: o, label: o || t("docs.any") }))}
                                        />
                                    ) : (
                                        <input
                                            id={`${ep.id}-${p.name}`}
                                            className={field}
                                            value={values[p.name]}
                                            placeholder={p.required ? t("docs.required") : t("docs.optional")}
                                            spellCheck={false}
                                            autoComplete="off"
                                            inputMode={p.type === "number" ? "decimal" : undefined}
                                            onChange={(e) => set(p.name, e.target.value)}
                                        />
                                    )}
                                </div>
                            ))}
                            {!ep.noTry && (
                                <button
                                    className="inline-flex h-8.5 cursor-pointer items-center gap-1.75 rounded-lg border-0 bg-ink px-4 text-[13px] font-semibold text-bg hover:bg-[color-mix(in_srgb,var(--og-ink)_85%,var(--og-accent))] disabled:cursor-wait disabled:opacity-60 km:font-khmer [&_svg]:size-3.25"
                                    type="submit"
                                    disabled={pending}
                                >
                                    <Icon name="play" />{pending ? t("docs.sending") : t("docs.send")}
                                </button>
                            )}
                        </div>
                    )}
                    <CodeBox
                        className="mx-3.5 mb-3.5"
                        head={<>
                            <span className={codeTab} aria-selected="true">curl</span>
                            <button className={codeCopy} type="button" onClick={() => copy(`curl "${url}"`)}><Icon name="copy" />{t("common.copy")}</button>
                        </>}
                    >
                        <span className={COMMENT}>$</span> curl <span className="text-j-str">"{url}"</span>
                    </CodeBox>
                    {result && (
                        <div aria-live="polite">
                            <CodeBox
                                className="mx-3.5 mb-3.5"
                                preClassName="max-h-[360px] overflow-auto"
                                head={<>
                                    <span className={codeTab} aria-selected="true">{t("docs.response")}</span>
                                    {log && (
                                        <span className="ml-auto font-mono text-xs text-code-dim">
                                            <span className={log.status < 400 ? "text-j-str" : "text-j-err"}>{log.status}</span>
                                            {log.server ? ` · ${t("hero.server")} ${log.server}` : ""} · {log.ms.toFixed(0)} ms · {fmtBytes(log.size)}
                                            {log.remaining ? ` · ${t("docs.left", { n: log.remaining })}` : ""}
                                        </span>
                                    )}
                                </>}
                            >
                                {log ? <JsonView value={forDisplay(log.body, { abbreviateCoords: true })} max={20000} /> : <span className={COMMENT}>{t("docs.requestFailed", { error: result.error ?? "" })}</span>}
                            </CodeBox>
                        </div>
                    )}
                </form>
            </div>
        </article>
    );
}
