"use client";

import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Link
        href="/admin/add-by-url"
        className="p-6 rounded-xl border border-card-border bg-card-bg hover:border-accent transition-colors group"
      >
        <div className="text-2xl mb-2">🔗</div>
        <h2 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
          Add by URL
        </h2>
        <p className="text-sm text-muted mt-1">
          Paste a recipe link and we&apos;ll scrape the title, ingredients, instructions, and image automatically.
        </p>
      </Link>

      <Link
        href="/admin/manual-entry"
        className="p-6 rounded-xl border border-card-border bg-card-bg hover:border-accent transition-colors group"
      >
        <div className="text-2xl mb-2">📝</div>
        <h2 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
          Manual Entry
        </h2>
        <p className="text-sm text-muted mt-1">
          Enter a recipe by hand — great for family recipes or ones not available online.
        </p>
      </Link>
    </div>
  );
}
