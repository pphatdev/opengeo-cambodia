import type { SVGProps } from "react";

interface RobotWaveIconProps extends SVGProps<SVGSVGElement> {
    isWaving?: boolean;
}

export function RobotWaveIcon({ className, isWaving = true, ...props }: RobotWaveIconProps) {
    return (
        <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
            {...props}
        >
            {/* Top Antenna */}
            <path
                d="M16 8V3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            {/* Pulsing Beacon Light */}
            <circle
                cx="16"
                cy="3"
                r="2"
                className="fill-accent animate-pulse"
            />

            {/* Side Bolts / Ears */}
            <rect x="4.5" y="13.5" width="2" height="5" rx="1" fill="currentColor" opacity="0.8" />
            <rect x="25.5" y="13.5" width="2" height="5" rx="1" fill="currentColor" opacity="0.8" />

            {/* Main Robot Head */}
            <rect
                x="6"
                y="8"
                width="20"
                height="16"
                rx="5"
                stroke="currentColor"
                strokeWidth="2"
                className="fill-surface/90 dark:fill-surface-2"
            />

            {/* Visor Screen */}
            <rect
                x="8.5"
                y="10.5"
                width="15"
                height="10.5"
                rx="3.5"
                className="fill-ink/90 dark:fill-bg"
            />

            {/* Glowing Digital Eyes with periodic blink */}
            <g className="origin-center animate-robot-blink">
                <rect x="11" y="13" width="2.5" height="4" rx="1.2" className="fill-accent" />
                <rect x="18.5" y="13" width="2.5" height="4" rx="1.2" className="fill-accent" />
            </g>

            {/* Happy Smile */}
            <path
                d="M14 18.5Q16 20 18 18.5"
                stroke="var(--og-accent)"
                strokeWidth="1.2"
                strokeLinecap="round"
            />

            {/* Left Arm (Resting) */}
            <path
                d="M6 16C3.5 17.5 3.5 21 5.5 22C6.5 22.5 7.5 21.5 7.5 19.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />

            {/* Lower Body Base */}
            <path
                d="M10 24V27C10 28.5 11.5 29.5 13 29.5H19C20.5 29.5 22 28.5 22 27V24"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            {/* Chest Core Indicator */}
            <circle cx="16" cy="26.5" r="1.2" className="fill-accent" />

            {/* Right Arm: Waving Hi! 👋 */}
            <g
                style={{ transformOrigin: "25px 17px" }}
                className={isWaving ? "animate-robot-wave" : "group-hover:animate-robot-wave"}
            >
                {/* Arm from shoulder pointing up */}
                <path
                    d="M25 17C27.5 15.5 29.5 13 30.5 9.5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                />
                {/* Waving Hand & Palm */}
                <circle cx="31" cy="8.5" r="2.2" className="fill-accent stroke-ink" strokeWidth="1" />
                {/* Tiny wave motion arcs above hand */}
                <path
                    d="M33 5.5C34.2 6.5 34.2 8.5 33 9.5"
                    stroke="var(--og-accent)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    className="opacity-80"
                />
            </g>
        </svg>
    );
}
