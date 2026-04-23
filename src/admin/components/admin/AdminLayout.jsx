import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  ClipboardList,
  ChevronDown,
  CreditCard,
  Languages,
  LayoutTemplate,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Percent,
  Plug,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Tags,
  Truck,
  Users,
  Menu,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { toast } from "@/components/ui/sonner";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminApi } from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import logo from "@/assets/Logo.png";


const formatDate = () => new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric"
}).format(/* @__PURE__ */ new Date());
const formatNotificationTime = (value) => new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
}).format(new Date(value));
const NOTIFICATION_POLL_INTERVAL_MS = 2e4;
const INTEGRATION_STATUS_POLL_INTERVAL_MS = 3e4;
const INTEGRATION_STATUS_EVENT = "admin:integration-settings-updated";
const MODULES_UPDATED_EVENT = "admin:modules-updated";
const LOW_STOCK_THRESHOLD = 10;
const LOW_STOCK_LIMIT = 300;
const MAX_NOTIFICATIONS = 40;
const normalizeStatus = (status) => String(status || "").trim().toLowerCase();
const toOrderLabel = (order) => order.order_number || `#${order.id}`;
const lowStockKey = (item) => {
  const productKey = item.product_id != null ? String(item.product_id) : item.sku || item.name || "product";
  const storeKey = item.store_id != null ? String(item.store_id) : item.store_name || "store";
  return `${productKey}::${storeKey}`;
};
const detectIntegrationProvider = (baseUrl) => {
  const value = String(baseUrl || "").trim().toLowerCase();
  if (!value) return null;
  if (value.includes("wordpress") || value.includes("/wp-json") || value.includes("/wc/v3")) return "WordPress";
  if (value.includes("shopify") || value.includes("myshopify.com")) return "Shopify";
  return null;
};
const buildIntegrationBadgeLabel = (settings) => {
  if (!settings?.is_active) return "Integração inativa";
  const explicitName = String(settings.integration_name || "").trim();
  if (explicitName) return `${explicitName} ativa`;
  const provider = detectIntegrationProvider(settings.base_url);
  return provider ? `${provider} ativa` : "Integração ativa";
};
const navSections = [
  {
    label: "Visão geral",
    items: [{ title: "Dashboard", to: "/admin", icon: LayoutDashboard }]
  },
  {
    label: "Catálogo",
    items: [
      { title: "Produtos", to: "/admin/products", icon: Boxes },
      { title: "Categorias", to: "/admin/categories", icon: Tags },
      // { title: "Attributes", to: "/admin/attributes", icon: ListFilter },
    //   { title: "Low Stock", to: "/admin/low-stock", icon: AlertTriangle }
    ]
  },
  {
    label: "Operações",
    items: [
      { title: "Lojas", to: "/admin/stores", icon: Store },
      { title: "Encomendas", to: "/admin/orders/total", icon: ClipboardList, badge: "8" },
      { title: "Envios", to: "/admin/shipping", icon: Truck },
      { title: "Faturas", to: "/admin/invoices", icon: Receipt }
    ]
  },
  {
    label: "Finanças",
    items: [
      { title: "Pagamentos", to: "/admin/payments", icon: CreditCard, badge: "2" },
      { title: "Descontos", to: "/admin/discounts/coupons", icon: Percent },
      { title: "Relatórios", to: "/admin/reports", icon: BarChart3 }
    ]
  },
  {
    label: "Clientes",
    items: [{ title: "Clientes", to: "/admin/customers", icon: Users }]
  },
  {
    label: "Plataforma",
    items: [
      { title: "Integrações", to: "/admin/integrations", icon: Plug },
      { title: "Traduções", to: "/admin/languages", icon: Languages },
      { title: "Themes", to: "/admin/layouts", icon: LayoutTemplate },
      { title: "Definições", to: "/admin/settings", icon: Settings },
      { title: "Blog", to: "/admin/blogs", icon: BookOpen },
      { title: "Segurança", to: "/admin/security", icon: ShieldCheck }
    ]
  }
];
const navItemModuleKey = {
  "/admin/products": "product",
  "/admin/categories": "product",
  "/admin/attributes": "product",
  "/admin/low-stock": "product",
  "/admin/orders/total": "order",
  "/admin/shipping": "shipping",
  "/admin/invoices": "invoice",
  "/admin/payments": "payment",
  "/admin/discounts/coupons": "discount",
  "/admin/reports": "report",
  "/admin/customers": "customers",
  "/admin/integrations": "integration",
  "/admin/languages": "language",
};
const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAdminAuth();
  const normalizedPath = location.pathname.replace(/\/$/, "");
  const isOrdersSection = normalizedPath.startsWith("/admin/orders");
  const ordersSearchQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("q") || "";
  }, [location.search]);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [integrationBadgeLabel, setIntegrationBadgeLabel] = useState("Integração ativa");
  const [modulesState, setModulesState] = useState({});
  const [adminName, setAdminName] = useState("User");
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);
  const orderTrackingRef = useRef({
    initialized: false,
    orderIds: /* @__PURE__ */ new Set(),
    orderStatusById: /* @__PURE__ */ new Map()
  });
  const lowStockTrackingRef = useRef({
    initialized: false,
    stockByKey: /* @__PURE__ */ new Map()
  });
  const pushNotification = useCallback((type, title, message) => {
    const next = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      message,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      read: false
    };
    setNotifications((prev) => [next, ...prev].slice(0, MAX_NOTIFICATIONS));
    toast(title, { description: message });
  }, []);
  const pollNotifications = useCallback(async () => {
    try {
      const [ordersResponse, summaryResponse] = await Promise.all([
        adminApi.listOrders(),
        adminApi.getDashboardSummary({ threshold: LOW_STOCK_THRESHOLD, limit: LOW_STOCK_LIMIT })
      ]);
      const orders = Array.isArray(ordersResponse) ? ordersResponse : [];
      const lowStockRows = Array.isArray(summaryResponse?.low_stock_products) ? summaryResponse.low_stock_products : [];
      const orderTracker = orderTrackingRef.current;
      const previousIds = orderTracker.orderIds;
      const previousStatusById = orderTracker.orderStatusById;
      const nextIds = /* @__PURE__ */ new Set();
      const nextStatusById = /* @__PURE__ */ new Map();
      for (const order of orders) {
        const id = Number(order.id);
        if (!Number.isFinite(id)) continue;
        const status = normalizeStatus(order.status);
        nextIds.add(id);
        nextStatusById.set(id, status);
        if (!orderTracker.initialized) continue;
        if (!previousIds.has(id)) {
          const customer = order.customer_name?.trim() || "um cliente";
          pushNotification("new_order", "Nova encomenda recebida", `${toOrderLabel(order)} foi efetuada por ${customer}.`);
          continue;
        }
        const previousStatus = previousStatusById.get(id);
        if (previousStatus && previousStatus !== "cancelled" && status === "cancelled") {
          pushNotification("order_cancelled", "Encomenda cancelada", `${toOrderLabel(order)} foi cancelada.`);
        }
      }
      const lowStockTracker = lowStockTrackingRef.current;
      const previousStockByKey = lowStockTracker.stockByKey;
      const currentStockByKey = /* @__PURE__ */ new Map();
      const currentRowsByKey = /* @__PURE__ */ new Map();
      for (const row of lowStockRows) {
        const key = lowStockKey(row);
        const qty = Math.max(0, Number(row.stock_left || 0));
        currentStockByKey.set(key, qty);
        currentRowsByKey.set(key, row);
      }
      if (lowStockTracker.initialized) {
        currentStockByKey.forEach((qty, key) => {
          const previousQty = previousStockByKey.get(key);
          const row = currentRowsByKey.get(key);
          const productName = row?.name?.trim() || row?.sku?.trim() || "Product";
          const storeName = row?.store_name?.trim() || "Loja desconhecida";
          if (qty === 0 && previousQty !== 0) {
            pushNotification("out_of_stock", "Produto sem stock", `${productName} está sem stock em ${storeName}.`);
            return;
          }
          if (qty > 0 && qty < LOW_STOCK_THRESHOLD && previousQty == null) {
            pushNotification("low_stock", "Alerta de stock baixo", `${productName} tem apenas ${qty} unidades em ${storeName}.`);
          }
        });
      }
      orderTracker.initialized = true;
      orderTracker.orderIds = nextIds;
      orderTracker.orderStatusById = nextStatusById;
      lowStockTracker.initialized = true;
      lowStockTracker.stockByKey = currentStockByKey;
      setNotificationsError("");
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : "Falha ao atualizar notificações");
    } finally {
      setNotificationsLoading(false);
    }
  }, [pushNotification]);
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
  const isActive = (to) => {
    if (to === "/admin") {
      return normalizedPath === "/admin" || normalizedPath === "";
    }
    return normalizedPath.startsWith(to);
  };
  const isNavItemEnabled = useCallback(
    (to) => {
      const key = navItemModuleKey[to];
      if (!key) return true;
      return modulesState[key] !== false;
    },
    [modulesState]
  );
  const visibleNavSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => isNavItemEnabled(item.to)),
        }))
        .filter((section) => section.items.length > 0),
    [isNavItemEnabled]
  );
  const pollModules = useCallback(async () => {
    try {
      const result = await adminApi.getSystemModules();
      const payload = result?.modules && typeof result.modules === "object" ? result.modules : {};
      setModulesState(payload);
    } catch {
      setModulesState({});
    }
  }, []);
  useEffect(() => {
    void pollNotifications();
    const intervalId = window.setInterval(() => {
      void pollNotifications();
    }, NOTIFICATION_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [pollNotifications]);
  useEffect(() => {
    void pollModules();
    const onModulesUpdated = (event) => {
      const payload = event?.detail?.modules;
      if (payload && typeof payload === "object") {
        setModulesState(payload);
        return;
      }
      void pollModules();
    };
    window.addEventListener(MODULES_UPDATED_EVENT, onModulesUpdated);
    return () => {
      window.removeEventListener(MODULES_UPDATED_EVENT, onModulesUpdated);
    };
  }, [pollModules]);
  const pollIntegrationStatus = useCallback(async () => {
    try {
      const settings = await adminApi.getIntegrationSettings();
      setIntegrationBadgeLabel(buildIntegrationBadgeLabel(settings));
    } catch {
      setIntegrationBadgeLabel("Integração ativa");
    }
  }, []);
  useEffect(() => {
    void pollIntegrationStatus();
    const intervalId = window.setInterval(() => {
      void pollIntegrationStatus();
    }, INTEGRATION_STATUS_POLL_INTERVAL_MS);
    const onIntegrationStatusUpdated = () => {
      void pollIntegrationStatus();
    };
    window.addEventListener(INTEGRATION_STATUS_EVENT, onIntegrationStatusUpdated);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(INTEGRATION_STATUS_EVENT, onIntegrationStatusUpdated);
    };
  }, [pollIntegrationStatus]);
  useEffect(() => {
    if (!isNotificationsOpen || unreadCount === 0) return;
    setNotifications((prev) => prev.map((item) => item.read ? item : { ...item, read: true }));
  }, [isNotificationsOpen, unreadCount]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedName = window.localStorage.getItem("admin:name") || window.sessionStorage.getItem("admin:name") || window.localStorage.getItem("adminName") || window.sessionStorage.getItem("adminName");
    if (storedName && storedName.trim().length > 0) {
      setAdminName(storedName.trim());
      return;
    }
    const storedEmail = window.localStorage.getItem("admin:email") || window.sessionStorage.getItem("admin:email") || window.sessionStorage.getItem("adminEmail");
    if (storedEmail && storedEmail.includes("@")) {
      setAdminName(storedEmail.split("@")[0]);
    }
  }, []);
  const handleOrdersSearchChange = useCallback(
    (value) => {
      const params = new URLSearchParams(location.search);
      if (value.trim().length > 0) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      const nextSearch = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : ""
        },
        { replace: true }
      );
    },
    [location.pathname, location.search, navigate]
  );
  return <SidebarProvider open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
    <div className="flex min-h-svh w-full items-stretch overflow-hidden bg-[#f2f5f5]">
      {isMobileSidebarOpen ? <div className="fixed inset-0 z-[70] md:hidden">
        <button type="button" aria-label="Close sidebar" className="absolute inset-0 bg-black/50" onClick={() => setIsMobileSidebarOpen(false)} />
        <aside className="relative z-[71] flex h-full w-[85vw] max-w-80 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground shadow-xl">
          <SidebarHeader>
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/80">Menu</p>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-white p-3 shadow-sm backdrop-blur transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-white/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-[16px] uppercase tracking-[0.26em] text-primary/80">BACKOFFICE</p>
                  <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
                </div>
              </div>
              <Badge variant="secondary" className="inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
                Online
              </Badge>
            </div>
          </SidebarHeader>
          <SidebarContent>
            {visibleNavSections.map((section, sectionIndex) => <SidebarGroup key={section.label}>
              <SidebarGroupLabel className="text-sidebar-foreground/80">{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.to)}
                      tooltip={item.title}
                      className={cn(
                        isActive(item.to) && "bg-sidebar-accent font-semibold",
                        item.nested && "pl-8 text-[13px] opacity-90"
                      )}
                    >
                      <NavLink to={item.to} onClick={() => setIsMobileSidebarOpen(false)}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>)}
                </SidebarMenu>
              </SidebarGroupContent>
              {/* {sectionIndex < visibleNavSections.length - 1 ? <SidebarSeparator /> : null} */}
            </SidebarGroup>)}
          </SidebarContent>
        </aside>
      </div> : null}

      <Sidebar className="hidden md:flex z-50 h-svh border-r border-border/60 bg-sidebar text-sidebar-foreground" collapsible="icon" variant="inset">
        <SidebarHeader>
          <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-white p-3 shadow-sm backdrop-blur transition-all group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:p-2">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-white/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="leading-tight group-data-[collapsible=icon]:hidden">
                <p className="text-[16px] uppercase tracking-[0.26em] text-primary/80">BACKOFFICE</p>
                <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
              </div>
            </div>
            <Badge variant="secondary" className="inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary group-data-[collapsible=icon]:hidden">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
              Online
            </Badge>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {visibleNavSections.map((section, sectionIndex) => <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.to)}
                    tooltip={item.title}
                    className={cn(
                      isActive(item.to) && "bg-sidebar-accent font-semibold",
                      item.nested && "pl-8 text-[13px] opacity-90"
                    )}
                  >
                    <NavLink to={item.to} onClick={() => setIsMobileSidebarOpen(false)}>
                      <item.icon className="h-4 w-4" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
            {/* {sectionIndex < visibleNavSections.length - 1 ? <SidebarSeparator /> : null} */}
          </SidebarGroup>)}
        </SidebarContent>
        
      </Sidebar>
      <SidebarRail className="hidden md:block" />
      <SidebarInset className="min-w-0 min-h-svh overflow-hidden bg-[#f2f5f5]">
        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-primary/30 bg-primary text-primary-foreground shadow-sm">
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileSidebarOpen(true)} aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
                <SidebarTrigger className="hidden md:inline-flex" aria-label="Toggle sidebar">
                  <Menu className="h-4 w-4" />
                </SidebarTrigger>
             
                <div className="min-w-0 leading-tight">
                  <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-white/80 sm:text-[16px] sm:tracking-[0.2em]">VISÃO DE ADMINISTRADOR</p>
                  <p className="truncate font-display text-[12px] text-white sm:text-[14px]">anadias.run</p>
                </div>
                {/* <Badge variant="secondary" className="hidden gap-1 text-[10px] uppercase tracking-[0.2em] md:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {integrationBadgeLabel}
                </Badge> */}
              </div>
              {isOrdersSection ? <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="h-9 w-64 rounded-full pl-9"
                    placeholder="Procurar encomendas, SKUs, clientes"
                    value={ordersSearchQuery}
                    onChange={(event) => handleOrdersSearchChange(event.target.value)}
                  />
                </div>
              </div> : null}
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden text-xs text-white/80 lg:block">{formatDate()}</span>
                <div className="relative">
                  <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative" aria-label="Open notifications">
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-black">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span> : null}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-[360px] p-0">
                      <div className="border-b px-4 py-3">
                        <p className="text-sm font-semibold">Notificações</p>
                        <p className="text-xs text-muted-foreground">
                          {notificationsLoading ? "A carregar notificações..." : unreadCount > 0 ? `${unreadCount} por ler` : "Tudo em dia"}
                        </p>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Ainda sem notificações.</p> : notifications.map((item) => <div
                          key={item.id}
                          className={cn(
                            "border-b px-4 py-3",
                            !item.read && "bg-amber-50/50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{item.title}</p>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {formatNotificationTime(item.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                        </div>)}
                      </div>
                      {notificationsError ? <p className="border-t px-4 py-2 text-xs text-destructive">{notificationsError}</p> : null}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2 px-2 text-primary-foreground hover:bg-white/10">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                          {adminName.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="hidden text-sm font-medium sm:inline">{adminName}</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="absolute right-0 top-full mt-3 w-[min(14rem,calc(100vw-2rem))] rounded-lg border border-black/10 bg-white p-0 text-foreground shadow-lg">
                      <div className="px-4 py-3 text-right">
                        <p className="text-sm font-semibold">{adminName}</p>
                        <p className="text-xs text-muted-foreground">Admin</p>
                      </div>
                      <hr className="border-border/60" />
                      <button
                        className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-muted/40"
                        onClick={() => navigate("/admin/settings")}
                      >
                        Perfil e definições
                      </button>
                      <button
                        className="flex w-full items-center justify-between px-4 py-3 text-sm text-destructive hover:bg-muted/40"
                        onClick={() => {
                          logout();
                          navigate("/", { replace: true });
                        }}
                      >
                        Terminar sessão
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {isOrdersSection ? <div className="w-full md:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="h-9 w-full rounded-full bg-white pl-9 text-foreground"
                    placeholder="Procurar encomendas, SKUs, clientes"
                    value={ordersSearchQuery}
                    onChange={(event) => handleOrdersSearchChange(event.target.value)}
                  />
                </div>
              </div> : null}
            </div>
          </header>
          <main className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-4 sm:pt-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarInset>
    </div>
  </SidebarProvider>;
};
var stdin_default = AdminLayout;
export {
  stdin_default as default
};

