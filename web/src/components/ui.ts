/**
 * Shared Tailwind class recipes. Kept as plain strings so Tailwind's scanner sees them
 * and components stay readable. Compose with `cx`.
 */
import type { Level } from "../lib/types";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export const wrap = "mx-auto w-full max-w-[1360px] px-6 max-sm:px-4";

export const btn =
    "inline-flex h-11 items-center gap-2 rounded-[10px] border border-transparent px-[18px] text-[14.5px] font-medium no-underline transition-[transform,background-color,border-color] active:translate-y-px km:font-khmer [&_svg]:size-4";
export const btnPrimary = cx(btn, "bg-ink text-bg hover:bg-[color-mix(in_srgb,var(--og-ink)_85%,var(--og-accent))]");
export const btnGhost = cx(btn, "border-line bg-surface text-ink hover:border-line-2");

export const iconBtn =
    "inline-grid size-9 cursor-pointer place-items-center rounded-[9px] border border-line bg-surface p-0 text-ink-2 hover:border-line-2 hover:text-ink [&_svg]:size-[17px]";

export const kicker =
    "mb-3 font-display text-xs font-bold uppercase tracking-[.16em] text-accent km:font-khmer km:text-[13.5px] km:font-semibold km:normal-case km:tracking-normal";

/** Bold geometric display type (Montserrat, like the logo); Khmer swaps to Kantumruy with taller lines. */
const khmerHeading = "km:font-khmer km:font-semibold km:tracking-normal km:leading-[1.4] km:[&_em]:not-italic";
export const displayH1 = cx("my-5 font-display text-[clamp(38px,5.2vw,64px)] font-bold leading-[1.06] tracking-[-.035em] [&_em]:not-italic [&_em]:text-brand km:text-[clamp(34px,4.8vw,56px)]", khmerHeading);
export const sectionH2 = cx("m-0 font-display text-[clamp(28px,3.4vw,42px)] font-bold leading-[1.12] tracking-[-.03em] km:text-[clamp(26px,3.2vw,38px)]", khmerHeading);
export const docsH1 = cx("mb-4 font-display text-[clamp(36px,4.4vw,54px)] font-bold leading-[1.06] tracking-[-.035em] [&_em]:not-italic [&_em]:text-brand km:text-[clamp(32px,4vw,46px)]", khmerHeading);
export const docsH2 = cx("mb-3.5 mt-16 pt-2 font-display text-[30px] font-bold leading-[1.15] tracking-[-.025em] max-sm:text-[26px] km:text-[clamp(26px,3.2vw,38px)]", khmerHeading);

/* Monochrome: levels differ by treatment (solid → filled → outlined → dashed) rather than hue */
const LEVEL_COLORS: Record<Level, string> = {
    province: "bg-ink text-bg",
    district: "bg-surface-3 text-ink",
    commune: "border border-line-2 text-ink-2",
    village: "border border-dashed border-line-2 text-ink-3",
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
    "ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-[#2f3239] bg-transparent px-2.5 py-[5px] text-xs font-medium text-code-dim hover:text-code-hi disabled:opacity-50 km:font-khmer [&_svg]:size-[13px]";
export const codePre = "m-0 overflow-x-auto whitespace-pre font-mono text-[13px] leading-[1.65]";

export const chip =
    "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-2 no-underline hover:border-line-2 hover:text-ink km:font-khmer [&_svg]:size-3.5";

export const focusRing = "focus:border-accent focus:shadow-[0_0_0_3px_var(--og-accent-soft)] focus:outline-none";
