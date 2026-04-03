"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminAuth from "@/components/admin/AdminAuth";

const tabs = [
  { label: "Add by URL", href: "/admin/add-by-url" },
  { label: "Manual Entry", href: "/admin/manual-entry" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditPage = pathname.startsWith("/admin/edit/");

  return (
    <AdminAuth>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Admin</h1>
          <p className="text-sm text-muted">Add and manage recipes</p>
        </div>

        {!isEditPage && (
          <nav className="flex gap-1 mb-8 border-b border-card-border">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  pathname === tab.href
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        )}

        {children}
      </div>
    </AdminAuth>
  );
}
