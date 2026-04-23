import { useEffect, useState } from "react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "@/lib/adminApi";
const Shipping = () => {
  const [shipments, setShipments] = useState([]);
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("in_transit");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    const rows = await adminApi.listShipments();
    setShipments(rows);
  };
  useEffect(() => {
    void load();
  }, []);
  return <div className='space-y-8'>
      <PageHeader
    title='Gestão de Envios'
    description='Faça a gestão de integrações, criação de etiquetas, tracking e atualize os seus envios.'
  />

      {message ? <p className='text-sm'>{message}</p> : null}

      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader>
          <CardTitle className='text-2xl font-normal'>Criar etiqueta</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-6 md:grid-cols-2'>
          <Input className='h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0' placeholder='ID da encomenda' value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          <select
    className='h-12 rounded-xl border border-slate-400/60 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-500'
    value={status}
    onChange={(e) => setStatus(e.target.value)}
  >
            <option value='label_created'>Etiqueta criada</option>
            <option value='shipped'>Enviado</option>
            <option value='in_transit'>Em trânsito</option>
            <option value='out_for_delivery'>Para entrega</option>
            <option value='delivered'>Entregue</option>
            <option value='cancelled'>Cancelado</option>
          </select>
          <Input className='h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0' placeholder='Localização (opcional)' value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input className='h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0' placeholder='Descrição (opcional)' value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className='flex flex-wrap gap-2 md:col-span-2'>
          <Button
    className='!h-10 !rounded-md !bg-black !px-6 !text-white hover:!bg-black/90'
    onClick={() => void adminApi.generateShippingLabel(Number(orderId)).then(() => load()).then(() => setMessage("Etiqueta gerada")).catch((e) => setMessage(e instanceof Error ? e.message : "Falha ao gerar etiqueta"))}
  >
            Criar Etiqueta
          </Button>
          <Button
    className='!h-10 !rounded-md !bg-zinc-400 !px-6 !text-white hover:!bg-zinc-500'
    onClick={() => void adminApi.getOrderTracking(Number(orderId)).then((result) => setMessage(`Tracking: ${result.tracking_code || "N/A"}`)).catch((e) => setMessage(e instanceof Error ? e.message : "Falha ao consultar tracking"))}
  >
            Localizar Encomenda
          </Button>
          <Button
    className='!h-10 !rounded-md !bg-zinc-400 !px-6 !text-white hover:!bg-zinc-500'
    onClick={() => void adminApi.updateOrderTrackingStatus(Number(orderId), {
      status,
      location: location.trim() || void 0,
      description: description.trim() || void 0
    }).then(
      (result) => setMessage(`Tracking atualizado: ${result.status || status}`)
    ).then(() => load()).catch((e) => setMessage(e instanceof Error ? e.message : "Falha ao atualizar tracking"))}
  >
            Atualizar Estado
          </Button>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader>
          <CardTitle>Registos de envios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Envio</TableHead>
                <TableHead>Encomenda</TableHead>
                {/* <TableHead>Transportador</TableHead> */}
                <TableHead>Fornecedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Etiqueta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => <TableRow key={shipment.id}>
                  <TableCell>{shipment.id}</TableCell>
                  <TableCell>{shipment.order_number}</TableCell>
                  <TableCell>{shipment.provider}</TableCell>
                  <TableCell>{shipment.status}</TableCell>
                  <TableCell>{shipment.tracking_code || "-"}</TableCell>
                  <TableCell>
                    {shipment.label_url ? <a href={shipment.label_url} target='_blank' rel='noreferrer' className='text-primary underline'>
                        Abrir
                      </a> : "-"}
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = Shipping;
export {
  stdin_default as default
};
