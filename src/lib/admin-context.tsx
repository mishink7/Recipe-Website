"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface AdminContextValue {
  isAdmin: boolean;
  password: string;
}

const AdminContext = createContext<AdminContextValue>({ isAdmin: false, password: "" });

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("admin-password");
    if (!saved) return;

    setPassword(saved);
    fetch("/api/admin/tags", { headers: { "x-admin-password": saved } })
      .then((r) => {
        if (r.ok) setIsAdmin(true);
        else localStorage.removeItem("admin-password");
      })
      .catch(() => {});
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, password }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  return useContext(AdminContext);
}
