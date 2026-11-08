import { Link, useParams } from "react-router";
import { Icon } from "../../components/Icon";
import { useI18n } from "../../i18n";
import { useToast } from "../../lib/toast";
import { BLOG_POSTS, getBlogPost } from "./blogData";

export function BlogPost() {
    const { category, slug } = useParams<{ category?: string; slug?: string }>();
    const { lang } = useI18n();
    const { copy } = useToast();

    // Resolve post either from /blog/:category/:slug or legacy /blog/:slug
    const targetSlug = slug || category;
    const post = targetSlug ? getBlogPost(targetSlug, slug ? category : undefined) : undefined;

    if (!post) {
        return (
            <div className="mx-auto max-w-2xl py-12 text-center">
                <Icon name="alert" className="mx-auto mb-4 size-10 text-warn" />
                <h2 className="font-display text-2xl font-bold km:font-khmer">
                    {lang === "km" ? "រកមិនឃើញអត្ថបទទេ" : "Chapter Not Found"}
                </h2>
                <p className="mt-2 text-sm text-ink-3 km:font-khmer">
                    {lang === "km"
                        ? "អត្ថបទដែលអ្នកកំពុងស្វែងរកមិនមាន ឬត្រូវបានផ្លាស់ប្តូរទីតាំង។"
                        : "The chapter you are looking for does not exist or has been moved."}
                </p>
                <Link
                    to="/blog"
                    className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-4 text-xs font-semibold text-bg no-underline hover:opacity-90 km:font-khmer"
                >
                    <Icon name="arrow" className="rotate-180" />
                    {lang === "km" ? "ត្រឡប់ទៅមាតិការួម" : "Back to Blog Series"}
                </Link>
            </div>
        );
    }

    const currentIndex = BLOG_POSTS.findIndex((p) => p.slug === post.slug);
    const prevPost = currentIndex > 0 ? BLOG_POSTS[currentIndex - 1] : null;
    const nextPost = currentIndex < BLOG_POSTS.length - 1 ? BLOG_POSTS[currentIndex + 1] : null;

    return (
        <div className="mx-auto max-w-3xl">
            {/* Top Navigation Bar */}
            <div className="mb-6 flex items-center justify-between border-b border-line pb-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <Link
                        to="/blog"
                        className="inline-flex items-center gap-1 font-medium text-ink-2 no-underline hover:text-accent km:font-khmer"
                    >
                        <Icon name="arrow" className="rotate-180 size-3.5" />
                        {lang === "km" ? "ត្រឡប់ទៅមាតិកា" : "All Chapters"}
                    </Link>
                    <span className="text-line-2">/</span>
                    <span className="font-mono text-ink-3">{post.category}</span>
                </div>
                <span className="font-mono text-ink-3">
                    Part {post.part} of {BLOG_POSTS.length}
                </span>
            </div>

            {/* Article Header */}
            <header className="mb-8">
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-ink-3">
                    <span className="rounded-md bg-accent-soft px-2.5 py-0.75 font-mono font-bold text-accent">
                        {post.category} · Part {post.part}
                    </span>
                    <span>{post.readTime}</span>
                    <span>·</span>
                    <span>{post.date}</span>
                </div>

                <h1 className="mb-3 mt-4 font-display text-[clamp(26px,3.8vw,42px)] font-bold tracking-tight text-ink km:font-khmer">
                    {lang === "km" ? post.titleKm : post.title}
                </h1>

                <p className="text-base leading-relaxed text-ink-2 km:font-khmer">
                    {lang === "km" ? post.descriptionKm : post.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                    {post.tags.map((t) => (
                        <span key={t} className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs text-ink-3">
                            #{t}
                        </span>
                    ))}
                </div>
            </header>

            {/* Key Highlights Card */}
            <div className="mb-8 rounded-2xl border border-line bg-surface p-6 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-accent km:font-khmer">
                    <Icon name="zap" className="size-4" />
                    {lang === "km" ? "ចំណុចសំខាន់ៗនៃភាគនេះ" : "Chapter Highlights"}
                </h3>
                <ul className="m-0 grid gap-2 pl-4 text-sm text-ink-2 km:font-khmer">
                    {post.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                    ))}
                </ul>
            </div>

            {/* Interactive Endpoints Section */}
            {post.apiEndpoints && post.apiEndpoints.length > 0 && (
                <div className="mb-8 rounded-2xl border border-code-line bg-code p-5 text-code-ink">
                    <div className="mb-3 flex items-center justify-between text-xs font-mono text-code-dim">
                        <span>{lang === "km" ? "Endpoint ពាក់ព័ន្ធ" : "Related Live Endpoints"}</span>
                        <span>Click to copy URL</span>
                    </div>
                    <div className="grid gap-2">
                        {post.apiEndpoints.map((ep) => (
                            <div
                                key={ep}
                                className="flex items-center justify-between rounded-lg border border-code-line/60 bg-code-pill px-3 py-2 font-mono text-xs"
                            >
                                <span className="truncate text-j-key">{ep}</span>
                                <button
                                    type="button"
                                    onClick={() => copy(location.origin + ep)}
                                    className="ml-2 inline-flex cursor-pointer items-center gap-1 rounded bg-code-tab px-2 py-1 text-[11px] text-code-hi hover:bg-code-line"
                                >
                                    <Icon name="copy" className="size-3" />
                                    {lang === "km" ? "ចម្លង" : "Copy"}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Previous and Next Navigation */}
            <div className="mt-12 grid grid-cols-1 gap-4 border-t border-line pt-6 sm:grid-cols-2">
                {prevPost ? (
                    <Link
                        to={`/blog/${prevPost.category}/${prevPost.slug}`}
                        className="group flex flex-col rounded-xl border border-line bg-surface p-4 text-left no-underline transition hover:border-line-2 hover:shadow-card"
                    >
                        <span className="flex items-center gap-1 text-xs text-ink-3">
                            <Icon name="arrow" className="rotate-180 size-3" />
                            {lang === "km" ? "ភាគមុន" : "Previous Chapter"}
                        </span>
                        <strong className="mt-1 text-sm text-ink group-hover:text-accent km:font-khmer">
                            Part {prevPost.part}: {lang === "km" ? prevPost.titleKm : prevPost.title}
                        </strong>
                    </Link>
                ) : (
                    <div />
                )}

                {nextPost ? (
                    <Link
                        to={`/blog/${nextPost.category}/${nextPost.slug}`}
                        className="group flex flex-col rounded-xl border border-line bg-surface p-4 text-right no-underline transition hover:border-line-2 hover:shadow-card sm:col-start-2"
                    >
                        <span className="flex items-center justify-end gap-1 text-xs text-ink-3">
                            {lang === "km" ? "ភាគបន្ទាប់" : "Next Chapter"}
                            <Icon name="arrow" className="size-3" />
                        </span>
                        <strong className="mt-1 text-sm text-ink group-hover:text-accent km:font-khmer">
                            Part {nextPost.part}: {lang === "km" ? nextPost.titleKm : nextPost.title}
                        </strong>
                    </Link>
                ) : (
                    <div />
                )}
            </div>
        </div>
    );
}
export default BlogPost;

