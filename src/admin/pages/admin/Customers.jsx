import { PageHeader } from "@/admin/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const customers = [
  { name: "Maria Silva", email: "maria@cliente.pt", orders: 12, status: "Active" },
  { name: "Diego Ruiz", email: "diego@cliente.es", orders: 7, status: "Active" },
  { name: "Ana Santos", email: "ana@cliente.pt", orders: 3, status: "Inactive" }
];
const Customers = () => {
  return <div className="space-y-8">
      <PageHeader
    title="Gestão de clientes"
    description="Rever atividade dos clientes, encomendas e controlo de contas."
  />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-[28px] border-border/60 bg-zinc-100">
          <CardHeader>
            <CardTitle className="font-display text-xl">Lista de clientes</CardTitle>
            <CardDescription>Contas de cliente, ativas e desativadas</CardDescription>
          </CardHeader>
          <CardContent>
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
                {customers.map((customer) => <TableRow key={customer.email}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.orders}</TableCell>
                    <TableCell>
                      <StatusBadge status={customer.status} />
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/60 bg-zinc-100">
          <CardHeader>
            <CardTitle className="font-display text-2xl font-normal">Perfil do Cliente</CardTitle>
            <CardDescription>Selecione o cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-[#6a8f97] p-6 text-white">
              <p className="text-base font-medium">Maria Silva</p>
              <p className="text-xs opacity-90">email</p>
              <p className="mt-2 text-xs opacity-90">Última atividade: hoje</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Encomendas: 12</p>
              <p className="font-medium">Total gasto: 1 420€</p>
              <p className="font-medium">Última encomenda: ORD-1024</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="sm" className="!h-12 !w-48 !rounded-xl !bg-black !text-white hover:!bg-black/90">
                Redefinir Password
              </Button>
              <Button size="sm" className="!h-12 !w-48 !rounded-xl !bg-destructive !text-destructive-foreground hover:!bg-destructive/90">
                Desativar Conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
var stdin_default = Customers;
export {
  stdin_default as default
};
