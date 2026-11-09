import type { ReactNode } from "react";

/**
 * Converts any Unicode emoji (including skin tones, variation selectors, compound ZWJ)
 * into a canonical lowercase hex string matching emoji-datasource-apple asset paths.
 */
export function emojiToHex(str: string): string {
    const codePoints: string[] = [];
    for (let i = 0; i < str.length; i++) {
        const code = str.codePointAt(i);
        if (code !== undefined) {
            codePoints.push(code.toString(16));
            if (code > 0xffff) i++; // skip low surrogate
        }
    }
    // Filter out standard variation selectors (fe0f / fe0e)
    const filtered = codePoints.filter((c) => c !== "fe0f" && c !== "fe0e");
    return (filtered.length > 0 ? filtered : codePoints).join("-").toLowerCase();
}

/**
 * High-definition Apple iOS Emoji CDN URL from emoji-datasource-apple.
 */
export function getIosEmojiUrl(emoji: string): string {
    const hex = emojiToHex(emoji);
    return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${hex}.png`;
}

export const EMOJI_REGEX =
    /(\p{Extended_Pictographic}(?:[\uFE0F\uFE0E]|\uD83C[\uDFFB-\uDFFF])?(?:\u200D\p{Extended_Pictographic}(?:[\uFE0F\uFE0E]|\uD83C[\uDFFB-\uDFFF])?)*)/gu;

/**
 * Replaces Unicode emojis in HTML text nodes with authentic Apple iOS Emoji image tags,
 * leaving `<pre>`, `<code>`, and HTML attributes untouched.
 */
export function replaceWithIosEmojiHtml(html: string): string {
    return html.replace(
        /<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<[^>]+>|([^<]+)/g,
        (match, textContent) => {
            if (!textContent) return match;
            return textContent.replace(EMOJI_REGEX, (emoji: string) => {
                const hex = emojiToHex(emoji);
                const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${hex}.png`;
                return `<img class="apple-emoji inline-block align-[-0.18em] size-[1.25em] select-none mx-[0.06em]" src="${url}" alt="${emoji}" loading="lazy" decoding="async" onerror="this.outerHTML='<span class=\\'font-ios-emoji\\'>${emoji}</span>'" />`;
            });
        },
    );
}

/**
 * React Component to render a crisp, authentic Apple iOS Emoji.
 */
export function IosEmoji({
    emoji,
    className = "inline-block align-[-0.18em] size-[1.25em] select-none",
}: {
    emoji: string;
    className?: string;
}) {
    const url = getIosEmojiUrl(emoji);
    return (
        <img
            src={url}
            alt={emoji}
            className={`apple-emoji ${className}`}
            loading="lazy"
            decoding="async"
            onError={(e) => {
                const span = document.createElement("span");
                span.className = "font-ios-emoji";
                span.textContent = emoji;
                e.currentTarget.replaceWith(span);
            }}
        />
    );
}

/**
 * Replaces plain text with React nodes including <IosEmoji />.
 */
export function renderIosEmojiText(text: string): ReactNode {
    const parts = text.split(EMOJI_REGEX);
    return parts.map((part, i) => {
        if (part.match(EMOJI_REGEX)) {
            return <IosEmoji key={i} emoji={part} />;
        }
        return part;
    });
}

