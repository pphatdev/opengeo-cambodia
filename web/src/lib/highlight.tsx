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
