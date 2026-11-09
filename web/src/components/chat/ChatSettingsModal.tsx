import { useState, useEffect } from "react";
import { Icon } from "../Icon";
import {
    getStoredApiKey,
    setStoredApiKey,
    getStoredModel,
    setStoredModel,
    getStoredMode,
    setStoredMode,
    type ChatStatus,
} from "../../lib/chat";
import { useToast } from "../../lib/toast";

interface ChatSettingsModalProps {
    open: boolean;
    onClose: () => void;
    status: ChatStatus | null;
    onSaved?: () => void;
}

export function ChatSettingsModal({
    open,
    onClose,
    status,
    onSaved,
}: ChatSettingsModalProps) {
    const { toast } = useToast();
    const [apiKey, setApiKey] = useState("");
    const [showKey, setShowKey] = useState(false);
    const [model, setModel] = useState("mistral-small-latest");
    const [mode, setMode] = useState<"compact" | "full">("compact");

    useEffect(() => {
        if (open) {
            setApiKey(getStoredApiKey());
            setModel(getStoredModel());
            setMode(getStoredMode());
        }
    }, [open]);

    if (!open) return null;

    const handleSave = () => {
        setStoredApiKey(apiKey);
        setStoredModel(model);
        setStoredMode(mode);
        toast(apiKey.trim() ? "Mistral settings saved!" : "Settings saved.");
        onSaved?.();
        onClose();
    };

    const handleClearKey = () => {
        setApiKey("");
        setStoredApiKey("");
        toast("Custom API key removed.");
    };

    const hasServerKey = status?.hasServerKey;

    return (
        <div className="fixed inset-0 z-1100 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity cursor-pointer"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-line pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                            <Icon name="settings" className="size-5" />
                        </div>
                        <div>
                            <h3 className="font-display text-base font-bold text-ink">
                                Assistant Settings
                            </h3>
                            <p className="text-xs text-ink-3">
                                Configure your API key and documentation context
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink cursor-pointer"
                        aria-label="Close"
                    >
                        <Icon name="x" className="size-4.5" />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-4.5 pt-4 text-[13px]">
                    {/* Server status alert */}
                    {hasServerKey ? (
                        <div className="flex items-center gap-2.5 rounded-xl border border-ok/25 bg-ok/10 px-3.5 py-2.5 text-xs text-ok">
                            <Icon name="check" className="size-4 shrink-0" />
                            <span>
                                <strong>Server key active:</strong> Ready to use out of the box! You may also provide your personal key below.
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2.5 rounded-xl border border-accent/25 bg-accent-soft px-3.5 py-2.5 text-xs text-ink">
                            <Icon name="info" className="mt-0.5 size-4 shrink-0 text-accent" />
                            <div>
                                <span>No server API key detected. Please enter your API key below to start asking questions.</span>
                                <a
                                    href="https://console.mistral.ai/api-keys/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 block font-semibold text-accent hover:underline"
                                >
                                    Get an API key at console.mistral.ai &rarr;
                                </a>
                            </div>
                        </div>
                    )}

                    {/* API Key Input */}
                    <div>
                        <label className="block font-medium text-ink mb-1.5">
                            Mistral API Key
                        </label>
                        <div className="relative flex items-center">
                            <input
                                type={showKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={hasServerKey ? "Using server key (optional custom key)" : "Enter your Mistral API key (sk-...)"}
                                className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 pr-20 font-mono text-xs text-ink placeholder:text-ink-3/70 focus:border-accent focus:outline-hidden"
                            />
                            <div className="absolute right-2 flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="rounded-md p-1.5 text-ink-3 hover:text-ink cursor-pointer"
                                    title={showKey ? "Hide key" : "Show key"}
                                >
                                    <Icon name={showKey ? "eyeOff" : "eye"} className="size-4" />
                                </button>
                                {apiKey && (
                                    <button
                                        type="button"
                                        onClick={handleClearKey}
                                        className="rounded-md p-1.5 text-ink-3 hover:text-warn cursor-pointer"
                                        title="Clear key"
                                    >
                                        <Icon name="trash" className="size-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="mt-1 text-[11px] text-ink-3">
                            Stored locally in your browser. Never shared or logged.
                        </p>
                    </div>

                    {/* Model Select */}
                    <div>
                        <label className="block font-medium text-ink mb-1.5">
                            Assistant Model
                        </label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-medium text-ink focus:border-accent focus:outline-hidden cursor-pointer"
                        >
                            <option value="mistral-small-latest">
                                mistral-small-latest (Recommended · Fast, 128k context)
                            </option>
                            <option value="mistral-large-latest">
                                mistral-large-latest (Flagship Reasoning Model)
                            </option>
                            <option value="open-mistral-nemo">
                                open-mistral-nemo (Efficient 12B Model)
                            </option>
                            <option value="codestral-latest">
                                codestral-latest (Code & SDK Specialist)
                            </option>
                        </select>
                    </div>

                    {/* Context Knowledge Mode */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="font-medium text-ink">
                                Token Efficiency & Knowledge Mode
                            </label>
                            <span className="text-[11px] text-accent font-medium">
                                {mode === "compact" ? "Minimal Token Usage" : "Full Schema"}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setMode("compact")}
                                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition cursor-pointer ${
                                    mode === "compact"
                                        ? "border-accent bg-accent-soft text-accent"
                                        : "border-line bg-surface hover:bg-surface-2 text-ink"
                                }`}
                            >
                                <div className="flex items-center gap-1.5 font-semibold text-xs">
                                    <span>Token-Saver</span>
                                    <span className="rounded bg-ok/20 px-1 py-0.2 text-[9px] font-bold text-ok">Recommended</span>
                                </div>
                                <span className="text-[11px] text-ink-3 mt-0.5">Ultra-low token usage (~1.2k tokens)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("full")}
                                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition cursor-pointer ${
                                    mode === "full"
                                        ? "border-accent bg-accent-soft text-accent"
                                        : "border-line bg-surface hover:bg-surface-2 text-ink"
                                }`}
                            >
                                <span className="font-semibold text-xs">Full Reference</span>
                                <span className="text-[11px] text-ink-3 mt-0.5">Extended schemas (~14k tokens)</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-2 hover:bg-surface-2 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-bg shadow-xs hover:brightness-110 cursor-pointer"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}

