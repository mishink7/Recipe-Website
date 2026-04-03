"use client";

import { useState, useEffect } from "react";

interface AdminAuthProps {
  children: React.ReactNode;
}

export default function AdminAuth({ children }: AdminAuthProps) {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("admin-password");
    if (saved) {
      // Verify saved password is still valid
      fetch("/api/admin/tags", { headers: { "x-admin-password": saved } })
        .then((r) => {
          if (r.ok) {
            setPassword(saved);
            setAuthenticated(true);
          } else {
            localStorage.removeItem("admin-password");
          }
        })
        .catch(() => {
          localStorage.removeItem("admin-password");
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    setError("");
    setChecking(true);

    try {
      const res = await fetch("/api/admin/tags", {
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        localStorage.setItem("admin-password", password);
        setAuthenticated(true);
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setChecking(false);
    }
  };

  if (checking) return null;

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <form onSubmit={handleSubmit} className="w-full max-w-sm p-6 rounded-xl border border-card-border bg-card-bg">
          <h2 className="text-xl font-semibold text-foreground mb-4">Admin Access</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full px-4 py-2 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent mb-3"
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent-dark transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}

export function useAdminPassword(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("admin-password") || "";
}
