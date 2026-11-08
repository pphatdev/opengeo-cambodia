import llmsMd from "../content/10-llms.md?raw";
import { Markdown } from "../Markdown";

export function LlmsSection() {
    return (
        <section id="llms">
            <Markdown content={llmsMd} />
        </section>
    );
}
