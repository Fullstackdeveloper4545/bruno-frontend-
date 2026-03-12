import { useEffect, useState } from "react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { adminApi } from "@/lib/adminApi";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const Invoices = () => {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const load = async () => setRows(await adminApi.listInvoices());
  useEffect(() => {
    void load();
  }, []);
  return <div className='space-y-6'>
      <PageHeader title='Faturas' description='Faça download, reenvie ou sincronize faturas.' />
      {message ? <p className='text-sm'>{message}</p> : null}

      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader className='flex flex-row items-center justify-between gap-4'>
          <CardTitle className='text-3xl font-normal'>Lista de Faturas</CardTitle>
          <Button
            className='!h-10 !rounded-md !bg-black !px-6 !text-white hover:!bg-black/90'
            onClick={() => void adminApi.syncInvoices().then(() => load()).then(() => setMessage("Faturas não sincronizadas enviadas para a API"))}
          >
            Conectar Faturas Pendentes
          </Button>
        </CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Fatura</TableHead><TableHead>Encomenda</TableHead><TableHead>Sincronizada</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{row.invoice_number}</TableCell><TableCell>{row.order_number}</TableCell><TableCell>{row.synced ? "Sim" : "Não"}</TableCell><TableCell><div className='flex gap-2'>
                    <a className='inline-flex h-9 items-center rounded-md border border-slate-400/60 bg-white px-4 text-sm' href={`${API_BASE_URL}/api/invoices/${row.id}/pdf`} target='_blank' rel='noreferrer'>Ver PDF</a>
                  </div></TableCell></TableRow>)}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = Invoices;
export {
  stdin_default as default
};
