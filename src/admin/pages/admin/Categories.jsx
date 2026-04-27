import { useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { resolveApiFileUrl, uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FRONTEND_CATEGORY_PRESETS = [
  { slug: "sapatilhas-corrida", name_pt: "Sapatilhas de Corrida", name_es: "Zapatillas de Running" },
  { slug: "sapatilhas-corrida-trail", name_pt: "Sapatilhas de Corrida de Trail", name_es: "Zapatillas de Trail Running" },
  { slug: "sapatilhas-atletismo", name_pt: "Sapatilhas de Atletismo", name_es: "Zapatillas de Atletismo" },
  { slug: "sapatilhas-carbono", name_pt: "Sapatilhas de Carbono", name_es: "Zapatillas de Carbono" },
];

const inputClassName =
  "h-9 rounded-[9px] border border-[#82a9b3] bg-white px-4 text-[13px] text-black shadow-none placeholder:text-[#7c878d] focus:border-[#82a9b3] focus:ring-0";
const CATEGORY_PRODUCTS_PER_PAGE = 8;
const EMPTY_FORM = {
  name_pt: "",
  name_es: "",
  slug: "",
  image_url: "",
  show_complete_the_look: false,
  complete_the_look_category_ids: [],
};

const Categories = () => {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingPresets, setIsSyncingPresets] = useState(false);
  const [activeCategoryActionId, setActiveCategoryActionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [showEsField, setShowEsField] = useState(false);
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState([]);
  const [categoryProductPage, setCategoryProductPage] = useState(1);
  const fileInputRef = useRef(null);
  const formSectionRef = useRef(null);

  const load = async () => {
    try {
      const [categoriesResponse, productsResponse] = await Promise.all([
        adminApi.listCategories(),
        adminApi.listProducts(),
      ]);
      setRows(Array.isArray(categoriesResponse) ? categoriesResponse : []);
      setProducts(Array.isArray(productsResponse) ? productsResponse : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar categorias");
    } finally {
      setIsLoading(false);
      setIsProductsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setShowEsField(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name_pt: row.name_pt ?? "",
      name_es: row.name_es ?? "",
      slug: row.slug ?? "",
      image_url: row.image_url ?? "",
      show_complete_the_look: Boolean(row.show_complete_the_look),
      complete_the_look_category_ids: Array.isArray(row.complete_the_look_category_ids)
        ? row.complete_the_look_category_ids.map((item) => String(item))
        : [],
    });
    setImageFile(null);
    setShowEsField(Boolean(row.name_es));
    setError("");
    setStatusMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const syncFrontendCategoryPresets = async () => {
    try {
      setIsSyncingPresets(true);
      setError("");
      setStatusMessage("");
      const existingSlugs = new Set(rows.map((row) => String(row.slug || "").trim().toLowerCase()).filter(Boolean));
      const existingNamesPt = new Set(rows.map((row) => String(row.name_pt || "").trim().toLowerCase()).filter(Boolean));
      let createdCount = 0;

      for (const preset of FRONTEND_CATEGORY_PRESETS) {
        if (existingSlugs.has(preset.slug) || existingNamesPt.has(preset.name_pt.toLowerCase())) continue;
        await adminApi.createCategory(preset);
        createdCount += 1;
      }

      await load();
      setStatusMessage(
        createdCount > 0
          ? `${createdCount} categorias do site foram adicionadas ao backoffice.`
          : "As categorias do site ja estavam sincronizadas."
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
        setError("Indique pelo menos um nome.");
        return;
      }

      setIsSaving(true);
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
        image_url: imageUrl || null,
        show_complete_the_look: Boolean(form.show_complete_the_look),
        complete_the_look_category_ids: Array.isArray(form.complete_the_look_category_ids)
          ? form.complete_the_look_category_ids
          : [],
      };

      if (editingId) {
        await adminApi.updateCategory(editingId, payload);
        await load();
        setStatusMessage("Categoria atualizada com sucesso.");
      } else {
        await adminApi.createCategory(payload);
        await load();
        setStatusMessage("Categoria criada com sucesso.");
      }

      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao guardar a categoria");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    try {
      setActiveCategoryActionId(category.id);
      setError("");
      setStatusMessage("");
      await adminApi.deleteCategory(category.id);
      if (editingId === category.id) resetForm();
      await load();
      setStatusMessage("Categoria apagada com sucesso.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao apagar a categoria");
    } finally {
      setActiveCategoryActionId(null);
    }
  };

  const handleToggleCategoryStatus = async () => {
    if (!editingId) return;

    const currentRow = rows.find((row) => row.id === editingId);
    if (!currentRow) return;

    try {
      setActiveCategoryActionId(editingId);
      setError("");
      setStatusMessage("");
      await adminApi.updateCategory(editingId, { is_active: currentRow.is_active === false });
      await load();
      setStatusMessage(currentRow.is_active === false ? "Categoria ativada." : "Categoria desativada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar o estado da categoria");
    } finally {
      setActiveCategoryActionId(null);
    }
  };

  const activeEditingRow = editingId ? rows.find((row) => row.id === editingId) : null;
  const selectedImageLabel = imageFile ? imageFile.name : form.image_url ? "Imagem atual selecionada" : "Nenhum ficheiro selecionado";
  const completeLookCategoryOptions = useMemo(
    () =>
      rows.filter((row) => String(row.id) !== String(editingId || "")).map((row) => ({
        id: String(row.id),
        label: row.name_pt || row.name_es || row.slug || String(row.id),
      })),
    [editingId, rows]
  );
  const productCountByCategory = useMemo(
    () =>
      new Map(
        rows.map((row) => [
          String(row.id),
          products.filter((product) => String(product.category_id || "") === String(row.id)).length,
        ])
      ),
    [rows, products]
  );
  const filteredCategoryProducts = useMemo(() => {
    if (selectedCategoryFilters.length === 0) return products;
    return products.filter((product) => selectedCategoryFilters.includes(String(product.category_id || "")));
  }, [products, selectedCategoryFilters]);
  const totalCategoryProductPages = Math.max(1, Math.ceil(filteredCategoryProducts.length / CATEGORY_PRODUCTS_PER_PAGE));
  const paginatedCategoryProducts = useMemo(() => {
    const startIndex = (categoryProductPage - 1) * CATEGORY_PRODUCTS_PER_PAGE;
    return filteredCategoryProducts.slice(startIndex, startIndex + CATEGORY_PRODUCTS_PER_PAGE);
  }, [filteredCategoryProducts, categoryProductPage]);
  const categoryPageStart = filteredCategoryProducts.length === 0 ? 0 : (categoryProductPage - 1) * CATEGORY_PRODUCTS_PER_PAGE + 1;
  const categoryPageEnd =
    filteredCategoryProducts.length === 0 ? 0 : Math.min(categoryProductPage * CATEGORY_PRODUCTS_PER_PAGE, filteredCategoryProducts.length);
  const visibleCategoryPages = useMemo(() => {
    const startPage = Math.max(1, categoryProductPage - 2);
    const endPage = Math.min(totalCategoryProductPages, startPage + 4);
    const adjustedStartPage = Math.max(1, endPage - 4);
    return Array.from({ length: endPage - adjustedStartPage + 1 }, (_, index) => adjustedStartPage + index);
  }, [categoryProductPage, totalCategoryProductPages]);

  useEffect(() => {
    setCategoryProductPage(1);
  }, [selectedCategoryFilters]);

  useEffect(() => {
    setCategoryProductPage((currentPage) => Math.min(currentPage, totalCategoryProductPages));
  }, [totalCategoryProductPages]);

  return (
    <div className="max-w-[980px] space-y-9">
      <section className="space-y-2 pt-1">
        <p className="text-xs uppercase tracking-[0.38em] text-[#7da3ae]">BACKOFFICE</p>
        <h1 className="text-[2.25rem] font-medium leading-none text-black sm:text-[3rem]">Gestão de Categorias</h1>
        <p className="text-[15px] text-black">Categorias de produto</p>
        <button
          type="button"
          className="pt-1 text-[12px] font-medium text-[#7da3ae] underline-offset-4 hover:underline"
          disabled={isSyncingPresets}
          onClick={() => void syncFrontendCategoryPresets()}
        >
          {isSyncingPresets ? "A sincronizar categorias..." : "Sincronizar categorias"}
        </button>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {statusMessage ? <p className="text-sm text-emerald-700">{statusMessage}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
        <section className="rounded-[22px] bg-[#f3f3f1] px-5 py-5 sm:px-6 sm:py-6 xl:sticky xl:top-24">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7da3ae]">Left bar</p>
            <h2 className="text-[18px] font-normal text-black">Filtros</h2>
          </div>

          <div className="mt-5 rounded-[16px] border border-[#dae3e5] bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#90a1a7]">Showing</p>
            <p className="mt-1 text-[34px] font-medium leading-none text-black">{filteredCategoryProducts.length}</p>
            <p className="mt-1 text-[12px] text-[#6f7678]">of {products.length} products</p>
          </div>

          <div className="mt-5 space-y-2">
            {rows.map((row) => {
              const rowId = String(row.id);
              const checked = selectedCategoryFilters.includes(rowId);
              const count = productCountByCategory.get(rowId) ?? 0;
              return (
                <label
                  key={rowId}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-[#dae3e5] bg-white px-3 py-2 text-[12px] text-black"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedCategoryFilters((previous) =>
                          previous.includes(rowId) ? previous.filter((item) => item !== rowId) : [...previous, rowId]
                        )
                      }
                    />
                    <span>{row.name_pt || row.name_es || row.slug || row.id}</span>
                  </span>
                  <span className="rounded-full bg-[#eef3f4] px-2 py-0.5 text-[10px] text-[#6f7678]">{count}</span>
                </label>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-5 h-9 w-full rounded-[9px] border border-[#82a9b3] bg-white px-5 text-[11px] text-black hover:bg-white"
            onClick={() => setSelectedCategoryFilters([])}
          >
            Clear filters
          </Button>
        </section>

        <section className="rounded-[22px] bg-[#f3f3f1] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[18px] font-normal text-black">Products list</h2>
              <p className="text-[12px] text-[#6f7678]">
                Showing {categoryPageStart}-{categoryPageEnd} of {filteredCategoryProducts.length} products
              </p>
            </div>
            <p className="text-[11px] text-[#6f7678]">Page {categoryProductPage} of {totalCategoryProductPages}</p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-[#8fb1bb]">
                  <th className="pb-2 text-left text-[9px] font-normal uppercase tracking-[0.18em] text-[#90a1a7]">ID</th>
                  <th className="pb-2 text-left text-[9px] font-normal uppercase tracking-[0.18em] text-[#90a1a7]">Produto</th>
                  <th className="pb-2 text-left text-[9px] font-normal uppercase tracking-[0.18em] text-[#90a1a7]">Categoria</th>
                  <th className="pb-2 text-left text-[9px] font-normal uppercase tracking-[0.18em] text-[#90a1a7]">Variants</th>
                </tr>
              </thead>
              <tbody>
                {isProductsLoading ? (
                  <tr>
                    <td colSpan={4} className="pt-7 text-sm text-[#68777d]">
                      A carregar produtos...
                    </td>
                  </tr>
                ) : paginatedCategoryProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="pt-7 text-sm text-[#68777d]">
                      Nenhum produto encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  paginatedCategoryProducts.map((product) => {
                    const productName = product.name_pt || product.name_es || `Produto ${product.id}`;
                    const categoryLabel = product.category_name_pt || product.category_name_es || "-";
                    const variantCount = Array.isArray(product.variants) ? product.variants.length : 0;
                    const thumbnail = Array.isArray(product.images)
                      ? product.images.find((image) => image?.image_url)?.image_url || ""
                      : "";

                    return (
                      <tr key={product.id}>
                        <td className="pt-4 align-middle text-[10px] text-black">{product.id}</td>
                        <td className="pt-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 overflow-hidden rounded-md bg-white shadow-sm">
                              {thumbnail ? (
                                <img
                                  src={resolveApiFileUrl(thumbnail)}
                                  alt={productName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[#f8f8f8] text-[8px] text-[#99a4a8]">
                                  IMG
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-black">{productName}</p>
                          </div>
                        </td>
                        <td className="pt-4 align-middle text-[10px] text-black">{categoryLabel}</td>
                        <td className="pt-4 align-middle text-[10px] text-black">{variantCount}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredCategoryProducts.length > CATEGORY_PRODUCTS_PER_PAGE ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[#6f7678]">
                Page {categoryProductPage} of {totalCategoryProductPages}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-[8px] border border-[#82a9b3] bg-white px-4 text-[10px] text-black hover:bg-white"
                  disabled={categoryProductPage === 1}
                  onClick={() => setCategoryProductPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                {visibleCategoryPages.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    type="button"
                    className={
                      pageNumber === categoryProductPage
                        ? "h-8 rounded-[8px] bg-black px-4 text-[10px] text-white hover:bg-black/90"
                        : "h-8 rounded-[8px] border border-[#82a9b3] bg-white px-4 text-[10px] text-black hover:bg-white"
                    }
                    variant={pageNumber === categoryProductPage ? "default" : "outline"}
                    onClick={() => setCategoryProductPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-[8px] border border-[#82a9b3] bg-white px-4 text-[10px] text-black hover:bg-white"
                  disabled={categoryProductPage === totalCategoryProductPages}
                  onClick={() => setCategoryProductPage((page) => Math.min(totalCategoryProductPages, page + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <section className="rounded-[22px] bg-[#f3f3f1] px-5 py-5 sm:px-7 sm:py-6">
        <h2 className="text-[18px] font-normal text-black">Categorias</h2>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead>
              <tr className="border-b border-[#8fb1bb]">
                <th className="pb-2 text-left text-[9px] font-normal uppercase tracking-[0.18em] text-[#90a1a7]">ID</th>
                <th className="pb-2 text-left text-[9px] font-normal uppercase tracking-[0.18em] text-[#90a1a7]">Slug</th>
                <th className="pb-2 text-left text-[9px] font-normal uppercase tracking-[0.18em] text-[#90a1a7]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="pt-7 text-sm text-[#68777d]">
                    A carregar categorias...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="pt-7 text-sm text-[#68777d]">
                    Ainda nao existem categorias.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isBusy = activeCategoryActionId === row.id;
                  const label = row.name_pt || row.name_es || "Categoria";

                  return (
                    <tr key={row.id}>
                      <td className="pt-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 overflow-hidden rounded-md bg-white shadow-sm">
                            {row.image_url ? (
                              <img src={resolveApiFileUrl(row.image_url)} alt={label} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#f8f8f8] text-[8px] text-[#99a4a8]">
                                IMG
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[10px] text-black">{label}</p>
                            {row.is_active === false ? <p className="text-[9px] text-[#9d9d9d]">Inativa</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="pt-4 align-middle text-[10px] text-black">{row.slug || "-"}</td>
                      <td className="pt-4 align-middle">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="h-7 rounded-[6px] bg-[#7ea0ab] px-4 text-[10px] font-medium text-white hover:bg-[#70939e]"
                            onClick={() => startEdit(row)}
                          >
                            Editar
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                type="button"
                                disabled={isBusy}
                                className="inline-flex h-7 items-center justify-center rounded-[6px] bg-[#e53935] px-4 text-[10px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                              >
                                Apagar
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Apagar categoria?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acao nao pode ser anulada. A categoria "{label}" sera eliminada permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-[#e53935] text-white hover:bg-[#d93431]"
                                  onClick={() => handleDeleteCategory(row)}
                                >
                                  Apagar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section ref={formSectionRef} className="rounded-[22px] bg-[#f3f3f1] px-5 py-5 sm:px-7 sm:py-6">
        <h2 className="text-[18px] font-normal text-black">{editingId ? "Atualizar Categoria" : "Criar Categoria"}</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input
            className={inputClassName}
            placeholder="Nome"
            value={form.name_pt}
            onChange={(e) => setForm((previous) => ({ ...previous, name_pt: e.target.value }))}
          />
          <Input
            className={inputClassName}
            placeholder="Slug"
            value={form.slug}
            onChange={(e) => setForm((previous) => ({ ...previous, slug: e.target.value }))}
          />
        </div>

        <button
          type="button"
          className="mt-3 text-[11px] text-[#7da3ae] underline-offset-4 hover:underline"
          onClick={() => setShowEsField((previous) => !previous)}
        >
          {showEsField ? "Esconder nome ES" : "Adicionar nome ES"}
        </button>

        {showEsField ? (
          <div className="mt-3 max-w-[304px]">
            <Input
              className={inputClassName}
              placeholder="Nome ES (opcional)"
              value={form.name_es}
              onChange={(e) => setForm((previous) => ({ ...previous, name_es: e.target.value }))}
            />
          </div>
        ) : null}

        <div className="mt-5 rounded-[16px] border border-[#d7e2e4] bg-white px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12px] font-medium text-black">Completa o look</p>
              <p className="text-[11px] text-[#6f7678]">
                Ative esta seccao para mostrar produtos aleatorios de outras categorias nesta pagina de produto.
              </p>
            </div>
            <label className="inline-flex items-center gap-3 text-[12px] text-black">
              <span>{form.show_complete_the_look ? "Ativo" : "Desativado"}</span>
              <button
                type="button"
                aria-pressed={form.show_complete_the_look}
                onClick={() =>
                  setForm((previous) => ({
                    ...previous,
                    show_complete_the_look: !previous.show_complete_the_look,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.show_complete_the_look ? "bg-[#7ea0ab]" : "bg-[#d6dcde]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.show_complete_the_look ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          </div>

          {form.show_complete_the_look ? (
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#90a1a7]">Categorias a mostrar</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {completeLookCategoryOptions.length > 0 ? (
                  completeLookCategoryOptions.map((option) => {
                    const checked = form.complete_the_look_category_ids.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 rounded-[10px] border border-[#dae3e5] px-3 py-2 text-[12px] text-black"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setForm((previous) => ({
                              ...previous,
                              complete_the_look_category_ids: checked
                                ? previous.complete_the_look_category_ids.filter((item) => item !== option.id)
                                : [...previous.complete_the_look_category_ids, option.id],
                            }))
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-[12px] text-[#6f7678]">
                    Crie mais categorias para poder selecionar sugestoes nesta seccao.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />

        <div className="mt-4 max-w-[420px]">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-[8px] border border-[#82a9b3] bg-white px-5 text-[10px] text-black hover:bg-white"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Escolher ficheiros
            </Button>
            <span className="text-[9px] text-black">{selectedImageLabel}</span>
          </div>
          <p className="mt-2 text-[8px] text-[#6f7678]">Faz upload de no maximo 5MB por imagem</p>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button
            className="h-10 min-w-[116px] rounded-[9px] bg-black px-6 text-[11px] font-medium text-white hover:bg-black/90"
            disabled={isSaving}
            onClick={() => void handleSubmit()}
          >
            {isSaving ? "A guardar..." : editingId ? "Atualizar Categoria" : "Guardar Categoria"}
          </Button>

          {editingId ? (
            <>
              <Button
                variant="outline"
                className="h-10 rounded-[9px] border border-[#82a9b3] bg-white px-5 text-[11px] text-black hover:bg-white"
                onClick={resetForm}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-[9px] border border-[#82a9b3] bg-white px-5 text-[11px] text-black hover:bg-white"
                disabled={activeCategoryActionId === editingId}
                onClick={() => void handleToggleCategoryStatus()}
              >
                {activeCategoryActionId === editingId
                  ? "A guardar..."
                  : activeEditingRow?.is_active === false
                    ? "Ativar categoria"
                    : "Desativar categoria"}
              </Button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
};

var stdin_default = Categories;

export {
  stdin_default as default,
};
