import { useEffect, useState } from "react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const Attributes = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name_pt: "", name_es: "" });
  const load = async () => setRows(await adminApi.listAttributes());
  useEffect(() => {
    void load();
  }, []);
  return <div className='space-y-6'>
      <PageHeader title='Gestão de atributos' description='Criar/editar atributos (tamanho, cor, etc.).' />
      <Card>
        <CardHeader><CardTitle>Atributos</CardTitle></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>PT</TableHead><TableHead>ES</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{row.id}</TableCell><TableCell>{row.name_pt}</TableCell><TableCell>{row.name_es}</TableCell><TableCell><ConfirmDeleteButton entityName={`atributo "${row.name_pt || row.name_es || row.id}"`} onConfirm={() => adminApi.deleteAttribute(row.id).then(load)} /></TableCell></TableRow>)}</TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Criar atributo</CardTitle></CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-3'>
          <Input placeholder='Nome PT' value={form.name_pt} onChange={(e) => setForm((p) => ({ ...p, name_pt: e.target.value }))} />
          <Input placeholder='Nome ES' value={form.name_es} onChange={(e) => setForm((p) => ({ ...p, name_es: e.target.value }))} />
          <Button onClick={() => void adminApi.createAttribute(form).then(() => {
    setForm({ name_pt: "", name_es: "" });
    return load();
  })}>Guardar</Button>
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = Attributes;
export {
  stdin_default as default
};
