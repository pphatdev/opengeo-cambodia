import { useState, type FormEvent } from "react";
import { Icon } from "../../components/Icon";
import { cx, focusRing } from "../../components/ui";
import { useI18n } from "../../i18n";
import { PROD_ORIGIN, type RequestLog } from "../../lib/api";
import { type Endpoint } from "../docs/endpoints";
import { EndpointSelector } from "./EndpointSelector";

interface PlaygroundFloatingRequestProps {
    endpoints: Endpoint[];
    selectedEndpoint: Endpoint;
    onSelectEndpoint: (ep: Endpoint) => void;
    customUrl: string;
    onUrlChange: (url: string) => void;
    paramValues: Record<string, string>;
    onParamChange: (name: string, value: string) => void;
    onResetParams: () => void;
    onSend: () => void;
    pending: boolean;
    log?: RequestLog | null;
}

export function PlaygroundFloatingRequest({
    endpoints,
    selectedEndpoint,
    onSelectEndpoint,
    customUrl,
    onUrlChange,
    paramValues,
    onParamChange,
    onResetParams,
    onSend,
    pending,
    log,
}: PlaygroundFloatingRequestProps) {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(true);
    const [copied, setCopied] = useState(false);
    const [showParams, setShowParams] = useState(false);

    const fullProdUrl = PROD_ORIGIN + (customUrl.startsWith("/") ? customUrl : `/${customUrl}`);

    const handleCopyCurl = () => {
        const cmd = `curl -s "${fullProdUrl}"`;
        navigator.clipboard.writeText(cmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasParams = Boolean(selectedEndpoint.params && selectedEndpoint.params.length > 0);

    return (
        <aside
            aria-label="Request API Console"
            className="fixed bottom-6 right-6 z-40 flex flex-col items-end"
        >
            {/* Collapsed Pill Button */}
            {!isOpen && (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="group flex cursor-pointer items-center gap-2.5 rounded-full border border-line bg-surface/95 px-4 py-2.5 font-mono text-xs font-semibold text-ink shadow-2xl backdrop-blur-md transition-all hover:border-accent hover:shadow-accent/20 active:scale-95"
                    title="Open API Request Console"
                >
                    <span className="flex size-2 rounded-full bg-accent animate-pulse" />
                    <span className="font-bold text-accent">GET</span>
                    <span className="max-w-45 truncate text-ink-2 sm:max-w-60">
                        {customUrl}
                    </span>
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-ink text-[10px] text-bg transition-transform group-hover:scale-110">
                        ▶
                    </span>
                </button>
            )}

            {/* Expanded Floating Request Console Card */}
            {isOpen && (
                <div className="w-95 max-w-[calc(100vw-32px)] rounded-2xl border border-line bg-surface/95 p-4 shadow-2xl backdrop-blur-xl space-y-3.5 transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
                        <div className="flex items-center gap-2">
                            <div className="flex size-6 items-center justify-center rounded-lg bg-accent/15 text-xs font-bold text-accent">
                                ⚡
                            </div>
                            <span className="font-display text-xs font-bold uppercase tracking-wider text-ink">
                                Request API
                            </span>
                            {log && (
                                <span className={cx(
                                    "rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold",
                                    log.status < 400 ? "bg-accent/10 text-accent" : "bg-warn/15 text-warn"
                                )}>
                                    {log.status} · {log.ms.toFixed(2)}ms
                                </span>
                            )}
                        </div>

                        {/* Minimize Button */}
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                            title="Minimize request panel"
                        >
                            <span className="text-sm font-bold leading-none">−</span>
                        </button>
                    </div>

                    {/* Endpoint Selector Dropdown */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
                            Endpoint
                        </label>
                        <EndpointSelector
                            endpoints={endpoints}
                            selected={selectedEndpoint}
                            onSelect={onSelectEndpoint}
                            variant="compact"
                        />
                    </div>

                    {/* URL Path Input Form */}
                    <form
                        onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            onSend();
                        }}
                        className="space-y-2.5"
                    >
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-ink-3 uppercase tracking-wider">
                                    Request URL
                                </span>
                                <button
                                    type="button"
                                    onClick={handleCopyCurl}
                                    className="flex cursor-pointer items-center gap-1 font-mono text-ink-3 hover:text-ink"
                                    title="Copy cURL"
                                >
                                    <Icon name={copied ? "check" : "copy"} className="size-3" />
                                    <span>{copied ? "Copied" : "cURL"}</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-1 text-xs">
                                <span className="shrink-0 font-mono text-[11px] font-bold text-accent">GET</span>
                                <input
                                    type="text"
                                    value={customUrl}
                                    onChange={(e) => onUrlChange(e.target.value)}
                                    className="w-full bg-transparent font-mono text-xs text-ink outline-none"
                                    placeholder="/api/v1/provinces"
                                />
                            </div>
                        </div>

                        {/* Parameter Quick Accordion */}
                        {hasParams && (
                            <div className="rounded-xl border border-line/60 bg-surface-2/40 p-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setShowParams((s) => !s)}
                                    className="flex w-full cursor-pointer items-center justify-between text-[11px] font-semibold text-ink-2"
                                >
                                    <span>Parameters ({selectedEndpoint.params?.length})</span>
                                    <span className="text-xs text-ink-3">{showParams ? "▲" : "▼"}</span>
                                </button>

                                {showParams && (
                                    <div className="mt-2 space-y-2 border-t border-line/40 pt-2">
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={onResetParams}
                                                className="cursor-pointer text-[10px] font-mono text-ink-3 hover:text-ink"
                                            >
                                                Reset defaults
                                            </button>
                                        </div>
                                        {selectedEndpoint.params?.map((p) => {
                                            const val = paramValues[p.name] ?? "";
                                            return (
                                                <div key={p.name} className="space-y-1">
                                                    <div className="flex items-center justify-between text-[10.5px]">
                                                        <span className="font-mono font-medium text-ink">
                                                            {p.name}
                                                            {p.required && <span className="ml-1 text-accent">*</span>}
                                                        </span>
                                                        <span className="font-mono text-[9.5px] text-ink-3">{p.type}</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={val}
                                                        placeholder={p.example ? `e.g. ${p.example}` : p.name}
                                                        onChange={(e) => onParamChange(p.name, e.target.value)}
                                                        className={cx(
                                                            "h-7 w-full rounded-md border border-line bg-surface px-2 font-mono text-xs text-ink",
                                                            focusRing,
                                                        )}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Execute Action Button */}
                        <button
                            type="submit"
                            disabled={pending}
                            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-ink py-2 px-3 text-xs font-semibold text-bg shadow-sm transition-all hover:bg-[color-mix(in_srgb,var(--og-ink)_85%,var(--og-accent))] disabled:cursor-wait disabled:opacity-60"
                        >
                            {pending ? (
                                <>
                                    <span className="size-3 rounded-full border-2 border-bg border-t-transparent animate-spin" />
                                    <span>{t("playground.sending")}</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="play" className="size-3" />
                                    <span>{t("playground.sendRequest")}</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}
        </aside>
    );
}
