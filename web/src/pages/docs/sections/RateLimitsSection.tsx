import rateLimitsMd from "../content/05-rate-limits.md?raw";
import { Markdown } from "../Markdown";

export function RateLimitsSection() {
    return (
        <section id="rate-limits">
            <Markdown content={rateLimitsMd} />
        </section>
    );
}
