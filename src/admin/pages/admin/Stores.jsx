import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const emptyForm = {
  name: "",
  region_district: "",
  priority_level: "1",
  address: "",
  regions: "",
  is_active: true
};
const parseRegions = (raw) => {
  const unique = /* @__PURE__ */ new Set();
  raw.split(",").map((item) => item.trim().toLowerCase()).filter((item) => Boolean(item)).forEach((item) => unique.add(item));
  return Array.from(unique);
};
const toForm = (store) => ({
  name: store.name || "",
  region_district: store.region_district || "",
  priority_level: String(store.priority_level ?? 1),
  address: store.address || "",
  regions: Array.isArray(store.regions) ? store.regions.join(", ") : "",
  is_active: store.is_active !== false
});
const Stores = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [routingMode, setRoutingMode] = useState("region");
  const [savingRoutingMode, setSavingRoutingMode] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStore, setSavingStore] = useState(false);
  const [activeStoreActionId, setActiveStoreActionId] = useState(null);
  const activeStoreCount = useMemo(
    () => rows.filter((store) => store.is_active !== false).length,
    [rows]
  );
  const canDeleteStores = rows.length > 1;
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [storesResult, routingResult] = await Promise.all([
        adminApi.listStores(),
        adminApi.getRoutingMode()
      ]);
      const safeRows = Array.isArray(storesResult) ? storesResult : [];
      setRows(safeRows);
      const mode = routingResult?.mode === "quantity" ? "quantity" : "region";
      setRoutingMode(mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar lojas");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };
  const handleSaveStore = async () => {
    const name = form.name.trim();
    const regionDistrict = form.region_district.trim();
    const address = form.address.trim();
    const priorityLevel = Number(form.priority_level);
    const regions = parseRegions(form.regions);
    if (!name) {
      setError("O nome da loja é obrigatório.");
      setSuccess("");
      return;
    }
    if (!regionDistrict) {
      setError("A região/distrito é obrigatória.");
      setSuccess("");
      return;
    }
    if (!Number.isInteger(priorityLevel) || priorityLevel < 1) {
      setError("A prioridade deve ser um número inteiro maior que 0.");
      setSuccess("");
      return;
    }
    if (!address) {
      setError("A morada é obrigatória.");
      setSuccess("");
      return;
    }
    const payload = {
      name,
      region_district: regionDistrict,
      priority_level: priorityLevel,
      address,
      regions,
      is_active: form.is_active
    };
    try {
      setSavingStore(true);
      setError("");
      setSuccess("");
      if (editingId != null) {
        await adminApi.updateStore(editingId, payload);
        setSuccess("Loja atualizada.");
      } else {
        await adminApi.createStore(payload);
        setSuccess("Loja criada.");
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao guardar a loja");
      setSuccess("");
    } finally {
      setSavingStore(false);
    }
  };
  const handleDeleteStore = async (storeId) => {
    try {
      setError("");
      setSuccess("");
      await adminApi.deleteStore(storeId);
      setSuccess("Loja eliminada.");
      if (editingId === storeId) {
        resetForm();
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao eliminar a loja");
      setSuccess("");
    }
  };
  const handleToggleStoreStatus = async (store) => {
    if (store.is_active !== false && activeStoreCount <= 1) {
      setError("É necessário pelo menos uma loja ativa.");
      setSuccess("");
      return;
    }
    try {
      setActiveStoreActionId(store.id);
      setError("");
      setSuccess("");
      await adminApi.updateStore(store.id, { is_active: store.is_active === false });
      setSuccess(`Loja ${store.is_active === false ? "ativada" : "desativada"}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar o estado da loja");
      setSuccess("");
    } finally {
      setActiveStoreActionId(null);
    }
  };
  const handleSaveRoutingMode = async () => {
    try {
      setSavingRoutingMode(true);
      setError("");
      setSuccess("");
      await adminApi.setRoutingMode(routingMode);
      setSuccess(`Modo de roteamento atualizado para ${routingMode === "quantity" ? "quantidade" : "região"}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar o modo de roteamento");
      setSuccess("");
    } finally {
      setSavingRoutingMode(false);
    }
  };
  return <div className="space-y-6">
      <PageHeader
    title="Gestão de lojas"
    description="Gerir lojas, prioridade, moradas e regiões mapeadas."
  />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-success">{success}</p> : null}

      <Card className="rounded-2xl bg-zinc-100">
        <CardHeader>
          <CardTitle>Modo de roteamento de encomendas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Escolha como as novas encomendas são atribuídas: por mapeamento de região do cliente ou por maior quantidade de stock disponível.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
    type="button"
    className={routingMode === "region" ? "!h-10 !rounded-md !bg-black !px-4 !text-white hover:!bg-black/90" : "!h-10 !rounded-md !bg-white !px-4 !text-black border border-slate-400/60 hover:!bg-zinc-100"}
    onClick={() => setRoutingMode("region")}
  >
              Prioridade de Região
            </Button>
            <Button
    type="button"
    className={routingMode === "quantity" ? "!h-10 !rounded-md !bg-black !px-4 !text-white hover:!bg-black/90" : "!h-10 !rounded-md !bg-white !px-4 !text-black border border-slate-400/60 hover:!bg-zinc-100"}
    onClick={() => setRoutingMode("quantity")}
  >
              Prioridade de Quantidade
            </Button>
            <Button
    type="button"
    className="!h-10 !rounded-md !bg-white !px-6 !text-[#6a8f97] border border-[#6a8f97] hover:!bg-[#6a8f97]/10"
    disabled={savingRoutingMode}
    onClick={() => void handleSaveRoutingMode()}
  >
              {savingRoutingMode ? "A guardar..." : "Guardar Modo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-zinc-100">
        <CardHeader>
          <CardTitle>Lojas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Distrito</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Morada</TableHead>
                <TableHead>Regiões</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    A carregar lojas...
                  </TableCell>
                </TableRow> : rows.length === 0 ? <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    Ainda não existem lojas configuradas.
                  </TableCell>
                </TableRow> : rows.map((row) => {
    const isActive = row.is_active !== false;
    const isBusy = activeStoreActionId === row.id;
    const isLastActive = isActive && activeStoreCount <= 1;
    return <TableRow key={String(row.id)}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{isActive ? "Ativa" : "Inativa"}</TableCell>
                      <TableCell>{row.region_district || "-"}</TableCell>
                      <TableCell>{row.priority_level ?? "-"}</TableCell>
                      <TableCell>{row.address || "-"}</TableCell>
                      <TableCell>{(row.regions || []).join(", ") || "-"}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button
      size="sm"
      className="!h-9 !rounded-md !bg-[#6a8f97] !px-5 !text-white hover:!bg-[#5e838b]"
      onClick={() => {
        setEditingId(row.id);
        setForm(toForm(row));
        setSuccess("");
        setError("");
      }}
    >
                          Editar
                        </Button>
                        <Button
      size="sm"
      className="!h-9 !rounded-md !bg-zinc-500 !px-5 !text-white hover:!bg-zinc-600"
      disabled={isBusy || isLastActive}
      onClick={() => void handleToggleStoreStatus(row)}
    >
                          {isBusy ? "A guardar..." : isActive ? "Desativar" : "Ativar"}
                        </Button>
                        <ConfirmDeleteButton
      triggerLabel="Apagar"
      confirmLabel="Apagar"
      entityName={`loja "${row.name}"`}
      onConfirm={() => handleDeleteStore(row.id)}
      disabled={!canDeleteStores}
    />
                      </TableCell>
                    </TableRow>;
  })}
            </TableBody>
          </Table>
          {!canDeleteStores ? <p className="mt-3 text-xs text-muted-foreground">
              Pelo menos uma loja deve permanecer configurada.
            </p> : null}
        </CardContent>
      </Card>

      <Card className="rounded-[28px] bg-zinc-100">
        <CardHeader>
          <CardTitle className="text-3xl font-normal">{editingId != null ? "Editar Loja" : "Criar Loja"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <Input
    className="h-12 rounded-xl border-slate-400/60 focus:ring-0 focus:border-slate-500"
    placeholder="Nome da Loja"
    value={form.name}
    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
  />
          <Input
    className="h-12 rounded-xl border-slate-400/60 focus:ring-0 focus:border-slate-500"
    placeholder="Região/Distrito"
    value={form.region_district}
    onChange={(e) => setForm((prev) => ({ ...prev, region_district: e.target.value }))}
  />
          <Input
    className="h-12 rounded-xl border-slate-400/60 focus:ring-0 focus:border-slate-500"
    placeholder="1"
    type="number"
    min={1}
    value={form.priority_level}
    onChange={(e) => setForm((prev) => ({ ...prev, priority_level: e.target.value }))}
  />
          <Input
    className="h-12 rounded-xl border-slate-400/60 focus:ring-0 focus:border-slate-500"
    placeholder="Morada"
    value={form.address}
    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
  />
          <Input
    className="h-12 rounded-xl border-slate-400/60 focus:ring-0 focus:border-slate-500"
    placeholder="Regiões mapeadas (separar com vírgulas)"
    value={form.regions}
    onChange={(e) => setForm((prev) => ({ ...prev, regions: e.target.value }))}
  />
          <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-400/60 bg-white px-4 text-sm">
            <input
    type="checkbox"
    checked={form.is_active}
    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
  />
            Ativar
          </label>
          <div className="flex gap-2 md:col-span-3">
            <Button className="!h-14 !w-56 !rounded-xl !bg-black !text-white hover:!bg-black/90" disabled={savingStore} onClick={() => void handleSaveStore()}>
              {savingStore ? "A guardar..." : editingId != null ? "Guardar alterações" : "Criar Loja"}
            </Button>
            {editingId != null ? <Button variant="secondary" onClick={resetForm}>
                Cancelar
              </Button> : null}
          </div>
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = Stores;
export {
  stdin_default as default
};
