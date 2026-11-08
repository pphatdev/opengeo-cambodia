import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { useI18n } from "../../i18n";
import { BLOG_CATEGORIES, BLOG_POSTS, BlogCategory } from "./blogData";

export function BlogIndex() {
    const { lang } = useI18n();
    const [selectedCategory, setSelectedCategory] = useState<BlogCategory | "all">("all");

    const filteredPosts =
        selectedCategory === "all"
            ? BLOG_POSTS
            : BLOG_POSTS.filter((p) => p.category === selectedCategory);

    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                    <h2 className="m-0 font-display text-xl font-bold km:font-khmer">
                        {lang === "km" ? "មាតិកាកម្រងអត្ថបទ (៧ ភាគ)" : "Series Chapters (7 Parts)"}
                    </h2>
                    <span className="text-xs text-ink-3 km:font-khmer">
                        {lang === "km"
                            ? "ចុចលើភាគណាមួយដើម្បីអានសេចក្តីលម្អិត និងកូដគំរូ"
                            : "Select any chapter to read implementation details and code examples."}
                    </span>
                </div>
                <span className="rounded-full border border-line bg-surface-2 px-3 py-1 font-mono text-xs font-semibold text-accent">
                    {filteredPosts.length} / {BLOG_POSTS.length} Chapters
                </span>
            </div>

            {/* Category Filter Tabs */}
            <div className="mb-8 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        selectedCategory === "all"
                            ? "bg-ink text-bg shadow-sm"
                            : "border border-line bg-surface text-ink-2 hover:border-line-2 hover:text-ink"
                    }`}
                >
                    {lang === "km" ? "ទាំងអស់" : "All"} ({BLOG_POSTS.length})
                </button>
                {BLOG_CATEGORIES.map((cat) => {
                    const count = BLOG_POSTS.filter((p) => p.category === cat.id).length;
                    const isActive = selectedCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer km:font-khmer ${
                                isActive
                                    ? "bg-ink text-bg shadow-sm"
                                    : "border border-line bg-surface text-ink-2 hover:border-line-2 hover:text-ink"
                            }`}
                        >
                            {lang === "km" ? cat.titleKm : cat.title} ({count})
                        </button>
                    );
                })}
            </div>

            <div className="grid gap-6">
                {filteredPosts.map((post) => (
                    <article
                        key={post.slug}
                        className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 transition-all hover:-translate-y-0.5 hover:border-line-2 hover:shadow-card"
                    >
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="rounded-md bg-accent-soft px-2.5 py-1 font-mono font-bold text-accent">
                                {post.category} · Part {post.part}
                            </span>
                            <span className="text-ink-3">{post.readTime}</span>
                            <span className="text-ink-3">·</span>
                            <span className="text-ink-3">{post.date}</span>
                        </div>

                        <h3 className="mb-2 mt-3 font-display text-lg font-bold tracking-tight text-ink group-hover:text-accent km:font-khmer">
                            <Link to={`/blog/${post.category}/${post.slug}`} className="no-underline after:absolute after:inset-0">
                                {lang === "km" ? post.titleKm : post.title}
                            </Link>
                        </h3>

                        <p className="mb-4 text-sm text-ink-2 km:font-khmer">
                            {lang === "km" ? post.descriptionKm : post.description}
                        </p>

                        {/* Highlights pill tags */}
                        <div className="mb-5 flex flex-wrap gap-1.5">
                            {post.highlights.map((h, i) => (
                                <span
                                    key={i}
                                    className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink-3"
                                >
                                    {h}
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-line/60 pt-4 text-xs">
                            <div className="flex flex-wrap gap-1.5">
                                {post.tags.map((t) => (
                                    <span key={t} className="text-ink-3">
                                        #{t}
                                    </span>
                                ))}
                            </div>

                            <span className="inline-flex items-center gap-1 font-medium text-accent">
                                {lang === "km" ? "អានបន្ត" : "Read Chapter"}
                                <Icon name="arrow" className="size-3.5 transition-transform group-hover:translate-x-1" />
                            </span>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
export default BlogIndex;

