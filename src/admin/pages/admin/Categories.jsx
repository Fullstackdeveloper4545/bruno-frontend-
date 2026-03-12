import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { adminApi } from "@/lib/adminApi";
import { resolveApiFileUrl, uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const FRONTEND_CATEGORY_PRESETS = [
  { slug: "sapatilhas-corrida", name_pt: "Sapatilhas de Corrida", name_es: "Zapatillas de Running" },
  { slug: "sapatilhas-corrida-trail", name_pt: "Sapatilhas de Corrida de Trail", name_es: "Zapatillas de Trail Running" },
  { slug: "sapatilhas-atletismo", name_pt: "Sapatilhas de Atletismo", name_es: "Zapatillas de Atletismo" },
  { slug: "sapatilhas-carbono", name_pt: "Sapatilhas de Carbono", name_es: "Zapatillas de Carbono" }
];
const Categories = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name_pt: "", name_es: "", slug: "", image_url: "" });
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);
  const [activeCategoryActionId, setActiveCategoryActionId] = useState(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSyncingPresets, setIsSyncingPresets] = useState(false);
  const load = async () => {
    try {
      setRows(await adminApi.listCategories());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar categorias");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name_pt: row.name_pt ?? "",
      name_es: row.name_es ?? "",
      slug: row.slug ?? "",
      image_url: row.image_url ?? ""
    });
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const resetForm = () => {
    setEditingId(null);
    setForm({ name_pt: "", name_es: "", slug: "", image_url: "" });
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(form.image_url || "");
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile, form.image_url]);
  const syncFrontendCategoryPresets = async () => {
    try {
      setIsSyncingPresets(true);
      setError("");
      setStatusMessage("");
      const existingSlugs = new Set(rows.map((row) => String(row.slug || "").trim().toLowerCase()).filter(Boolean));
      const existingNamesPt = new Set(rows.map((row) => String(row.name_pt || "").trim().toLowerCase()).filter(Boolean));
      let createdCount = 0;
      for (const preset of FRONTEND_CATEGORY_PRESETS) {
        if (existingSlugs.has(preset.slug) || existingNamesPt.has(preset.name_pt.toLowerCase())) {
          continue;
        }
        await adminApi.createCategory(preset);
        createdCount += 1;
      }
      await load();
      setStatusMessage(
        createdCount > 0 ? `${createdCount} categorias do site foram adicionadas ao backoffice.` : "As categorias do site já estavam sincronizadas."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao sincronizar categorias do site");
    } finally {
      setIsSyncingPresets(false);
    }
  };
  const handleSubmit = async () => {
    try {
      if (!form.name_pt && !form.name_es) {
        setError("Indique pelo menos um nome PT ou ES.");
        return;
      }
      setError("");
      setStatusMessage("");
      let imageUrl = form.image_url.trim();
      if (imageFile) {
        const uploaded = await uploadFile(imageFile);
        imageUrl = uploaded.url;
      }
      const payload = {
        name_pt: form.name_pt,
        name_es: form.name_es,
        slug: form.slug,
        image_url: imageUrl || null
      };
      if (editingId) {
        await adminApi.updateCategory(editingId, payload);
        resetForm();
        await load();
        return;
      }
      await adminApi.createCategory(payload);
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao guardar a categoria");
    }
  };
  const handleToggleCategoryStatus = async (category) => {
    try {
      setActiveCategoryActionId(category.id);
      setError("");
      setStatusMessage("");
      await adminApi.updateCategory(category.id, { is_active: category.is_active === false });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar o estado da categoria");
    } finally {
      setActiveCategoryActionId(null);
    }
  };
  return <div className='space-y-6'>
      <PageHeader title='Gestão de categorias' description='Criar/editar categorias PT/ES e sincronizar com o site.' />
      {error ? <p className='text-sm text-destructive'>{error}</p> : null}
      {statusMessage ? <p className='text-sm text-emerald-700'>{statusMessage}</p> : null}
      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader><CardTitle>Categorias</CardTitle></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Miniatura</TableHead><TableHead>Slug</TableHead><TableHead>PT</TableHead><TableHead>ES</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((row) => {
    const isActive = row.is_active !== false;
    const isBusy = activeCategoryActionId === row.id;
    return <TableRow key={row.id}><TableCell>{row.id}</TableCell><TableCell>{row.image_url ? <img src={resolveApiFileUrl(row.image_url)} alt={row.name_pt || row.name_es || row.slug || "categoria"} className='h-10 w-10 rounded-md border object-cover' /> : "-"}</TableCell><TableCell>{row.slug ?? "-"}</TableCell><TableCell>{row.name_pt ?? "-"}</TableCell><TableCell>{row.name_es ?? "-"}</TableCell><TableCell className='flex gap-2'>
                      <Button size='sm' onClick={() => startEdit(row)}>Editar</Button>
                      <Button variant='secondary' size='sm' disabled={isBusy} onClick={() => void handleToggleCategoryStatus(row)}>{isBusy ? "A guardar..." : isActive ? "Desativar" : "Ativar"}</Button>
                      <ConfirmDeleteButton triggerLabel="Apagar" confirmLabel="Apagar" entityName={`categoria "${row.name_pt || row.name_es || row.slug || row.id}"`} onConfirm={() => adminApi.deleteCategory(row.id).then(load)} />
                    </TableCell></TableRow>;
  })}</TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader><CardTitle className='text-3xl font-normal'>{editingId ? "Atualizar categoria" : "Criar categoria"}</CardTitle></CardHeader>
        <CardContent className='grid gap-6 md:grid-cols-3'>
          <Input className='h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0' placeholder='Nome PT' value={form.name_pt} onChange={(e) => setForm((p) => ({ ...p, name_pt: e.target.value }))} />
          <Input className='h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0' placeholder='Nome ES' value={form.name_es} onChange={(e) => setForm((p) => ({ ...p, name_es: e.target.value }))} />
          <Input className='h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0' placeholder='Slug (opcional)' value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
          <input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
          <Input
            readOnly
            className='h-12 cursor-pointer rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0'
            placeholder='Escolher ficheiro'
            value={imageFile ? imageFile.name : "Nenhum ficheiro selecionado"}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          />
          <Input
            readOnly
            className='h-12 rounded-xl border-slate-400/60 text-muted-foreground focus:border-slate-500 focus:ring-0'
            value='Limite de upload: máx. 5 MB por imagem.'
          />
          <Input
            readOnly
            className={`h-12 rounded-xl border-slate-400/60 text-muted-foreground focus:border-slate-500 focus:ring-0 ${imagePreview ? "cursor-pointer" : ""}`}
            value={imagePreview ? "Pré-visualização disponível" : "Sem pré-visualização"}
            onClick={() => {
              if (!imagePreview) return;
              window.open(resolveApiFileUrl(imagePreview), "_blank", "noopener,noreferrer");
            }}
          />
          <div className='flex flex-wrap gap-3 md:col-span-3'>
            <Button className='!h-14 !w-56 !rounded-xl !bg-black !text-white hover:!bg-black/90' onClick={() => void handleSubmit()}>{editingId ? "Atualizar" : "Guardar"}</Button>
            {editingId ? <Button variant='secondary' onClick={resetForm}>Cancelar</Button> : null}
          </div>
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = Categories;
export {
  stdin_default as default
};
