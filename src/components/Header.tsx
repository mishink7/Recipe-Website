import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-card-border bg-background/80 backdrop-blur-sm no-print">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-xl font-bold tracking-tight text-foreground hover:text-accent transition-colors">
          My Recipes
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-muted hover:text-accent transition-colors">
            Admin
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
