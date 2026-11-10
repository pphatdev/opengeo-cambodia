import type en from "./en";

/** Same shape as the English messages, with every leaf a string. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type Messages = Shape<typeof en>;

/** Dotted key paths, e.g. "hero.title". */
type Paths<T> = { [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}` }[keyof T & string];
export type MessageKey = Paths<Messages>;

export type Lang = "en" | "km";

/** Inline bilingual text, used by data-like specs (e.g. the endpoint list). */
export interface Localized {
    en: string;
    km: string;
}
