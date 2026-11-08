import type { SVGProps } from "react";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const paths = {
    search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
    copy: (<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></>),
    sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    book: (<><path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5Z" /><path d="M8 7h8" /></>),
    check: <path d="M20 6 9 17l-5-5" />,
    pin: (<><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>),
    layers: (<><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>),
    zap: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
    key: (<><circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 9.2-9.2M17 6l3 3M15 8l2 2" /></>),
    polygon: <path d="M4 8 12 3l8 6-3 11H7L4 8Z" />,
    lang: (<><path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 3-3 7-7 9" /><path d="m13 21 4-9 4 9M14.5 18h5" /></>),
    bot: (<><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4M9 13v2M15 13v2" /></>),
    ext: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
    map: (<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>),
    info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
    alert: (<><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevrons: <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />,
    code: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
    eye: (<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>),
    download: (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>),
    table: (<><path d="M12 3v18M3 9h18M3 15h18" /><rect width="18" height="18" x="3" y="3" rx="2" /></>),
    sparkles: (<><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" /></>),
    x: (<><path d="M18 6 6 18M6 6l12 12" /></>),
} as const;

export type IconName = keyof typeof paths | "play" | "pause" | "github";

export function Icon({ name, ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
    if (name === "play") {
        return (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}><path d="M7 4.5v15l13-7.5-13-7.5Z" /></svg>);
    }
    if (name === "pause") {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
        );
    }
    if (name === "github") {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
                <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...rest}>
            {paths[name]}
        </svg>
    );
}
