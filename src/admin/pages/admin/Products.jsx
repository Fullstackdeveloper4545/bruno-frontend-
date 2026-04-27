import { useEffect, useMemo, useState } from "react";
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
const PRODUCTS_PER_PAGE = 10;
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
const normalizeSpecifications = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return [createSpecificationRow()];
  const rows = raw
    .map((item, index) => {
      const value = item?.value && typeof item.value === "object" ? item.value : {};
      const key = String(item?.key || "").trim();
      const valuePt = String(value?.pt || value?.value_pt || "").trim();
      const valueEs = String(value?.es || value?.value_es || "").trim();
      if (!key && !valuePt && !valueEs) return null;
      return {
        id: item?.id != null ? `spec-${item.id}` : `spec-${Date.now()}-${index}`,
        key,
        value_pt: valuePt,
        value_es: valueEs
      };
    })
    .filter(Boolean);
  return rows.length > 0 ? rows : [createSpecificationRow()];
};
const toggleSelection = (items, value) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
const colorMatches = (value, selectedColor) => {
  const haystack = normalizeValue(value);
  if (!haystack) return false;
  const tokens = colorAliasMap[normalizeValue(selectedColor)] || [normalizeValue(selectedColor)];
  return tokens.some((token) => haystack.includes(token));
};
const figmaSectionClass = "rounded-[28px] border-0 bg-[#f3f3f1] shadow-none";
const figmaInputClass =
  "h-10 rounded-[10px] border border-black bg-white px-4 text-[13px] text-black shadow-none placeholder:text-[#7b8085] focus:border-black focus:ring-0";
const figmaTextareaClass =
  "min-h-[92px] rounded-[10px] border border-black bg-white px-4 py-3 text-[13px] text-black shadow-none placeholder:text-[#7b8085] focus:border-black focus:ring-0";
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
  const [existingProductImages, setExistingProductImages] = useState([]);
  const [removedExistingImageIds, setRemovedExistingImageIds] = useState([]);
  const [inventoryForm, setInventoryForm] = useState({ variantId: "", storeId: "", stock: "0" });
  const [inventoryProductId, setInventoryProductId] = useState("");
  const [inventoryCategoryId, setInventoryCategoryId] = useState("");
  const [inventoryProductSearch, setInventoryProductSearch] = useState("");
  const [inventoryRows, setInventoryRows] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productSearch, _setProductSearch] = useState("");
  const [selectedProductCategories, _setSelectedProductCategories] = useState([]);
  const [selectedProductGenders, _setSelectedProductGenders] = useState([]);
  const [selectedProductSizes, _setSelectedProductSizes] = useState([]);
  const [selectedProductColors, _setSelectedProductColors] = useState([]);
  const [selectedProductBrands, _setSelectedProductBrands] = useState([]);
  const [productPage, setProductPage] = useState(1);
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
  const productFilterState = {
    search: productSearch,
    categories: selectedProductCategories,
    genders: selectedProductGenders,
    sizes: selectedProductSizes,
    colors: selectedProductColors,
    brands: selectedProductBrands
  };
  const matchesProductFilters = (product, filters = productFilterState) => {
    const categoryId = String(product.category_id || "");
    if (filters.categories.length > 0 && !filters.categories.includes(categoryId)) {
      return false;
    }

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const productNamePt = String(product.name_pt || "");
    const productNameEs = String(product.name_es || "");
    const productNameCombined = `${productNamePt} ${productNameEs}`;
    const query = normalizeValue(filters.search);

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

    const genderValues = valuesByKeyMatch(["gender", "genero", "gÃªnero", "sexo"]);
    if (filters.genders.length > 0) {
      const genderMap = {
        mulher: ["mulher", "female", "woman", "women"],
        homem: ["homem", "male", "man", "men"],
        unisexo: ["unisexo", "unisex"]
      };
      const matchesGender = filters.genders.some((selected) => {
        const tokens = genderMap[normalizeValue(selected)] || [normalizeValue(selected)];
        return genderValues.some((value) => tokens.some((token) => normalizeValue(value).includes(token)));
      });
      if (!matchesGender) return false;
    }

    const sizeValues = valuesByKeyMatch(["size", "tamanho"]);
    if (filters.sizes.length > 0) {
      const matchesSize = filters.sizes.some((size) =>
        sizeValues.some((value) => normalizeValue(value).split(/[^a-z0-9]+/).includes(normalizeValue(size)))
      );
      if (!matchesSize) return false;
    }

    const colorValues = valuesByKeyMatch(["color", "colour", "cor"]);
    if (filters.colors.length > 0) {
      const matchesColor = filters.colors.some((selected) =>
        colorValues.some((value) => colorMatches(value, selected))
      );
      if (!matchesColor) return false;
    }

    const brandValues = valuesByKeyMatch(["brand", "marca"]);
    if (filters.brands.length > 0) {
      const matchesBrand = filters.brands.some((selectedBrand) => {
        const selectedNorm = normalizeValue(selectedBrand);
        return brandValues.some((value) => normalizeValue(value).includes(selectedNorm)) || normalizeValue(productNameCombined).includes(selectedNorm);
      });
      if (!matchesBrand) return false;
    }

    return true;
  };
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
  const withFacetSelection = (items, value) => items.includes(value) ? items : [...items, value];
  const _filterCountMaps = (() => {
    const countForFilters = (filters) => products.filter((product) => matchesProductFilters(product, filters)).length;
    return {
      categories: new Map(
        categories.map((category) => {
          const categoryId = String(category.id);
          return [
            categoryId,
            countForFilters({
              ...productFilterState,
              categories: withFacetSelection(productFilterState.categories, categoryId)
            })
          ];
        })
      ),
      genders: new Map(
        adminGenderOptions.map((gender) => [
          gender,
          countForFilters({
            ...productFilterState,
            genders: withFacetSelection(productFilterState.genders, gender)
          })
        ])
      ),
      sizes: new Map(
        adminSizeOptions.map((size) => [
          size,
          countForFilters({
            ...productFilterState,
            sizes: withFacetSelection(productFilterState.sizes, size)
          })
        ])
      ),
      colors: new Map(
        adminColorSwatches.map((item) => [
          item.name,
          countForFilters({
            ...productFilterState,
            colors: withFacetSelection(productFilterState.colors, item.name)
          })
        ])
      ),
      brands: new Map(
        adminBrandOptions.map((brand) => [
          brand,
          countForFilters({
            ...productFilterState,
            brands: withFacetSelection(productFilterState.brands, brand)
          })
        ])
      )
    };
  })();
  const _activeProductFilterCount = [
    productSearch.trim() ? 1 : 0,
    selectedProductCategories.length,
    selectedProductGenders.length,
    selectedProductSizes.length,
    selectedProductColors.length,
    selectedProductBrands.length
  ].reduce((total, value) => total + value, 0);
  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const startIndex = (productPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredProducts, productPage]);
  const paginationStart = filteredProducts.length === 0 ? 0 : (productPage - 1) * PRODUCTS_PER_PAGE + 1;
  const paginationEnd = filteredProducts.length === 0 ? 0 : Math.min(productPage * PRODUCTS_PER_PAGE, filteredProducts.length);
  const visibleProductPages = useMemo(() => {
    const startPage = Math.max(1, productPage - 2);
    const endPage = Math.min(totalProductPages, startPage + 4);
    const adjustedStartPage = Math.max(1, endPage - 4);
    return Array.from({ length: endPage - adjustedStartPage + 1 }, (_, index) => adjustedStartPage + index);
  }, [productPage, totalProductPages]);
  const getProductThumbnail = (product) => {
    const firstImage = Array.isArray(product.images) ? product.images.find((image) => image?.image_url)?.image_url || "" : "";
    return resolveApiFileUrl(firstImage);
  };
  const getPrimaryVariant = (product) => Array.isArray(product.variants) ? product.variants[0] || null : null;
  const getProductReference = (product) => getPrimaryVariant(product)?.sku || product.sku || product.id || "-";
  const getProductPriceLabel = (product) => {
    const variant = getPrimaryVariant(product);
    const value = Number(variant?.price ?? product.base_price ?? 0);
    if (!Number.isFinite(value) || value <= 0) return "-";
    return `${Math.round(value * 100) / 100}€`;
  };
  const getProductStockLabel = (product) => {
    const quantities = [
      Number(product?.stock_quantity),
      Number(product?.stock_left),
      ...(Array.isArray(product.variants)
        ? product.variants.flatMap((variant) => [Number(variant?.stock_quantity), Number(variant?.stock_left)])
        : [])
    ].filter((value) => Number.isFinite(value));
    const hasStock = quantities.some((value) => value > 0);
    return hasStock ? "Em Stock" : "Sem Stock";
  };
  const getProductBrandSummary = (product) => {
    const brands = Array.isArray(product.variants)
      ? product.variants.flatMap((variant) => {
          const attributes = parseAttributeObject(variant.attribute_values);
          return Object.entries(attributes)
            .filter(([key]) => normalizeValue(key).includes("brand") || normalizeValue(key).includes("marca"))
            .map(([, value]) => String(value || "").trim())
            .filter(Boolean);
        })
      : [];
    return brands[0] || "-";
  };
  const getProductTagSummary = (product) => {
    const tags = Array.isArray(product.variants)
      ? product.variants.flatMap((variant) => {
          const attributes = parseAttributeObject(variant.attribute_values);
          return Object.values(attributes).map((value) => String(value || "").trim()).filter(Boolean);
        })
      : [];
    const uniqueTags = Array.from(new Set(tags));
    return uniqueTags.slice(0, 2).join(", ") || "-";
  };
  useEffect(() => {
    setProductPage(1);
  }, [
    productSearch,
    selectedProductCategories,
    selectedProductGenders,
    selectedProductSizes,
    selectedProductColors,
    selectedProductBrands
  ]);
  useEffect(() => {
    setProductPage((currentPage) => Math.min(currentPage, totalProductPages));
  }, [totalProductPages]);
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
    setExistingProductImages([]);
    setRemovedExistingImageIds([]);
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
        const editingProduct = products.find((item) => String(item.id) === String(editingProductId));
        const editingVariants = Array.isArray(editingProduct?.variants) ? editingProduct.variants : [];
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
        if (editingVariants.length > 0) {
          await Promise.all(
            editingVariants.map((variant, index) =>
              adminApi.updateVariant(String(variant.id), {
                price: effectivePrice,
                compare_at_price: effectiveCompareAt,
                currency: form.currency || "EUR",
                is_active: form.variant_is_active,
                sku: editingVariants.length === 1 && index === 0 ? form.sku || variant.sku : variant.sku
              })
            )
          );
        }
        if (removedExistingImageIds.length > 0) {
          await Promise.all(
            removedExistingImageIds.map((imageId) => adminApi.deleteProductImage(String(editingProductId), imageId))
          );
        }
        if (imagePayload.length > 0) {
          await Promise.all(
            imagePayload.map((image, index) =>
              adminApi.addProductImage(String(editingProductId), {
                ...image,
                position: existingProductImages.length + index
              })
            )
          );
        }
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
    const firstVariantPrice = Number(firstVariant?.price ?? product.base_price ?? 0);
    const firstVariantCompareAt = Number(firstVariant?.compare_at_price ?? 0);
    const inferredDiscount =
      Number.isFinite(firstVariantPrice) &&
      Number.isFinite(firstVariantCompareAt) &&
      firstVariantCompareAt > firstVariantPrice &&
      firstVariantCompareAt > 0
        ? Math.round(((firstVariantCompareAt - firstVariantPrice) / firstVariantCompareAt) * 100)
        : "";
    setEditingProductId(product.id);
    setForm({
      name_pt: product.name_pt || "",
      name_es: product.name_es || "",
      description_pt: product.description_pt || "",
      description_es: product.description_es || "",
      sku: firstVariant?.sku || "",
      price: String(firstVariant?.price ?? "0"),
      compare_at_price: firstVariant?.compare_at_price != null ? String(firstVariant.compare_at_price) : "",
      discount_percent: inferredDiscount === "" ? "" : String(inferredDiscount),
      currency: firstVariant?.currency || "EUR",
      variant_is_active: firstVariant?.is_active ?? true,
      is_promoted: Boolean(product.is_promoted),
      category_id: product.category_id || ""
    });
    setVariantAttributes([createAttributeRow()]);
    setSpecifications(normalizeSpecifications(product.specifications));
    setProductImages([]);
    setProductImagePreviews([]);
    setProductImageTags([]);
    setExistingProductImages(
      Array.isArray(product.images)
        ? product.images.map((image, index) => ({
            id: String(image?.id ?? `existing-${index}`),
            image_url: image?.image_url || "",
            alt_text: image?.alt_text || "",
            position: image?.position ?? index
          }))
        : []
    );
    setRemovedExistingImageIds([]);
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
  return <div className='max-w-[980px] space-y-9'>
      <section className='space-y-2 pt-1'>
        <p className='text-xs uppercase tracking-[0.38em] text-[#7da3ae]'>BACKOFFICE</p>
        <h1 className='text-[2.25rem] font-medium leading-none text-black sm:text-[3rem]'>Gestão de Produtos</h1>
        <p className='text-[15px] text-black'>Produtos, variantes, preços, promoções e inventário</p>
      </section>
      {error ? <p className='text-sm text-destructive'>{error}</p> : null}

      <div className='space-y-6'>
        <Card className={figmaSectionClass}>
          <CardHeader className='flex flex-col gap-3 px-7 pb-4 pt-6 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle className='text-[18px] font-normal text-black'>Produtos</CardTitle>
              <p className='text-sm text-muted-foreground'>
                Showing {paginationStart}-{paginationEnd} of {filteredProducts.length} products
              </p>
            </div>
            <p className='text-xs text-muted-foreground'>Page {productPage} of {totalProductPages}</p>
          </CardHeader>
          <CardContent className='px-0 pb-6'>
            <Table>
              <TableHeader>
                <TableRow className='border-b border-black hover:bg-transparent'>
                  <TableHead className='px-7 pb-3 text-[9px] font-normal uppercase tracking-[0.14em] text-[#9aa0a5]'>Produto</TableHead>
                  <TableHead className='pb-3 text-[9px] font-normal uppercase tracking-[0.14em] text-[#9aa0a5]'>REF</TableHead>
                  <TableHead className='pb-3 text-[9px] font-normal uppercase tracking-[0.14em] text-[#9aa0a5]'>Categoria</TableHead>
                  <TableHead className='pb-3 text-[9px] font-normal uppercase tracking-[0.14em] text-[#9aa0a5]'>Preço</TableHead>
                  <TableHead className='pb-3 text-[9px] font-normal uppercase tracking-[0.14em] text-[#9aa0a5]'>Stock</TableHead>
                  <TableHead className='pb-3 text-[9px] font-normal uppercase tracking-[0.14em] text-[#9aa0a5]'>Etiquetas</TableHead>
                  <TableHead className='pb-3 text-[9px] font-normal uppercase tracking-[0.14em] text-[#9aa0a5]'>Marcas</TableHead>
                  <TableHead className='pr-7 pb-3 text-[9px] font-normal uppercase tracking-[0.14em] text-[#9aa0a5]'>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => <TableRow key={product.id}>
                    <TableCell className='px-7 py-4'>
                      <div className='flex items-center gap-3'>
                        {getProductThumbnail(product) ? <img
      src={getProductThumbnail(product)}
      alt={product.name_pt || product.name_es || "product"}
      className='h-8 w-8 rounded-md border border-white object-cover'
    /> : <div className='flex h-8 w-8 items-center justify-center rounded-md bg-white text-[8px] text-[#9aa0a5]'>IMG</div>}
                        <div className='min-w-0'>
                          <p className='truncate text-[10px] text-black'>{product.name_pt || product.name_es || `Produto ${product.id}`}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className='py-4 text-[10px] text-black'>{getProductReference(product)}</TableCell>
                    <TableCell className='py-4 text-[10px] text-black'>{product.category_name_pt ?? product.category_name_es ?? "-"}</TableCell>
                    <TableCell className='py-4 text-[10px] text-black'>{getProductPriceLabel(product)}</TableCell>
                    <TableCell className={`py-4 text-[10px] ${getProductStockLabel(product) === "Em Stock" ? "text-[#68c35a]" : "text-[#e53935]"}`}>
                      {getProductStockLabel(product)}
                    </TableCell>
                    <TableCell className='py-4 text-[10px] text-black'>{getProductTagSummary(product)}</TableCell>
                    <TableCell className='py-4 text-[10px] text-black'>{getProductBrandSummary(product)}</TableCell>
                    <TableCell className='pr-7 py-4'>
                      <div className='flex items-center gap-2'>
                        <Button
                          variant='secondary'
                          size='sm'
                          className='h-7 rounded-[6px] !bg-black px-4 text-[10px] font-medium !text-white hover:!bg-black'
                          onClick={() => startEditProduct(product)}
                        >
                        Edit
                        </Button>
                        <ConfirmDeleteButton
      entityName={`product "${product.name_pt || product.name_es || product.id}"`}
      onConfirm={() => adminApi.deleteProduct(product.id).then(load)}
    />
                      </div>
                    </TableCell>
                  </TableRow>)}
                {filteredProducts.length === 0 ? <TableRow><TableCell colSpan={8} className='px-7 py-8 text-[12px] text-[#6f7678]'>No products available.</TableCell></TableRow> : null}
              </TableBody>
            </Table>

            {filteredProducts.length > PRODUCTS_PER_PAGE ? <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <p className='text-sm text-muted-foreground'>
                  Page {productPage} of {totalProductPages}
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='!border-black !bg-black !text-white hover:!bg-black disabled:!bg-black disabled:!text-white'
                    disabled={productPage === 1}
                    onClick={() => setProductPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </Button>
                  {visibleProductPages.map((pageNumber) => <Button
                      key={pageNumber}
                      variant={pageNumber === productPage ? 'default' : 'outline'}
                      size='sm'
                      className='!border-black !bg-black !text-white hover:!bg-black'
                      onClick={() => setProductPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>)}
                  <Button
                    variant='outline'
                    size='sm'
                    className='!border-black !bg-black !text-white hover:!bg-black disabled:!bg-black disabled:!text-white'
                    disabled={productPage === totalProductPages}
                    onClick={() => setProductPage((page) => Math.min(totalProductPages, page + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div> : null}
          </CardContent>
        </Card>
      </div>

      <Card className={figmaSectionClass}>
        <CardHeader className='px-7 pb-4 pt-6'><CardTitle className='text-[18px] font-normal text-black'>{editingProductId ? "Editar Produto + Variante" : "Criar Produto + Variante"}</CardTitle></CardHeader>
        <CardContent className='grid gap-4 px-7 pb-7 md:grid-cols-2'>
          <select
    className={`${figmaInputClass} md:col-span-2`}
    value={form.category_id}
    onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
  >
            <option value=''>Category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>
                {category.name_pt || category.name_es || category.id}
              </option>)}
          </select>
          {selectedCategory?.image_url ? <div className='md:col-span-2 flex items-center gap-3 rounded-[14px] border border-[#d9e3e6] bg-white p-3'>
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
          <Input className={figmaInputClass} placeholder='Nome do Produto' value={form.name_pt} onChange={(e) => setForm((p) => ({ ...p, name_pt: e.target.value }))} />
          <Input className={figmaInputClass} placeholder='Nome ES' value={form.name_es} onChange={(e) => setForm((p) => ({ ...p, name_es: e.target.value }))} />
          <textarea className={`md:col-span-2 ${figmaTextareaClass}`} placeholder='Descrição do Produto' value={form.description_pt} onChange={(e) => setForm((p) => ({ ...p, description_pt: e.target.value }))} />
          <textarea className={`md:col-span-2 ${figmaTextareaClass}`} placeholder='Descrição ES' value={form.description_es} onChange={(e) => setForm((p) => ({ ...p, description_es: e.target.value }))} />
          <div className='md:col-span-2 space-y-3 pt-1'>
            <p className='text-[11px] text-black'>Especificações (para todo o tipo de produtos)</p>
            {specifications.map((specification, index) => <div key={specification.id} className='grid gap-2 sm:grid-cols-[1fr_1fr_1fr_92px]'>
                <Input
    className={figmaInputClass}
    placeholder='Info específica'
    value={specification.key}
    onChange={(e) => setSpecifications(
      (prev) => prev.map((item, i) => i === index ? { ...item, key: e.target.value } : item)
    )}
  />
                <Input
    className={figmaInputClass}
    placeholder='Info específica'
    value={specification.value_pt}
    onChange={(e) => setSpecifications(
      (prev) => prev.map((item, i) => i === index ? { ...item, value_pt: e.target.value } : item)
    )}
  />
                <Input
    className={figmaInputClass}
    placeholder='Info específica'
    value={specification.value_es}
    onChange={(e) => setSpecifications(
      (prev) => prev.map((item, i) => i === index ? { ...item, value_es: e.target.value } : item)
    )}
  />
                <Button
    variant='secondary'
    className='h-10 rounded-[10px] !bg-black px-3 text-[11px] !text-white hover:!bg-black disabled:!bg-black disabled:!text-white'
    onClick={() => setSpecifications((prev) => prev.filter((_, i) => i !== index))}
    disabled={specifications.length === 1}
  >
                  Remove
                </Button>
              </div>)}
            <Button className='h-10 w-fit rounded-[9px] !bg-black px-5 text-[11px] !text-white hover:!bg-black' onClick={() => setSpecifications((prev) => [...prev, createSpecificationRow()])}>
              Adicionar Especificação
            </Button>
          </div>
          <div className='md:col-span-2 space-y-2'>
            <label className='inline-flex h-10 cursor-pointer items-center justify-center rounded-[10px] border border-black !bg-black px-5 text-[11px] !text-white hover:!bg-black'>
              Escolher ficheiros
              <input
                type='file'
                accept='image/*'
                multiple
                className='hidden'
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length === 0) return;
                  setProductImages((prev) => [...prev, ...files]);
                  setProductImageTags((prev) => [...prev, ...files.map(() => "")]);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <p className='text-[9px] text-black'>
              {existingProductImages.length + productImages.length > 0
                ? `${existingProductImages.length + productImages.length} imagem(ns) pronta(s) para o produto`
                : "Nenhum ficheiro selecionado"}
            </p>
            <p className='text-[8px] text-[#6f7678]'>Faz upload de no máximo 5MB por imagem</p>
          </div>
          {existingProductImages.length > 0 ? <div className='md:col-span-2 space-y-2 rounded-[16px] border border-[#d9e3e6] bg-white p-3'>
              <p className='text-[11px] text-muted-foreground'>Current product images ({existingProductImages.length})</p>
              <div className='flex flex-wrap gap-3'>
                {existingProductImages.map((image, index) => <div key={image.id} className='relative'>
                    <img
    src={resolveApiFileUrl(image.image_url)}
    alt={image.alt_text || `Current image ${index + 1}`}
    className='h-16 w-16 rounded-md border object-cover'
  />
                    <button
    type='button'
    className='absolute -right-1 -top-1 rounded-full border border-black !bg-black px-1 text-xs !text-white'
    onClick={() => {
      setExistingProductImages((prev) => prev.filter((item) => item.id !== image.id));
      setRemovedExistingImageIds((prev) => prev.includes(image.id) ? prev : [...prev, image.id]);
    }}
    aria-label={`Remove current image ${index + 1}`}
  >
                      x
                    </button>
                    <p className='mt-2 max-w-24 truncate text-[10px] text-muted-foreground'>{image.alt_text || "Sem tag"}</p>
                  </div>)}
              </div>
            </div> : null}
          {productImagePreviews.length > 0 ? <div className='md:col-span-2 space-y-2 rounded-[16px] border border-[#d9e3e6] bg-white p-3'>
              <p className='text-[11px] text-muted-foreground'>Product images preview ({productImagePreviews.length})</p>
              <div className='flex flex-wrap gap-2'>
                {productImagePreviews.map((preview, index) => <div key={preview} className='relative'>
                    <img
    src={preview}
    alt={`Product preview ${index + 1}`}
    className='h-14 w-14 rounded-md border object-cover'
  />
                    <button
    type='button'
    className='absolute -right-1 -top-1 rounded-full border border-black !bg-black px-1 text-xs !text-white'
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
    className='mt-2 h-7 w-28 rounded-[8px] border border-black text-xs'
  />
                  </div>)}
              </div>
              <p className='text-[11px] text-muted-foreground'>Use image tags to match variants (example: Red, Blue, XL).</p>
            </div> : null}
          <Input className={figmaInputClass} placeholder='SKU' value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
          <Input className={figmaInputClass} placeholder='0' type='number' value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
          <Input
    className={figmaInputClass}
    placeholder='Comparar o preço'
    type='number'
    value={form.compare_at_price}
    onChange={(e) => setForm((p) => ({ ...p, compare_at_price: e.target.value }))}
  />
          <Input
    className={figmaInputClass}
    placeholder='Desconto %'
    type='number'
    value={form.discount_percent}
    onChange={(e) => setForm((p) => ({ ...p, discount_percent: e.target.value }))}
  />
          {canPreviewDiscount ? <p className='md:col-span-2 text-xs text-muted-foreground'>
              Discount preview: EUR {basePricePreview.toFixed(2)} {"->"} EUR {discountedPricePreview?.toFixed(2)} ({discountPercentPreview}% off)
            </p> : null}
          <Input
    className={figmaInputClass}
    placeholder='Currency'
    value={form.currency}
    onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
  />
          <div className='md:col-span-2 space-y-3 rounded-[18px] border border-[#d9e3e6] bg-white p-4'>
            <p className='text-[12px] font-medium text-black'>Storefront Features</p>
            <p className='text-[11px] text-muted-foreground'>
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
                        className={`border px-2 py-1 text-xs !border-black !bg-black !text-white ${active ? "ring-2 ring-black ring-offset-2" : ""}`}
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
          <div className='md:col-span-2 space-y-3 pt-1'>
            <p className='text-[11px] text-black'>Atributos de Variantes</p>
            {variantAttributes.map((attr, index) => <div key={attr.id} className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                <Input
    placeholder='Nome do atributo (ex: tamanho)'
    value={attr.name}
    onChange={(e) => setVariantAttributes(
      (prev) => prev.map((item, i) => i === index ? { ...item, name: e.target.value } : item)
    )}
    className={`flex-1 ${figmaInputClass}`}
  />
                <Input
    placeholder='Nome do atributo (ex: amarelo, vermelho)'
    value={attr.value}
    onChange={(e) => setVariantAttributes(
      (prev) => prev.map((item, i) => i === index ? { ...item, value: e.target.value } : item)
    )}
    className={`flex-1 ${figmaInputClass}`}
  />
                <Button
    variant='secondary'
    className='h-10 rounded-[10px] !bg-black px-4 text-[11px] !text-white hover:!bg-black disabled:!bg-black disabled:!text-white'
    onClick={() => setVariantAttributes((prev) => prev.filter((_, i) => i !== index))}
    disabled={variantAttributes.length === 1}
  >
                  Remove
                </Button>
              </div>)}
            <Button
    className='h-10 w-fit rounded-[9px] !bg-black px-5 text-[11px] !text-white hover:!bg-black'
    onClick={() => setVariantAttributes((prev) => [...prev, createAttributeRow()])}
  >
              Adicionar Atributo
            </Button>
            <p className='text-[10px] italic text-muted-foreground'>Nota: utilize vírgulas para separar os valores, para criar diferentes variantes no mesmo produto.</p>
            <p className='text-xs text-muted-foreground'>For beauty shades, you can set custom color swatch: `Sandstone:#D8B08F, Rose Beige:#C98F7E`.</p>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[11px] text-black'>Promovido</span>
            <Switch className='h-5 w-9 !bg-black' checked={form.is_promoted} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_promoted: checked }))} />
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[11px] text-black'>Variante ativa</span>
            <Switch
    className='h-5 w-9 !bg-black'
    checked={form.variant_is_active}
    onCheckedChange={(checked) => setForm((p) => ({ ...p, variant_is_active: checked }))}
  />
          </div>
          <div className='md:col-span-2 flex flex-wrap gap-2 pt-3'>
            <Button className='h-10 rounded-[9px] !bg-black px-6 text-[11px] !text-white hover:!bg-black' onClick={() => void saveProduct()}>
              {editingProductId ? "Atualizar Produto" : "Guardar Produto"}
            </Button>
            {editingProductId ? <Button variant='outline' className='h-10 rounded-[9px] !border-black !bg-black px-5 text-[11px] !text-white hover:!bg-black' onClick={resetProductForm}>
                Cancelar
              </Button> : null}
          </div>
        </CardContent>
      </Card>

      <Card className={figmaSectionClass}>
        <CardHeader className='px-7 pb-4 pt-6'><CardTitle className='text-[18px] font-normal text-black'>Atualizações de Inventários</CardTitle></CardHeader>
        <CardContent className='grid gap-3 px-7 pb-7 md:grid-cols-4'>
          <select
    className={figmaInputClass}
    value={inventoryForm.variantId}
    onChange={(e) => setInventoryForm((p) => ({ ...p, variantId: e.target.value }))}
    disabled={stockLocked}
  >
            <option value=''>Variant (name + attributes)</option>
            {variantOptions.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
          </select>
          <select className={figmaInputClass} value={inventoryForm.storeId} onChange={(e) => setInventoryForm((p) => ({ ...p, storeId: e.target.value }))} disabled={stockLocked}>
            <option value=''>Store</option>
            {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
          <Input className={figmaInputClass} placeholder='0' type='number' value={inventoryForm.stock} onChange={(e) => setInventoryForm((p) => ({ ...p, stock: e.target.value }))} disabled={stockLocked} />
          <Button className='h-10 rounded-[9px] !bg-black px-5 text-[11px] !text-white hover:!bg-black disabled:!bg-black disabled:!text-white' onClick={() => void updateStock()} disabled={stockLocked}>Atualizar Stock</Button>
          {stockLocked ? <p className='text-xs text-muted-foreground md:col-span-4'>Stock editing is locked while integration is ON.</p> : null}
        </CardContent>
      </Card>

      <Card className={figmaSectionClass}>
        <CardHeader className='px-7 pb-4 pt-6'><CardTitle className='text-[18px] font-normal text-black'>Inventário por Loja</CardTitle></CardHeader>
        <CardContent className='space-y-4 px-7 pb-7'>
          <div className='grid gap-3 md:grid-cols-3'>
            <select
    className={figmaInputClass}
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
    className={figmaInputClass}
    placeholder='Search product (name, sku, category)'
    value={inventoryProductSearch}
    onChange={(e) => {
      setInventoryProductSearch(e.target.value);
      setInventoryProductId("");
    }}
            />
            <select
    className={figmaInputClass}
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
    className='h-10 rounded-[9px] !bg-black px-5 text-[11px] !text-white hover:!bg-black disabled:!bg-black disabled:!text-white'
    onClick={() => void loadInventory(inventoryProductId)}
    disabled={!inventoryProductId || loadingInventory}
  >
              {loadingInventory ? "Atualizar..." : "Atualizar"}
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
export default Products;
