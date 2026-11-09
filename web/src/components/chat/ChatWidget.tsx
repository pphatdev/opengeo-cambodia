import { useState, useEffect, useRef } from "react";
import { Icon } from "../Icon";
import { cx } from "../ui";
import {
    type ChatMessage,
    type ChatStatus,
    type SamplePrompt,
    fetchChatStatus,
    fetchSamplePrompts,
    getStoredApiKey,
    getStoredHistory,
    setStoredHistory,
    clearStoredHistory,
    getStoredModel,
    getStoredMode,
    streamChatMessage,
} from "../../lib/chat";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatWelcomeCard } from "./ChatWelcomeCard";
import { ChatSettingsModal } from "./ChatSettingsModal";
import { useToast } from "../../lib/toast";

export function ChatWidget() {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [maximized, setMaximized] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [status, setStatus] = useState<ChatStatus | null>(null);
    const [prompts, setPrompts] = useState<SamplePrompt[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Initial load
    useEffect(() => {
        const stored = getStoredHistory();
        if (stored.length > 0) {
            setMessages(stored);
        }

        fetchChatStatus().then((s) => s && setStatus(s));
        fetchSamplePrompts().then((p) => p && setPrompts(p));

        const handleOpenChat = () => setOpen(true);
        window.addEventListener("open-opengeo-chat", handleOpenChat);
        return () => window.removeEventListener("open-opengeo-chat", handleOpenChat);
    }, []);

    // Sync messages to localStorage
    useEffect(() => {
        setStoredHistory(messages);
    }, [messages]);

    // Scroll to bottom on updates
    useEffect(() => {
        if (open) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, open, isStreaming]);

    // Auto-focus input when opening
    useEffect(() => {
        if (open && !settingsOpen) {
            setTimeout(() => textareaRef.current?.focus(), 150);
        }
    }, [open, settingsOpen]);

    // Close on Escape key
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !settingsOpen) {
                setOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, settingsOpen]);

    const handleSend = async (textToSend?: string) => {
        const query = (textToSend || input).trim();
        if (!query || isStreaming) return;

        setInput("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        const userMsg: ChatMessage = {
            id: "msg-" + Date.now(),
            role: "user",
            content: query,
            timestamp: Date.now(),
        };

        const assistantMsgId = "msg-ai-" + (Date.now() + 1);
        const currentModel = getStoredModel();
        const currentMode = getStoredMode();

        const pendingAssistantMsg: ChatMessage = {
            id: assistantMsgId,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
            model: currentModel,
            mode: currentMode,
        };

        const updatedHistory = [...messages, userMsg];
        setMessages([...updatedHistory, pendingAssistantMsg]);
        setIsStreaming(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const conversationForApi = updatedHistory
            .filter((m) => !m.isError)
            .map((m) => ({ role: m.role, content: m.content }));

        await streamChatMessage({
            message: query,
            history: conversationForApi,
            apiKey: getStoredApiKey(),
            model: currentModel,
            mode: currentMode,
            signal: controller.signal,
            onDelta: (delta) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantMsgId ? { ...m, content: m.content + delta } : m,
                    ),
                );
            },
            onDone: (fullText) => {
                setIsStreaming(false);
                abortControllerRef.current = null;
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantMsgId
                            ? { ...m, content: fullText || "No response received." }
                            : m,
                    ),
                );
            },
            onError: (err) => {
                setIsStreaming(false);
                abortControllerRef.current = null;
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantMsgId
                            ? { ...m, content: err.message, isError: true }
                            : m,
                    ),
                );
                if (err.requiresKey) {
                    setSettingsOpen(true);
                }
            },
        });
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsStreaming(false);
            toast("Generation stopped.");
        }
    };

    const handleClear = () => {
        clearStoredHistory();
        setMessages([]);
        toast("Chat history cleared.");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
    };

    const hasKey = Boolean(status?.hasServerKey || getStoredApiKey());

    return (
        <>
            {/* Settings Modal */}
            <ChatSettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                status={status}
                onSaved={() => {
                    fetchChatStatus().then((s) => s && setStatus(s));
                }}
            />

            {/* Floating Action Button */}
            {!open && (
                <aside aria-label="AI Assistant" className="fixed bottom-5 right-5 z-1050 max-sm:bottom-4 max-sm:right-4">
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="group relative flex items-center gap-2.5 rounded-full bg-ink p-3 text-bg shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:bg-ink/90 hover:shadow-2xl active:scale-95 cursor-pointer max-sm:p-3.5"
                        aria-label="Open API Q&A Chat"
                    >
                        <Icon name="bot" className="size-6 text-accent pb-1" />
                    </button>
                </aside>
            )}

            {/* Backdrop Overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-1040 bg-black/40 backdrop-blur-xs transition-opacity duration-200 cursor-pointer"
                    onClick={() => setOpen(false)}
                    aria-label="Close OpenGeo Assistant"
                />
            )}

            {/* Chat Drawer / Floating Window */}
            {open && (
                <div
                    className={cx(
                        "fixed z-1050 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/98 backdrop-blur-2xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] transition-all duration-200 animate-pop",
                        maximized
                            ? "inset-3 sm:inset-6 max-w-4xl mx-auto h-[calc(100vh-24px)] sm:h-[calc(100vh-48px)]"
                            : "bottom-5 right-5 w-[calc(100vw-32px)] sm:w-117.5 h-160 max-h-[calc(100vh-40px)] max-sm:bottom-2 max-sm:right-2 max-sm:left-2 max-sm:w-auto",
                    )}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-line bg-surface-2/70 px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent text-bg shadow-xs">
                                <Icon name="bot" className="size-4.5" />
                                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-surface bg-ok" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h2 className="font-display text-[13.5px] font-bold text-ink truncate">
                                        OpenGeo Assistant
                                    </h2>
                                </div>
                                <p className="text-[11px] text-ink-3 truncate">
                                    Official Cambodia Geography API Knowledge
                                </p>
                            </div>
                        </div>

                        {/* Window Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSettingsOpen(true)}
                                className={cx(
                                    "rounded-lg p-1.5 text-ink-3 hover:bg-surface hover:text-ink transition cursor-pointer",
                                    !hasKey && "text-warn animate-bounce",
                                )}
                                title="Mistral API Key & Model Settings"
                                aria-label="Settings"
                            >
                                <Icon name="settings" className="size-4" />
                            </button>
                            {messages.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="rounded-lg p-1.5 text-ink-3 hover:bg-surface hover:text-warn transition cursor-pointer"
                                    title="Clear conversation"
                                    aria-label="Clear chat"
                                >
                                    <Icon name="trash" className="size-4" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setMaximized(!maximized)}
                                className="rounded-lg p-1.5 text-ink-3 hover:bg-surface hover:text-ink transition cursor-pointer max-sm:hidden"
                                title={maximized ? "Restore size" : "Maximize"}
                                aria-label={maximized ? "Restore" : "Maximize"}
                            >
                                <Icon name={maximized ? "minimize" : "maximize"} className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-lg p-1.5 text-ink-3 hover:bg-surface hover:text-ink transition cursor-pointer"
                                title="Close"
                                aria-label="Close chat"
                            >
                                <Icon name="x" className="size-4.5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-2/30">
                        {/* API Key Warning Banner if no key configured */}
                        {!hasKey && (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-ink">
                                <div className="flex items-center gap-2">
                                    <Icon name="key" className="size-4 text-warn shrink-0" />
                                    <span>Provide a Mistral API key to query OpenGeo Cambodia API documentation.</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSettingsOpen(true)}
                                    className="shrink-0 rounded-lg bg-warn px-2.5 py-1 text-xs font-semibold text-bg hover:brightness-110 active:scale-95 cursor-pointer"
                                >
                                    Set Key
                                </button>
                            </div>
                        )}

                        {/* If no messages yet, display the beautiful Welcome Hero Card */}
                        {messages.length === 0 ? (
                            <ChatWelcomeCard onSelectPrompt={handleSend} />
                        ) : (
                            messages.map((m) => (
                                <ChatMessageItem
                                    key={m.id}
                                    message={m}
                                    isStreaming={isStreaming && m.id === messages[messages.length - 1]?.id}
                                    onConfigureKey={() => setSettingsOpen(true)}
                                    onRetry={() => {
                                        const lastUserMsg = [...messages].reverse().find((x) => x.role === "user");
                                        if (lastUserMsg) handleSend(lastUserMsg.content);
                                    }}
                                />
                            ))
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Footer Input Area */}
                    <div className="border-t border-line bg-surface-2/50 p-3 sm:p-3.5 space-y-2">
                        {/* Quick Prompts Ribbon when chat is active */}
                        {messages.length > 0 && prompts.length > 0 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                                {prompts.slice(0, 5).map((p, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSend(p.prompt)}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 font-medium text-ink-2 transition hover:border-accent hover:text-accent hover:bg-surface-2 cursor-pointer active:scale-95"
                                    >
                                        <span>{p.title}</span>
                                        <span className="text-accent">&rarr;</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Box */}
                        <div className="relative flex items-end rounded-2xl border border-line bg-surface p-1.5 shadow-xs transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={handleTextareaInput}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                placeholder="Ask how to use OpenGeo API (e.g. Find all districts in Siem Reap)..."
                                className="w-full resize-none border-0 bg-transparent px-3 py-1.5 text-xs text-ink placeholder:text-ink-3/70 focus:outline-hidden min-h-8 max-h-20 leading-normal"
                            />
                            <div className="flex items-center gap-1 shrink-0 pb-0.5 pr-0.5">
                                {isStreaming ? (
                                    <button
                                        type="button"
                                        onClick={handleStop}
                                        className="flex size-8 items-center justify-center rounded-xl bg-warn text-bg shadow-xs transition hover:brightness-110 active:scale-95 cursor-pointer"
                                        title="Stop generating"
                                    >
                                        <Icon name="stop" className="size-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleSend()}
                                        disabled={!input.trim()}
                                        className="flex size-8 items-center justify-center rounded-xl bg-accent text-bg shadow-xs transition hover:brightness-110 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                                        title="Send message (Enter)"
                                    >
                                        <Icon name="send" className="size-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Bottom Status / Keyboard Hint */}
                        <div className="flex items-center justify-between px-1 text-[11px] text-ink-3">
                            <span className="hidden sm:inline opacity-75">
                                Press <strong className="font-semibold text-ink-2">Enter ↵</strong> to send
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
