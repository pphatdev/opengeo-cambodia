import { PROD_ORIGIN } from "./api";

/**
 * Social share covers (og:image / twitter:image) per page, in public/cover/.
 * The server injects the same values into the HTML for link-preview crawlers (src/app.ts → SEO_COVERS);
 * keep both in sync. Sizes are the real pixel dimensions of each file.
 */
export interface SeoCover {
    url: string;
    width: number;
    height: number;
    alt: string;
}

const cover = (file: string, width: number, height: number, alt: string): SeoCover => ({
    url: `${PROD_ORIGIN}/cover/${file}`,
    width,
    height,
    alt,
});

export const COVERS = {
    home: cover("home.webp", 1900, 1079, "OpenGeo Cambodia — free open API for Cambodia's administrative geography"),
    docs: cover("doc.webp", 1901, 1078, "OpenGeo Cambodia API documentation"),
    playground: cover("playground.webp", 1919, 1079, "OpenGeo Cambodia interactive API playground"),
    map: cover("map.webp", 1906, 1079, "Interactive map of Cambodia province, district and commune boundaries"),
} satisfies Record<string, SeoCover>;
