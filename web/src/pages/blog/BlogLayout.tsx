import { Outlet, Link, useLocation } from "react-router";
import { Footer } from "../../components/Footer";
import { Nav } from "../../components/Nav";
import { cx, wrap } from "../../components/ui";
import { useI18n } from "../../i18n";
import { Icon } from "../../components/Icon";

export function BlogLayout() {
    const { lang } = useI18n();
    const location = useLocation();
    const isRootBlog = location.pathname === "/blog" || location.pathname === "/blog/";

    return (
        <div className="flex min-h-screen flex-col bg-bg text-ink">
            <Nav />

            {/* Hero Banner for the Blog Series */}
            <div className="border-b border-line bg-surface-2/60 py-10 sm:py-14">
                <div className={wrap}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                                <Link to="/blog" className="no-underline hover:underline">
                                    {lang === "km" ? "ប្លុកបច្ចេកវិទ្យា" : "Engineering Blog"}
                                </Link>
                                {!isRootBlog && (
                                    <>
                                        <span className="text-line-2">/</span>
                                        <span className="text-ink-3">
                                            {lang === "km" ? "អត្ថបទលម្អិត" : "Deep Dive"}
                                        </span>
                                    </>
                                )}
                            </div>
                            <h1 className="m-0 font-display text-[clamp(26px,3.5vw,40px)] font-bold tracking-tight km:font-khmer">
                                {lang === "km"
                                    ? "ស្វែងយល់ពីប្រព័ន្ធ OpenGeo Cambodia"
                                    : "Building with OpenGeo Cambodia"}
                            </h1>
                            <p className="mb-0 mt-2 max-w-2xl text-sm text-ink-2 km:font-khmer">
                                {lang === "km"
                                    ? "កម្រងអត្ថបទបច្ចេកទេស ៧ ភាគ អំពីស្ថាបត្យកម្មទិន្នន័យភូមិសាស្ត្រ ម៉ាស៊ីន Point-in-Polygon និងការរួមបញ្ចូលជាមួយ AI"
                                    : "A 7-part deep dive into Cambodia's 4-tier administrative hierarchy, sub-millisecond in-memory spatial indexing, and AI agent integration."}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            <Link
                                to="/docs"
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-xs font-medium text-ink-2 hover:border-line-2 hover:text-ink km:font-khmer"
                            >
                                <Icon name="book" />
                                {lang === "km" ? "ឯកសារ API" : "API Docs"}
                            </Link>
                            <Link
                                to="/#explore"
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-transparent bg-ink px-3.5 text-xs font-medium text-bg hover:opacity-90 km:font-khmer"
                            >
                                <Icon name="map" />
                                {lang === "km" ? "ផែនទីផ្ទាល់" : "Live Explorer"}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nested Content: Blog Index or Individual Post */}
            <main className={cx("flex-1 py-10 sm:py-14", wrap)}>
                <Outlet />
            </main>

            <Footer />
        </div>
    );
}
export default BlogLayout;

