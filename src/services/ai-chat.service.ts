import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "../config.js";
import type { ChatMessage, ChatResponseData, ChatStatusData } from "../types/chat.js";

const DEFAULT_MODEL = "mistral-small-latest";
export const AVAILABLE_MODELS = [
    "mistral-small-latest",
    "mistral-large-latest",
    "open-mistral-nemo",
    "codestral-latest",
] as const;

let cachedFullContext: string | null = null;
let cachedCompactContext: string | null = null;

function distillCompactDocumentation(raw: string): string {
    let text = raw;
    // Strip non-API documentation and dataset download links to save tokens
    text = text.replace(/## Datasets[\s\S]*$/g, "");
    text = text.replace(/## Docs[\s\S]*?(?=## Administrative)/g, "");

    // Simplify Markdown link syntax to bare endpoint format (e.g. [GET /api/...](...) -> GET /api/...)
    text = text.replace(/\[(GET [^\]]+)\]\([^)]+\)/g, "$1");

    // Remove redundant blank lines
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    return text;
}

function resolveRootDir(): string {
    try {
        if (typeof import.meta !== "undefined" && import.meta?.url) {
            const currentDir = path.dirname(fileURLToPath(import.meta.url));
            return path.resolve(currentDir, "..", "..");
        }
    } catch {
        // Edge / Cloudflare Workers runtime
    }
    return typeof process !== "undefined" && process.cwd ? process.cwd() : "";
}

/**
 * Loads and caches the documentation knowledge base (llms-full.txt or llms.txt).
 * Uses multi-path fallback for Node.js, dist builds, and Cloudflare Workers compatibility.
 */
export function loadKnowledgeBase(mode: "full" | "compact" = "compact"): string {
    if (mode === "compact" && cachedCompactContext) {
        return cachedCompactContext;
    }
    if (mode === "full" && cachedFullContext) {
        return cachedFullContext;
    }

    const rootDir = resolveRootDir();
    const filename = mode === "full" ? "llms-full.txt" : "llms.txt";

    const candidatePaths = [
        rootDir ? path.join(rootDir, filename) : "",
        rootDir ? path.join(rootDir, "public", filename) : "",
        rootDir ? path.join(rootDir, "dist", filename) : "",
        typeof process !== "undefined" && process.cwd ? path.resolve(process.cwd(), filename) : "",
        typeof process !== "undefined" && process.cwd ? path.resolve(process.cwd(), "public", filename) : "",
        typeof process !== "undefined" && process.cwd ? path.resolve(process.cwd(), "dist", filename) : "",
    ].filter(Boolean);

    for (const p of candidatePaths) {
        try {
            if (typeof fs?.existsSync === "function" && fs.existsSync(p)) {
                const content = fs.readFileSync(p, "utf-8");
                if (content && content.trim().length > 100) {
                    if (mode === "full") {
                        cachedFullContext = content;
                        return content;
                    }
                    cachedCompactContext = distillCompactDocumentation(content);
                    return cachedCompactContext;
                }
            }
        } catch {
            // Check next candidate
        }
    }

    // Fallback minimal context if file cannot be read from filesystem
    const fallback = [
        "# OpenGeo Cambodia API",
        "> Free, keyless REST API for Cambodia's 4-tier administrative geography (25 Provinces, 210 Districts, 1,661 Communes, 14,576 Villages).",
        "- Base URL: https://opengeo-cambodia.pphat.me",
        "- Administrative endpoints: GET /api/admin/provinces, /api/admin/provinces/:id/districts, /api/admin/districts/:id/communes, /api/admin/communes/:id/villages, /api/admin/hierarchy/:id, /api/admin/search?q=:query",
        "- Boundary endpoints: GET /api/boundaries/zone?lat=:lat&lng=:lng, /api/boundaries/provinces, /api/boundaries/districts, /api/boundaries/communes",
        "- Geocoding endpoints: GET /api/geocode/reverse?lat=:lat&lon=:lon, /api/geocode/search?q=:query",
        "- Mandatory: Must send User-Agent header (403 without it).",
    ].join("\n");

    return fallback;
}

/**
 * Constructs the system prompt with strict ground truth guidelines and full documentation.
 */
export function buildSystemPrompt(mode: "full" | "compact" = "compact"): string {
    const documentation = loadKnowledgeBase(mode);

    return `You are OpenGeo Cambodia AI Assistant — an authoritative, expert technical assistant for the OpenGeo Cambodia API.

=== CRITICAL GROUND TRUTH RULES ===
1. 100% Free & Keyless: OpenGeo Cambodia endpoints are free and require no API key or auth token.
2. User-Agent Header Mandatory: Every HTTP request MUST include a descriptive User-Agent header (e.g. \`User-Agent: MyApp/1.0 (contact@example.com)\`), else receives HTTP 403.
3. 4-Tier Administrative Hierarchy (NCDD standard):
   - Tier 1: Province / Capital (រាជធានី / ខេត្ត) -> 2-digit code (e.g., 12 = Phnom Penh, 17 = Siem Reap)
   - Tier 2: District / Khan / Krong (ស្រុក / ខណ្ឌ / ក្រុង) -> 4-digit code (e.g., 1201 = Khan Chamkar Mon)
   - Tier 3: Commune / Sangkat (ឃុំ / សង្កាត់) -> 6-digit code (e.g., 120101 = Sangkat Tonle Basac)
   - Tier 4: Village / Phum (ភូមិ) -> 8-digit code (e.g., 12010101 = Phum 1)
   Leading digits ALWAYS match parent prefix (e.g., Chamkar Mon \`1201\` is strictly inside Phnom Penh \`12\`). Never hallucinate or invent non-existent codes.
4. Sub-Millisecond Spatial Containment (Point-in-Polygon):
   Use \`GET /api/boundaries/zone?lat={lat}&lng={lng}\` to instantly determine the containing Province, District, and Commune for any GPS coordinates from memory.
5. Multilingual Search:
   Use \`GET /api/admin/search?q={query}&level={level}&limit={limit}\` to match Khmer or English place names without accent or casing restrictions.
6. Boundaries:
   Polygons are GeoJSON at \`/api/boundaries/provinces\`, \`/api/boundaries/districts\`, \`/api/boundaries/communes\`, and \`/api/boundaries/:code\`. Use \`format=summary\` when only bounding boxes and centroids are needed.
7. Language of Answer:
   If the user asks in Khmer, reply in clear, professional Khmer. If asked in English, reply in English.
8. Runnable Code Snippets:
   Supply clean, working, and copy-pasteable code examples (cURL with User-Agent, JavaScript fetch, or Python requests).
9. Confidentiality of internal file names:
   NEVER mention "llms.txt", "llms-full.txt", or any internal text filenames or file paths to the user. Always refer to your knowledge source simply as "the official OpenGeo Cambodia API documentation" or "the API reference".
10. Strict Output Economy (Minimize Tokens):
   - Be concise, direct, and token-efficient.
   - Do NOT output conversational filler, pleasantries, or preamble (e.g. avoid "Hello!", "Certainly, here is...", "Hope this helps!").
   - Provide directly what was requested: the exact endpoint URL, parameters, and one concise code snippet.
   - Keep explanations under 2-3 short sentences.

=== API SPECIFICATION & REFERENCE ===
${documentation}
`;
}

export interface ChatServiceOptions {
    message: string;
    history?: ChatMessage[];
    apiKey?: string;
    model?: string;
    mode?: "full" | "compact";
    stream?: boolean;
}

export class AiChatService {
    private static instance: AiChatService;

    static getInstance(): AiChatService {
        if (!AiChatService.instance) {
            AiChatService.instance = new AiChatService();
        }
        return AiChatService.instance;
    }

    getStatus(): ChatStatusData {
        const full = loadKnowledgeBase("full");
        const compact = loadKnowledgeBase("compact");

        return {
            hasServerKey: Boolean(config.mistral.apiKey),
            defaultModel: config.mistral.model || DEFAULT_MODEL,
            availableModels: [...AVAILABLE_MODELS],
            knowledge: {
                mode: "compact",
                fullBytes: Buffer.byteLength(full, "utf-8"),
                compactBytes: Buffer.byteLength(compact, "utf-8"),
                loaded: Boolean(compact && compact.length > 200),
            },
        };
    }

    async chat(options: ChatServiceOptions): Promise<Response | { success: true; data: ChatResponseData }> {
        const {
            message,
            history = [],
            apiKey = config.mistral.apiKey,
            model = config.mistral.model || DEFAULT_MODEL,
            mode = "compact",
            stream = true,
        } = options;

        if (!apiKey) {
            throw new Error("MISTRAL_API_KEY_REQUIRED");
        }

        const systemPrompt = buildSystemPrompt(mode);

        // Token-efficient history optimization:
        // 1. Keep only the last 4 messages (2 conversation turns) instead of 10 to avoid token bloat.
        // 2. In older messages (prior turns), compress large code blocks so past code isn't re-transmitted in full.
        const recentHistory = history.slice(-4).map((m) => {
            if (m.role === "assistant" && m.content.length > 400) {
                const compressed = m.content.replace(
                    /```[\s\S]{200,}?```/g,
                    "```\n// [Previous code block omitted to save tokens]\n```",
                );
                return { ...m, content: compressed };
            }
            return m;
        });

        const messages: ChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...recentHistory,
            { role: "user", content: message },
        ];

        const mistralPayload = {
            model,
            messages,
            temperature: 0.1,
            max_tokens: 1024,
            stream,
        };

        const res = await fetch(config.mistral.apiUrl || "https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify(mistralPayload),
        });

        if (!res.ok) {
            const errorText = await res.text();
            let parsedError = errorText;
            try {
                const json = JSON.parse(errorText);
                parsedError = json.message || json.error?.message || errorText;
            } catch {
                // use errorText
            }

            if (res.status === 401) {
                const err = new Error("INVALID_MISTRAL_API_KEY: " + parsedError);
                (err as any).status = 401;
                throw err;
            }
            if (res.status === 429) {
                const err = new Error("MISTRAL_RATE_LIMIT: " + parsedError);
                (err as any).status = 429;
                throw err;
            }

            const err = new Error(`MISTRAL_API_ERROR (${res.status}): ${parsedError}`);
            (err as any).status = res.status;
            throw err;
        }

        if (stream && res.body) {
            return new Response(res.body, {
                status: 200,
                headers: {
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache, no-transform",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            });
        }

        const data: any = await res.json();
        const assistantText = data.choices?.[0]?.message?.content || "";

        return {
            success: true,
            data: {
                message: assistantText,
                model: data.model || model,
                mode,
                usage: data.usage,
            },
        };
    }
}

