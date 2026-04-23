import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { adminApi } from "@/lib/adminApi";
import { resolveApiFileUrl, uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const roundMoney = (value) => Math.round(value * 100) / 100;
const toSlugPart = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const buildAttributeCombinations = (entries) => {
  if (entries.length === 0) return [{}];
  const [head, ...tail] = entries;
  const [key, values] = head;
  const suffixes = buildAttributeCombinations(tail);
  const combinations = [];
  values.forEach((value) => {
    suffixes.forEach((suffix) => {
      combinations.push({ [key]: value, ...suffix });
    });
  });
  return combinations;
};
const createSpecificationRow = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  key: "",
  value_pt: "",
  value_es: ""
});
const adminColorSwatches = [
  { name: "Preto", color: "#111111" },
  { name: "Azul", color: "#1f4f8f" },
  { name: "Castanho", color: "#9a5b2a" },
  { name: "Verde", color: "#5f6b4f" },
  { name: "Cinzento", color: "#d9d9d9", light: true },
  { name: "Laranja", color: "#d8892b" },
  { name: "Rosa", color: "#f0c7bd" },
  { name: "Vermelho", color: "#c62828" },
  { name: "Bege", color: "#b8a892" }
];
const adminGenderOptions = ["Mulher", "Homem", "Unisexo"];
const adminSizeOptions = ["36", "38", "40", "42", "44", "46", "48", "50"];
const adminBrandOptions = ["Adidas", "Asics", "Nike", "Hoka", "Puma", "New Balance", "Garmin", "Brooks"];
const colorAliasMap = {
  preto: ["preto", "preta", "black", "noir"],
  azul: ["azul", "blue", "navy"],
  castanho: ["castanho", "marrom", "brown"],
  verde: ["verde", "green"],
  cinzento: ["cinzento", "cinza", "gris", "grey", "gray"],
  laranja: ["laranja", "orange"],
  rosa: ["rosa", "pink"],
  vermelho: ["vermelho", "red", "rojo"],
  bege: ["bege", "beige"]
};
const normalizeValue = (value) => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const parseAttributeObject = (raw) => {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};
const toggleSelection = (items, value) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
const colorMatches = (value, selectedColor) => {
  const haystack = normalizeValue(value);
  if (!haystack) return false;
  const tokens = colorAliasMap[normalizeValue(selectedColor)] || [normalizeValue(selectedColor)];
  return tokens.some((token) => haystack.includes(token));
};
const Products = () => {
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockLocked, setStockLocked] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name_pt: "",
    name_es: "",
    description_pt: "",
    description_es: "",
    sku: "",
    price: "0",
    compare_at_price: "",
    discount_percent: "",
    currency: "EUR",
    variant_is_active: true,
    is_promoted: false,
    category_id: ""
  });
  const createAttributeRow = () => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: "", value: "" });
  const [variantAttributes, setVariantAttributes] = useState([createAttributeRow()]);
  const [specifications, setSpecifications] = useState([createSpecificationRow()]);
  const [productImages, setProductImages] = useState([]);
  const [productImagePreviews, setProductImagePreviews] = useState([]);
  const [productImageTags, setProductImageTags] = useState([]);
  const [inventoryForm, setInventoryForm] = useState({ variantId: "", storeId: "", stock: "0" });
  const [inventoryProductId, setInventoryProductId] = useState("");
  const [inventoryCategoryId, setInventoryCategoryId] = useState("");
  const [inventoryProductSearch, setInventoryProductSearch] = useState("");
  const [inventoryRows, setInventoryRows] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductCategories, setSelectedProductCategories] = useState([]);
  const [selectedProductGenders, setSelectedProductGenders] = useState([]);
  const [selectedProductSizes, setSelectedProductSizes] = useState([]);
  const [selectedProductColors, setSelectedProductColors] = useState([]);
  const [selectedProductBrands, setSelectedProductBrands] = useState([]);
  const [selectedFormGenders, setSelectedFormGenders] = useState([]);
  const [selectedFormSizes, setSelectedFormSizes] = useState([]);
  const [selectedFormColors, setSelectedFormColors] = useState([]);
  const [selectedFormBrands, setSelectedFormBrands] = useState([]);
  const selectedCategory = categories.find((category) => category.id === form.category_id);
  const discountPercentPreview = Number(form.discount_percent);
  const basePricePreview = Number(form.price);
  const canPreviewDiscount = Number.isFinite(discountPercentPreview) && discountPercentPreview > 0 && discountPercentPreview < 100 && Number.isFinite(basePricePreview) && basePricePreview > 0;
  const discountedPricePreview = canPreviewDiscount ? roundMoney(basePricePreview * (1 - discountPercentPreview / 100)) : null;
  const filteredInventoryProducts = products.filter((product) => {
    const matchesCategory = !inventoryCategoryId || product.category_id === inventoryCategoryId;
    if (!matchesCategory) return false;
    const query = inventoryProductSearch.trim().toLowerCase();
    if (!query) return true;
    const namePt = String(product.name_pt || "").toLowerCase();
    const nameEs = String(product.name_es || "").toLowerCase();
    const categoryPt = String(product.category_name_pt || "").toLowerCase();
    const categoryEs = String(product.category_name_es || "").toLowerCase();
    const variants = (product.variants || []).map((variant) => String(variant.sku || "").toLowerCase()).join(" ");
    return namePt.includes(query) || nameEs.includes(query) || categoryPt.includes(query) || categoryEs.includes(query) || variants.includes(query);
  });
  const filteredProducts = useMemo(() => {
    const query = normalizeValue(productSearch);

    return products.filter((product) => {
      const categoryId = String(product.category_id || "");
      if (selectedProductCategories.length > 0 && !selectedProductCategories.includes(categoryId)) {
        return false;
      }

      const variants = Array.isArray(product.variants) ? product.variants : [];
      const productNamePt = String(product.name_pt || "");
      const productNameEs = String(product.name_es || "");
      const productNameCombined = `${productNamePt} ${productNameEs}`;

      if (query) {
        const variantText = variants.map((variant) => `${variant.sku || ""} ${JSON.stringify(variant.attribute_values || {})}`).join(" ");
        const searchable = normalizeValue(
          `${productNamePt} ${productNameEs} ${product.category_name_pt || ""} ${product.category_name_es || ""} ${variantText}`
        );
        if (!searchable.includes(query)) {
          return false;
        }
      }

      const attributes = variants.flatMap((variant) => Object.entries(parseAttributeObject(variant.attribute_values)));
      const valuesByKeyMatch = (matchers) =>
        attributes
          .filter(([key]) => matchers.some((matcher) => normalizeValue(key).includes(normalizeValue(matcher))))
          .map(([, value]) => String(value || ""));

      const genderValues = valuesByKeyMatch(["gender", "genero", "gênero", "sexo"]);
      if (selectedProductGenders.length > 0) {
        const genderMap = {
          mulher: ["mulher", "female", "woman", "women"],
          homem: ["homem", "male", "man", "men"],
          unisexo: ["unisexo", "unisex"]
        };
        const matchesGender = selectedProductGenders.some((selected) => {
          const tokens = genderMap[normalizeValue(selected)] || [normalizeValue(selected)];
          return genderValues.some((value) => tokens.some((token) => normalizeValue(value).includes(token)));
        });
        if (!matchesGender) return false;
      }

      const sizeValues = valuesByKeyMatch(["size", "tamanho"]);
      if (selectedProductSizes.length > 0) {
        const matchesSize = selectedProductSizes.some((size) =>
          sizeValues.some((value) => normalizeValue(value).split(/[^a-z0-9]+/).includes(normalizeValue(size)))
        );
        if (!matchesSize) return false;
      }

      const colorValues = valuesByKeyMatch(["color", "colour", "cor"]);
      if (selectedProductColors.length > 0) {
        const matchesColor = selectedProductColors.some((selected) =>
          colorValues.some((value) => colorMatches(value, selected))
        );
        if (!matchesColor) return false;
      }

      const brandValues = valuesByKeyMatch(["brand", "marca"]);
      if (selectedProductBrands.length > 0) {
        const matchesBrand = selectedProductBrands.some((selectedBrand) => {
          const selectedNorm = normalizeValue(selectedBrand);
          return brandValues.some((value) => normalizeValue(value).includes(selectedNorm)) || normalizeValue(productNameCombined).includes(selectedNorm);
        });
        if (!matchesBrand) return false;
      }

      return true;
    });
  }, [
    products,
    productSearch,
    selectedProductCategories,
    selectedProductGenders,
    selectedProductSizes,
    selectedProductColors,
    selectedProductBrands
  ]);
  const getProductThumbnail = (product) => {
    const firstImage = Array.isArray(product.images) ? product.images.find((image) => image?.image_url)?.image_url || "" : "";
    return resolveApiFileUrl(firstImage);
  };
  useEffect(() => {
    if (productImages.length === 0) {
      setProductImagePreviews([]);
      return;
    }
    const objectUrls = productImages.map((file) => URL.createObjectURL(file));
    setProductImagePreviews(objectUrls);
    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [productImages]);
  const formatAttributes = (attrs) => {
    if (!attrs) return "";
    let resolved = null;
    if (typeof attrs === "string") {
      try {
        resolved = JSON.parse(attrs);
      } catch {
        return "";
      }
    } else if (typeof attrs === "object") {
      resolved = attrs;
    }
    if (!resolved) return "";
    const entries = Object.entries(resolved).filter(([key]) => key);
    if (entries.length === 0) return "";
    return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ");
  };
  const variantOptions = products.flatMap(
    (product) => (product.variants || []).map((variant) => {
      const name = product.name_pt || product.name_es || product.id;
      const attrs = formatAttributes(variant.attribute_values);
      const label = attrs ? `${name} \u2022 ${variant.sku} \u2022 ${attrs}` : `${name} \u2022 ${variant.sku}`;
      return { id: variant.id, label };
    })
  );
  const loadInventory = async (productId) => {
    if (!productId) {
      setInventoryRows([]);
      return;
    }
    try {
      setLoadingInventory(true);
      const result = await adminApi.getInventory(productId);
      setInventoryRows(Array.isArray(result) ? result : []);
    } catch (e) {
      setInventoryRows([]);
      setError(e instanceof Error ? e.message : "Failed to load inventory");
    } finally {
      setLoadingInventory(false);
    }
  };
  const load = async () => {
    try {
      setError("");
      const [productRes, storeRes, categoryRes, integrationRes] = await Promise.allSettled([
        adminApi.listProducts(),
        adminApi.listStores(),
        adminApi.listCategories(),
        adminApi.getIntegrationSettings()
      ]);
      if (productRes.status === "fulfilled") {
        setProducts(productRes.value);
      } else {
        setProducts([]);
        setError(productRes.reason instanceof Error ? productRes.reason.message : "Failed to load products");
      }
      if (storeRes.status === "fulfilled") {
        setStores(storeRes.value);
      } else {
        setStores([]);
      }
      if (categoryRes.status === "fulfilled") {
        setCategories(categoryRes.value);
      } else {
        setCategories([]);
      }
      if (integrationRes.status === "fulfilled") {
        setStockLocked(Boolean(integrationRes.value?.is_active));
      } else {
        setStockLocked(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!inventoryProductId) return;
    void loadInventory(inventoryProductId);
  }, [inventoryProductId]);
  const resetProductForm = () => {
    setEditingProductId(null);
    setForm({
      name_pt: "",
      name_es: "",
      description_pt: "",
      description_es: "",
      sku: "",
      price: "0",
      compare_at_price: "",
      discount_percent: "",
      currency: "EUR",
      variant_is_active: true,
      is_promoted: false,
      category_id: ""
    });
    setVariantAttributes([createAttributeRow()]);
    setSpecifications([createSpecificationRow()]);
    setProductImages([]);
    setProductImagePreviews([]);
    setProductImageTags([]);
    setSelectedFormGenders([]);
    setSelectedFormSizes([]);
    setSelectedFormColors([]);
    setSelectedFormBrands([]);
  };
  const saveProduct = async () => {
    try {
      setError("");
      const basePrice = Number(form.price);
      if (!Number.isFinite(basePrice) || basePrice <= 0) {
        setError("Price must be greater than 0");
        return;
      }
      const manualCompareAt = form.compare_at_price ? Number(form.compare_at_price) : null;
      if (manualCompareAt != null && (!Number.isFinite(manualCompareAt) || manualCompareAt <= 0)) {
        setError("Compare at price must be greater than 0");
        return;
      }
      const parsedDiscountPercent = form.discount_percent ? Number(form.discount_percent) : 0;
      if (form.discount_percent && (!Number.isFinite(parsedDiscountPercent) || parsedDiscountPercent <= 0 || parsedDiscountPercent >= 100)) {
        setError("Discount % must be between 1 and 99");
        return;
      }
      const hasDiscountPercent = Number.isFinite(parsedDiscountPercent) && parsedDiscountPercent > 0;
      const effectivePrice = hasDiscountPercent ? roundMoney(basePrice * (1 - parsedDiscountPercent / 100)) : basePrice;
      const effectiveCompareAt = hasDiscountPercent ? roundMoney(basePrice) : manualCompareAt;
      const attributeMap = new Map();
      const addAttributeValues = (key, values) => {
        const safeKey = String(key || "").trim();
        if (!safeKey) return;
        const normalizedKey = normalizeValue(safeKey);
        const safeValues = values.map((value) => String(value || "").trim()).filter(Boolean);
        if (safeValues.length === 0) return;
        if (!attributeMap.has(normalizedKey)) {
          attributeMap.set(normalizedKey, { key: safeKey, values: new Set() });
        }
        const entry = attributeMap.get(normalizedKey);
        safeValues.forEach((value) => entry.values.add(value));
      };

      variantAttributes.forEach((item) => {
        const values = item.value.split(",").map((value) => value.trim()).filter((value) => Boolean(value));
        addAttributeValues(item.name, values);
      });

      addAttributeValues("gender", selectedFormGenders);
      addAttributeValues("size", selectedFormSizes);
      addAttributeValues("color", selectedFormColors);
      addAttributeValues("brand", selectedFormBrands);

      const parsedAttributeValues = Array.from(attributeMap.values()).map((entry) => [entry.key, Array.from(entry.values)]);
      const attributeCombinations = buildAttributeCombinations(parsedAttributeValues);
      const baseSku = form.sku.trim() || `SKU-${Date.now()}`;
      const variantsPayload = attributeCombinations.map((attributes, index) => {
        const suffix = Object.values(attributes).map((value) => toSlugPart(value)).filter((value) => Boolean(value)).join("-");
        const sku = attributeCombinations.length === 1 ? baseSku : `${baseSku}-${suffix || index + 1}`;
        return {
          sku,
          price: effectivePrice,
          compare_at_price: effectiveCompareAt,
          currency: form.currency || "EUR",
          attribute_values: attributes,
          is_active: form.variant_is_active
        };
      });
      const specificationsPayload = specifications.map((specification) => {
        const key = specification.key.trim();
        if (!key) return null;
        const pt = specification.value_pt.trim();
        const es = specification.value_es.trim();
        if (!pt && !es) return null;
        return {
          key,
          value: {
            pt: pt || es,
            es: es || pt
          }
        };
      }).filter((specification) => Boolean(specification));
      let imagePayload = [];
      if (productImages.length > 0) {
        const uploadedImages = await Promise.all(productImages.map((file) => uploadFile(file)));
        imagePayload = uploadedImages.map((uploaded, index) => ({
          image_url: uploaded.url,
          alt_text: productImageTags[index]?.trim() || form.name_pt || form.name_es || "",
          position: index
        }));
      }
      if (editingProductId) {
        await adminApi.updateProduct(editingProductId, {
          category_id: form.category_id || null,
          sku: form.sku || null,
          base_price: effectivePrice,
          name_pt: form.name_pt || null,
          name_es: form.name_es || null,
          description_pt: form.description_pt || null,
          description_es: form.description_es || null,
          specifications: specificationsPayload,
          is_promoted: form.is_promoted
        });
      } else {
        await adminApi.createProduct({
          category_id: form.category_id || null,
          name_pt: form.name_pt,
          name_es: form.name_es,
          description_pt: form.description_pt,
          description_es: form.description_es,
          specifications: specificationsPayload,
          is_promoted: form.is_promoted,
          images: imagePayload,
          variants: variantsPayload
        });
      }
      resetProductForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${editingProductId ? "update" : "create"} product`);
    }
  };
  const startEditProduct = (product) => {
    const firstVariant = (product.variants || [])[0];
    setEditingProductId(product.id);
    setForm({
      name_pt: product.name_pt || "",
      name_es: product.name_es || "",
      description_pt: "",
      description_es: "",
      sku: firstVariant?.sku || "",
      price: String(firstVariant?.price ?? "0"),
      compare_at_price: "",
      discount_percent: "",
      currency: "EUR",
      variant_is_active: true,
      is_promoted: Boolean(product.is_promoted),
      category_id: product.category_id || ""
    });
    setVariantAttributes([createAttributeRow()]);
    setSpecifications([createSpecificationRow()]);
    setProductImages([]);
    setProductImagePreviews([]);
    setProductImageTags([]);
    setSelectedFormGenders([]);
    setSelectedFormSizes([]);
    setSelectedFormColors([]);
    setSelectedFormBrands([]);
  };
  const updateStock = async () => {
    try {
      setError("");
      await adminApi.updateInventory(inventoryForm.variantId, inventoryForm.storeId, Number(inventoryForm.stock));
      const productIdFromVariant = products.find(
        (product) => product.variants?.some((variant) => variant.id === inventoryForm.variantId)
      )?.id;
      if (productIdFromVariant) {
        setInventoryProductId(productIdFromVariant);
        await loadInventory(productIdFromVariant);
      }
      setInventoryForm({ variantId: "", storeId: "", stock: "0" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update stock");
    }
  };
  return <div className='space-y-6'>
      <PageHeader title='Gestão de produtos' description='Criar/editar produtos, variantes, preços, promoções e stock.' />
      {error ? <p className='text-sm text-destructive'>{error}</p> : null}

      <Card>
        <CardHeader><CardTitle>Product Filters</CardTitle></CardHeader>
        <CardContent className='space-y-4'>
          <Input
            placeholder='Search products (name, category, sku, attributes)'
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
            <div className='space-y-2'>
              <p className='text-sm font-medium'>Categoria</p>
              <div className='space-y-2'>
                {categories.map((category) => {
                  const categoryId = String(category.id);
                  const checked = selectedProductCategories.includes(categoryId);
                  return <label key={categoryId} className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={() => setSelectedProductCategories((prev) => toggleSelection(prev, categoryId))}
                      />
                      {category.name_pt || category.name_es || categoryId}
                    </label>;
                })}
              </div>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium'>Genero</p>
              <div className='space-y-2'>
                {adminGenderOptions.map((gender) => {
                  const checked = selectedProductGenders.includes(gender);
                  return <label key={gender} className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={() => setSelectedProductGenders((prev) => toggleSelection(prev, gender))}
                      />
                      {gender}
                    </label>;
                })}
              </div>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium'>Tamanho</p>
              <div className='grid grid-cols-3 gap-2'>
                {adminSizeOptions.map((size) => {
                  const active = selectedProductSizes.includes(size);
                  return <button
                      key={size}
                      type='button'
                      className={`border px-2 py-1 text-xs ${active ? "border-black bg-black text-white" : "border-black/20"}`}
                      onClick={() => setSelectedProductSizes((prev) => toggleSelection(prev, size))}
                    >
                      {size}
                    </button>;
                })}
              </div>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium'>Cor</p>
              <div className='grid grid-cols-3 gap-3'>
                {adminColorSwatches.map((item) => {
                  const active = selectedProductColors.includes(item.name);
                  return <button
                      key={item.name}
                      type='button'
                      className='flex flex-col items-center gap-1 text-[11px]'
                      onClick={() => setSelectedProductColors((prev) => toggleSelection(prev, item.name))}
                    >
                      <span
                        className={`h-5 w-5 rounded-full ${item.light ? "ring-1 ring-black/20" : ""} ${active ? "ring-2 ring-black ring-offset-2" : ""}`}
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </button>;
                })}
              </div>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium'>Marcas</p>
              <div className='space-y-2'>
                {adminBrandOptions.map((brand) => {
                  const checked = selectedProductBrands.includes(brand);
                  return <label key={brand} className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={() => setSelectedProductBrands((prev) => toggleSelection(prev, brand))}
                      />
                      {brand}
                    </label>;
                })}
              </div>
            </div>
          </div>

          <div className='flex items-center justify-between gap-3'>
            <p className='text-xs text-muted-foreground'>Showing {filteredProducts.length} of {products.length} products</p>
            <Button
              variant='outline'
              onClick={() => {
                setProductSearch("");
                setSelectedProductCategories([]);
                setSelectedProductGenders([]);
                setSelectedProductSizes([]);
                setSelectedProductColors([]);
                setSelectedProductBrands([]);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Products ({filteredProducts.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Thumbnail</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>PT</TableHead>
                <TableHead>ES</TableHead>
                <TableHead>Promoted</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => <TableRow key={product.id}>
                  <TableCell>{product.id}</TableCell>
                  <TableCell>
                    {getProductThumbnail(product) ? <img
    src={getProductThumbnail(product)}
    alt={product.name_pt || product.name_es || "product"}
    className='h-10 w-10 rounded-md border object-cover'
  /> : "-"}
                  </TableCell>
                  <TableCell>{product.category_name_pt ?? product.category_name_es ?? "-"}</TableCell>
                  <TableCell>{product.name_pt}</TableCell>
                  <TableCell>{product.name_es}</TableCell>
                  <TableCell>{product.is_promoted ? "Yes" : "No"}</TableCell>
                  <TableCell>{product.variants?.map((v) => `${v.sku} (EUR ${v.price})`).join(", ") || "-"}</TableCell>
                  <TableCell className='flex gap-2'>
                    <Button variant='secondary' size='sm' onClick={() => startEditProduct(product)}>
                      Edit
                    </Button>
                    <ConfirmDeleteButton
    entityName={`product "${product.name_pt || product.name_es || product.id}"`}
    onConfirm={() => adminApi.deleteProduct(product.id).then(load)}
  />
                  </TableCell>
                </TableRow>)}
              {filteredProducts.length === 0 ? <TableRow><TableCell colSpan={8}>No products match current filters.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{editingProductId ? "Edit Product" : "Create Product + Variant"}</CardTitle></CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-2'>
          <select
    className='rounded-md border bg-background px-3 py-2 text-sm md:col-span-2'
    value={form.category_id}
    onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
  >
            <option value=''>Category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>
                {category.name_pt || category.name_es || category.id}
              </option>)}
          </select>
          {selectedCategory?.image_url ? <div className='md:col-span-2 flex items-center gap-3 rounded-md border bg-muted/20 p-2'>
              <img
    src={resolveApiFileUrl(selectedCategory.image_url)}
    alt={selectedCategory.name_pt || selectedCategory.name_es || "category"}
    className='h-12 w-12 rounded-md border object-cover'
  />
              <div className='text-sm'>
                <p className='font-medium'>Category thumbnail</p>
                <p className='text-xs text-muted-foreground'>{selectedCategory.name_pt || selectedCategory.name_es || selectedCategory.id}</p>
              </div>
            </div> : null}
          <Input placeholder='Name PT' value={form.name_pt} onChange={(e) => setForm((p) => ({ ...p, name_pt: e.target.value }))} />
          <Input placeholder='Name ES' value={form.name_es} onChange={(e) => setForm((p) => ({ ...p, name_es: e.target.value }))} />
          <Input placeholder='Description PT' value={form.description_pt} onChange={(e) => setForm((p) => ({ ...p, description_pt: e.target.value }))} />
          <Input placeholder='Description ES' value={form.description_es} onChange={(e) => setForm((p) => ({ ...p, description_es: e.target.value }))} />
          <div className='md:col-span-2 space-y-2'>
            <p className='text-sm text-muted-foreground'>Specifications (for all product types)</p>
            {specifications.map((specification, index) => <div key={specification.id} className='grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]'>
                <Input
    placeholder='Spec key (e.g. RAM)'
    value={specification.key}
    onChange={(e) => setSpecifications(
      (prev) => prev.map((item, i) => i === index ? { ...item, key: e.target.value } : item)
    )}
  />
                <Input
    placeholder='Value PT (e.g. 8 GB)'
    value={specification.value_pt}
    onChange={(e) => setSpecifications(
      (prev) => prev.map((item, i) => i === index ? { ...item, value_pt: e.target.value } : item)
    )}
  />
                <Input
    placeholder='Value ES (e.g. 8 GB)'
    value={specification.value_es}
    onChange={(e) => setSpecifications(
      (prev) => prev.map((item, i) => i === index ? { ...item, value_es: e.target.value } : item)
    )}
  />
                <Button
    variant='secondary'
    onClick={() => setSpecifications((prev) => prev.filter((_, i) => i !== index))}
    disabled={specifications.length === 1}
  >
                  Remove
                </Button>
              </div>)}
            <Button variant='secondary' onClick={() => setSpecifications((prev) => [...prev, createSpecificationRow()])}>
              Add specification
            </Button>
          </div>
          <input
    type='file'
    accept='image/*'
    multiple
    className='md:col-span-2 text-sm'
    onChange={(e) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      setProductImages((prev) => [...prev, ...files]);
      setProductImageTags((prev) => [...prev, ...files.map(() => "")]);
      e.currentTarget.value = "";
    }}
  />
          <p className='md:col-span-2 text-xs text-muted-foreground'>Upload limit: max 5 MB per image.</p>
          {productImagePreviews.length > 0 ? <div className='md:col-span-2 space-y-2 rounded-md border bg-muted/20 p-2'>
              <p className='text-xs text-muted-foreground'>Product images preview ({productImagePreviews.length})</p>
              <div className='flex flex-wrap gap-2'>
                {productImagePreviews.map((preview, index) => <div key={preview} className='relative'>
                    <img
    src={resolveApiFileUrl(preview)}
    alt={`Product preview ${index + 1}`}
    className='h-14 w-14 rounded-md border object-cover'
  />
                    <button
    type='button'
    className='absolute -right-1 -top-1 rounded-full border bg-background px-1 text-xs'
    onClick={() => {
      setProductImages((prev) => prev.filter((_, i) => i !== index));
      setProductImageTags((prev) => prev.filter((_, i) => i !== index));
    }}
    aria-label={`Remove image ${index + 1}`}
  >
                      x
                    </button>
                    <Input
    value={productImageTags[index] || ""}
    onChange={(e) => setProductImageTags((prev) => prev.map((tag, i) => i === index ? e.target.value : tag))}
    placeholder='Tag (e.g. Red, XL)'
    className='mt-2 h-7 w-28 text-xs'
  />
                  </div>)}
              </div>
              <p className='text-[11px] text-muted-foreground'>Use image tags to match variants (example: Red, Blue, XL).</p>
            </div> : null}
          <Input placeholder='SKU' value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
          <Input placeholder='Price' type='number' value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
          <Input
    placeholder='Compare at price'
    type='number'
    value={form.compare_at_price}
    onChange={(e) => setForm((p) => ({ ...p, compare_at_price: e.target.value }))}
  />
          <Input
    placeholder='Discount % (optional)'
    type='number'
    value={form.discount_percent}
    onChange={(e) => setForm((p) => ({ ...p, discount_percent: e.target.value }))}
  />
          {canPreviewDiscount ? <p className='md:col-span-2 text-xs text-muted-foreground'>
              Discount preview: EUR {basePricePreview.toFixed(2)} {"->"} EUR {discountedPricePreview?.toFixed(2)} ({discountPercentPreview}% off)
            </p> : null}
          <Input
    placeholder='Currency'
    value={form.currency}
    onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
  />
          <div className='md:col-span-2 space-y-3 rounded-md border bg-muted/20 p-3'>
            <p className='text-sm font-medium'>Storefront Features</p>
            <p className='text-xs text-muted-foreground'>
              Select sidebar features here so product variants are saved with these attributes.
            </p>

            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <div className='space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Genero</p>
                <div className='space-y-2'>
                  {adminGenderOptions.map((gender) => {
                    const checked = selectedFormGenders.includes(gender);
                    return <label key={gender} className='flex items-center gap-2 text-sm'>
                        <input
                          type='checkbox'
                          checked={checked}
                          onChange={() => setSelectedFormGenders((prev) => toggleSelection(prev, gender))}
                        />
                        {gender}
                      </label>;
                  })}
                </div>
              </div>

              <div className='space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Tamanho</p>
                <div className='grid grid-cols-3 gap-2'>
                  {adminSizeOptions.map((size) => {
                    const active = selectedFormSizes.includes(size);
                    return <button
                        key={size}
                        type='button'
                        className={`border px-2 py-1 text-xs ${active ? "border-black bg-black text-white" : "border-black/20"}`}
                        onClick={() => setSelectedFormSizes((prev) => toggleSelection(prev, size))}
                      >
                        {size}
                      </button>;
                  })}
                </div>
              </div>

              <div className='space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Cor</p>
                <div className='grid grid-cols-3 gap-3'>
                  {adminColorSwatches.map((item) => {
                    const active = selectedFormColors.includes(item.name);
                    return <button
                        key={item.name}
                        type='button'
                        className='flex flex-col items-center gap-1 text-[11px]'
                        onClick={() => setSelectedFormColors((prev) => toggleSelection(prev, item.name))}
                      >
                        <span
                          className={`h-5 w-5 rounded-full ${item.light ? "ring-1 ring-black/20" : ""} ${active ? "ring-2 ring-black ring-offset-2" : ""}`}
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </button>;
                  })}
                </div>
              </div>

              <div className='space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Marcas</p>
                <div className='space-y-2'>
                  {adminBrandOptions.map((brand) => {
                    const checked = selectedFormBrands.includes(brand);
                    return <label key={brand} className='flex items-center gap-2 text-sm'>
                        <input
                          type='checkbox'
                          checked={checked}
                          onChange={() => setSelectedFormBrands((prev) => toggleSelection(prev, brand))}
                        />
                        {brand}
                      </label>;
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className='md:col-span-2 space-y-2'>
            <p className='text-sm text-muted-foreground'>Variant attributes</p>
            {variantAttributes.map((attr, index) => <div key={attr.id} className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                <Input
    placeholder='Attribute name (e.g. Size)'
    value={attr.name}
    onChange={(e) => setVariantAttributes(
      (prev) => prev.map((item, i) => i === index ? { ...item, name: e.target.value } : item)
    )}
    className='flex-1'
  />
                <Input
    placeholder='Attribute value (e.g. yellow, red)'
    value={attr.value}
    onChange={(e) => setVariantAttributes(
      (prev) => prev.map((item, i) => i === index ? { ...item, value: e.target.value } : item)
    )}
    className='flex-1'
  />
                <Button
    variant='secondary'
    onClick={() => setVariantAttributes((prev) => prev.filter((_, i) => i !== index))}
    disabled={variantAttributes.length === 1}
  >
                  Remove
                </Button>
              </div>)}
            <Button
    variant='secondary'
    onClick={() => setVariantAttributes((prev) => [...prev, createAttributeRow()])}
  >
              Add attribute
            </Button>
            <p className='text-xs text-muted-foreground'>Tip: use comma-separated values to create multiple variants in one product (e.g. color: yellow, red).</p>
            <p className='text-xs text-muted-foreground'>For beauty shades, you can set custom color swatch: `Sandstone:#D8B08F, Rose Beige:#C98F7E`.</p>
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-sm'>Promoted</span>
            <Switch checked={form.is_promoted} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_promoted: checked }))} />
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-sm'>Variant Active</span>
            <Switch
    checked={form.variant_is_active}
    onCheckedChange={(checked) => setForm((p) => ({ ...p, variant_is_active: checked }))}
  />
          </div>
          <div className='md:col-span-2 flex gap-2'>
            <Button onClick={() => void saveProduct()}>
              {editingProductId ? "Update Product" : "Save Product"}
            </Button>
            {editingProductId ? <Button variant='outline' onClick={resetProductForm}>
                Cancel Edit
              </Button> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Inventory Update</CardTitle></CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-4'>
          <select
    className='rounded-md border bg-background px-3 py-2 text-sm'
    value={inventoryForm.variantId}
    onChange={(e) => setInventoryForm((p) => ({ ...p, variantId: e.target.value }))}
    disabled={stockLocked}
  >
            <option value=''>Variant (name + attributes)</option>
            {variantOptions.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
          </select>
          <select className='rounded-md border bg-background px-3 py-2 text-sm' value={inventoryForm.storeId} onChange={(e) => setInventoryForm((p) => ({ ...p, storeId: e.target.value }))} disabled={stockLocked}>
            <option value=''>Store</option>
            {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
          <Input placeholder='Stock Qty' type='number' value={inventoryForm.stock} onChange={(e) => setInventoryForm((p) => ({ ...p, stock: e.target.value }))} disabled={stockLocked} />
          <Button onClick={() => void updateStock()} disabled={stockLocked}>Update Stock</Button>
          {stockLocked ? <p className='text-xs text-muted-foreground md:col-span-4'>Stock editing is locked while integration is ON.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Inventory by Store</CardTitle></CardHeader>
        <CardContent className='space-y-3'>
          <div className='grid gap-3 md:grid-cols-3'>
            <select
    className='rounded-md border bg-background px-3 py-2 text-sm'
    value={inventoryCategoryId}
    onChange={(e) => {
      setInventoryCategoryId(e.target.value);
      setInventoryProductId("");
    }}
  >
              <option value=''>All Categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>
                  {category.name_pt || category.name_es || category.id}
                </option>)}
            </select>
            <Input
    placeholder='Search product (name, sku, category)'
    value={inventoryProductSearch}
    onChange={(e) => {
      setInventoryProductSearch(e.target.value);
      setInventoryProductId("");
    }}
  />
            <select
    className='rounded-md border bg-background px-3 py-2 text-sm'
    value={inventoryProductId}
    onChange={(e) => setInventoryProductId(e.target.value)}
  >
              <option value=''>Select Product</option>
              {filteredInventoryProducts.map((product) => <option key={product.id} value={product.id}>
                  {`${product.name_pt || product.name_es || product.id} (${product.category_name_pt || product.category_name_es || "No Category"})`}
                </option>)}
            </select>
          </div>
          <div className='grid gap-3 md:grid-cols-[1fr_auto]'>
            <p className='text-xs text-muted-foreground'>
              Products found: {filteredInventoryProducts.length}
            </p>
            <Button
    variant='secondary'
    onClick={() => void loadInventory(inventoryProductId)}
    disabled={!inventoryProductId || loadingInventory}
  >
              {loadingInventory ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Variant SKU</TableHead>
                <TableHead>Stock Qty</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!inventoryProductId ? <TableRow><TableCell colSpan={4}>Select a product to view stock.</TableCell></TableRow> : loadingInventory ? <TableRow><TableCell colSpan={4}>Loading inventory...</TableCell></TableRow> : inventoryRows.length === 0 ? <TableRow><TableCell colSpan={4}>No inventory records for this product.</TableCell></TableRow> : inventoryRows.map((row, index) => <TableRow key={`${row.store_id}-${row.variant_id || index}`}>
                    <TableCell>{row.store_name || row.store_id}</TableCell>
                    <TableCell>{row.sku || row.variant_id || "-"}</TableCell>
                    <TableCell>{Number(row.stock_quantity || 0)}</TableCell>
                    <TableCell>{row.updated_at ? new Date(row.updated_at).toLocaleString() : "-"}</TableCell>
                  </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = Products;
export {
  stdin_default as default
};
