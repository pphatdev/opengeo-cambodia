import { useEffect, useState } from "react";
import { Link } from "react-router";
import { LANGS, useI18n } from "../i18n";
import { useTheme } from "../lib/theme";
import { Icon } from "./Icon";
import { cx, iconBtn, wrap } from "./ui";

export const REPO_URL = "https://github.com/pphatdev/opengeo-cambodia";

interface NavProps {
    variant?: "home" | "docs";
    menuOpen?: boolean;
    onMenu?: () => void;
}

export function LangSwitch() {
    const { lang, setLang, t } = useI18n();
    return (
        <div className="mx-0.5 inline-flex h-9 items-center rounded-[9px] border border-line bg-surface p-0.5" role="group" aria-label={t("nav.language")}>
            {LANGS.map((l) => (
                <button
                    key={l.id}
                    type="button"
                    lang={l.id}
                    aria-pressed={lang === l.id}
                    title={l.name}
                    onClick={() => setLang(l.id)}
                    className={cx(
                        "h-7.5 cursor-pointer rounded-[7px] border-0 bg-transparent px-2.25 text-ink-3 hover:text-ink aria-pressed:bg-ink aria-pressed:text-bg",
                        l.id === "km" ? "font-khmer text-[12.5px] font-medium" : "font-sans text-xs font-semibold",
                    )}
                >
                    {l.label}
                </button>
            ))}
        </div>
    );
}

const navLink = "rounded-lg px-3 py-2 text-sm font-medium text-ink-2 no-underline hover:bg-surface-2 hover:text-ink km:font-khmer";

export function Nav({ variant = "home", menuOpen, onMenu }: NavProps) {
    const { toggle } = useTheme();
    const { t } = useI18n();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const isDocs = variant === "docs";
    return (
        <header
            className={cx(
                "sticky top-0 z-1000 border-b bg-bg/85 backdrop-blur-md backdrop-saturate-150 transition-colors",
                scrolled || isDocs ? "border-line" : "border-transparent",
            )}
        >
            <div className={cx("flex h-16 items-center gap-5", isDocs ? "mx-auto max-w-340 px-6 max-sm:px-4" : wrap)}>
                {isDocs && (
                    <button className={cx(iconBtn, "lg:hidden")} type="button" aria-label={t("nav.openMenu")} aria-controls="sidebar" aria-expanded={!!menuOpen} onClick={onMenu}>
                        <Icon name="menu" />
                    </button>
                )}
                <Link className="flex items-center gap-2.5 font-semibold tracking-[-.01em] text-ink no-underline" to="/" aria-label={t("nav.home")}>
                    <img src="/logo.jpg" alt="" width={30} height={30} className="size-7.5 rounded-lg object-cover" />
                    <span className="font-sans max-md:hidden">OpenGeo Cambodia</span>
                    {isDocs ? (
                        <>
                            <span className="font-normal text-line-2">/</span>
                            <span className="font-display text-[13px] font-bold uppercase tracking-[.14em] text-accent km:font-khmer km:text-base km:font-semibold km:normal-case km:tracking-normal">{t("nav.docs")}</span>
                        </>
                    ) : (
                        <small className="rounded-full border border-line px-2 py-px text-xs font-medium text-ink-3 max-xs:hidden">v1.2</small>
                    )}
                </Link>
                <nav className="ml-auto flex items-center gap-1" aria-label="Primary">
                    <Link to="/#explore" className={cx(navLink, "max-sm:hidden")}>{t("nav.explorer")}</Link>
                    <Link to="/#data" className={cx(navLink, "max-sm:hidden")}>{t("nav.data")}</Link>
                    <Link to="/blog" className={cx(navLink, "max-sm:hidden")}>{t("nav.blog")}</Link>
                    {!isDocs && <Link to="/docs" className={navLink}>{t("nav.docs")}</Link>}
                    <LangSwitch />
                    <a href={REPO_URL} className={cx(iconBtn, "max-xs:hidden")} aria-label={t("nav.github")} target="_blank" rel="noopener noreferrer"><Icon name="github" /></a>
                    <button className={iconBtn} type="button" aria-label={t("nav.theme")} onClick={toggle}>
                        <Icon name="moon" className="dark:hidden" />
                        <Icon name="sun" className="hidden dark:block" />
                    </button>
                </nav>
            </div>
        </header>
    );
}
