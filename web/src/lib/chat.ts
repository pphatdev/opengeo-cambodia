export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    model?: string;
    mode?: "full" | "compact";
    isError?: boolean;
}

export interface ChatStatus {
    hasServerKey: boolean;
    requiresUserKey?: boolean;
    defaultModel: string;
    availableModels: string[];
    knowledge: {
        mode: "full" | "compact";
        fullBytes: number;
        compactBytes: number;
        loaded: boolean;
    };
}

export interface SamplePrompt {
    category: string;
    title: string;
    prompt: string;
}

const STORAGE_KEY_API_KEY = "opengeo_mistral_api_key";
const STORAGE_KEY_MODEL = "opengeo_mistral_model";
const STORAGE_KEY_MODE = "opengeo_mistral_mode";
const STORAGE_KEY_MAC_ID = "opengeo_device_mac";
const LEGACY_STORAGE_KEY_HISTORY = "opengeo_chat_history";

/**
 * Returns or generates a persistent synthetic IEEE 802 MAC address (e.g. 02:A1:B2:C3:D4:E5)
 * for the current client device with locally-administered and unicast bits configured.
 */
export function getOrCreateDeviceMac(): string {
    if (typeof window === "undefined") return "02:00:00:00:00:00";
    try {
        let mac = localStorage.getItem(STORAGE_KEY_MAC_ID);
        if (!mac || !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac)) {
            const bytes = crypto.getRandomValues(new Uint8Array(6));
            // Set unicast (bit 0 = 0) and locally administered (bit 1 = 1)
            bytes[0] = (bytes[0] | 0x02) & 0xfe;
            mac = Array.from(bytes)
                .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
                .join(":");
            localStorage.setItem(STORAGE_KEY_MAC_ID, mac);
        }
        return mac;
    } catch {
        return "02:00:00:00:00:00";
    }
}

/**
 * Regenerates a brand-new synthetic MAC address for the device.
 */
export function regenerateDeviceMac(): string {
    if (typeof window === "undefined") return "02:00:00:00:00:00";
    try {
        const bytes = crypto.getRandomValues(new Uint8Array(6));
        bytes[0] = (bytes[0] | 0x02) & 0xfe;
        const mac = Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
            .join(":");
        localStorage.setItem(STORAGE_KEY_MAC_ID, mac);
        return mac;
    } catch {
        return "02:00:00:00:00:00";
    }
}

function getHistoryKey(mac?: string): string {
    const effectiveMac = mac || getOrCreateDeviceMac();
    return `opengeo_chat_history_${effectiveMac.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

export function getStoredApiKey(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY_API_KEY) || "";
}

export function setStoredApiKey(key: string): void {
    if (typeof window === "undefined") return;
    if (!key.trim()) {
        localStorage.removeItem(STORAGE_KEY_API_KEY);
    } else {
        localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
    }
}

export function getStoredModel(): string {
    if (typeof window === "undefined") return "mistral-small-latest";
    return localStorage.getItem(STORAGE_KEY_MODEL) || "mistral-small-latest";
}

export function setStoredModel(model: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_MODEL, model);
}

export function getStoredMode(): "compact" | "full" {
    if (typeof window === "undefined") return "full";
    const mode = localStorage.getItem(STORAGE_KEY_MODE);
    return mode === "compact" ? "compact" : "full";
}

export function setStoredMode(mode: "compact" | "full"): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_MODE, mode);
}

export function getStoredHistory(mac?: string): ChatMessage[] {
    if (typeof window === "undefined") return [];
    try {
        const key = getHistoryKey(mac);
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);

        // Migrate legacy un-scoped history if present
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY_HISTORY);
        if (legacy) {
            localStorage.setItem(key, legacy);
            localStorage.removeItem(LEGACY_STORAGE_KEY_HISTORY);
            return JSON.parse(legacy);
        }

        return [];
    } catch {
        return [];
    }
}

export function setStoredHistory(history: ChatMessage[], mac?: string): void {
    if (typeof window === "undefined") return;
    try {
        const key = getHistoryKey(mac);
        localStorage.setItem(key, JSON.stringify(history.slice(-30)));
    } catch {
        // storage quota exceeded or disabled
    }
}

export function clearStoredHistory(mac?: string): void {
    if (typeof window === "undefined") return;
    try {
        const key = getHistoryKey(mac);
        localStorage.removeItem(key);
        localStorage.removeItem(LEGACY_STORAGE_KEY_HISTORY);
    } catch {
        // storage quota exceeded or disabled
    }
}

export async function fetchChatStatus(): Promise<ChatStatus | null> {
    try {
        const res = await fetch("/api/chat/status", {
            headers: {
                "Accept": "application/json",
                "User-Agent": "OpenGeoWeb/1.0",
                "x-device-mac": getOrCreateDeviceMac(),
            },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data || null;
    } catch {
        return null;
    }
}

export async function fetchSamplePrompts(): Promise<SamplePrompt[]> {
    try {
        const res = await fetch("/api/chat/prompts", {
            headers: {
                "Accept": "application/json",
                "User-Agent": "OpenGeoWeb/1.0",
            },
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || [];
    } catch {
        return [];
    }
}

export interface StreamChatParams {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    apiKey?: string;
    model?: string;
    mode?: "full" | "compact";
    signal?: AbortSignal;
    onDelta: (delta: string) => void;
    onDone: (fullText: string) => void;
    onError: (err: { message: string; requiresKey?: boolean }) => void;
}

/**
 * Sends a message to /api/chat with Server-Sent Events (SSE) streaming.
 * Handles incremental chunks and falls back gracefully.
 */
export async function streamChatMessage(params: StreamChatParams): Promise<void> {
    const { message, history, apiKey, model, mode = "compact", signal, onDelta, onDone, onError } = params;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream, application/json",
        "User-Agent": "OpenGeoWeb/1.0",
        "x-device-mac": getOrCreateDeviceMac(),
    };

    const effectiveKey = apiKey || getStoredApiKey();
    if (effectiveKey) {
        headers["x-mistral-api-key"] = effectiveKey;
    }

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers,
            body: JSON.stringify({
                message,
                history,
                model: model || getStoredModel(),
                mode,
                stream: true,
            }),
            signal,
        });

        if (!res.ok) {
            let errorMsg = `Server error (${res.status})`;
            let requiresKey = res.status === 401;
            try {
                const errJson = await res.json();
                errorMsg = errJson.error || errJson.message || errorMsg;
                if (errJson.requiresKey) requiresKey = true;
            } catch {
                // non-JSON error
            }
            onError({ message: errorMsg, requiresKey });
            return;
        }

        const contentType = res.headers.get("content-type") || "";

        // If returned as standard JSON instead of SSE
        if (contentType.includes("application/json")) {
            const json = await res.json();
            const text = json.data?.message || json.message || "";
            onDelta(text);
            onDone(text);
            return;
        }

        // Stream via ReadableStream and text decoder
        if (!res.body) {
            onError({ message: "No response body received from chat server." });
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedText = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(":")) continue;

                if (trimmed.startsWith("data: ")) {
                    const dataStr = trimmed.slice(6).trim();
                    if (dataStr === "[DONE]") {
                        continue;
                    }
                    try {
                        const parsed = JSON.parse(dataStr);
                        const token =
                            parsed.choices?.[0]?.delta?.content ||
                            parsed.token ||
                            parsed.text ||
                            parsed.delta ||
                            "";
                        if (token) {
                            accumulatedText += token;
                            onDelta(token);
                        }
                    } catch {
                        // ignore unparseable chunk
                    }
                }
            }
        }

        if (buffer.trim().startsWith("data: ")) {
            const dataStr = buffer.trim().slice(6).trim();
            if (dataStr !== "[DONE]") {
                try {
                    const parsed = JSON.parse(dataStr);
                    const token = parsed.choices?.[0]?.delta?.content || "";
                    if (token) {
                        accumulatedText += token;
                        onDelta(token);
                    }
                } catch {
                    // ignore
                }
            }
        }

        onDone(accumulatedText);
    } catch (err: any) {
        if (err.name === "AbortError") {
            // User aborted the stream intentionally
            return;
        }
        onError({
            message: err.message || "Network error. Could not connect to API Chat service.",
        });
    }
}

