import type { ReactNode } from "react";

// Token colours for the always-dark code surfaces
const K = "text-j-key";
const S = "text-j-str";
const N = "text-j-num";
const B = "text-j-bool";
export const COMMENT = "text-code-faint";

/** Tokenise JSON text into coloured spans (no innerHTML). */
export function highlightJson(text: string): ReactNode[] {
    const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|(\/\/[^\n]*)/g;
    return tokenize(text, re, (m) => {
        if (m[1]) return m[2] ? [<span className={K}>{m[1]}</span>, m[2]] : [<span className={S}>{m[1]}</span>];
        if (m[3]) return [<span className={B}>{m[0]}</span>];
        if (m[4]) return [<span className={COMMENT}>{m[0]}</span>];
        return [<span className={N}>{m[0]}</span>];
    });
}

/** Light JS/Python highlighting for snippets: comments, strings, keywords. */
export function highlightCode(text: string): ReactNode[] {
    const re = /(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|f"(?:[^"\\\n]|\\.)*")|\b(const|let|async|await|function|return|new|if|throw|import|from|def|for|in|not|raise|print)\b/g;
    return tokenize(text, re, (m) => {
        if (m[1]) return [<span className={COMMENT}>{m[1]}</span>];
        if (m[2]) return [<span className={S}>{m[2]}</span>];
        return [<span className={B}>{m[3]}</span>];
    });
}

/* -------------------------------------------------------------------------- */
/* HTML-string variant for Markdown (marked renders to a string, not React)   */
/* -------------------------------------------------------------------------- */

const JSON_RE = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|(\/\/[^\n]*)/g;
const JS_RE =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|async|await|function|return|new|if|else|for|of|in|throw|try|catch|import|from|export|default|class|extends|typeof|while)\b|\b(true|false|null|undefined)\b|(-?\b\d+(?:\.\d+)?\b)/g;
const PY_RE =
    /(#[^\n]*)|(f?"(?:[^"\\\n]|\\.)*"|f?'(?:[^'\\\n]|\\.)*')|\b(def|return|import|from|as|for|in|if|elif|else|not|and|or|raise|try|except|with|class|print|await|async)\b|\b(True|False|None)\b|(-?\b\d+(?:\.\d+)?\b)/g;
const SH_RE = /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'[^'\n]*')|(^|\s)(curl|wget|npm|pnpm|npx|yarn|node|python3?|pip|git|export|echo)\b|(\s-{1,2}[\w-]+)/gm;

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function span(cls: string, s: string): string {
    return `<span class="${cls}">${esc(s)}</span>`;
}

function tokenizeHtml(text: string, re: RegExp, render: (m: RegExpExecArray) => string): string {
    let out = "";
    let last = 0;
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
        if (m.index > last) out += esc(text.slice(last, m.index));
        out += render(m);
        last = re.lastIndex;
        if (m[0].length === 0) re.lastIndex++;
    }
    if (last < text.length) out += esc(text.slice(last));
    return out;
}

/** Escaped + syntax-coloured HTML for a fenced code block. Unknown languages are escaped only. */
export function highlightToHtml(text: string, lang = ""): string {
    const l = lang.toLowerCase();
    if (l === "json" || l === "jsonc" || l === "geojson") {
        return tokenizeHtml(text, JSON_RE, (m) => {
            if (m[1]) return m[2] ? span(K, m[1]) + esc(m[2]) : span(S, m[1]);
            if (m[3]) return span(B, m[0]);
            if (m[4]) return span(COMMENT, m[0]);
            return span(N, m[0]);
        });
    }
    if (["js", "javascript", "ts", "typescript", "jsx", "tsx", "mjs"].includes(l)) {
        return tokenizeHtml(text, JS_RE, (m) => {
            if (m[1]) return span(COMMENT, m[1]);
            if (m[2]) return span(S, m[2]);
            if (m[3]) return span(B, m[3]);
            if (m[4]) return span(B, m[4]);
            return span(N, m[0]);
        });
    }
    if (l === "py" || l === "python") {
        return tokenizeHtml(text, PY_RE, (m) => {
            if (m[1]) return span(COMMENT, m[1]);
            if (m[2]) return span(S, m[2]);
            if (m[3] || m[4]) return span(B, m[0]);
            return span(N, m[0]);
        });
    }
    if (["bash", "sh", "shell", "zsh", "console", "curl"].includes(l)) {
        return tokenizeHtml(text, SH_RE, (m) => {
            if (m[1]) return span(COMMENT, m[1]);
            if (m[2]) return span(S, m[2]);
            if (m[4]) return esc(m[3]) + span(K, m[4]);
            return span(N, m[0]);
        });
    }
    return esc(text);
}

function tokenize(text: string, re: RegExp, render: (m: RegExpExecArray) => ReactNode[]): ReactNode[] {
    const out: ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = re.exec(text))) {
        if (m.index > last) out.push(text.slice(last, m.index));
        for (const node of render(m)) out.push(typeof node === "string" ? node : <span key={key++}>{node}</span>);
        last = re.lastIndex;
        if (m[0].length === 0) re.lastIndex++;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}

export function JsonView({ value, max = 16000 }: { value: unknown; max?: number }) {
    let text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    if (text.length > max) text = text.slice(0, max) + "\n// … truncated for display";
    return <>{highlightJson(text)}</>;
}
