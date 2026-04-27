import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { adminApi } from "@/lib/adminApi";
import { cn } from "@/lib/utils";

const normalizeText = (value) => String(value || "").trim();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
};

const formatRelativeDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDate = new Date(parsed);
  startOfDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return parsed.toLocaleDateString("pt-PT");
};

const safeMessage = (error, fallback) =>
  error instanceof Error ? error.message : fallback || "Ocorreu um erro.";

const buildCustomersFromOrders = (orders, inactiveEmails) => {
  const grouped = new Map();
  const inactive = new Set(Array.isArray(inactiveEmails) ? inactiveEmails : []);

  for (const order of Array.isArray(orders) ? orders : []) {
    const email = normalizeEmail(order.customer_email);
    if (!email) continue;

    const name = normalizeText(order.customer_name) || email;
    const total = Number(order.total || 0);
    const createdAt = order.created_at || null;
    const orderNumber = normalizeText(order.order_number) || `#${order.id}`;

    const existing = grouped.get(email);
    if (!existing) {
      grouped.set(email, {
        id: email,
        name,
        email,
        orderCount: 1,
        totalSpent: Number.isFinite(total) ? total : 0,
        lastActivityAt: createdAt,
        lastOrderNumber: orderNumber,
        status: inactive.has(email) ? "Inactive" : "Active"
      });
      continue;
    }

    existing.orderCount += 1;
    existing.totalSpent += Number.isFinite(total) ? total : 0;

    const existingDate = existing.lastActivityAt ? new Date(existing.lastActivityAt).getTime() : 0;
    const currentDate = createdAt ? new Date(createdAt).getTime() : 0;
    if (currentDate >= existingDate) {
      existing.lastActivityAt = createdAt;
      existing.lastOrderNumber = orderNumber;
      existing.name = name || existing.name;
    }

    if (inactive.has(email)) existing.status = "Inactive";
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const dateA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const dateB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return dateB - dateA || b.orderCount - a.orderCount;
  });
};

const Customers = () => {
  const [orders, setOrders] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [inactiveEmails, setInactiveEmails] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const rows = await adminApi.listOrders();
        if (!active) return;
        setOrders(Array.isArray(rows) ? rows : []);
      } catch (loadError) {
        if (!active) return;
        setOrders([]);
        setError(safeMessage(loadError, "Falha ao carregar clientes."));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const customers = useMemo(
    () => buildCustomersFromOrders(orders, inactiveEmails),
    [inactiveEmails, orders]
  );

  useEffect(() => {
    if (!customers.length) return;
    if (selectedCustomerId) return;
    setSelectedCustomerId(customers[0].id);
  }, [customers, selectedCustomerId]);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || null;
  const canAct = Boolean(selectedCustomer?.email) && !sendingReset && !deactivating;
  const canDeactivate = Boolean(selectedCustomer?.email) && selectedCustomer?.status !== "Inactive" && !sendingReset && !deactivating;

  const handlePasswordReset = async () => {
    if (!selectedCustomer?.email) return;
    try {
      setSendingReset(true);
      await adminApi.requestCustomerPasswordResetOtp(selectedCustomer.email);
      toast("OTP enviado", { description: `Enviámos um código de redefinição para ${selectedCustomer.email}.` });
    } catch (requestError) {
      toast("Falha ao redefinir password", { description: safeMessage(requestError), variant: "error" });
    } finally {
      setSendingReset(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedCustomer?.email || selectedCustomer.status === "Inactive") return;
    try {
      setDeactivating(true);
      await adminApi.deactivateCustomerAccount(selectedCustomer.email);
      setInactiveEmails((prev) => (prev.includes(selectedCustomer.email) ? prev : [...prev, selectedCustomer.email]));
      toast("Conta desativada", { description: `${selectedCustomer.email} foi desativada com sucesso.` });
    } catch (requestError) {
      toast("Falha ao desativar conta", { description: safeMessage(requestError), variant: "error" });
    } finally {
      setDeactivating(false);
    }
  };

  return <div className="space-y-8">
      <PageHeader title="Gestão de clientes" description="Rever atividade dos clientes, encomendas e controlo de contas." />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-[28px] border-border/60 bg-zinc-100">
          <CardHeader>
            <CardTitle className="font-display text-xl">Lista de clientes</CardTitle>
            <CardDescription>Contas de cliente, ativas e desativadas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">A carregar clientes...</p> : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : customers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não existem clientes reais para mostrar nesta página.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Encomendas</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => <TableRow
    key={customer.email}
    className={cn(
      "cursor-pointer transition-colors",
      customer.id === selectedCustomerId ? "bg-white/70" : "hover:bg-white/40"
    )}
    onClick={() => setSelectedCustomerId(customer.id)}
  >
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.orderCount}</TableCell>
                      <TableCell>
                        <StatusBadge status={customer.status} />
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/60 bg-zinc-100">
          <CardHeader>
            <CardTitle className="font-display text-2xl font-normal">Perfil do Cliente</CardTitle>
            <CardDescription>Selecione o cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomer ? (
              <>
                <div className="rounded-xl bg-[#6a8f97] p-6 text-white">
                  <p className="text-base font-medium">{selectedCustomer.name}</p>
                  <p className="text-xs opacity-90">{selectedCustomer.email}</p>
                  <p className="mt-2 text-xs opacity-90">Última atividade: {formatRelativeDate(selectedCustomer.lastActivityAt)}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Encomendas: {selectedCustomer.orderCount}</p>
                  <p className="font-medium">Total gasto: {formatCurrency(selectedCustomer.totalSpent)}</p>
                  <p className="font-medium">Última encomenda: {selectedCustomer.lastOrderNumber || "-"}</p>
                </div>

                <div className="flex flex-wrap gap-4 sm:flex-nowrap">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        disabled={!canAct}
                        className="!h-12 !min-w-[190px] !flex-1 !rounded-2xl !bg-black !text-white disabled:opacity-100"
                      >
                        {sendingReset ? "A enviar..." : "Redefinir Password"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Redefinir password?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Vamos enviar um OTP de redefinição para {selectedCustomer.email}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handlePasswordReset()}>
                          Enviar OTP
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        disabled={!canDeactivate}
                        className="!h-12 !min-w-[190px] !flex-1 !rounded-2xl !bg-[#e4312f] !text-white hover:!bg-[#e4312f] disabled:opacity-100"
                      >
                        {deactivating ? "A desativar..." : "Desativar Conta"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Desativar conta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação vai impedir o cliente de iniciar sessão. Conta: {selectedCustomer.email}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => void handleDeactivate()}
                        >
                          Desativar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione um cliente na lista para ver detalhes.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>;
};
var stdin_default = Customers;
export {
  stdin_default as default
};

