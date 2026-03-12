import { createContext, useContext, useEffect, useMemo, useState } from "react";
const ADMIN_EMAIL = "admin123ecom@gmail.com";
const ADMIN_PASSWORD = "admin123@";
const STORAGE_KEY = "admin:auth:session";
const UNLOAD_MARKER_KEY = "admin:auth:unload";
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
  const login = (email, password) => {
    const success = email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
    setIsAdmin(success);
    if (typeof window !== "undefined") {
      if (success) {
        window.sessionStorage.removeItem(UNLOAD_MARKER_KEY);
        window.sessionStorage.setItem(STORAGE_KEY, "true");
        window.sessionStorage.setItem("admin:email", email.trim());
        window.localStorage.setItem("admin:email", email.trim());
      } else {
        window.sessionStorage.removeItem(UNLOAD_MARKER_KEY);
        window.sessionStorage.removeItem(STORAGE_KEY);
        window.sessionStorage.removeItem("admin:email");
        window.localStorage.removeItem("admin:email");
      }
    }
    return success;
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
  ADMIN_EMAIL
};
