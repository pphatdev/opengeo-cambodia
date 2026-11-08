import { Icon } from "../../components/Icon";
import { codeCopy, cx } from "../../components/ui";
import { useI18n } from "../../i18n";
import type { RequestLog } from "../../lib/api";
import { PROD_ORIGIN } from "../../lib/api";
import { useToast } from "../../lib/toast";

interface PlaygroundHeadersProps {
    log: RequestLog;
    customUrl?: string;
}

export function PlaygroundHeaders({ log, customUrl }: PlaygroundHeadersProps) {
    const { t } = useI18n();
    const { copy } = useToast();

    const headersList = Object.entries(log.headers ?? {});
    const fullUrl = customUrl || (PROD_ORIGIN + log.path);
    const curlCommand = `curl "${fullUrl}"`;

    return (
        <div className="space-y-4">
            {/* cURL command box */}
            <div className="rounded-xl border border-line bg-code-bg p-3.5">
                <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-code-hi">cURL Request</span>
                    <button
                        className={codeCopy}
                        type="button"
                        onClick={() => copy(curlCommand)}
                    >
                        <Icon name="copy" />
                        {t("common.copy")}
                    </button>
                </div>
                <div className="overflow-x-auto font-mono text-xs text-code-text">
                    <span className="text-code-faint">$ </span>
                    <span className="text-ink-2">curl </span>
                    <span className="text-j-str">"{fullUrl}"</span>
                </div>
            </div>

            {/* Status Line */}
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 font-mono text-xs">
                <span className="font-semibold text-ink-3">HTTP/1.1</span>
                <span className={cx("font-bold", log.status < 400 ? "text-ok" : "text-warn")}>
                    {log.status} {log.statusText || ""}
                </span>
                <span className="ml-auto text-ink-3">
                    {log.ms.toFixed(1)} ms
                </span>
            </div>

            {/* Headers Table */}
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
                <div className="border-b border-line bg-surface-2 px-4 py-2.5 text-xs font-semibold text-ink">
                    Response Headers ({headersList.length})
                </div>
                {headersList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-ink-3">
                        No custom headers recorded.
                    </div>
                ) : (
                    <div className="divide-y divide-line/60 overflow-x-auto">
                        {headersList.map(([key, val]) => (
                            <div key={key} className="flex items-start gap-4 px-4 py-2 text-xs">
                                <span className="w-48 shrink-0 font-mono font-medium text-ink-3">
                                    {key}
                                </span>
                                <span className="break-all font-mono text-ink">
                                    {val}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

