import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
const statusActions = [
  { value: "processing", label: "em preparação" },
  { value: "shipped", label: "enviada" },
  { value: "completed", label: "entregue" },
  { value: "cancelled", label: "cancelada" }
];
const statusLabelMap = {
  pending: "pendente",
  awaiting_payment: "aguarda pagamento",
  payment_failed: "pagamento falhou",
  paid: "pago",
  processing: "em preparação",
  shipped: "enviada",
  completed: "entregue",
  delivered: "entregue",
  cancelled: "cancelada"
};
const toStatusLabel = (status) => statusLabelMap[status] || status;
const viewConfig = {
  total: {
    title: "Encomendas",
    description: "Todas as encomendas.",
    tabLabel: "Total encomendas",
    filter: () => true
  },
  packaging: {
    title: "Encomendas",
    description: "Encomendas atualmente em preparação/embalamento.",
    tabLabel: "Embalagem",
    filter: (order) => ["pending", "awaiting_payment", "paid", "processing"].includes(order.status)
  },
  shipped: {
    title: "Encomendas",
    description: "Encomendas já enviadas.",
    tabLabel: "Enviadas",
    filter: (order) => order.status === "shipped"
  },
  delivered: {
    title: "Encomendas",
    description: "Encomendas marcadas como entregues/concluídas.",
    tabLabel: "Entregues",
    filter: (order) => ["delivered", "completed"].includes(order.status)
  },
  cancelled: {
    title: "Encomendas",
    description: "Encomendas canceladas pelo utilizador/admin.",
    tabLabel: "Canceladas",
    filter: (order) => order.status === "cancelled"
  }
};
const tabs = [
  { mode: "total", to: "/admin/orders/total" },
  { mode: "packaging", to: "/admin/orders/packaging" },
  { mode: "shipped", to: "/admin/orders/shipped" },
  { mode: "delivered", to: "/admin/orders/delivered" },
  { mode: "cancelled", to: "/admin/orders/cancelled" }
];
function OrdersView({ mode }) {
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const config = viewConfig[mode];
  const searchQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("q")?.trim().toLowerCase() || "";
  }, [location.search]);
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const orders = await adminApi.listOrders();
      setRows(Array.isArray(orders) ? orders : []);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Falha ao carregar encomendas");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const filteredRows = useMemo(() => {
    return rows.filter((order) => {
      if (!config.filter(order)) return false;
      if (!searchQuery) return true;
      const searchable = [
        order.order_number,
        order.customer_name,
        order.store_name || "",
        order.status,
        toStatusLabel(order.status),
        String(order.total)
      ].join(" ").toLowerCase();
      return searchable.includes(searchQuery);
    });
  }, [rows, config, searchQuery]);
  return <div className="space-y-6">
      <PageHeader title={config.title} description={config.description} />
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Seções de pedidos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
    const isActive = mode === tab.mode;
    return <Button
              key={tab.mode}
              asChild
              size="sm"
              className={cn(
                "!h-10 !rounded-md !px-6",
                isActive ? "!bg-black !text-white hover:!bg-black/90" : "!bg-zinc-400 !text-white hover:!bg-zinc-500"
              )}
            >
              <NavLink to={location.search ? { pathname: tab.to, search: location.search } : tab.to}>
                {viewConfig[tab.mode].tabLabel}
              </NavLink>
            </Button>;
  })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {config.tabLabel} ({filteredRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Encomenda</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    A carregar encomendas...
                  </TableCell>
                </TableRow> : filteredRows.length === 0 ? <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    {searchQuery ? "Nenhuma encomenda corresponde à pesquisa." : "Sem encomendas nesta secção."}
                  </TableCell>
                </TableRow> : filteredRows.map((row) => <TableRow key={row.id}>
                    <TableCell>{row.order_number}</TableCell>
                    <TableCell>{row.customer_name}</TableCell>
                    <TableCell>{row.store_name || "-"}</TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} label={toStatusLabel(row.status)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {statusActions.map((status) => <Button
    key={status.value}
    variant="outline"
    size="sm"
    className={cn(row.status === status.value && "border-primary text-primary")}
    onClick={() => void adminApi.updateOrderStatus(row.id, status.value).then(() => load()).then(
      () => setMessage(
        status.value === "completed" ? "Encomenda concluída: fatura gerada e enviada." : "Estado da encomenda atualizado."
      )
    ).catch(
      (e) => setError(e instanceof Error ? e.message : "Falha ao atualizar o estado da encomenda")
    )}
  >
                            {status.label}
                          </Button>)}
                      </div>
                    </TableCell>
                  </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
}
export {
  OrdersView
};
