import bestPracticesMd from "../content/12-best-practices.md?raw";
import { Markdown } from "../Markdown";

export function BestPracticesSection() {
    return (
        <section id="best-practices">
            <Markdown content={bestPracticesMd} />
        </section>
    );
}
