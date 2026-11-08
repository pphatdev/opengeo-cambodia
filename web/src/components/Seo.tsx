import { useEffect } from "react";
import { useI18n } from "../i18n";
import { PROD_ORIGIN } from "../lib/api";

export interface SeoProps {
    title: string;
    description: string;
    canonical?: string;
    type?: "website" | "article";
}

function setMetaTag(name: string, content: string, isProperty = false) {
    const attr = isProperty ? "property" : "name";
    let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
    }
    el.setAttribute("content", content);
}

function setCanonical(href: string) {
    let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", "canonical");
        document.head.appendChild(el);
    }
    el.setAttribute("href", href);
}

export function useSeo({ title, description, canonical, type = "website" }: SeoProps) {
    const { lang } = useI18n();

    useEffect(() => {
        document.title = title;
        document.documentElement.lang = lang;

        setMetaTag("description", description);
        setMetaTag("og:title", title, true);
        setMetaTag("og:description", description, true);
        setMetaTag("og:type", type, true);
        setMetaTag("twitter:title", title);
        setMetaTag("twitter:description", description);

        const url = canonical || (typeof location !== "undefined" ? location.origin + location.pathname : PROD_ORIGIN);
        setMetaTag("og:url", url, true);
        setCanonical(url);
    }, [title, description, canonical, type, lang]);
}

export function Seo(props: SeoProps) {
    useSeo(props);
    return null;
}
