import responsesMd from "../content/04-responses.md?raw";
import { Markdown } from "../Markdown";

export function ResponsesSection() {
    return (
        <section id="responses">
            <Markdown content={responsesMd} />
        </section>
    );
}
