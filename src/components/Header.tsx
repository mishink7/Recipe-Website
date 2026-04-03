"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { useAdmin } from "@/lib/admin-context";

export default function Header() {
  const { isAdmin } = useAdmin();

  return (
    <header className="sticky top-0 z-50 border-b border-card-border bg-background/80 backdrop-blur-sm no-print">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-xl font-bold tracking-tight text-foreground hover:text-accent transition-colors">
          My Recipes
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className={`text-sm transition-colors flex items-center gap-1.5 ${
              isAdmin ? "text-accent" : "text-muted hover:text-accent"
            }`}
          >
            {isAdmin && (
              <span className="w-2 h-2 rounded-full bg-accent" />
            )}
            Admin
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
