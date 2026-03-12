import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/adminApi";
import { resolveApiFileUrl, uploadFile } from "@/lib/api";
const initialForm = {
  slug: "",
  title_pt: "",
  title_es: "",
  excerpt_pt: "",
  excerpt_es: "",
  content_pt: "",
  content_es: "",
  cover_image_url: "",
  is_published: false,
  published_at: ""
};
const Blogs = () => {
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [coverFile, setCoverFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const load = async () => {
    try {
      setError("");
      const result = await adminApi.listBlogPosts();
      setRows(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar posts do blog");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const resetForm = () => {
    setEditingId(null);
    setCoverFile(null);
    setForm(initialForm);
  };
  const startEdit = (row) => {
    setEditingId(row.id);
    setCoverFile(null);
    setForm({
      slug: row.slug || "",
      title_pt: row.title_pt || "",
      title_es: row.title_es || "",
      excerpt_pt: row.excerpt_pt || "",
      excerpt_es: row.excerpt_es || "",
      content_pt: row.content_pt || "",
      content_es: row.content_es || "",
      cover_image_url: row.cover_image_url || "",
      is_published: Boolean(row.is_published),
      published_at: row.published_at ? new Date(row.published_at).toISOString().slice(0, 16) : ""
    });
  };
  const onSubmit = async () => {
    if (!form.title_pt.trim() && !form.title_es.trim()) {
      setError("Indique pelo menos um título (PT ou ES).");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      let coverImageUrl = form.cover_image_url.trim();
      if (coverFile) {
        const uploaded = await uploadFile(coverFile);
        coverImageUrl = uploaded.url;
      }
      const payload = {
        slug: form.slug,
        title_pt: form.title_pt,
        title_es: form.title_es,
        excerpt_pt: form.excerpt_pt,
        excerpt_es: form.excerpt_es,
        content_pt: form.content_pt,
        content_es: form.content_es,
        cover_image_url: coverImageUrl || null,
        is_published: form.is_published,
        published_at: form.published_at ? new Date(form.published_at).toISOString() : null
      };
      if (editingId) {
        await adminApi.updateBlogPost(editingId, payload);
      } else {
        await adminApi.createBlogPost(payload);
      }
      resetForm();
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao guardar o post do blog");
    } finally {
      setSubmitting(false);
    }
  };
  const onDelete = async (id) => {
    try {
      setError("");
      await adminApi.deleteBlogPost(id);
      if (editingId === id) {
        resetForm();
      }
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Falha ao eliminar o post do blog");
    }
  };
  return <div className="space-y-6">
      <PageHeader
    title="Gestão do blog"
    description="Criar, atualizar, publicar e eliminar posts do blog."
  />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Posts do blog</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Publicado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? <TableRow>
                  <TableCell colSpan={5}>Não existem posts do blog.</TableCell>
                </TableRow> : rows.map((row) => <TableRow key={row.id}>
                    <TableCell>{row.title_pt || row.title_es || "-"}</TableCell>
                    <TableCell>{row.slug}</TableCell>
                    <TableCell>{row.is_published ? "Publicado" : "Rascunho"}</TableCell>
                    <TableCell>
                      {row.published_at ? new Date(row.published_at).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/blog/${row.slug}`} target="_blank" rel="noreferrer">
                          Ver
                        </Link>
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => startEdit(row)}>
                        Editar
                      </Button>
                      <ConfirmDeleteButton
    triggerLabel="Apagar"
    confirmLabel="Apagar"
    entityName={`post do blog "${row.title_pt || row.title_es || row.slug}"`}
    onConfirm={() => onDelete(row.id)}
  />
                    </TableCell>
                  </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Atualizar post do blog" : "Criar post do blog"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
    placeholder="Slug (opcional)"
    value={form.slug}
    onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
  />
          <div className="flex items-center gap-3">
            <span className="text-sm">Publicado</span>
            <Switch
    checked={form.is_published}
    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_published: checked }))}
  />
          </div>
          <Input
    placeholder="Título PT"
    value={form.title_pt}
    onChange={(event) => setForm((prev) => ({ ...prev, title_pt: event.target.value }))}
  />
          <Input
    placeholder="Título ES"
    value={form.title_es}
    onChange={(event) => setForm((prev) => ({ ...prev, title_es: event.target.value }))}
  />
          <Input
    type="datetime-local"
    value={form.published_at}
    onChange={(event) => setForm((prev) => ({ ...prev, published_at: event.target.value }))}
  />
          <Input
    placeholder="URL da imagem de capa"
    value={form.cover_image_url}
    onChange={(event) => setForm((prev) => ({ ...prev, cover_image_url: event.target.value }))}
  />
          <input
    type="file"
    accept="image/*"
    className="md:col-span-2 text-sm"
    onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
  />
          {form.cover_image_url ? <div className="md:col-span-2 flex items-center gap-3">
              <img
    src={resolveApiFileUrl(form.cover_image_url)}
    alt="Pré-visualização da capa do blog"
    className="h-16 w-16 rounded-md border object-cover"
  />
              <p className="text-xs text-muted-foreground">Pré-visualização da capa</p>
            </div> : null}
          <Textarea
    placeholder="Resumo PT"
    value={form.excerpt_pt}
    onChange={(event) => setForm((prev) => ({ ...prev, excerpt_pt: event.target.value }))}
    className="md:col-span-2 min-h-20"
  />
          <Textarea
    placeholder="Resumo ES"
    value={form.excerpt_es}
    onChange={(event) => setForm((prev) => ({ ...prev, excerpt_es: event.target.value }))}
    className="md:col-span-2 min-h-20"
  />
          <Textarea
    placeholder="Conteúdo PT"
    value={form.content_pt}
    onChange={(event) => setForm((prev) => ({ ...prev, content_pt: event.target.value }))}
    className="md:col-span-2 min-h-32"
  />
          <Textarea
    placeholder="Conteúdo ES"
    value={form.content_es}
    onChange={(event) => setForm((prev) => ({ ...prev, content_es: event.target.value }))}
    className="md:col-span-2 min-h-32"
  />
          <div className="md:col-span-2 flex gap-2">
            <Button onClick={() => void onSubmit()} disabled={submitting}>
              {submitting ? "A guardar..." : editingId ? "Atualizar" : "Criar"}
            </Button>
            {editingId ? <Button variant="outline" onClick={resetForm} disabled={submitting}>
                Cancelar
              </Button> : null}
          </div>
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = Blogs;
export {
  stdin_default as default
};
