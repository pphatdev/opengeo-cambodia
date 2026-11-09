export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
    role: ChatRole;
    content: string;
}

export interface ChatRequestPayload {
    message: string;
    history?: ChatMessage[];
    apiKey?: string;
    model?: string;
    mode?: "full" | "compact";
    stream?: boolean;
}

export interface ChatResponseData {
    message: string;
    model: string;
    mode: "full" | "compact";
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface ChatStatusData {
    hasServerKey: boolean;
    defaultModel: string;
    availableModels: string[];
    knowledge: {
        mode: "full" | "compact";
        fullBytes: number;
        compactBytes: number;
        loaded: boolean;
    };
}

