import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "@/lib/adminApi";
const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      setError("");
      const [paymentRows, webhookRows] = await Promise.all([
        adminApi.listPayments(),
        adminApi.listPaymentWebhookLogs()
      ]);
      setPayments(paymentRows);
      setWebhooks(webhookRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payment data");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return <div className='space-y-8'>
      <PageHeader
    title='Gestão de pagamentos'
    description='Gestão de pagamentos e Klarna'
    actions={<Button variant='outline' onClick={() => void load()}>
            <RefreshCw className='mr-2 h-4 w-4' />
            Atualizar
          </Button>}
  />

      {error ? <p className='text-sm text-destructive'>{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Registos de pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Encomenda</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Montante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => <TableRow key={payment.id}>
                  <TableCell>{payment.id}</TableCell>
                  <TableCell>{payment.order_number}</TableCell>
                  <TableCell>{payment.provider}</TableCell>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell>EUR {Number(payment.amount).toFixed(2)}</TableCell>
                  <TableCell>{payment.status}</TableCell>
                  <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registos de webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Processado</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead>Recebido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((log) => <TableRow key={log.id}>
                  <TableCell>{log.id}</TableCell>
                  <TableCell>{log.provider}</TableCell>
                  <TableCell>{log.event_type}</TableCell>
                  <TableCell>{log.processed ? "Sim" : "Não"}</TableCell>
                  <TableCell>{log.processing_error || "-"}</TableCell>
                  <TableCell>{new Date(log.received_at).toLocaleString()}</TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints de webhook</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2 text-sm text-muted-foreground'>
          <p>`POST /api/payments/webhooks/ifthenpay`</p>
          <p>`POST /api/payments/webhooks/klarna`</p>
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = PaymentManagement;
export {
  stdin_default as default
};
