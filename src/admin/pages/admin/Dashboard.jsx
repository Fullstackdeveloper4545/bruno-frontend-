import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import { ArrowDownRight, ArrowUpRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { toast } from "@/components/ui/sonner";
import { adminApi } from "@/lib/adminApi";
const fallbackKpis = {
  total_revenue: 1284320,
  today_revenue: 18240,
  month_revenue: 412300,
  year_revenue: 5142e3,
  total_orders: 2482,
  pending_orders: 86,
  ready_to_ship_orders: 142,
  failed_payments: 12,
  revenue_vs_last_month_pct: 12.4,
  total_orders_vs_prev_7d_pct: 4.3,
  pending_orders_vs_prev_7d_pct: -2.1,
  ready_to_ship_vs_prev_7d_pct: 6.9,
  failed_payments_vs_prev_7d_pct: -1.4
};
const DASHBOARD_REFRESH_INTERVAL_MS = 2e4;
const formatCurrency = (value) => Number(value || 0).toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const formatInteger = (value) => Number(value || 0).toLocaleString("pt-PT");
const formatPercent = (value) => `${value >= 0 ? "+" : ""}${Number(value || 0).toFixed(1)}%`;
const formatAlertTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("pt-PT", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
};
const formatStatusLabel = (status) => String(status || "").trim().replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
const revenueConfig = {
  revenue: {
    label: "Receitas",
    color: "hsl(var(--primary))"
  }
};
const ordersConfig = {
  orders: {
    label: "Encomendas",
    color: "hsl(var(--accent))"
  }
};
const Dashboard = () => {
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [isExportingSnapshot, setIsExportingSnapshot] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [kpis, setKpis] = useState(fallbackKpis);
  const [ordersPerStore, setOrdersPerStore] = useState([]);
  const [revenue7, setRevenue7] = useState([]);
  const [revenue30, setRevenue30] = useState([]);
  const [orders7, setOrders7] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [cttWebhook, setCttWebhook] = useState({
    last_event_at: null,
    last_status: null
  });
  const navigate = useNavigate();
  const alerts = useMemo(() => {
    const lastEventText = cttWebhook.last_event_at ? formatAlertTime(cttWebhook.last_event_at) : null;
    const statusLabel = formatStatusLabel(cttWebhook.last_status);
    return [
      {
        title: "Falha na integração de Stock",
        description: "Ajustes manuais de estoque estão desabilitados para a loja do Porto.",
        tone: "warning"
      },
      {
        title: "Erro na gateway de pagamento",
        description: "Erro nos pagamentos efetuados por MBWay.",
        tone: "warning"
      },
      {
        title: "CTT webhook off",
        description: "Falha na conexão com os CTT",
        tone: "info"
      }
    ];
  }, [cttWebhook]);
  const loadDashboardSummary = useCallback(async () => {
    try {
      setDashboardLoading(true);
      setDashboardError("");
      const summary = await adminApi.getDashboardSummary({ threshold: 10, limit: 200 });
      const incomingKpis = summary.kpis;
      if (incomingKpis) {
        const nextKpis = {
          total_revenue: Number(incomingKpis.total_revenue || 0),
          today_revenue: Number(incomingKpis.today_revenue || 0),
          month_revenue: Number(incomingKpis.month_revenue || 0),
          year_revenue: Number(incomingKpis.year_revenue || 0),
          total_orders: Number(incomingKpis.total_orders || 0),
          pending_orders: Number(incomingKpis.pending_orders || 0),
          ready_to_ship_orders: Number(incomingKpis.ready_to_ship_orders || 0),
          failed_payments: Number(incomingKpis.failed_payments || 0),
          revenue_vs_last_month_pct: Number(incomingKpis.revenue_vs_last_month_pct || 0),
          total_orders_vs_prev_7d_pct: Number(incomingKpis.total_orders_vs_prev_7d_pct || 0),
          pending_orders_vs_prev_7d_pct: Number(incomingKpis.pending_orders_vs_prev_7d_pct || 0),
          ready_to_ship_vs_prev_7d_pct: Number(incomingKpis.ready_to_ship_vs_prev_7d_pct || 0),
          failed_payments_vs_prev_7d_pct: Number(incomingKpis.failed_payments_vs_prev_7d_pct || 0)
        };
        setKpis(nextKpis);
      }
      setOrdersPerStore(
        (summary.orders_per_store || []).map((item) => ({
          store_name: item.store_name || "Unassigned",
          orders: Number(item.orders || 0)
        }))
      );
      setLowStockProducts(
        (summary.low_stock_products || []).map((item) => ({
          name: item.name || "Unnamed Product",
          sku: item.sku || "-",
          store_name: item.store_name || "Unknown Store",
          stock_left: Number(item.stock_left || 0)
        }))
      );
      setOrders7(
        (summary.orders_7d || []).map((item) => ({
          day: item.day || "-",
          orders: Number(item.orders || 0)
        }))
      );
      setRevenue7(
        (summary.revenue_7d || []).map((item) => ({
          day: item.day || "-",
          revenue: Number(item.revenue || 0)
        }))
      );
      setRevenue30(
        (summary.revenue_30d || []).map((item) => ({
          day: item.day || "-",
          revenue: Number(item.revenue || 0)
        }))
      );
      setCttWebhook({
        last_event_at: summary.ctt_webhook?.last_event_at || null,
        last_status: summary.ctt_webhook?.last_status || null
      });
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Failed to load dashboard summary");
      setOrdersPerStore([]);
      setLowStockProducts([]);
      setOrders7([]);
      setRevenue7([]);
      setRevenue30([]);
      setCttWebhook({ last_event_at: null, last_status: null });
    } finally {
      setDashboardLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadDashboardSummary();
    const intervalId = window.setInterval(() => {
      void loadDashboardSummary();
    }, DASHBOARD_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [loadDashboardSummary]);
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
  const storeOrders = useMemo(() => {
    const total = ordersPerStore.reduce((sum, store) => sum + store.orders, 0);
    return ordersPerStore.map((store) => ({
      name: store.store_name,
      orders: store.orders,
      share: total > 0 ? Math.round(store.orders / total * 100) : 0
    }));
  }, [ordersPerStore]);
  const statsCards = useMemo(
    () => [
      {
        label: "Total de Encomendas",
        value: formatInteger(kpis.total_orders),
        change: formatPercent(kpis.total_orders_vs_prev_7d_pct),
        trend: kpis.total_orders_vs_prev_7d_pct >= 0 ? "up" : "down"
      },
      {
        label: "Encomendas Pendentes",
        value: formatInteger(kpis.pending_orders),
        change: formatPercent(kpis.pending_orders_vs_prev_7d_pct),
        trend: kpis.pending_orders_vs_prev_7d_pct >= 0 ? "up" : "down"
      },
      {
        label: "Encomendas prontas",
        value: formatInteger(kpis.ready_to_ship_orders),
        change: formatPercent(kpis.ready_to_ship_vs_prev_7d_pct),
        trend: kpis.ready_to_ship_vs_prev_7d_pct >= 0 ? "up" : "down"
      },
      {
        label: "Pagamentos falhados",
        value: formatInteger(kpis.failed_payments),
        change: formatPercent(kpis.failed_payments_vs_prev_7d_pct),
        trend: kpis.failed_payments_vs_prev_7d_pct >= 0 ? "up" : "down"
      }
    ],
    [kpis]
  );
  const visibleLowStockProducts = lowStockProducts.slice(0, 4);
  const lowStockBelowTenCount = lowStockProducts.length;
  const handleExportSnapshot = () => {
    try {
      setIsExportingSnapshot(true);
      const exportedAt = /* @__PURE__ */ new Date();
      const snapshot = {
        exported_at: exportedAt.toISOString(),
        source: "admin_dashboard",
        kpis,
        kpi_cards: statsCards,
        alerts,
        charts: {
          revenue_7d: revenue7,
          revenue_30d: revenue30,
          orders_7d: orders7
        },
        orders_per_store: storeOrders,
        low_stock_products: lowStockProducts
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const fileStamp = exportedAt.toISOString().replace(/[:.]/g, "-");
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `dashboard-snapshot-${fileStamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success("Snapshot exported", {
        description: "Dashboard snapshot has been downloaded successfully."
      });
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Could not export dashboard snapshot."
      });
    } finally {
      setIsExportingSnapshot(false);
    }
  };
  return <div className="space-y-8">
      <PageHeader
    title={`Olá, ${adminName}!`}
    description="O seu centro de comando em tempo real para receitas, pedidos e visualização de encomendas."
    actions={<>
            {/* <Button variant="outline" onClick={handleExportSnapshot} disabled={isExportingSnapshot}>
              {isExportingSnapshot ? "Exporting..." : "Export Snapshot"}
            </Button> */}
          </>}
  />
      {dashboardError ? <Alert className="bg-background/70">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro de dados do painel</AlertTitle>
          <AlertDescription>{dashboardError}</AlertDescription>
        </Alert> : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardDescription>Total de Receitas</CardDescription>
              <CardTitle className="font-display text-3xl">{formatCurrency(kpis.total_revenue)}</CardTitle>
            </div>
            <Badge
    variant="secondary"
    className={kpis.revenue_vs_last_month_pct >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}
  >
              {`${formatPercent(kpis.revenue_vs_last_month_pct)} vs mês anterior`}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg  border border-[#6C939B] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">HOJE</p>
              <p className="text-lg font-semibold">{formatCurrency(kpis.today_revenue)}</p>
            </div>
            <div className="rounded-lg border border-[#6C939B] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">MÊS</p>
              <p className="text-lg font-semibold">{formatCurrency(kpis.month_revenue)}</p>
            </div>
            <div className="rounded-lg border border-[#6C939B] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">ANO</p>
              <p className="text-lg font-semibold">{formatCurrency(kpis.year_revenue)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {statsCards.map((stat, index) => <Card
    key={stat.label}
    className=" bg-card/90 transition-all animate-fade-in"
    style={{ animationDelay: `${index * 80}ms` }}
  >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <span className={stat.trend === "up" ? "text-emerald-600" : "text-rose-600"}>
                  {stat.trend === "up" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </span>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-[32px] font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-secondary/60 border-transparent shadow-none">
          <Tabs defaultValue="7d" className="space-y-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display text-[26px]">Tendência de Receitas</CardTitle>
                <CardDescription>Últimos 7 dias / 30 dias perfomance</CardDescription>
              </div>
              <TabsList className="h-10 rounded-md bg-[#6c939b] p-1">
                <TabsTrigger value="7d" className="rounded-sm px-4 py-2">
                  7 dias
                </TabsTrigger>
                <TabsTrigger value="30d" className="rounded-sm px-4 py-2">
                  30 dias
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="7d">
                <ChartContainer config={revenueConfig} className="h-[200px] w-full">
                  <AreaChart
    data={revenue7.length > 0 ? revenue7 : [
      { day: "SEG", revenue: 0 },
      { day: "TER", revenue: 0 },
      { day: "QUA", revenue: 0 },
      { day: "QUI", revenue: 0 },
      { day: "SEX", revenue: 0 },
      { day: "SAB", revenue: 0 },
      { day: "DOM", revenue: 0 }
    ]}
    margin={{ left: 16, right: 16, bottom: 28, top: 12 }}
  >
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <ReferenceLine y={0} stroke="#6c939b" strokeWidth={1} />
                    <XAxis
      dataKey="day"
      axisLine={{ stroke: "#6c939b", strokeWidth: 1 }}
      tickLine={false}
      interval={0}
      padding={{ left: 4, right: 4 }}
      tickMargin={8}
      tick={{ fill: "#6c939b", fontSize: 12 }}
    />
                    <YAxis hide domain={[0, (dataMax) => Math.max(dataMax, 1)]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
    type="monotone"
    dataKey="revenue"
    stroke="var(--color-revenue)"
    strokeWidth={2}
    fill="url(#revFill)"
  />
                  </AreaChart>
                </ChartContainer>
              </TabsContent>
              <TabsContent value="30d">
                <ChartContainer config={revenueConfig} className="h-[200px] w-full">
                  <AreaChart
    data={revenue30.length > 0 ? revenue30 : [{ day: "D1", revenue: 0 }]}
    margin={{ left: 16, right: 16, bottom: 28, top: 12 }}
  >
                    <defs>
                      <linearGradient id="revFill30" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <ReferenceLine y={0} stroke="#6c939b" strokeWidth={1} />
                    <XAxis
      dataKey="day"
      axisLine={{ stroke: "#6c939b", strokeWidth: 1 }}
      tickLine={false}
      interval={Math.max(Math.floor(revenue30.length / 10), 1)}
      padding={{ left: 4, right: 4 }}
      tickMargin={8}
      tick={{ fill: "#6c939b", fontSize: 12 }}
    />
                    <YAxis hide domain={[0, (dataMax) => Math.max(dataMax, 1)]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
    type="monotone"
    dataKey="revenue"
    stroke="var(--color-revenue)"
    strokeWidth={2}
    fill="url(#revFill30)"
  />
                  </AreaChart>
                </ChartContainer>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle className="font-display text-xl">Fluxo de Pedidos</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ordersConfig} className="h-[240px] w-full">
              <BarChart data={orders7.length > 0 ? orders7 : [{ day: "SEG", orders: 0 }, { day: "TER", orders: 0 }, { day: "QUA", orders: 0 }, { day: "QUI", orders: 0 }, { day: "SEX", orders: 0 }, { day: "SAB", orders: 0 }, { day: "DOM", orders: 0 }]} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="orders" fill="var(--color-orders)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle className="font-display text-xl">Encomendas por Loja</CardTitle>
            <CardDescription>Distribuição em tempo real conforme o roteamento de encomendas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardLoading ? <p className="text-sm text-muted-foreground">A carregar distribuição por loja...</p> : storeOrders.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não existem encomendas roteadas.</p> : storeOrders.map((store) => <div key={store.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{store.name}</span>
                  <span className="text-muted-foreground">{store.orders} encomendas</span>
                </div>
                <Progress value={store.share} className="h-2" />
              </div>)}
          </CardContent>
        </Card>

        <Card className="border-transparent bg-secondary/60 shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Produtos com baixo stock</CardTitle>
            <CardDescription>Priorize a reposição</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardLoading ? <p className="text-sm text-muted-foreground">A carregar produtos com stock baixo...</p> : lowStockProducts.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum produto abaixo das 10 unidades.</p> : <div className="grid gap-4 sm:grid-cols-2">
                  {visibleLowStockProducts.map((item) => <div
        key={`${item.sku}-${item.store_name}-${item.name}`}
        className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-border/50"
      >
                      {item.image || item.image_url || item.thumbnail || item.photo ? <img
        src={item.image || item.image_url || item.thumbnail || item.photo}
        alt={item.name || "Produto"}
        className="h-14 w-14 rounded-md object-cover"
      /> : <div className="h-14 w-14 rounded-md bg-muted" />}
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{item.name || "Nome do Produto"}</p>
                        <p className="text-xs text-muted-foreground">SKU {item.sku}</p>
                        <p className="text-xs text-muted-foreground">Loja: {item.store_name}</p>
                      </div>
                    </div>)}
                </div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-secondary/60 border-transparent shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-xl">Alertas do Sistema</CardTitle>
            <CardDescription>Últimos 7 dias / 30 dias performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => <div
    key={alert.title}
    className="flex items-start gap-3 rounded-lg bg-primary text-primary-foreground px-4 py-3 shadow-sm"
  >
                <AlertTriangle className="mt-0.5 h-4 w-4 text-primary-foreground" />
                <div>
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="text-xs text-primary-foreground/90">{alert.description}</p>
                </div>
              </div>)}
          </CardContent>
        </Card>

        <Card className="bg-secondary/60 border-transparent shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-xl">Foco Operacional</CardTitle>
            <CardDescription>Ações rápidas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-sm">
              <div>
                <p className="text-sm font-semibold">Revisão de Encomendas</p>
                <p className="text-xs text-primary-foreground/90">{kpis.pending_orders} encomendas a aguardar pagamento</p>
              </div>
              <Button
    size="sm"
    className="h-9 min-w-[104px] rounded-full border border-white/60 bg-black px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    onClick={() => navigate("/admin/orders/packaging")}
  >
                Rever
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-sm">
              <div>
                <p className="text-sm font-semibold">Pronto para envio</p>
                <p className="text-xs text-primary-foreground/90">{kpis.ready_to_ship_orders} encomendas para levantamento</p>
              </div>
              <Button
    size="sm"
    className="h-9 min-w-[104px] rounded-full border border-white/60 bg-black px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    onClick={() => navigate("/admin/shipping")}
  >
                Rever
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-sm">
              <div>
                <p className="text-sm font-semibold">Pagamentos falhados</p>
                <p className="text-xs text-primary-foreground/90">{kpis.failed_payments} clientes precisam de acompanhamento</p>
              </div>
              <Button
    size="sm"
    className="h-9 min-w-[104px] rounded-full border border-white/60 bg-black px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    onClick={() => navigate("/admin/payments")}
  >
                Rever
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
var stdin_default = Dashboard;
export {
  stdin_default as default
};
