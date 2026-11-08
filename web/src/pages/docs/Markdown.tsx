import { useMemo } from "react";
import { Marked } from "marked";
import { cx } from "../../components/ui";
import { useToast } from "../../lib/toast";

const markedInstance = new Marked();

markedInstance.use({
    gfm: true,
    breaks: false,
    renderer: {
        heading({ tokens, depth }) {
            const rawText = this.parser.parseInline(tokens);
            const match = rawText.match(/\s*\{#([\w-]+)\}\s*$/);
            const id = match
                ? match[1]
                : rawText
                      .replace(/<[^>]+>/g, "")
                      .trim()
                      .toLowerCase()
                      .replace(/[^\w\s-]/g, "")
                      .replace(/\s+/g, "-");
            const text = rawText.replace(/\s*\{#[\w-]+\}\s*$/, "");

            if (depth === 1) {
                return `<h1 id="${id}" class="mb-4 font-display text-[clamp(36px,4.4vw,54px)] font-bold leading-[1.06] tracking-[-.035em] text-ink km:text-[clamp(32px,4vw,46px)] km:font-khmer km:font-semibold">${text}</h1>\n`;
            }
            if (depth === 2) {
                return `<h2 id="${id}" class="mb-3.5 mt-16 pt-2 font-display text-[30px] font-bold leading-[1.15] tracking-[-.025em] text-ink max-sm:text-[26px] km:text-[clamp(26px,3.2vw,38px)] km:font-khmer km:font-semibold"><a class="group text-inherit no-underline" href="#${id}">${text}<span class="ml-2 text-ink-3 opacity-0 group-hover:opacity-100">#</span></a></h2>\n`;
            }
            if (depth === 3) {
                return `<h3 id="${id}" class="mb-2 mt-6 font-display text-[20px] font-bold text-ink km:font-khmer km:font-semibold">${text}</h3>\n`;
            }
            return `<h${depth} id="${id}">${text}</h${depth}>\n`;
        },
        table(token) {
            let head = "";
            for (const cell of token.header) {
                head += `<th class="whitespace-nowrap border-b border-line bg-surface-2 px-3.5 py-2.5 text-left align-top font-mono text-[11.5px] font-semibold uppercase tracking-[.06em] text-ink-3 km:font-khmer km:text-[12.5px] km:normal-case km:tracking-normal">${this.parser.parseInline(cell.tokens)}</th>`;
            }
            let body = "";
            for (const row of token.rows) {
                let rowHtml = "";
                for (const cell of row) {
                    rowHtml += `<td class="border-b border-line px-3.5 py-2.5 text-left align-top">${this.parser.parseInline(cell.tokens)}</td>`;
                }
                body += `<tr class="[&:last-child>td]:border-b-0">${rowHtml}</tr>`;
            }
            return `<div class="overflow-x-auto my-3.5 mb-5 rounded-xl border border-line bg-surface"><table class="rich w-full border-collapse text-[13.5px]"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;
        },
        code({ text, lang }) {
            const language = lang || "code";
            const escaped = encodeURIComponent(text);
            const safeCode = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `<div class="overflow-hidden rounded-xl border border-code-line bg-code text-code-ink my-3.5 mb-5"><div class="flex items-center justify-between border-b border-code-line px-3 py-2 text-xs font-mono text-code-dim"><span>${language}</span><button type="button" class="inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-code-line bg-transparent px-2.5 py-1 text-xs font-medium text-code-dim hover:text-code-hi" data-copy-code="${escaped}"><svg class="size-3.25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy</button></div><pre class="m-0 overflow-x-auto p-4 font-mono text-[13px] leading-[1.65]"><code>${safeCode}</code></pre></div>\n`;
        },
        blockquote({ tokens }) {
            const inner = this.parser.parse(tokens);
            return `<div class="my-[18px] grid grid-cols-[20px_1fr] gap-3 rounded-xl border border-water/25 bg-water-soft px-4 py-3.5 text-sm text-ink"><svg class="mt-[3px] size-[18px] text-water" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg><div class="rich m-0 text-ink">${inner}</div></div>\n`;
        },
        link({ href, title, tokens }) {
            const text = this.parser.parseInline(tokens);
            const isExternal = href.startsWith("http");
            const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
            const titleAttr = title ? ` title="${title}"` : "";
            return `<a href="${href}" class="text-accent underline-offset-[3px] hover:underline"${targetAttr}${titleAttr}>${text}</a>`;
        },
    },
});

export function Markdown({ content, className }: { content: string; className?: string }) {
    const { copy } = useToast();

    const html = useMemo(() => {
        return markedInstance.parse(content, { async: false }) as string;
    }, [content]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-copy-code]");
        if (btn && btn.dataset.copyCode) {
            copy(decodeURIComponent(btn.dataset.copyCode));
        }
    };

    return (
        <div
            className={cx("rich markdown-body text-ink-2 [&>p]:mb-3.5 [&>p]:mt-0 [&>p]:text-ink-2", className)}
            dangerouslySetInnerHTML={{ __html: html }}
            onClick={handleClick}
        />
    );
}

