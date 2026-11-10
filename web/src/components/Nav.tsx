import { useEffect, useState } from "react";
import { Link } from "react-router";
import { LANGS, useI18n } from "../i18n";
import { useTheme } from "../lib/theme";
import { Icon } from "./Icon";
import { cx, iconBtn, wrap } from "./ui";

export const REPO_URL = "https://github.com/pphatdev/opengeo-cambodia";

interface NavProps {
    variant?: "home" | "docs" | "playground" | "map";
    menuOpen?: boolean;
    onMenu?: () => void;
}

export function LangSwitch() {
    const { lang, setLang, t } = useI18n();
    return (
        <div className="mx-0.5 inline-flex h-9 items-center rounded-[10px] glass-pill p-0.5 max-sm:mx-0" role="group" aria-label={t("nav.language")}>
            {LANGS.map((l) => (
                <button
                    key={l.id}
                    type="button"
                    lang={l.id}
                    aria-pressed={lang === l.id}
                    title={l.name}
                    onClick={() => setLang(l.id)}
                    className={cx(
                        "h-7.5 cursor-pointer rounded-[7px] border-0 bg-transparent px-2.25 max-sm:px-1.5 text-ink-3 transition-all hover:text-ink aria-pressed:bg-ink aria-pressed:text-bg aria-pressed:shadow-xs",
                        l.id === "km" ? "font-khmer text-[12.5px] font-medium" : "font-sans text-xs font-semibold",
                    )}
                >
                    {l.label}
                </button>
            ))}
        </div>
    );
}

const navItem =
    "cursor-pointer no-underline text-ink-2 hover:text-ink transition-all max-sm:inline-grid max-sm:size-9 max-sm:place-items-center max-sm:rounded-[10px] max-sm:glass-pill max-sm:p-0 max-sm:hover:border-accent/40 max-sm:[&_svg]:size-[17px] sm:inline-flex sm:items-center sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm sm:font-medium sm:hover:bg-surface-2/70 sm:hover:text-ink sm:km:font-khmer";

export function Nav({ variant = "home", menuOpen, onMenu }: NavProps) {
    const { toggle } = useTheme();
    const { t, lang } = useI18n();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const isDocs = variant === "docs";
    const isPlayground = variant === "playground";
    const isMap = variant === "map";
    return (
        <header
            className={cx(
                "sticky top-0 z-1000 transition-all duration-300",
                scrolled || isDocs || isPlayground || isMap
                    ? "glass-panel-subtle border-b-line/60! border-t-0! border-x-0! shadow-[0_8px_30px_-6px_rgba(0,0,0,0.04)]!"
                    : "border-transparent bg-transparent backdrop-blur-xs",
            )}
        >
            <div className={cx("flex h-16 items-center gap-5 max-sm:gap-2", isDocs ? "mx-auto max-w-340 px-6 max-sm:px-4" : wrap)}>
                {isDocs && (
                    <button className={cx(iconBtn, "lg:hidden")} type="button" aria-label={t("nav.openMenu")} aria-controls="sidebar" aria-expanded={!!menuOpen} onClick={onMenu}>
                        <Icon name="menu" />
                    </button>
                )}
                <Link className="flex items-center gap-2.5 max-sm:gap-1.5 font-semibold tracking-[-.01em] text-ink no-underline" to={lang === "km" ? "/?lang=km" : "/"} aria-label={t("nav.home")}>
                    <img src="/logo.jpg" alt="" width={30} height={30} className="size-7.5 rounded-lg object-cover shadow-xs" />
                    <span className="font-sans max-md:hidden">OpenGeo Cambodia</span>
                    {isDocs ? (
                        <>
                            <span className="font-normal text-line-2 max-md:hidden">/</span>
                            <span className="font-display text-[13px] font-bold uppercase text-accent km:font-khmer km:text-base km:font-semibold km:normal-case km:tracking-normal max-md:hidden">{t("nav.docs")}</span>
                        </>
                    ) : isPlayground ? (
                        <>
                            <span className="font-normal text-line-2 max-md:hidden">/</span>
                            <span className="font-display text-[13px] font-bold uppercase text-accent km:font-khmer km:text-base km:font-semibold km:normal-case km:tracking-normal max-md:hidden">{t("nav.playground")}</span>
                        </>
                    ) : isMap ? (
                        <>
                            <span className="font-normal text-line-2 max-md:hidden">/</span>
                            <span className="font-display text-[13px] font-bold uppercase text-accent km:font-khmer km:text-base km:font-semibold km:normal-case km:tracking-normal max-md:hidden">{t("nav.map")}</span>
                        </>
                    ) : (
                        <small className="rounded-full glass-pill px-2.5 py-0.5 text-xs font-medium text-accent max-xs:hidden">v1.7</small>
                    )}
                </Link>
                <nav className="ml-auto flex items-center gap-1.5" aria-label="Primary">
                    <Link
                        to={lang === "km" ? "/docs?lang=km" : "/docs"}
                        className={cx(
                            navItem,
                            isDocs && "bg-surface-2 font-semibold text-ink max-sm:border-accent/40 max-sm:text-accent max-sm:shadow-xs",
                        )}
                        title={t("nav.docs")}
                        aria-label={t("nav.docs")}
                    >
                        <Icon name="book" className="sm:hidden" />
                        <span className="max-sm:hidden">{t("nav.docs")}</span>
                    </Link>
                    <Link
                        to={lang === "km" ? "/playground?lang=km" : "/playground"}
                        className={cx(
                            navItem,
                            isPlayground && "bg-surface-2 font-semibold text-ink max-sm:border-accent/40 max-sm:text-accent max-sm:shadow-xs",
                        )}
                        title={t("nav.playground")}
                        aria-label={t("nav.playground")}
                    >
                        <Icon name="play" className="sm:hidden" />
                        <span className="max-sm:hidden">{t("nav.playground")}</span>
                    </Link>
                    <Link
                        to={lang === "km" ? "/map?lang=km" : "/map"}
                        className={cx(
                            navItem,
                            isMap && "bg-surface-2 font-semibold text-ink max-sm:border-accent/40 max-sm:text-accent max-sm:shadow-xs",
                        )}
                        title={t("nav.map")}
                        aria-label={t("nav.map")}
                        aria-current={isMap ? "page" : undefined}
                    >
                        <Icon name="map" className="sm:hidden" />
                        <span className="max-sm:hidden">{t("nav.map")}</span>
                    </Link>
                    <LangSwitch />
                    <a
                        href={REPO_URL}
                        className={iconBtn}
                        aria-label={t("nav.github")}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Icon name="github" />
                    </a>
                    <button className={iconBtn} type="button" aria-label={t("nav.theme")} onClick={toggle}>
                        <Icon name="moon" className="dark:hidden" />
                        <Icon name="sun" className="hidden dark:block" />
                    </button>
                </nav>
            </div>
        </header>
    );
}
