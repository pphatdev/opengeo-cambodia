/**
 * Shared Tailwind class recipes. Kept as plain strings so Tailwind's scanner sees them
 * and components stay readable. Compose with `cx`.
 */
import type { Level } from "../lib/types";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export const wrap = "mx-auto w-full max-w-[1360px] px-6 max-sm:px-4";

export const btn = "inline-flex h-11 items-center gap-2 rounded-[10px] border border-transparent px-[18px] text-[14.5px] font-medium no-underline transition-all active:translate-y-px km:font-khmer [&_svg]:size-4";
export const btnPrimary = cx(btn, "bg-ink text-bg shadow-sm hover:bg-[color-mix(in_srgb,var(--og-ink)_85%,var(--og-accent))] hover:shadow-[0_4px_20px_-4px_var(--og-accent)]");
export const btnGhost = cx(btn, "glass-pill text-ink hover:text-accent hover:border-accent/40");

export const iconBtn = "glass-pill inline-grid size-9 cursor-pointer place-items-center rounded-[10px] p-0 text-ink-2 hover:text-ink [&_svg]:size-[17px]";

export const kicker = "mb-3 font-display text-xs font-bold uppercase tracking-[.16em] text-accent km:font-khmer km:text-[13.5px] km:font-semibold km:normal-case km:tracking-normal";

/** Bold developer-centric display type (JetBrains Mono); Khmer swaps to Kantumruy with taller lines. */
const khmerHeading = "km:font-khmer km:font-semibold km:tracking-normal km:leading-[1.4] km:[&_em]:not-italic";
export const displayH1 = cx("my-5 font-display text-[clamp(32px,4.5vw,56px)] font-bold leading-[1.12] tracking-[-.03em] [&_em]:not-italic [&_em]:text-brand km:text-[clamp(34px,4.8vw,56px)]", khmerHeading);
export const sectionH2 = cx("m-0 font-display text-[clamp(24px,3vw,38px)] font-bold leading-[1.15] tracking-[-.025em] km:text-[clamp(26px,3.2vw,38px)]", khmerHeading);
export const docsH1 = cx("mb-4 font-display text-[clamp(30px,3.8vw,48px)] font-bold leading-[1.12] tracking-[-.03em] [&_em]:not-italic [&_em]:text-brand km:text-[clamp(32px,4vw,46px)]", khmerHeading);
export const docsH2 = cx("mb-3.5 mt-16 pt-2 font-display text-[26px] font-bold leading-[1.2] tracking-[-.02em] max-sm:text-[22px] km:text-[clamp(26px,3.2vw,38px)]", khmerHeading);

/* Administrative division hierarchy badges: province (accent), district (water), commune (amber), village (emerald) */
const LEVEL_COLORS: Record<Level, string> = {
    province: "bg-accent-soft text-accent border border-accent/25",
    district: "bg-water-soft text-water border border-water/25",
    commune: "bg-warn/15 text-warn border border-warn/25",
    village: "bg-ok/15 text-ok border border-ok/25",
};
export const lvl = (level: Level | string | undefined) =>
    cx(
        "inline-block whitespace-nowrap rounded-md px-[7px] py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[.05em] km:font-khmer km:text-[11.5px] km:normal-case km:tracking-normal",
        LEVEL_COLORS[level as Level] ?? "bg-surface-3 text-ink-2",
    );

/* Dark code surfaces */
export const codeTab =
    "cursor-pointer rounded-[7px] border-0 bg-transparent px-2.5 py-1.5 font-mono text-[12.5px] font-medium text-code-dim aria-selected:bg-code-tab aria-selected:text-code-hi";
export const codeCopy =
    "ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-code-line bg-transparent px-2.5 py-[5px] text-xs font-medium text-code-dim hover:border-code-dim/40 hover:text-code-hi disabled:opacity-50 km:font-khmer [&_svg]:size-[13px]";
export const codePre = "m-0 overflow-x-auto whitespace-pre font-mono text-[13px] leading-[1.65]";

export const chip =
    "glass-pill inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium text-ink-2 no-underline hover:text-ink km:font-khmer [&_svg]:size-3.5";

export const focusRing = "focus:border-accent focus:shadow-[0_0_0_3px_var(--og-accent-soft)] focus:outline-none";
