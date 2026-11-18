import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "../config.ts";
import type { ChatMessage, ChatResponseData, ChatStatusData } from "../types/chat.ts";
import process from "node:process";

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
 * Uses multi-path fallback for the Deno server, dist builds, and Cloudflare Workers compatibility.
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
        "- Creator: PPhat (Sophat LEAT / LEAT Sophat, info.sophat@gmail.com, https://pphat.me)",
        "- Administrative endpoints: GET /api/admin/provinces, /api/admin/provinces/:id/districts, /api/admin/districts/:id/communes, /api/admin/communes/:id/villages, /api/admin/hierarchy/:id, /api/admin/search?q=:query",
        "- Boundary endpoints: GET /api/boundaries/zone?lat=:lat&lng=:lng, /api/boundaries/zones?points=:lat,:lng;:lat,:lng (batch, max 100), /api/boundaries/provinces, /api/boundaries/districts, /api/boundaries/communes",
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
10. Thorough, In-Depth Technical Detail:
   - Provide comprehensive, high-value, and detailed responses that thoroughly explain the context and mechanics.
   - When answering endpoint inquiries, always include:
     * Full Endpoint URL, HTTP Method, and clear purpose description
     * Complete Parameter Breakdown: Path parameters and Query parameters (data types, required/optional, defaults, and usage examples)
     * Mandatory Headers: emphasize the mandatory \`User-Agent: YourApp/1.0\` requirement
     * Example JSON Response: show representative JSON response structures illustrating key attributes (\`code\`, \`name_en\`, \`name_km\`, \`administrative_unit\`, etc.)
     * Production-Ready Code Examples: provide clean, working code in cURL, TypeScript/JavaScript (\`fetch\`), and Python (\`requests\`) with proper headers and error handling
     * Architecture & Gotchas: explain NCDD hierarchy code structure (2/4/6/8-digit prefix inheritance), performance best practices (e.g. \`format=summary\` vs full GeoJSON boundaries, sub-millisecond in-memory point-in-polygon), and rate limit guidelines
   - Format with structured Markdown: use descriptive subheadings (\`###\`), parameter lists/tables, blockquotes, and language-tagged code blocks (\`bash\`, \`ts\`, \`python\`, \`json\`).
   - If asked in Khmer, provide the response in rich, natural, professional Khmer, retaining standard English endpoint paths and technical identifiers.
11. Project Creator & Social Profiles:
   - This project was created and is actively maintained by PPhat (Full name: Sophat LEAT, or LEAT Sophat).
   - When asked who created, built, authored, or maintains OpenGeo Cambodia, or how to contact the creator or follow their work, always provide the exact author information:
     * **Creator**: PPhat
     * **Full Name**: Sophat LEAT (or LEAT Sophat)
     * **eMail**: info.sophat@gmail.com
     * **Website**: https://pphat.me
     * **Social & Developer Links**:
       - Figma: https://www.figma.com/@pphat
       - Facebook: https://fb.me/pphat.me
       - X: https://x.com/pphatdev
       - GitHub: https://github.com/pphatdev
       - GitLab: https://gitlab.com/pphatdev
       - LinkedIn: https://www.linkedin.com/in/pphatdev
       - PeerList: https://peerlist.io/pphat
       - Instagram: https://www.instagram.com/pphat_dev
       - Google Developer Profile: https://g.dev/pphat
       - Glitch: https://glitch.com/@pphat
12. Reverse Token Optimization for Saving Tokens:
   - The chatbot engine uses reverse token windowing to save tokens: conversation history is traversed in reverse order (from newest to oldest), compressing bulky code blocks and pruning distant turns that exceed the token budget.
   - If asked about token usage, cost optimization, or context management, explain that OpenGeo Assistant uses reverse token windowing to maximize contextual relevance while conserving user API tokens and minimizing quota costs.

=== PROJECT CREATOR & SOCIAL PROFILES ===
Creator: PPhat
Full Name: Sophat LEAT (or LEAT Sophat)
eMail: info.sophat@gmail.com

Social:
- Website: https://pphat.me
- Figma: https://www.figma.com/@pphat
- Facebook: https://fb.me/pphat.me
- X: https://x.com/pphatdev
- GitHub: https://github.com/pphatdev
- GitLab: https://gitlab.com/pphatdev
- LinkedIn: https://www.linkedin.com/in/pphatdev
- PeerList: https://peerlist.io/pphat
- Instagram: https://www.instagram.com/pphat_dev
- Google Developer Profile: https://g.dev/pphat
- Glitch: https://glitch.com/@pphat

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

/**
 * Estimates token count for English, Khmer, and code content.
 * Latin/ASCII: ~3.8 characters per token.
 * Non-ASCII (Khmer unicode, symbols): ~1.5 characters per token.
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    let asciiCount = 0;
    let nonAsciiCount = 0;
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) < 128) {
            asciiCount++;
        } else {
            nonAsciiCount++;
        }
    }
    const tokenEst = Math.ceil(asciiCount / 3.8) + Math.ceil(nonAsciiCount / 1.5);
    return Math.max(1, tokenEst);
}

/**
 * Reverse Token Windowing:
 * Iterates through message history in REVERSE (from the most recent message backwards),
 * compressing verbose assistant code blocks and accumulating tokens until the token budget is met.
 * Older messages that exceed the budget are pruned to save user API tokens.
 */
export function applyReverseTokenBudget(
    history: ChatMessage[],
    maxBudgetTokens: number = 1500,
): { messages: ChatMessage[]; estimatedTokens: number; prunedCount: number } {
    if (!history || history.length === 0) {
        return { messages: [], estimatedTokens: 0, prunedCount: 0 };
    }

    const selectedReversed: ChatMessage[] = [];
    let accumulatedTokens = 0;
    let prunedCount = 0;

    // Traverse in REVERSE: newest message (at the end) backwards to oldest
    for (let i = history.length - 1; i >= 0; i--) {
        const item = history[i];
        if (!item || !item.content) continue;

        let content = item.content;

        // Compress older assistant responses by omitting verbose code fences to save tokens
        if (item.role === "assistant" && content.length > 500) {
            content = content.replace(
                /```[\w]*\n[\s\S]{250,}?```/g,
                "```\n// [Previous code block omitted to save tokens]\n```",
            );
        }

        const msgTokens = estimateTokens(content) + 4; // 4 tokens per message role overhead

        if (accumulatedTokens + msgTokens <= maxBudgetTokens) {
            selectedReversed.push({ ...item, content });
            accumulatedTokens += msgTokens;
        } else {
            // If we haven't selected ANY message yet, partially trim this single message to fit
            if (selectedReversed.length === 0) {
                const remainingTokens = Math.max(100, maxBudgetTokens - accumulatedTokens);
                const charBudget = Math.floor(remainingTokens * 3);
                const trimmedContent = content.slice(-charBudget);
                selectedReversed.push({
                    ...item,
                    content: `...[Previous context trimmed to save tokens]\n${trimmedContent}`,
                });
                accumulatedTokens += remainingTokens;
            }
            prunedCount += (i + 1);
            break; // Stop collecting older turns
        }

        // Limit maximum turn depth to 8 messages (4 turns) for optimal relevance
        if (selectedReversed.length >= 8) {
            prunedCount += i;
            break;
        }
    }

    // Reverse back to chronological order (oldest to newest)
    return {
        messages: selectedReversed.reverse(),
        estimatedTokens: accumulatedTokens,
        prunedCount,
    };
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
        const hasServerKey = Boolean(config.mistral.apiKey && config.mistral.apiKey.trim());

        return {
            hasServerKey,
            requiresUserKey: !hasServerKey,
            defaultModel: config.mistral.model || DEFAULT_MODEL,
            availableModels: [...AVAILABLE_MODELS],
            knowledge: {
                mode: "full",
                fullBytes: new TextEncoder().encode(full).length,
                compactBytes: new TextEncoder().encode(compact).length,
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
            mode = "full",
            stream = true,
        } = options;

        const effectiveKey = apiKey?.trim() || config.mistral.apiKey?.trim();
        if (!effectiveKey) {
            throw new Error("MISTRAL_API_KEY_REQUIRED");
        }

        const systemPrompt = buildSystemPrompt(mode);

        // Reverse Token Budgeting:
        // Evaluates conversation history in REVERSE (newest to oldest), compressing large previous code
        // blocks and discarding turns that exceed the token reserve budget to save user API tokens.
        const tokenBudget = mode === "compact" ? 900 : 1600;
        const { messages: recentHistory } = applyReverseTokenBudget(history, tokenBudget);

        const messages: ChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...recentHistory,
            { role: "user", content: message },
        ];

        const mistralPayload = {
            model,
            messages,
            temperature: 0.2,
            max_tokens: 2500,
            stream,
        };

        const res = await fetch(config.mistral.apiUrl || "https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${effectiveKey.trim()}`,
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

