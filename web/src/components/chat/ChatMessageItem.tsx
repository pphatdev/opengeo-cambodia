import type { ChatMessage } from "../../lib/chat";
import { Icon } from "../Icon";
import { cx } from "../ui";
import { ChatMarkdown } from "./ChatMarkdown";
import { renderIosEmojiText } from "../../lib/emoji";

interface ChatMessageItemProps {
    message: ChatMessage;
    isStreaming?: boolean;
    onConfigureKey?: () => void;
    onRetry?: () => void;
}

export function ChatMessageItem({
    message,
    isStreaming,
    onConfigureKey,
    onRetry,
}: ChatMessageItemProps) {
    const isUser = message.role === "user";
    const isError = message.isError;

    const timeString = message.timestamp
        ? new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
          })
        : "";

    return (
        <div
            className={cx(
                "group flex w-full gap-2.5 transition-all",
                isUser ? "flex-row-reverse" : "flex-row",
            )}
        >
            {/* Avatar */}
            <div
                className={cx(
                    "flex size-7 shrink-0 items-center justify-center rounded-xl text-xs font-semibold shadow-xs select-none mt-0.5",
                    isUser
                        ? "bg-accent text-bg"
                        : "border border-line bg-surface-2 text-accent",
                )}
            >
                {isUser ? (
                    <span>You</span>
                ) : (
                    <Icon name="bot" className="size-4" />
                )}
            </div>

            {/* Bubble & Metadata */}
            <div
                className={cx(
                    "flex flex-col min-w-0",
                    isUser ? "items-end max-w-[85%] sm:max-w-[78%]" : "items-start max-w-[96%] sm:max-w-[88%]",
                )}
            >
                {/* Header label */}
                <div
                    className={cx(
                        "my-1 flex items-center gap-1.5 text-[10.5px] font-medium text-ink-3",
                        isUser && "justify-end",
                    )}
                >
                    <span>{isUser ? "You" : "OpenGeo Assistant"}</span>
                    {timeString && <span className="opacity-60">&middot; {timeString}</span>}
                </div>

                {/* Bubble Container */}
                <div
                    className={cx(
                        "w-full rounded-2xl text-[13px] leading-relaxed transition-all",
                        isUser
                            ? "rounded-tr-xs bg-accent text-bg font-normal"
                            : isError
                            ? "rounded-tl-xs bg-warn/10 text-ink"
                            : "rounded-tl-xs bg-surface text-ink",
                    )}
                >
                    {isUser ? (
                        <div className="whitespace-pre-wrap wrap-break-word p-2">{renderIosEmojiText(message.content)}</div>
                    ) : isError ? (
                        <div className="space-y-2.5 text-xs p-2">
                            <div className="flex items-start gap-2 text-warn">
                                <Icon name="alert" className="mt-0.5 size-3.5 shrink-0" />
                                <div className="font-medium text-[11px] leading-relaxed">{message.content}</div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-warn/20">
                                {onConfigureKey && message.content.toLowerCase().includes("key") && (
                                    <button
                                        type="button"
                                        onClick={onConfigureKey}
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg shadow-xs transition hover:brightness-110 active:scale-95"
                                    >
                                        <Icon name="key" className="size-3.5" />
                                        Configure Mistral API Key
                                    </button>
                                )}
                                {onRetry && (
                                    <button
                                        type="button"
                                        onClick={onRetry}
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-surface-2 active:scale-95"
                                    >
                                        <Icon name="refresh" className="size-3.5" />
                                        Retry
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="relative min-w-0 max-w-full">
                            <ChatMarkdown content={message.content} />
                            {isStreaming && (
                                <span className="inline-block size-2 animate-pulse rounded-full bg-accent ml-1 align-middle" />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
