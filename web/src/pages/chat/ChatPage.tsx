import { useState, useEffect, useRef } from "react";
import { Nav } from "../../components/Nav";
import { Icon } from "../../components/Icon";
import { useSeo } from "../../components/Seo";
import { useI18n } from "../../i18n";
import { useToast } from "../../lib/toast";
import { PROD_ORIGIN } from "../../lib/api";
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
import { ChatMessageItem } from "../../components/chat/ChatMessageItem";
import { ChatWelcomeCard } from "../../components/chat/ChatWelcomeCard";
import { ChatSettingsModal } from "../../components/chat/ChatSettingsModal";

export default function ChatPage() {
    const { lang } = useI18n();
    const { toast } = useToast();

    useSeo({
        title: lang === "km" ? "ជំនួយការ AI សួរឆ្លើយ API — OpenGeo Cambodia" : "API Q&A Chatbot (Mistral) — OpenGeo Cambodia",
        description:
            "Ask questions and get instant code examples for OpenGeo Cambodia API powered by Mistral AI.",
        canonical: lang === "km" ? `${PROD_ORIGIN}/chat?lang=km` : `${PROD_ORIGIN}/chat`,
    });

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [status, setStatus] = useState<ChatStatus | null>(null);
    const [prompts, setPrompts] = useState<SamplePrompt[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        const stored = getStoredHistory();
        if (stored.length > 0) {
            setMessages(stored);
        }

        fetchChatStatus().then((s) => s && setStatus(s));
        fetchSamplePrompts().then((p) => p && setPrompts(p));
    }, []);

    useEffect(() => {
        setStoredHistory(messages);
    }, [messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isStreaming]);

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

    const hasKey = Boolean(status?.hasServerKey || getStoredApiKey());

    return (
        <div className="flex h-screen flex-col bg-bg text-ink">
            <Nav />

            <ChatSettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                status={status}
                onSaved={() => {
                    fetchChatStatus().then((s) => s && setStatus(s));
                }}
            />

            <div className="mx-auto flex w-full max-w-7xl flex-1 overflow-hidden px-4 py-4 sm:px-6">
                <div className="grid h-full w-full grid-cols-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl lg:grid-cols-[320px_1fr]">
                    {/* Left Sidebar */}
                    <div className="hidden border-r border-line bg-surface-2/40 p-4 lg:flex lg:flex-col lg:justify-between overflow-y-auto">
                        <div className="space-y-4">
                            {/* App badge */}
                            <div className="rounded-xl border border-line bg-surface p-3.5 shadow-xs">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-bg shadow-xs">
                                        <Icon name="bot" className="size-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-display text-sm font-bold text-ink">
                                            API AI Assistant
                                        </h2>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-ink-3 leading-relaxed">
                                    Authoritative Q&A assistant trained on Cambodia's 4-tier geography API (25 Provinces, 210 Districts, 1,661 Communes, 14,576 Villages).
                                </p>
                            </div>

                            {/* Status Card */}
                            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-ink-3">Mistral API Key</span>
                                    {hasKey ? (
                                        <span className="inline-flex items-center gap-1 font-semibold text-ok">
                                            <span className="size-1.5 rounded-full bg-ok" />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 font-semibold text-warn">
                                            <span className="size-1.5 rounded-full bg-warn" />
                                            Key Required
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-ink-3">Active Model</span>
                                    <span className="font-mono text-accent text-[11px]">
                                        {getStoredModel()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-ink-3">Token Mode</span>
                                    <span className="font-mono text-accent text-[11px]">
                                        {getStoredMode() === "compact" ? "Token-Saver (~1.2k tokens)" : "Full Reference (~14k tokens)"}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSettingsOpen(true)}
                                    className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line bg-surface-2 py-1.5 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95"
                                >
                                    <Icon name="settings" className="size-3.5" />
                                    Change Model & Key
                                </button>
                            </div>

                            {/* Sample Prompts */}
                            <div>
                                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">
                                    Common API Questions
                                </h3>
                                <div className="space-y-1.5">
                                    {prompts.map((p, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSend(p.prompt)}
                                            className="w-full rounded-xl border border-line bg-surface p-2.5 text-left text-xs transition hover:border-accent/40 hover:bg-surface-2 cursor-pointer group active:scale-[0.99]"
                                        >
                                            <div className="font-medium text-ink group-hover:text-accent">
                                                {p.title}
                                            </div>
                                            <div className="text-[11px] text-ink-3 line-clamp-1">
                                                {p.prompt}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-line text-[11px] text-ink-3 flex items-center justify-between">
                            {messages.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="inline-flex items-center gap-1 hover:text-warn cursor-pointer"
                                >
                                    <Icon name="trash" className="size-3.5" />
                                    Clear History
                                </button>
                            )}
                            <a
                                href="/docs"
                                className="text-accent hover:underline ml-auto"
                            >
                                View API Docs &rarr;
                            </a>
                        </div>
                    </div>

                    {/* Main Chat Conversation Area */}
                    <div className="flex h-full flex-col overflow-hidden">
                        {/* Conversation Header */}
                        <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface-2/30">
                            <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full bg-ok" />
                                <span className="text-xs font-semibold text-ink">
                                    OpenGeo Technical Q&A
                                </span>
                                <span className="hidden sm:inline-block rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] text-accent">
                                    {getStoredModel()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSettingsOpen(true)}
                                    className="inline-flex lg:hidden items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-2 cursor-pointer"
                                >
                                    <Icon name="settings" className="size-3.5" />
                                    Settings
                                </button>
                                {messages.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleClear}
                                        className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink cursor-pointer"
                                        title="Clear chat"
                                    >
                                        <Icon name="trash" className="size-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages Container */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-surface-2/30">
                            {!hasKey && (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-ink">
                                    <div className="flex items-center gap-2">
                                        <Icon name="key" className="size-4 text-warn shrink-0" />
                                        <span>Provide your Mistral API key to query OpenGeo Cambodia API documentation.</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSettingsOpen(true)}
                                        className="rounded-lg bg-warn px-2.5 py-1 text-xs font-semibold text-bg hover:brightness-110 active:scale-95 cursor-pointer"
                                    >
                                        Configure Key
                                    </button>
                                </div>
                            )}

                            {messages.length === 0 ? (
                                <div className="max-w-2xl mx-auto py-4">
                                    <ChatWelcomeCard onSelectPrompt={handleSend} />
                                </div>
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

                        {/* Input Footer */}
                        <div className="border-t border-line bg-surface-2/40 p-3 sm:p-4 space-y-2">
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

                            <div className="relative flex items-end rounded-2xl border border-line bg-surface p-2 shadow-xs transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        e.target.style.height = "auto";
                                        e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
                                    }}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    placeholder="Ask how to use the OpenGeo Cambodia API (e.g. Find all communes in Chamkar Mon)..."
                                    className="w-full resize-none border-0 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-3/70 focus:outline-hidden max-h-48 leading-normal"
                                />
                                <div className="flex items-center gap-1 shrink-0 pb-1 pr-1">
                                    {isStreaming ? (
                                        <button
                                            type="button"
                                            onClick={handleStop}
                                            className="flex size-9 items-center justify-center rounded-xl bg-warn text-bg shadow-xs transition hover:brightness-110 active:scale-95 cursor-pointer"
                                            title="Stop generating"
                                        >
                                            <Icon name="stop" className="size-4.5" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSend()}
                                            disabled={!input.trim()}
                                            className="flex size-9 items-center justify-center rounded-xl bg-accent text-bg shadow-xs transition hover:brightness-110 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                                            title="Send message (Enter)"
                                        >
                                            <Icon name="send" className="size-4.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-1 text-xs text-ink-3">
                                <span className="hidden sm:inline opacity-75">
                                    Press <strong className="font-semibold text-ink-2">Enter ↵</strong> to send, Shift + Enter for newline
                                </span>
                                <span className="font-mono text-[11px] text-accent">
                                    Knowledge: Official API Reference
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
