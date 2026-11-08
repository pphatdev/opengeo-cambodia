import { useState } from "react";
import { Icon } from "../../components/Icon";
import { cx, iconBtn } from "../../components/ui";
import { useI18n } from "../../i18n";
import { fmtBytes, forDisplay, type RequestLog } from "../../lib/api";
import { JsonView } from "../../lib/highlight";
import { useToast } from "../../lib/toast";

interface PlaygroundRawPreviewProps {
    log: RequestLog;
    endpointPath: string;
}

export function PlaygroundRawPreview({ log, endpointPath }: PlaygroundRawPreviewProps) {
    const { t } = useI18n();
    const { copy, toast } = useToast();
    const [abbreviateCoords, setAbbreviateCoords] = useState(true);

    const rawString = JSON.stringify(log.body, null, 2);
    const displayValue = forDisplay(log.body, { abbreviateCoords });

    const handleCopy = () => {
        copy(rawString);
    };

    const handleDownload = () => {
        try {
            const blob = new Blob([rawString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const cleanName = endpointPath.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^_+|_+$/g, "") || "response";
            a.href = url;
            a.download = `${cleanName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast("JSON downloaded");
        } catch {
            toast("Download failed");
        }
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-code-line/80 bg-code/95 shadow-glass backdrop-blur-md">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-code-line bg-code-tab/50 px-4 py-2 text-xs">
                <div className="flex items-center gap-3 font-mono text-code-dim">
                    <span>{fmtBytes(log.size)}</span>
                    <span>·</span>
                    <span>{rawString.length.toLocaleString()} chars</span>
                    <span>·</span>
                    <button
                        type="button"
                        onClick={() => setAbbreviateCoords((prev) => !prev)}
                        className={cx(
                            "cursor-pointer rounded px-1.5 py-0.5 text-[11px] transition-colors",
                            abbreviateCoords ? "bg-code-tab text-code-hi" : "text-code-dim hover:text-code-hi",
                        )}
                        title="Toggle coordinate abbreviation for large GeoJSON polygons"
                    >
                        {abbreviateCoords ? "Short coords" : "Full coords"}
                    </button>
                </div>

                <div className="flex items-center gap-2">

                    <button
                        type="button"
                        onClick={handleCopy}
                        className={iconBtn} aria-label={t("nav.github")}
                        rel="noopener noreferrer">
                        <Icon className="size-4" name="copy" />
                    </button>

                    <button
                        type="button"
                        className={iconBtn}
                        onClick={handleDownload}>
                        <Icon className="size-4" name="download" />
                    </button>
                </div>
            </div>

            {/* Syntax Highlighted JSON Body */}
            <div className="overflow-auto p-4 font-mono text-[13px] leading-relaxed">
                <pre className="m-0 text-code-text">
                    <JsonView value={displayValue} max={100000} />
                </pre>
            </div>
        </div>
    );
}

