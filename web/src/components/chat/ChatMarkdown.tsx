import { useMemo } from "react";
import { Marked } from "marked";
import { useToast } from "../../lib/toast";
import { cx } from "../ui";
import { replaceWithIosEmojiHtml } from "../../lib/emoji";

const chatMarked = new Marked();

chatMarked.use({
    gfm: true,
    breaks: true,
    renderer: {
        heading({ tokens, depth }) {
            const text = this.parser.parseInline(tokens);
            if (depth === 1) {
                return `<h3 class="mt-3 mb-1.5 text-sm font-bold text-ink tracking-tight">${text}</h3>\n`;
            }
            if (depth === 2) {
                return `<h4 class="mt-2.5 mb-1 text-[13px] font-bold text-ink">${text}</h4>\n`;
            }
            return `<h5 class="mt-2 mb-1 text-xs font-bold uppercase tracking-wider text-ink-3">${text}</h5>\n`;
        },
        paragraph({ tokens }) {
            const text = this.parser.parseInline(tokens);
            return `<p class="my-0.5 text-xs leading-[1.65] text-ink">${text}</p>\n`;
        },
        hr() {
            return `<hr class="my-3 border-0 border-t border-line" />\n`;
        },
        list({ items, ordered }) {
            let body = "";
            for (const item of items) {
                body += `<li class="my-0.5 leading-relaxed text-[13px] text-ink">${this.parser.parseInline(item.tokens)}</li>`;
            }
            const tag = ordered ? "ol" : "ul";
            const cls = ordered ? "list-decimal" : "list-disc";
            return `<${tag} class="my-1.5 pl-4.5 space-y-1 ${cls} text-ink">${body}</${tag}>\n`;
        },
        codespan({ text }) {
            const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `<code class="rounded-md bg-surface-2 border border-line px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-accent break-all">${safe}</code>`;
        },
        code({ text, lang }) {
            const language = (lang || "code").toLowerCase();
            const escaped = encodeURIComponent(text);
            const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `<div class="my-2.5 overflow-hidden rounded-xl bg-code text-code-ink shadow-xs">
                <div class="flex items-center justify-between border-b border-code-line bg-surface-3/30 px-3 py-1.5 text-[11px] font-mono text-code-dim">
                    <span class="font-semibold text-accent">${language}</span>
                    <button type="button" class="inline-flex cursor-pointer items-center gap-1 rounded-md border border-code-line/60 bg-code p-1 text-[10.5px] font-medium text-code-dim transition hover:text-code-hi hover:border-code-line active:scale-95" data-copy-code="${escaped}">
                        <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>
                <pre class="m-0 overflow-x-auto p-3 font-mono text-[10px] leading-[1.6]"><code>${safe}</code></pre>
            </div>\n`;
        },
        blockquote({ tokens }) {
            const inner = this.parser.parse(tokens);
            return `<div class="my-2 rounded-r-xl border-l-2 border-accent bg-accent-soft/40 px-3 py-2 text-[12.5px] text-ink [&>p]:my-0">${inner}</div>\n`;
        },
        table(token) {
            let head = "";
            for (const cell of token.header) {
                head += `<th class="whitespace-nowrap border-b border-line bg-surface-2 px-2.5 py-1.5 text-left font-mono text-[11px] font-semibold text-ink-3">${this.parser.parseInline(cell.tokens)}</th>`;
            }
            let body = "";
            for (const row of token.rows) {
                let rowHtml = "";
                for (const cell of row) {
                    rowHtml += `<td class="border-b border-line px-2.5 py-1.5 text-left text-[12px] text-ink">${this.parser.parseInline(cell.tokens)}</td>`;
                }
                body += `<tr class="[&:last-child>td]:border-b-0">${rowHtml}</tr>`;
            }
            return `<div class="my-2 overflow-x-auto rounded-lg border border-line bg-surface"><table class="w-full border-collapse"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;
        },
        link({ href, title, tokens }) {
            const text = this.parser.parseInline(tokens);
            const isExternal = href.startsWith("http");
            const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
            const titleAttr = title ? ` title="${title}"` : "";
            return `<a href="${href}" class="text-accent font-medium underline underline-offset-2 hover:brightness-110"${targetAttr}${titleAttr}>${text}</a>`;
        },
        strong({ tokens }) {
            return `<strong class="font-semibold text-ink">${this.parser.parseInline(tokens)}</strong>`;
        },
        em({ tokens }) {
            return `<em class="italic text-ink-2">${this.parser.parseInline(tokens)}</em>`;
        },
    },
});

export function ChatMarkdown({ content, className }: { content: string; className?: string }) {
    const { copy } = useToast();

    const html = useMemo(() => {
        const raw = chatMarked.parse(content, { async: false }) as string;
        return replaceWithIosEmojiHtml(raw);
    }, [content]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-copy-code]");
        if (btn && btn.dataset.copyCode) {
            copy(decodeURIComponent(btn.dataset.copyCode));
        }
    };

    return (
        <div
            className={cx("chat-markdown min-w-0 max-w-full wrap-break-word", className)}
            dangerouslySetInnerHTML={{ __html: html }}
            onClick={handleClick}
        />
    );
}
