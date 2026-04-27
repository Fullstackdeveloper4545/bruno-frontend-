import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { postJson } from "@/lib/api";

const ADMIN_EMAIL = String(import.meta.env.VITE_ADMIN_EMAIL || "admin123ecom@gmail.com").trim().toLowerCase();
const STORAGE_KEY = "admin:auth:session";
const UNLOAD_MARKER_KEY = "admin:auth:unload";
const PRESERVE_SESSION_KEY = "admin:auth:preserve-once";
const isAllowedAdminRole = (role) => ["admin", "super_admin"].includes(String(role || "").trim().toLowerCase());
const getNavigationType = () => {
  if (typeof window === "undefined" || typeof performance === "undefined") {
    return null;
  }
  const [entry] = performance.getEntriesByType("navigation");
  return entry?.type ?? null;
};
const readStoredAdminSession = () => {
  if (typeof window === "undefined") {
    return false;
  }
  const unloadMarkerExists = window.sessionStorage.getItem(UNLOAD_MARKER_KEY) === "1";
  if (unloadMarkerExists) {
    window.sessionStorage.removeItem(UNLOAD_MARKER_KEY);
    const preserveOnce = window.sessionStorage.getItem(PRESERVE_SESSION_KEY) === "1";
    if (preserveOnce) {
      window.sessionStorage.removeItem(PRESERVE_SESSION_KEY);
      return window.sessionStorage.getItem(STORAGE_KEY) === "true";
    }
    const navigationType = getNavigationType();
    if (navigationType !== "reload") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
  }
  return window.sessionStorage.getItem(STORAGE_KEY) === "true";
};
const AdminAuthContext = createContext(void 0);
const AdminAuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(() => readStoredAdminSession());
  useEffect(() => {
    if (typeof window === "undefined") {
      return void 0;
    }
    const markUnload = () => {
      window.sessionStorage.setItem(UNLOAD_MARKER_KEY, "1");
    };
    window.addEventListener("beforeunload", markUnload);
    return () => window.removeEventListener("beforeunload", markUnload);
  }, []);
  const login = async (email, password, totpCode = "") => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPassword = String(password || "");
    const normalizedTotpCode = String(totpCode || "").trim();

    try {
      const result = await postJson("/api/auth/login", {
        email: normalizedEmail,
        password: normalizedPassword,
        totp_code: normalizedTotpCode || undefined,
      });
      if (result?.requires_2fa) {
        setIsAdmin(false);
        return {
          success: false,
          requiresTwoFactor: true,
          message: result?.message || "Two-factor code required",
        };
      }
      if (!isAllowedAdminRole(result?.role)) {
        throw new Error("This account does not have admin access");
      }
      setIsAdmin(true);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(UNLOAD_MARKER_KEY);
        window.sessionStorage.setItem(STORAGE_KEY, "true");
        window.sessionStorage.setItem("admin:email", normalizedEmail);
        window.localStorage.setItem("admin:email", normalizedEmail);
      }
      return { success: true, requiresTwoFactor: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Admin login failed";
      if (message.includes("Two-factor code required")) {
        setIsAdmin(false);
        return { success: false, requiresTwoFactor: true, message };
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(UNLOAD_MARKER_KEY);
        window.sessionStorage.removeItem(STORAGE_KEY);
        window.sessionStorage.removeItem("admin:email");
        window.localStorage.removeItem("admin:email");
      }
      setIsAdmin(false);
      return { success: false, requiresTwoFactor: false, message };
    }
  };
  const logout = () => {
    setIsAdmin(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(UNLOAD_MARKER_KEY);
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem("admin:email");
      window.localStorage.removeItem("admin:email");
    }
  };
  const value = useMemo(() => ({ isAdmin, login, logout }), [isAdmin]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};
const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
export {
  AdminAuthProvider,
  useAdminAuth,
  ADMIN_EMAIL,
  PRESERVE_SESSION_KEY
};
