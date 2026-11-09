import { Hono } from "hono";
import { config } from "../config.js";
import { AiChatService } from "../services/ai-chat.service.js";
import type { ChatMessage, ChatRequestPayload } from "../types/chat.js";

export const chatRoutes = new Hono();

chatRoutes.get("/status", (c) => {
    const service = AiChatService.getInstance();
    const status = service.getStatus();

    // Check environment key from Cloudflare Worker env or process.env
    const envKey = ((c.env as any)?.MISTRAL_API_KEY as string | undefined)?.trim() || config.mistral.apiKey?.trim();
    status.hasServerKey = Boolean(envKey);
    status.requiresUserKey = !envKey;

    return c.json({
        success: true,
        data: status,
    });
});

chatRoutes.get("/prompts", (c) => {
    return c.json({
        success: true,
        data: [
            {
                category: "hierarchy",
                title: "All Districts in Phnom Penh",
                prompt: "How do I get all districts (Khan) in Phnom Penh with their codes?",
            },
            {
                category: "spatial",
                title: "Point-in-Polygon Zone Lookup",
                prompt: "How can I find which Province, District, and Commune contain GPS coordinates (11.5564, 104.9282)?",
            },
            {
                category: "search",
                title: "Search Place by Khmer Name",
                prompt: "How do I search for 'សៀមរាប' (Siem Reap) using the API search endpoint?",
            },
            {
                category: "code",
                title: "Python Integration Example",
                prompt: "Show me a Python script to fetch all 25 provinces and print their English and Khmer names.",
            },
            {
                category: "specs",
                title: "Rate Limits & Mandatory Headers",
                prompt: "What are the rate limits and header requirements for OpenGeo Cambodia?",
            },
            {
                category: "boundaries",
                title: "GeoJSON Province Boundaries",
                prompt: "How do I download the GeoJSON boundary polygon for a specific province?",
            },
        ],
    });
});

chatRoutes.post("/", async (c) => {
    let body: ChatRequestPayload;
    try {
        body = await c.req.json();
    } catch {
        return c.json(
            {
                success: false,
                error: "Invalid JSON request payload.",
            },
            400,
        );
    }

    const message = body.message?.trim();
    if (!message) {
        return c.json(
            {
                success: false,
                error: "Field 'message' is required and must not be empty.",
            },
            400,
        );
    }

    if (message.length > 8000) {
        return c.json(
            {
                success: false,
                error: "Message is too long (maximum 8,000 characters).",
            },
            400,
        );
    }

    // Resolve Mistral API Key priority:
    // First read from environment (process.env.MISTRAL_API_KEY or Cloudflare c.env.MISTRAL_API_KEY).
    // Users can also use their own personal Mistral token via x-mistral-api-key header, Bearer authorization, or request body.
    const headerKey = c.req.header("x-mistral-api-key")?.trim();
    const authHeader = c.req.header("authorization")?.trim();
    let bearerKey = "";
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        bearerKey = authHeader.slice(7).trim();
    }
    const bodyKey = body.apiKey?.trim();
    const userKey = headerKey || bearerKey || bodyKey;

    const envKey = ((c.env as any)?.MISTRAL_API_KEY as string | undefined)?.trim() || config.mistral.apiKey?.trim();

    // First read from env, then user can use their personal mistral token (user token overrides if provided)
    const apiKey = userKey || envKey;

    if (!apiKey) {
        return c.json(
            {
                success: false,
                error: "Mistral API key is required. Please set MISTRAL_API_KEY in your server environment (.env) or provide your personal Mistral key in Chat Settings.",
                requiresKey: true,
            },
            401,
        );
    }

    const service = AiChatService.getInstance();

    try {
        const stream = body.stream !== false; // default true for snappy streaming
        const result = await service.chat({
            message,
            history: Array.isArray(body.history) ? (body.history as ChatMessage[]) : [],
            apiKey,
            model: body.model,
            mode: body.mode || "full",
            stream,
        });

        if (result instanceof Response) {
            return result;
        }

        return c.json(result);
    } catch (err: any) {
        const message = err?.message || "An unexpected error occurred during chat processing.";
        const status = err?.status || 500;

        if (message === "MISTRAL_API_KEY_REQUIRED") {
            return c.json(
                {
                    success: false,
                    error: "Mistral API key is required. Please set MISTRAL_API_KEY in your environment or provide it in the chat settings.",
                    requiresKey: true,
                },
                401,
            );
        }

        if (status === 401 || message.includes("INVALID_MISTRAL_API_KEY")) {
            return c.json(
                {
                    success: false,
                    error: "Invalid Mistral API key. Please check your API key at https://console.mistral.ai/api-keys/.",
                    requiresKey: true,
                },
                401,
            );
        }

        if (status === 429 || message.includes("MISTRAL_RATE_LIMIT")) {
            return c.json(
                {
                    success: false,
                    error: "Mistral AI rate limit or quota exceeded. Please check your Mistral account balance or wait a moment.",
                },
                429,
            );
        }

        if (message.includes("fetch failed") || message.includes("ENOTFOUND") || message.includes("ECONNREFUSED")) {
            return c.json(
                {
                    success: false,
                    error: "Could not connect to Mistral AI API. Please verify your internet connection, proxy, or firewall settings.",
                },
                502,
            );
        }

        return c.json(
            {
                success: false,
                error: message,
            },
            status >= 400 && status < 600 ? status : 500,
        );
    }
});
