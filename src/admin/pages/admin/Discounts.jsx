import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { NavLink } from "react-router-dom";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const emptyForm = {
  code: "",
  type: "percentage",
  value: "0",
  expiration: "",
  usage_limit: "",
  restriction_type: "global",
  restriction_id: "",
  is_active: true
};
const toDateInput = (value) => value ? value.slice(0, 10) : "";
const roundMoney = (value) => Math.round(value * 100) / 100;
const formatMoney = (value, currency = "EUR") => `${currency} ${value.toFixed(2)}`;
const Discounts = ({ mode = "coupons" }) => {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [productDiscountMessage, setProductDiscountMessage] = useState("");
  const [selectedDiscountProductId, setSelectedDiscountProductId] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingProductDiscount, setIsApplyingProductDiscount] = useState(false);
  const [activeDiscountActionProductId, setActiveDiscountActionProductId] = useState(null);
  const productMap = useMemo(
    () => new Map(products.map((item) => [String(item.id), item])),
    [products]
  );
  const categoryMap = useMemo(
    () => new Map(categories.map((item) => [String(item.id), item])),
    [categories]
  );
  const productDiscountRows = useMemo(() => {
    return products.map((product) => {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const discountedVariants = variants.filter((variant) => {
        const price = Number(variant.price);
        const compareAt = Number(variant.compare_at_price);
        return Number.isFinite(price) && Number.isFinite(compareAt) && compareAt > price;
      });
      if (discountedVariants.length === 0) {
        return null;
      }
      const discounts = discountedVariants.map((variant) => {
        const price = Number(variant.price);
        const compareAt = Number(variant.compare_at_price);
        return roundMoney((compareAt - price) / compareAt * 100);
      });
      const minDiscount = Math.min(...discounts);
      const maxDiscount = Math.max(...discounts);
      const currentPrices = discountedVariants.map((variant) => Number(variant.price));
      const originalPrices = discountedVariants.map((variant) => Number(variant.compare_at_price));
      const minCurrent = Math.min(...currentPrices);
      const maxCurrent = Math.max(...currentPrices);
      const minOriginal = Math.min(...originalPrices);
      const maxOriginal = Math.max(...originalPrices);
      const currency = discountedVariants[0]?.currency || "EUR";
      return {
        id: String(product.id),
        name: product.name_pt || product.name_es || product.sku || String(product.id),
        discountedVariants: discountedVariants.length,
        totalVariants: variants.length,
        minDiscount,
        maxDiscount,
        minCurrent,
        maxCurrent,
        minOriginal,
        maxOriginal,
        currency
      };
    }).filter((row) => Boolean(row)).sort((a, b) => b.maxDiscount - a.maxDiscount);
  }, [products]);
  const load = async () => {
    try {
      setError("");
      const couponRows = await adminApi.listCoupons();
      const [productResult, categoryResult] = await Promise.allSettled([
        adminApi.listProducts(),
        adminApi.listCategories()
      ]);
      setRows(couponRows);
      if (productResult.status === "fulfilled") {
        setProducts(productResult.value);
      } else {
        setProducts([]);
      }
      if (categoryResult.status === "fulfilled") {
        setCategories(categoryResult.value);
      } else {
        setCategories([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load coupons");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };
  const startEdit = (coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      expiration: toDateInput(coupon.expiration),
      usage_limit: coupon.usage_limit != null ? String(coupon.usage_limit) : "",
      restriction_type: coupon.restriction_type,
      restriction_id: coupon.restriction_id ? String(coupon.restriction_id) : "",
      is_active: coupon.is_active
    });
  };
  const resolveRestriction = (coupon) => {
    if (coupon.restriction_type === "global") return "All products";
    if (!coupon.restriction_id) return coupon.restriction_type;
    const key = String(coupon.restriction_id);
    if (coupon.restriction_type === "product") {
      const product = productMap.get(key);
      const label2 = product?.name_pt || product?.name_es || product?.sku || key;
      return `Product: ${label2}`;
    }
    const category = categoryMap.get(key);
    const label = category?.name_pt || category?.name_es || category?.slug || key;
    return `Category: ${label}`;
  };
  const handleDelete = async (id) => {
    try {
      setError("");
      await adminApi.deleteCoupon(id);
      if (editingId === id) {
        resetForm();
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete coupon");
    }
  };
  const handleSubmit = async () => {
    const normalizedCode = form.code.trim().toUpperCase();
    const parsedValue = Number(form.value);
    const parsedUsageLimit = form.usage_limit ? Number(form.usage_limit) : null;
    if (!normalizedCode) {
      setError("Coupon code is required.");
      return;
    }
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setError("Value must be greater than 0.");
      return;
    }
    if (form.type === "percentage" && parsedValue > 100) {
      setError("Percentage value cannot exceed 100.");
      return;
    }
    if (parsedUsageLimit != null && (!Number.isInteger(parsedUsageLimit) || parsedUsageLimit < 1)) {
      setError("Usage limit must be an integer greater than 0.");
      return;
    }
    if (form.restriction_type !== "global" && !form.restriction_id) {
      setError("Select a product/category for restriction.");
      return;
    }
    const payload = {
      code: normalizedCode,
      type: form.type,
      value: parsedValue,
      expiration: form.expiration || null,
      usage_limit: parsedUsageLimit,
      restriction_type: form.restriction_type,
      restriction_id: form.restriction_type === "global" ? null : form.restriction_id,
      is_active: form.is_active
    };
    try {
      setError("");
      setIsSaving(true);
      if (editingId) {
        await adminApi.updateCoupon(editingId, payload);
      } else {
        await adminApi.createCoupon(payload);
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save coupon");
    } finally {
      setIsSaving(false);
    }
  };
  const handleApplyProductDiscount = async () => {
    const applyDiscountForProduct = async (productId2, parsedPercent2) => {
      const targetProduct = products.find((item) => String(item.id) === productId2);
      if (!targetProduct) {
        throw new Error("Selected product not found.");
      }
      const variants = Array.isArray(targetProduct.variants) ? targetProduct.variants : [];
      if (variants.length === 0) {
        throw new Error("This product has no variants to update.");
      }
      const updates = variants.map(async (variant) => {
        const currentPrice = Number(variant.price);
        const currentCompareAt = Number(variant.compare_at_price);
        const hasCompareAt = Number.isFinite(currentCompareAt) && currentCompareAt > currentPrice;
        const basePrice = hasCompareAt ? currentCompareAt : currentPrice;
        if (!Number.isFinite(basePrice) || basePrice <= 0) {
          throw new Error(`Variant ${String(variant.id)} has invalid price.`);
        }
        const nextPrice = parsedPercent2 > 0 ? roundMoney(basePrice * (1 - parsedPercent2 / 100)) : roundMoney(basePrice);
        return adminApi.updateVariant(String(variant.id), {
          price: nextPrice,
          compare_at_price: roundMoney(basePrice)
        });
      });
      await Promise.all(updates);
      return variants.length;
    };
    const productId = selectedDiscountProductId.trim();
    const parsedPercent = Number(discountPercent);
    if (!productId) {
      setError("Select a product for discount.");
      setProductDiscountMessage("");
      return;
    }
    if (!Number.isFinite(parsedPercent) || parsedPercent < 0 || parsedPercent >= 100) {
      setError("Discount % must be between 0 and 99.");
      setProductDiscountMessage("");
      return;
    }
    try {
      setError("");
      setProductDiscountMessage("");
      setIsApplyingProductDiscount(true);
      const updatedCount = await applyDiscountForProduct(productId, parsedPercent);
      await load();
      setProductDiscountMessage(
        parsedPercent > 0 ? `Applied ${parsedPercent}% discount to ${updatedCount} variant(s).` : `Removed discount from ${updatedCount} variant(s).`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply product discount");
      setProductDiscountMessage("");
    } finally {
      setIsApplyingProductDiscount(false);
    }
  };
  const handleEditProductDiscount = (row) => {
    setSelectedDiscountProductId(row.id);
    setDiscountPercent(String(row.maxDiscount));
    setProductDiscountMessage("Product selected in form. Update the discount % and click Apply to Product.");
    setError("");
  };
  const handleDeleteProductDiscount = async (productId) => {
    const targetProduct = products.find((item) => String(item.id) === productId);
    if (!targetProduct) {
      setError("Selected product not found.");
      setProductDiscountMessage("");
      return;
    }
    try {
      setError("");
      setProductDiscountMessage("");
      setActiveDiscountActionProductId(productId);
      const variants = Array.isArray(targetProduct.variants) ? targetProduct.variants : [];
      const updates = variants.map(async (variant) => {
        const currentPrice = Number(variant.price);
        const currentCompareAt = Number(variant.compare_at_price);
        const hasCompareAt = Number.isFinite(currentCompareAt) && currentCompareAt > currentPrice;
        const basePrice = hasCompareAt ? currentCompareAt : currentPrice;
        if (!Number.isFinite(basePrice) || basePrice <= 0) {
          throw new Error(`Variant ${String(variant.id)} has invalid price.`);
        }
        return adminApi.updateVariant(String(variant.id), {
          price: roundMoney(basePrice),
          compare_at_price: roundMoney(basePrice)
        });
      });
      await Promise.all(updates);
      await load();
      if (selectedDiscountProductId === productId) {
        setDiscountPercent("0");
      }
      setProductDiscountMessage(`Removed discount from ${variants.length} variant(s).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove product discount");
      setProductDiscountMessage("");
    } finally {
      setActiveDiscountActionProductId(null);
    }
  };
  const isCouponsMode = mode === "coupons";
  const isProductDiscountMode = mode === "product-discounts";
  return <div className='space-y-6'>
    <PageHeader
      title={isCouponsMode ? "Cupões" : "Descontos de Produto"}
      description={isCouponsMode ? "Crie e faça a festão dos seus cupões e descontos para todos os produtos, categorias ou produto específico." : "Apply or remove direct product-level discounts."}
      actions={<Button className='!h-10 !rounded-md !bg-zinc-400 !px-6 !text-white hover:!bg-zinc-500' onClick={() => void load()}>
        <RefreshCw className='mr-2 h-4 w-4' />
        Atualizar
      </Button>}
    />
    {error ? <p className='text-sm text-destructive'>{error}</p> : null}

    <Card className='rounded-[28px] bg-zinc-100'>
      <CardHeader><CardTitle>Secções de Desconto</CardTitle></CardHeader>
      <CardContent className='flex flex-wrap gap-2'>
        <Button asChild size='sm' className={`!h-10 !rounded-md !px-6 ${isCouponsMode ? "!bg-black !text-white hover:!bg-black/90" : "!bg-zinc-400 !text-white hover:!bg-zinc-500"}`}>
          <NavLink to='/admin/discounts/coupons'>Cupões</NavLink>
        </Button>
        <Button asChild size='sm' className={`!h-10 !rounded-md !px-6 ${isProductDiscountMode ? "!bg-black !text-white hover:!bg-black/90" : "!bg-zinc-400 !text-white hover:!bg-zinc-500"}`}>
          <NavLink to='/admin/discounts/product-discounts'>Descontos de Produto</NavLink>
        </Button>
      </CardContent>
    </Card>

    {isCouponsMode ? <>
      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader><CardTitle>Cupões</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Restrição</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead>Usado</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? <TableRow>
                <TableCell colSpan={9} className='text-center text-sm text-muted-foreground'>
                  Ainda não há cupons
                </TableCell>
              </TableRow> : rows.map((row) => <TableRow key={row.id}>
                <TableCell className='font-medium'>{row.code}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>
                  {row.type === "percentage" ? `${Number(row.value)}%` : `EUR ${Number(row.value).toFixed(2)}`}
                </TableCell>
                <TableCell>{resolveRestriction(row)}</TableCell>
                <TableCell>{row.usage_limit ?? "-"}</TableCell>
                <TableCell>{row.usage_count ?? 0}</TableCell>
                <TableCell>{row.expiration ? new Date(row.expiration).toLocaleDateString() : "-"}</TableCell>
                <TableCell>{row.is_active ? "Ativo" : "Inativo"}</TableCell>
                <TableCell className='flex gap-2'>
                  <Button size='sm' onClick={() => startEdit(row)}>
                    Editar
                  </Button>
                  <ConfirmDeleteButton triggerLabel="Apagar" confirmLabel="Apagar" entityName={`cupão "${row.code}"`} onConfirm={() => handleDelete(row.id)} />
                </TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader><CardTitle>{editingId ? "Atualizar cupão" : "Criar cupão"}</CardTitle></CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-4'>
          <Input placeholder='Código' value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <select className='w-full rounded-md border bg-background px-3 py-2 text-sm' value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            <option value='percentage'>percentagem</option>
            <option value='fixed'>fixo</option>
          </select>
          <Input placeholder='Valor' type='number' value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} />
          <Input placeholder='Expiração' type='date' value={form.expiration} onChange={(e) => setForm((p) => ({ ...p, expiration: e.target.value }))} />
          <Input placeholder='Limite de uso' type='number' value={form.usage_limit} onChange={(e) => setForm((p) => ({ ...p, usage_limit: e.target.value }))} />
          <select
            className='w-full rounded-md border bg-background px-3 py-2 text-sm'
            value={form.restriction_type}
            onChange={(e) => setForm((p) => ({ ...p, restriction_type: e.target.value, restriction_id: "" }))}
          >
            <option value='global'>Todos os produtos</option>
            <option value='product'>Produto específico</option>
            <option value='category'>Categoria específica</option>
          </select>
          {form.restriction_type === "global" ? <div className='w-full rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>O cupão será aplicado a todos os produtos</div> : <select
            className='w-full rounded-md border bg-background px-3 py-2 text-sm'
            value={form.restriction_id}
            onChange={(e) => setForm((p) => ({ ...p, restriction_id: e.target.value }))}
          >
            <option value=''>
              {form.restriction_type === "product" ? "Select product" : "Select category"}
            </option>
            {form.restriction_type === "product" ? products.map((item) => <option key={String(item.id)} value={String(item.id)}>
              {item.name_pt || item.name_es || item.sku || String(item.id)}
            </option>) : categories.map((item) => <option key={String(item.id)} value={String(item.id)}>
              {item.name_pt || item.name_es || item.slug || String(item.id)}
            </option>)}
          </select>}
          <label className='flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm'>
            <input
              type='checkbox'
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            Ativo
          </label>
          <div className='flex gap-2 md:col-span-4'>
            <Button className='!h-14 !w-56 !rounded-xl !bg-black !text-white hover:!bg-black/90' disabled={isSaving} onClick={() => void handleSubmit()}>
              {isSaving ? "A guardar..." : editingId ? "Atualizar" : "Guardar"}
            </Button>
            {editingId ? <Button variant='secondary' onClick={resetForm}>
              Cancelar
            </Button> : null}
          </div>
        </CardContent>
      </Card>
    </> : null}

    {isProductDiscountMode ? <>
      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader><CardTitle>Descontos em produtos</CardTitle></CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-4'>
          <select
            className='rounded-md border bg-background px-3 py-2 text-sm md:col-span-2'
            value={selectedDiscountProductId}
            onChange={(e) => setSelectedDiscountProductId(e.target.value)}
          >
            <option value=''>Selecione o produto</option>
            {products.map((item) => <option key={String(item.id)} value={String(item.id)}>
              {item.name_pt || item.name_es || item.sku || String(item.id)}
            </option>)}
          </select>
          <Input
            placeholder='Desconto % (0-99)'
            type='number'
            min={0}
            max={99}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
          />
          <Button className='!h-10 !rounded-md !bg-black !px-6 !text-white hover:!bg-black/90' disabled={isApplyingProductDiscount} onClick={() => void handleApplyProductDiscount()}>
            {isApplyingProductDiscount ? "A aplicar..." : "Aplicar ao produto"}
          </Button>
          <p className='text-xs text-muted-foreground md:col-span-4'>
            Esta opção atualiza todas as variantes do produto selecionado. Use 0% para remover o desconto.
          </p>
          {productDiscountMessage ? <p className='text-xs text-success md:col-span-4'>{productDiscountMessage}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Descontos aplicados aos produtos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Variantes</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Preço atual</TableHead>
                <TableHead>Preço original</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productDiscountRows.length === 0 ? <TableRow>
                <TableCell colSpan={6} className='text-center text-sm text-muted-foreground'>
Nenhum desconto foi aplicado ainda.
                </TableCell>
              </TableRow> : productDiscountRows.map((row) => <TableRow key={row.id}>
                <TableCell className='font-medium'>{row.name}</TableCell>
                <TableCell>{row.discountedVariants}/{row.totalVariants}</TableCell>
                <TableCell>
                  {row.minDiscount === row.maxDiscount ? `${row.maxDiscount}%` : `${row.minDiscount}% - ${row.maxDiscount}%`}
                </TableCell>
                <TableCell>
                  {row.minCurrent === row.maxCurrent ? formatMoney(row.minCurrent, row.currency) : `${formatMoney(row.minCurrent, row.currency)} - ${formatMoney(row.maxCurrent, row.currency)}`}
                </TableCell>
                <TableCell>
                  {row.minOriginal === row.maxOriginal ? formatMoney(row.minOriginal, row.currency) : `${formatMoney(row.minOriginal, row.currency)} - ${formatMoney(row.maxOriginal, row.currency)}`}
                </TableCell>
                <TableCell className='flex gap-2'>
                  <Button
                    variant='secondary'
                    size='sm'
                    disabled={isApplyingProductDiscount || activeDiscountActionProductId === row.id}
                    onClick={() => handleEditProductDiscount(row)}
                  >
                    Edit
                  </Button>
                  <ConfirmDeleteButton
                    entityName={`discount on "${row.name}"`}
                    triggerLabel={activeDiscountActionProductId === row.id ? "Removing..." : "Delete"}
                    confirmLabel='Remove'
                    disabled={isApplyingProductDiscount || activeDiscountActionProductId === row.id}
                    onConfirm={() => handleDeleteProductDiscount(row.id)}
                  />
                </TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </> : null}
  </div>;
};
var stdin_default = Discounts;
export {
  stdin_default as default
};
