import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import { Pagination, Navigation } from 'swiper/modules'
import './App.css'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ProductCard from './components/ui/ProductCard'
import CategoryCard from './components/ui/CategoryCard'
import StoreCard from './components/ui/StoreCard'
import CommunityCard from './components/ui/CommunityCard'
import StoreFaro from './assets/Faro.png'
import StoreLisboa from './assets/Lisboa.png'
import StoreMatosinhos from './assets/Matosinhos.png'
import AnaDias1 from './assets/ana-dias-1.jpg'
import AnaDias2 from './assets/ana-dias-2.jpg'
import adidasLogo from './assets/adidas.png'
import asicsLogo from './assets/asics.png'
import nikeLogo from './assets/nike.png'
import hokaLogo from './assets/hoka.png'
import pumaLogo from './assets/puma.png'
import newBalanceLogo from './assets/newBalance.png'
import garminLogo from './assets/garmin.png'
import brooksLogo from './assets/brooks.png'
import benefitShipping from './assets/image1.png'
import benefitReturns from './assets/image2.png'
import benefitSecure from './assets/image3.png'
import fallbackProductImage from './assets/product-card-test-image.png'
import { getJson, resolveAssetUrl } from './lib/api'
import { THEME_UPDATED_EVENT } from './lib/theme'

const fallbackStoreImages = [StoreFaro, StoreLisboa, StoreMatosinhos]

const fallbackProducts = Array.from({ length: 10 }, (_, index) => ({
  id: `fallback-product-${index}`,
  image: fallbackProductImage,
  title: 'Produto em destaque',
  color: 'Cor disponivel',
  price: '0.00 EUR',
  oldPrice: null,
  discountLabel: null,
  isPromoted: false,
}))

const fallbackCategories = [
  { id: 'fallback-cat-1', title: 'Sapatilhas', image: '' },
  { id: 'fallback-cat-2', title: 'Trail Running', image: '' },
  { id: 'fallback-cat-3', title: 'Acessorios', image: '' },
  { id: 'fallback-cat-4', title: 'Roupa Tecnica', image: '' },
  { id: 'fallback-cat-5', title: 'Recuperacao', image: '' },
  { id: 'fallback-cat-6', title: 'Suplementos', image: '' },
]

const fallbackStores = [
  { id: 'fallback-store-1', name: 'Loja de Faro', image: StoreFaro },
  { id: 'fallback-store-2', name: 'Loja de Lisboa', image: StoreLisboa },
  { id: 'fallback-store-3', name: 'Loja de Matosinhos', image: StoreMatosinhos },
]

const brandLogos = [
  { src: adidasLogo, alt: 'Adidas' },
  { src: asicsLogo, alt: 'Asics' },
  { src: nikeLogo, alt: 'Nike' },
  { src: hokaLogo, alt: 'Hoka' },
  { src: pumaLogo, alt: 'Puma' },
  { src: newBalanceLogo, alt: 'New Balance' },
  { src: garminLogo, alt: 'Garmin' },
  { src: brooksLogo, alt: 'Brooks' },
]

const benefits = [
  {
    icon: benefitShipping,
    title: 'Envios Rapidos e Fiaveis',
    description:
      'Encomendas expedidas em 24/48h para Portugal Continental, com tracking e acompanhamento em tempo real.',
  },
  {
    icon: benefitReturns,
    title: 'Trocas e Devolucoes Simples',
    description:
      'Processo de trocas e devolucoes claro, rapido e sem complicacoes, porque a tua satisfacao vem primeiro.',
  },
  {
    icon: benefitSecure,
    title: 'Compra Segura e Transparente',
    description:
      'Pagamentos seguros, precos claros e informacao detalhada em todos os produtos, sem surpresas.',
  },
]
const LOW_STOCK_THRESHOLD = 5

const HOME_SECTION_KEYS = [
  'hero',
  'athlete',
  'categories',
  'performance',
  'promo',
  'brands',
  'stores',
  'community',
  'benefits',
]

const DEFAULT_HOME_CONTENT = {
  hero_title: 'Corre mais longe. Corre melhor.',
  hero_body:
    'Equipamento tecnico para corrida e trail running, testado por atletas e escolhido para quem leva a performance a serio.',
  hero_cta_label: 'COMPRAR AGORA',
  athlete_title: 'Escolhas dos atletas',
  athlete_body:
    'Os modelos e equipamentos mais procurados por quem corre todos os dias - estrada, trilho e ultra trail.',
  athlete_cta_label: 'COMPRAR AGORA',
  categories_title: 'Tudo o que precisas para correr melhor',
  performance_title: 'Performance comprovada',
  performance_body:
    'Selecionamos apenas marcas e modelos que cumprem os nossos criterios de qualidade, durabilidade e eficiencia.',
  promo_title: 'Corre para as oportunidades',
  promo_body: 'Ate 30% de desconto em artigos selecionados. So por tempo limitado.',
  promo_cta_label: 'COMPRAR AGORA',
  brands_title: 'Marcas',
  stores_title: 'Estamos perto de ti',
  stores_body: 'Visita-nos numa das nossas lojas fisicas e recebe aconselhamento especializado.',
  community_title: 'Ana Dias sempre contigo',
  community_body:
    'A tua corrida e a nossa inspiracao. Partilha os teus momentos, treinos e conquistas com #anadiasrun e faz parte da nossa comunidade.',
}

function normalizeLayout(layout) {
  const candidate = String(layout || 'classic').trim().toLowerCase()
  const allowed = new Set(['classic', 'categories-first', 'minimal'])
  return allowed.has(candidate) ? candidate : 'classic'
}

function buildDefaultHomeSections(layout) {
  const enabledByLayout = (() => {
    if (layout === 'categories-first') {
      return new Set(['hero', 'categories', 'athlete', 'performance', 'promo', 'brands', 'stores', 'community', 'benefits'])
    }
    if (layout === 'minimal') return new Set(['hero', 'categories', 'performance', 'benefits'])
    return new Set(['hero', 'athlete', 'categories', 'performance', 'promo', 'brands', 'stores', 'community', 'benefits'])
  })()

  return HOME_SECTION_KEYS.map((key) => ({ key, enabled: enabledByLayout.has(key) }))
}

function normalizeHomeSections(raw, layout) {
  const allowed = new Set(HOME_SECTION_KEYS)
  const fallback = buildDefaultHomeSections(layout)
  if (!Array.isArray(raw) || raw.length === 0) return fallback

  const defaults = buildDefaultHomeSections(layout)
  const defaultEnabled = new Map(defaults.map((row) => [row.key, row.enabled !== false]))

  const normalized = []
  const seen = new Set()
  for (const entry of raw) {
    const key = typeof entry === 'string' ? entry : entry?.key
    const safeKey = String(key || '').trim()
    const isCustom = safeKey.startsWith('custom:')
    if (!safeKey || (!isCustom && !allowed.has(safeKey)) || seen.has(safeKey)) continue
    seen.add(safeKey)
    const enabled = typeof entry === 'object' && entry ? entry.enabled !== false : true
    normalized.push({ key: safeKey, enabled })
  }

  for (const key of HOME_SECTION_KEYS) {
    if (seen.has(key)) continue
    normalized.push({ key, enabled: defaultEnabled.get(key) !== false })
  }

  return normalized.length > 0 ? normalized : fallback
}

function normalizeHomeContent(raw) {
  const safe = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const next = { ...DEFAULT_HOME_CONTENT }
  for (const key of Object.keys(DEFAULT_HOME_CONTENT)) {
    if (safe[key] == null) continue
    next[key] = String(safe[key])
  }
  return next
}

function normalizeHomeCustomSections(raw) {
  const safe = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const next = {}
  for (const [id, value] of Object.entries(safe)) {
    const safeId = String(id || '').trim()
    if (!safeId) continue
    const section = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    const type = String(section.type || 'text').trim() || 'text'
    next[safeId] = {
      type,
      title: String(section.title || '').trim(),
      body: String(section.body || '').trim(),
      image_url: String(section.image_url || '').trim(),
      button_label: String(section.button_label || '').trim(),
      button_href: String(section.button_href || '/products').trim() || '/products',
    }
  }
  return next
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function formatPrice(value) {
  const parsed = toNumber(value, 0)
  return `${parsed.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`
}

function createStockLabel(stock) {
  const qty = Number(stock)
  if (!Number.isFinite(qty)) return null
  const safeQty = Math.max(0, Math.floor(qty))
  if (safeQty === 0) return 'Out of stock'
  if (safeQty <= LOW_STOCK_THRESHOLD) return `${safeQty} left`
  return null
}

function readStockValue(source) {
  if (!source || typeof source !== 'object') return null
  const candidates = [
    source.stock_quantity,
    source.stock_left,
    source.quantity,
    source.stock,
  ]
  for (const candidate of candidates) {
    const parsed = Number(candidate)
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed))
  }
  return null
}

function sumStockValues(items) {
  if (!Array.isArray(items) || items.length === 0) return null
  let total = 0
  let hasValue = false
  for (const item of items) {
    const qty = readStockValue(item)
    if (qty == null) continue
    total += qty
    hasValue = true
  }
  return hasValue ? total : null
}

function getProductStock(product) {
  const directProductStock = readStockValue(product)
  if (directProductStock != null) return directProductStock

  const productInventoryStock = sumStockValues(product?.inventory)
  if (productInventoryStock != null) return productInventoryStock

  const variants = Array.isArray(product?.variants) ? product.variants : []
  if (variants.length === 0) return null

  let total = 0
  let hasValue = false
  for (const variant of variants) {
    const directVariantStock = readStockValue(variant)
    if (directVariantStock != null) {
      total += directVariantStock
      hasValue = true
      continue
    }
    const variantInventoryStock = sumStockValues(variant?.inventory)
    if (variantInventoryStock != null) {
      total += variantInventoryStock
      hasValue = true
    }
  }
  return hasValue ? total : null
}

function parseAttributeValues(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  if (typeof raw !== 'string') return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function extractColorLabel(attributes) {
  const source = parseAttributeValues(attributes)
  const entries = Object.entries(source)
  if (entries.length === 0) return 'Cor disponivel'

  const direct = entries.find(([key]) => ['color', 'colour', 'cor'].includes(String(key).toLowerCase()))
  if (direct) return String(direct[1] || 'Cor disponivel')

  const fuzzy = entries.find(([key]) => String(key).toLowerCase().includes('color') || String(key).toLowerCase().includes('cor'))
  if (fuzzy) return String(fuzzy[1] || 'Cor disponivel')

  return 'Cor disponivel'
}

function buildProductCard(product, index) {
  const variants = Array.isArray(product?.variants) ? product.variants : []
  const primaryVariant = variants.find((variant) => variant?.is_active !== false) || variants[0] || null
  const imageUrl = Array.isArray(product?.images) && product.images[0]?.image_url
    ? resolveAssetUrl(product.images[0].image_url)
    : fallbackProductImage
  const price = toNumber(primaryVariant?.price ?? product?.base_price, 0)
  const compareAtPrice = toNumber(primaryVariant?.compare_at_price, 0)
  const hasDiscount = compareAtPrice > price && compareAtPrice > 0
  const discountPct = hasDiscount ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0
  const stockLeft = getProductStock(product)
  const stockLabel =
    stockLeft === 0
      ? 'Out of stock'
      : stockLeft != null && stockLeft <= LOW_STOCK_THRESHOLD
        ? `${stockLeft} left`
        : null

  return {
    id: product?.id || `product-${index}`,
    categoryId: product?.category_id || null,
    image: imageUrl,
    title: product?.name_pt || product?.name_es || product?.sku || `Produto ${index + 1}`,
    color: extractColorLabel(primaryVariant?.attribute_values),
    price: formatPrice(price),
    oldPrice: hasDiscount ? formatPrice(compareAtPrice) : null,
    discountLabel: hasDiscount ? `${discountPct}% off` : null,
    stockLabel,
    isPromoted: Boolean(product?.is_promoted),
  }
}

function buildCategoryCard(category, index) {
  const categoryId = category?.id != null ? String(category.id) : `category-${index}`
  const categoryTitle = category?.name_pt || category?.name_es || category?.slug || 'Categoria'
  return {
    id: categoryId,
    title: categoryTitle,
    image: resolveAssetUrl(category?.image_url || ''),
    to: `/products?categoryId=${encodeURIComponent(categoryId)}&categoryName=${encodeURIComponent(
      categoryTitle
    )}`,
  }
}

function buildStoreCard(store, index) {
  const fallbackImage = fallbackStoreImages[index % fallbackStoreImages.length]
  return {
    id: store?.id || `store-${index}`,
    name: store?.name || 'Loja',
    image: resolveAssetUrl(store?.image_url || '') || fallbackImage,
  }
}

function App() {
  const [homeLoading, setHomeLoading] = useState(true)
  const [homeError, setHomeError] = useState('')
  const [homeProducts, setHomeProducts] = useState([])
  const [homeCategories, setHomeCategories] = useState([])
  const [homeStores, setHomeStores] = useState([])
  const [publicLayout, setPublicLayout] = useState('classic')
  const [homeSections, setHomeSections] = useState(() => buildDefaultHomeSections('classic'))
  const [homeContent, setHomeContent] = useState(() => normalizeHomeContent(null))
  const [homeCustomSections, setHomeCustomSections] = useState(() => ({}))
  const [heroCarouselImages, setHeroCarouselImages] = useState([])
  const [athleteSettings, setAthleteSettings] = useState({
    enabled: true,
    product_count: 10,
    category_ids: [],
    category_limits: {},
    sort_by: 'sales',
  })
  const [brandSettings, setBrandSettings] = useState({
    enabled: true,
    brand_ids: [],
  })
  const [performanceSettings, setPerformanceSettings] = useState({
    enabled: true,
    product_count: 10,
    category_ids: [],
    category_limits: {},
    sort_by: 'sales',
  })
  const publicLayoutRef = useRef('classic')

  useEffect(() => {
    publicLayoutRef.current = publicLayout
  }, [publicLayout])

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const loadThemeSettings = async () => {
      try {
        const settings = await getJson('/api/system/theme', { signal: controller.signal })
        if (!active) return
        const layout = normalizeLayout(settings?.public_layout)
        setPublicLayout(layout)
        setHomeSections(normalizeHomeSections(settings?.public_home_sections, layout))
        setHomeContent(normalizeHomeContent(settings?.public_home_content))
        setHomeCustomSections(normalizeHomeCustomSections(settings?.public_home_custom_sections))
        setHeroCarouselImages(Array.isArray(settings?.public_home_hero_carousel_images) ? settings.public_home_hero_carousel_images : [])
      } catch (error) {
        if (!active || error?.name === 'AbortError') return
        setPublicLayout('classic')
        setHomeSections(buildDefaultHomeSections('classic'))
        setHomeContent(normalizeHomeContent(null))
        setHomeCustomSections({})
        setHeroCarouselImages([])
      }
    }

    const loadAthleteSettings = async () => {
      try {
        const settings = await getJson('/api/system/athlete-settings', { signal: controller.signal })
        if (!active) return
        const normalized = {
          enabled: typeof settings?.enabled === 'boolean' ? settings.enabled : true,
          product_count: Number.isInteger(settings?.product_count) ? settings.product_count : 10,
          category_ids: Array.isArray(settings?.category_ids) ? settings.category_ids : [],
          category_limits: settings?.category_limits && typeof settings.category_limits === 'object' ? settings.category_limits : {},
          sort_by: settings?.sort_by || 'sales',
        }
        setAthleteSettings(normalized)
      } catch (error) {
        if (!active || error?.name === 'AbortError') return
        setAthleteSettings({
          enabled: true,
          product_count: 10,
          category_ids: [],
          category_limits: {},
          sort_by: 'sales',
        })
      }
    }

    const loadBrandSettings = async () => {
      try {
        const settings = await getJson('/api/system/brand-settings', { signal: controller.signal })
        if (!active) return
        const normalized = {
          enabled: typeof settings?.enabled === 'boolean' ? settings.enabled : true,
          brand_ids: Array.isArray(settings?.brand_ids) ? settings.brand_ids : [],
        }
        setBrandSettings(normalized)
      } catch (error) {
        if (!active || error?.name === 'AbortError') return
        setBrandSettings({
          enabled: true,
          brand_ids: [],
        })
      }
    }

    const loadPerformanceSettings = async () => {
      try {
        const settings = await getJson('/api/system/performance-settings', { signal: controller.signal })
        if (!active) return
        const normalized = {
          enabled: typeof settings?.enabled === 'boolean' ? settings.enabled : true,
          product_count: Number.isInteger(settings?.product_count) ? settings.product_count : 10,
          category_ids: Array.isArray(settings?.category_ids) ? settings.category_ids : [],
          category_limits: settings?.category_limits && typeof settings.category_limits === 'object' ? settings.category_limits : {},
          sort_by: settings?.sort_by || 'sales',
        }
        setPerformanceSettings(normalized)
      } catch (error) {
        if (!active || error?.name === 'AbortError') return
        setPerformanceSettings({
          enabled: true,
          product_count: 10,
          category_ids: [],
          category_limits: {},
          sort_by: 'sales',
        })
      }
    }

    void loadThemeSettings()
    void loadAthleteSettings()
    void loadBrandSettings()
    void loadPerformanceSettings()

    const onThemeUpdated = (event) => {
      const payload = event?.detail?.settings ?? event?.detail ?? null
      if (!payload) return
      const hasLayout = Object.prototype.hasOwnProperty.call(payload, 'public_layout')
      const nextLayout = hasLayout ? normalizeLayout(payload?.public_layout) : publicLayoutRef.current
      setPublicLayout(nextLayout)

      if (Object.prototype.hasOwnProperty.call(payload, 'public_home_sections')) {
        setHomeSections(normalizeHomeSections(payload?.public_home_sections, nextLayout))
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'public_home_content')) {
        setHomeContent(normalizeHomeContent(payload?.public_home_content))
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'public_home_custom_sections')) {
        setHomeCustomSections(normalizeHomeCustomSections(payload?.public_home_custom_sections))
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'public_home_hero_carousel_images')) {
        setHeroCarouselImages(Array.isArray(payload?.public_home_hero_carousel_images) ? payload.public_home_hero_carousel_images : [])
      }
    }

    window.addEventListener(THEME_UPDATED_EVENT, onThemeUpdated)

    return () => {
      active = false
      controller.abort()
      window.removeEventListener(THEME_UPDATED_EVENT, onThemeUpdated)
    }
  }, [])

  useEffect(() => {
    let isCancelled = false
    const controller = new AbortController()

    const loadHomeData = async () => {
      setHomeLoading(true)
      setHomeError('')

      const [productsResult, categoriesResult, storesResult, stockSummaryResult] = await Promise.allSettled([
        getJson('/api/products', { signal: controller.signal }),
        getJson('/api/catalog/categories', { signal: controller.signal }),
        getJson('/api/stores', { signal: controller.signal }),
        getJson(`/api/orders/dashboard/summary?threshold=${LOW_STOCK_THRESHOLD}&limit=1000`, { signal: controller.signal }),
      ])

      if (isCancelled) return

      const lowStockMap = new Map()
      if (stockSummaryResult.status === 'fulfilled' && Array.isArray(stockSummaryResult.value?.low_stock_products)) {
        for (const row of stockSummaryResult.value.low_stock_products) {
          const key = String(row?.product_id || '').trim()
          if (!key) continue
          const qty = Number(row?.stock_left)
          if (!Number.isFinite(qty)) continue
          lowStockMap.set(key, Math.max(0, Math.floor(qty)))
        }
      }

      const nextProducts = productsResult.status === 'fulfilled' && Array.isArray(productsResult.value)
        ? productsResult.value.map((entry, index) => {
            const mapped = buildProductCard(entry, index)
            const dbStock = lowStockMap.get(String(mapped.id || '').trim())
            return dbStock == null ? mapped : { ...mapped, stockLabel: createStockLabel(dbStock) }
          })
        : []

      const nextCategories =
        categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value)
          ? categoriesResult.value
              .filter((category) => category?.is_active !== false)
              .sort((a, b) => toNumber(b?.product_count, 0) - toNumber(a?.product_count, 0))
              .slice(0, 6)
              .map(buildCategoryCard)
          : []

      const nextStores =
        storesResult.status === 'fulfilled' && Array.isArray(storesResult.value)
          ? storesResult.value
              .filter((store) => store?.is_active !== false)
              .slice(0, 3)
              .map(buildStoreCard)
          : []

      setHomeProducts(nextProducts)
      setHomeCategories(nextCategories)
      setHomeStores(nextStores)

      if (productsResult.status === 'rejected' && categoriesResult.status === 'rejected' && storesResult.status === 'rejected') {
        setHomeError('Live home data is unavailable right now. Showing fallback content.')
      }

      setHomeLoading(false)
    }

    loadHomeData().catch((error) => {
      if (isCancelled || error?.name === 'AbortError') return
      setHomeProducts([])
      setHomeCategories([])
      setHomeStores([])
      setHomeError(error instanceof Error ? error.message : 'Failed to load home data.')
      setHomeLoading(false)
    })

    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [])

  const athleteProducts = useMemo(() => {
    const source = homeProducts.length > 0 ? homeProducts : fallbackProducts
    
    // If specific categories are selected with limits, apply per-category filtering
    if (athleteSettings.category_ids && athleteSettings.category_ids.length > 0) {
      const categoryLimits = athleteSettings.category_limits || {}
      const categoryIdSet = new Set(athleteSettings.category_ids)
      const result = []
      const categoryCount = {}
      
      // Iterate through products and collect up to the limit for each category
      for (const product of source) {
        const catId = String(product?.categoryId || '')
        
        // Only include products from selected categories
        if (!categoryIdSet.has(catId)) continue
        
        // Check if we've reached the limit for this category
        const limit = Number(categoryLimits[catId]) || 5
        if ((categoryCount[catId] || 0) >= limit) continue
        
        result.push(product)
        categoryCount[catId] = (categoryCount[catId] || 0) + 1
      }
      
      // If we got some results, use them; otherwise fallback to all products
      if (result.length > 0) {
        return result.slice(0, athleteSettings.product_count)
      }
    }
    
    // Default behavior: no category filtering, just limit by product_count
    return source.slice(0, athleteSettings.product_count)
  }, [homeProducts, athleteSettings])


  const performanceProducts = useMemo(() => {
    const source = homeProducts.length > 0 ? homeProducts : fallbackProducts
    
    // If specific categories are selected with limits, apply per-category filtering
    if (performanceSettings.category_ids && performanceSettings.category_ids.length > 0) {
      const categoryLimits = performanceSettings.category_limits || {}
      const categoryIdSet = new Set(performanceSettings.category_ids)
      const result = []
      const categoryCount = {}
      
      // Iterate through products and collect up to the limit for each category
      for (const product of source) {
        const catId = String(product?.categoryId || '')
        
        // Only include products from selected categories
        if (!categoryIdSet.has(catId)) continue
        
        // Check if we've reached the limit for this category
        const limit = Number(categoryLimits[catId]) || 5
        if ((categoryCount[catId] || 0) >= limit) continue
        
        result.push(product)
        categoryCount[catId] = (categoryCount[catId] || 0) + 1
      }
      
      // If we got some results, use them; otherwise fallback to all products
      if (result.length > 0) {
        return result.slice(0, performanceSettings.product_count)
      }
    }
    
    // Default behavior: no category filtering, just limit by product_count
    return source.slice(0, performanceSettings.product_count)
  }, [homeProducts, performanceSettings])

  const categories = useMemo(() => {
    const source = homeCategories.length > 0 ? homeCategories : fallbackCategories
    return source.slice(0, 6)
  }, [homeCategories])

  const stores = useMemo(() => {
    const source = homeStores.length > 0 ? homeStores : fallbackStores
    return source.slice(0, 3)
  }, [homeStores])

  const displayedBrands = useMemo(() => {
    if (!brandSettings.brand_ids || brandSettings.brand_ids.length === 0) {
      return brandLogos
    }
    const brandIdSet = new Set(brandSettings.brand_ids)
    // Map brand names to IDs for matching
    const brandNameToId = {
      'adidas': 'adidas',
      'asics': 'asics',
      'nike': 'nike',
      'hoka': 'hoka',
      'puma': 'puma',
      'new balance': 'newbalance',
      'garmin': 'garmin',
      'brooks': 'brooks',
    }
    return brandLogos.filter((brand) => {
      const brandId = brandNameToId[brand.alt.toLowerCase()]
      return brandId && brandIdSet.has(brandId)
    })
  }, [brandSettings.brand_ids])

  const normalizedHomeSections = useMemo(
    () => normalizeHomeSections(homeSections, publicLayout),
    [homeSections, publicLayout]
  )

  const enabledHomeSections = useMemo(() => {
    const enabled = new Set()
    for (const row of normalizedHomeSections) {
      if (row?.enabled === false) continue
      enabled.add(row.key)
    }
    return enabled
  }, [normalizedHomeSections])

  const sectionOrder = useMemo(() => {
    const next = {}
    let order = 10
    for (const row of normalizedHomeSections) {
      const key = String(row?.key || '').trim()
      if (!key) continue
      next[key] = order
      order += 10
    }
    next.status = (next.hero || 10) + 5
    next.loading = order + 10
    return next
  }, [normalizedHomeSections])

  const isSectionEnabled = (key) => enabledHomeSections.has(key)

  return (
    <>
      <Navbar />
      <div className='flex flex-col' data-theme-layout-root='home'>

      {isSectionEnabled('hero') ? (
        <section className='bg-white' style={{ order: sectionOrder.hero }} data-theme-layout-section='hero'>
          {heroCarouselImages && heroCarouselImages.length > 0 ? (
            <Swiper
              modules={[Pagination, Navigation]}
              pagination={{ clickable: true }}
              navigation
              loop={true}
              loopFillGroupWithBlank={false}
              slidesPerView={1}
              className='hero-carousel w-full'
            >
              {heroCarouselImages.map((image, index) => (
                <SwiperSlide key={index}>
                  <div className='hero-bg min-h-[72svh] md:h-[90vh]' style={{ backgroundImage: `url(${resolveAssetUrl(image.url)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <div className='flex min-h-[72svh] w-full max-w-[640px] flex-col justify-center px-6 py-14 text-white md:ml-[10%] md:h-[90vh] md:px-0'>
                      <h1 className='text-[32px] leading-tight md:text-[46px]' data-theme-edit='public_home_content.hero_title'>
                        {homeContent.hero_title}
                      </h1>
                      <p className='w-full py-4 text-[14px] md:w-9/12' data-theme-edit='public_home_content.hero_body'>
                        {homeContent.hero_body}
                      </p>
                      <button
                        className='w-full bg-primary py-3 text-primary-foreground sm:w-auto sm:min-w-[220px] md:w-6/12'
                        data-theme-edit='public_home_content.hero_cta_label'
                      >
                        {homeContent.hero_cta_label}
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className='hero-bg min-h-[72svh] md:h-[90vh]' data-theme-image='public_home_hero_image' data-theme-image-label='Hero image'>
              <div className='flex min-h-[72svh] w-full max-w-[640px] flex-col justify-center px-6 py-14 text-white md:ml-[10%] md:h-[90vh] md:px-0'>
                <h1 className='text-[32px] leading-tight md:text-[46px]' data-theme-edit='public_home_content.hero_title'>
                  {homeContent.hero_title}
                </h1>
                <p className='w-full py-4 text-[14px] md:w-9/12' data-theme-edit='public_home_content.hero_body'>
                  {homeContent.hero_body}
                </p>
                <button
                  className='w-full bg-primary py-3 text-primary-foreground sm:w-auto sm:min-w-[220px] md:w-6/12'
                  data-theme-edit='public_home_content.hero_cta_label'
                >
                  {homeContent.hero_cta_label}
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {homeError ? (
        <p className='mt-4 text-center text-[13px] text-[#b42318]' style={{ order: sectionOrder.status }}>
          {homeError}
        </p>
      ) : null}

      {isSectionEnabled('athlete') ? (
        <section
          className='mt-[10vh] flex flex-col items-center'
          style={{ order: sectionOrder.athlete }}
          data-theme-layout-section='athlete'
        >
          <div className='text-center'>
            <h1 className='text-[24px]' data-theme-edit='public_home_content.athlete_title'>
              {homeContent.athlete_title}
            </h1>
            <p className='py-4' data-theme-edit='public_home_content.athlete_body'>
              {homeContent.athlete_body}
            </p>
          </div>

          <div className='w-[95vw] mx-auto'>
            <Swiper
              slidesPerView={1}
              spaceBetween={12}
              preventClicks={false}
              preventClicksPropagation={false}
              breakpoints={{
                640: { slidesPerView: 2, spaceBetween: 12 },
                768: { slidesPerView: 3, spaceBetween: 12 },
                1024: { slidesPerView: 5, spaceBetween: 6 },
              }}
              pagination={{ clickable: true }}
              navigation={true}
              loop={true}
              loopFillGroupWithBlank={false}
              modules={[Pagination, Navigation]}
              className='mySwiper'
            >
              {athleteProducts.map((product) => (
                <SwiperSlide key={product.id} className=' flex gap-3'>
                  <ProductCard
                    image={product.image}
                    title={product.title}
                    color={product.color}
                    price={product.price}
                    oldPrice={product.oldPrice}
                    discountLabel={product.discountLabel}
                    stockLabel={product.stockLabel}
                    to={`/productDetails/${encodeURIComponent(String(product.id))}`}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
          <button
            className='py-2 px-10 bg-primary text-primary-foreground my-10'
            data-theme-edit='public_home_content.athlete_cta_label'
          >
            {homeContent.athlete_cta_label}
          </button>
        </section>
      ) : null}

      {isSectionEnabled('categories') ? (
      <section style={{ order: sectionOrder.categories }} data-theme-layout-section='categories'>
        <h1 className='text-[24px] text-center' data-theme-edit='public_home_content.categories_title'>
          {homeContent.categories_title}
        </h1>

        <div className='mt-6 w-full md:hidden'>
          <Swiper
            slidesPerView={1}
            spaceBetween={12}
            pagination={{ clickable: true }}
            navigation={true}
                  loop={true}
              loopFillGroupWithBlank={false}
            modules={[Pagination, Navigation]}
            className='mySwiper '
          >
            {[...categories].reverse().map((category) => (
              <SwiperSlide key={`cat-mobile-${category.id}`} className='py-4'>
                <CategoryCard title={category.title} image={category.image} to={category.to} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className='hidden md:flex flex-wrap justify-center gap-4 mt-10'>
          {[...categories].reverse().map((category) => (
            <CategoryCard
              key={`cat-desktop-${category.id}`}
              title={category.title}
              image={category.image}
              to={category.to}
            />
          ))}
        </div>
      </section>
      ) : null}

      {isSectionEnabled('performance') ? (
      <section
        className='mt-[10vh] flex flex-col items-center'
        style={{ order: sectionOrder.performance }}
        data-theme-layout-section='performance'
      >
        <div className='text-center'>
          <h1 className='text-[24px]' data-theme-edit='public_home_content.performance_title'>
            {homeContent.performance_title}
          </h1>
          <p className='py-4' data-theme-edit='public_home_content.performance_body'>
            {homeContent.performance_body}
          </p>
        </div>

        <div className='w-[95vw] mx-auto'>
          <Swiper
            slidesPerView={1}
            spaceBetween={12}
            preventClicks={false}
            preventClicksPropagation={false}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 12 },
              768: { slidesPerView: 3, spaceBetween: 12 },
              1024: { slidesPerView: 5, spaceBetween: 0 },
            }}
            pagination={{ clickable: true }}
            navigation={true}
                  loop={true}
              loopFillGroupWithBlank={false}
            modules={[Pagination, Navigation]}
            className='mySwiper'
          >
            {performanceProducts.map((product) => (
              <SwiperSlide key={`perf-${product.id}`}>
                <ProductCard
                  image={product.image}
                  title={product.title}
                  color={product.color}
                  price={product.price}
                  oldPrice={product.oldPrice}
                  discountLabel={product.discountLabel}
                  stockLabel={product.stockLabel}
                  to={`/productDetails/${encodeURIComponent(String(product.id))}`}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>
      ) : null}

      {isSectionEnabled('promo') ? (
      <section className='mt-[10vh]' style={{ order: sectionOrder.promo }} data-theme-layout-section='promo'>
        <div className='promo-bg mx-auto flex min-h-[340px] w-[90vw] items-center justify-center md:h-[50vh]' data-theme-image='public_home_promo_image' data-theme-image-label='Promo image'>
          <div className='px-6 py-8 text-center text-white sm:px-8'>
            <h2 className='text-[28px] leading-tight md:text-[32px]' data-theme-edit='public_home_content.promo_title'>
              {homeContent.promo_title}
            </h2>
            <p className='py-3 text-[14px] md:text-[16px]' data-theme-edit='public_home_content.promo_body'>
              {homeContent.promo_body}
            </p>
            <button
              className='bg-primary px-8 py-3 text-[13px] tracking-[2px] text-primary-foreground sm:px-10'
              data-theme-edit='public_home_content.promo_cta_label'
            >
              {homeContent.promo_cta_label}
            </button>
          </div>
        </div>
      </section>
      ) : null}

      {isSectionEnabled('brands') ? (
      <section className='mt-[10vh] mb-[10vh]' style={{ order: sectionOrder.brands }} data-theme-layout-section='brands'>
        <h2 className='text-[32px] text-center mb-6' data-theme-edit='public_home_content.brands_title'>
          {homeContent.brands_title}
        </h2>

        <div className='w-[90vw] mx-auto md:hidden'>
          <Swiper
            slidesPerView={1}
            spaceBetween={12}
            pagination={{ clickable: true }}
            navigation={true}
            modules={[Pagination, Navigation]}
            className='mySwiper'
          >
            {displayedBrands.map((brand) => (
              <SwiperSlide key={brand.alt}>
                <div className='flex items-center justify-center py-6'>
                  <img className='h-16 object-contain' src={brand.src} alt={brand.alt} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className='hidden md:flex w-[90vw] mx-auto flex-wrap items-center justify-between gap-y-6'>
          {displayedBrands.map((brand) => (
            <img key={`brand-${brand.alt}`} className='h-16 object-contain' src={brand.src} alt={brand.alt} />
          ))}
        </div>
      </section>
      ) : null}

      {isSectionEnabled('stores') ? (
      <section
        className='mx-auto max-w-[1366px] px-5 sm:px-8 lg:px-[42px] py-[40px] sm:py-[55px] lg:py-[70px] text-center'
        style={{ order: sectionOrder.stores }}
        data-theme-layout-section='stores'
      >
        <h2 className='m-0 text-[28px] sm:text-[32px] leading-[1.04] font-normal text-[#262626]'>
          <span data-theme-edit='public_home_content.stores_title'>{homeContent.stores_title}</span>
        </h2>
        <p className='m-0 mt-3 text-[14px] sm:text-[16px] leading-[1.5] tracking-[0.04em] text-[#333]'>
          <span data-theme-edit='public_home_content.stores_body'>{homeContent.stores_body}</span>
        </p>

        <div className='mx-auto mt-6 w-full max-w-[1180px]'>
          <Swiper
            slidesPerView={1}
            spaceBetween={16}
            breakpoints={{
              640: { slidesPerView: 1.25, spaceBetween: 16 },
              768: { slidesPerView: 2.1, spaceBetween: 18 },
              1024: { slidesPerView: 3, spaceBetween: 20 },
            }}
            pagination={{ clickable: true }}
            navigation={true}
            modules={[Pagination, Navigation]}
            className='mySwiper py-2'
          >
            {stores.map((store) => (
              <SwiperSlide key={`store-mobile-${store.id}`} className='!flex justify-center py-2'>
                <StoreCard image={store.image} title={store.name} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>
      ) : null}

      {isSectionEnabled('community') ? (
      <section
        className='mt-[10vh] mb-[10vh] flex flex-col items-center'
        style={{ order: sectionOrder.community }}
        data-theme-layout-section='community'
      >
        <div className='text-center'>
          <h2 className='text-[32px]' data-theme-edit='public_home_content.community_title'>
            {homeContent.community_title}
          </h2>
          <p className='py-3 text-[16px]' data-theme-edit='public_home_content.community_body'>
            {homeContent.community_body}
          </p>
        </div>
        <div className='w-[95vw] mx-auto'>
          <Swiper
            slidesPerView={1}
            spaceBetween={12}
            loop={true}
            grabCursor={true}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 16 },
              1024: { slidesPerView: 4, spaceBetween: 20 },
            }}
            pagination={{ clickable: true }}
            navigation={true}
            modules={[Pagination, Navigation]}
            className='ana-dias-swiper'
          >
            <SwiperSlide className='py-2'>
              <CommunityCard image={AnaDias1} alt='Ana Dias Run 1' />
            </SwiperSlide>
            <SwiperSlide className='py-2'>
              <CommunityCard image={AnaDias2} alt='Ana Dias Run 2' />
            </SwiperSlide>
            <SwiperSlide className='py-2'>
              <CommunityCard image={AnaDias1} alt='Ana Dias Run 3' />
            </SwiperSlide>
            <SwiperSlide className='py-2'>
              <CommunityCard image={AnaDias2} alt='Ana Dias Run 4' />
            </SwiperSlide>
            <SwiperSlide className='py-2'>
              <CommunityCard image={AnaDias1} alt='Ana Dias Run 5' />
            </SwiperSlide>
          </Swiper>
        </div>
      </section>
      ) : null}

      {isSectionEnabled('benefits') ? (
      <section className='mt-[10vh] mb-[10vh]' style={{ order: sectionOrder.benefits }} data-theme-layout-section='benefits'>
        <div className='w-[90vw] mx-auto md:hidden'>
          <Swiper
            slidesPerView={1}
            spaceBetween={12}
            pagination={{ clickable: true }}
            navigation={true}
            modules={[Pagination, Navigation]}
            className='mySwiper'
          >
            {benefits.map((benefit) => (
              <SwiperSlide key={`benefit-mobile-${benefit.title}`} className='py-2'>
                <div className='text-center px-6'>
                  <img className='h-10 mx-auto mb-4' src={benefit.icon} alt={benefit.title} />
                  <h3 className='text-[14px] font-semibold'>{benefit.title}</h3>
                  <p className='text-[12px] mt-2'>{benefit.description}</p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className='hidden md:flex w-[90vw] mx-auto flex-wrap items-start justify-between gap-y-10 text-center'>
          {benefits.map((benefit) => (
            <div key={`benefit-desktop-${benefit.title}`} className='w-full md:w-1/3 px-6'>
              <img className='h-10 mx-auto mb-4' src={benefit.icon} alt={benefit.title} />
              <h3 className='text-[14px] font-semibold'>{benefit.title}</h3>
              <p className='text-[12px] mt-2'>{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>
      ) : null}

      {normalizedHomeSections
        .filter((row) => String(row?.key || '').startsWith('custom:') && row?.enabled !== false)
        .map((row) => {
          const key = String(row.key || '').trim()
          const id = key.slice('custom:'.length).trim()
          if (!id) return null
          const section = homeCustomSections?.[id] || { type: 'text' }
          const type = String(section?.type || 'text').trim() || 'text'
          const titleKey = `public_home_custom_sections.${id}.title`
          const bodyKey = `public_home_custom_sections.${id}.body`
          const imageKey = `public_home_custom_sections.${id}.image_url`
          const buttonLabelKey = `public_home_custom_sections.${id}.button_label`
          const href = String(section?.button_href || '/products').trim() || '/products'
          const imageUrl = String(section?.image_url || '').trim()
          const showImage = Boolean(imageUrl) && imageUrl !== '__none__'

          return (
            <section
              key={key}
              className='w-[90vw] mx-auto mt-16 rounded-2xl border border-black/10 bg-white p-6 md:p-10'
              style={{ order: sectionOrder[key] || 9999 }}
              data-theme-layout-section={key}
            >
              {type === 'image' ? (
                <div className='grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-center'>
                  <div>
                    <h2 className='m-0 text-[28px] font-semibold' data-theme-edit={titleKey}>
                      {section?.title || 'New section'}
                    </h2>
                    <p className='mt-3 text-[14px] leading-[1.6] text-black/70' data-theme-edit={bodyKey}>
                      {section?.body || 'Click to edit text.'}
                    </p>
                  </div>
                  <div
                    className='w-full overflow-hidden rounded-2xl bg-black/[0.04]'
                    data-theme-image={imageKey}
                    data-theme-image-label='Custom image'
                  >
                    {showImage ? (
                      <img
                        src={resolveAssetUrl(imageUrl)}
                        alt={section?.title || 'Section image'}
                        className='h-[240px] w-full object-cover md:h-[320px]'
                      />
                    ) : (
                      <div className='flex h-[240px] w-full items-center justify-center text-[12px] text-black/60 md:h-[320px]'>
                        Click to set image
                      </div>
                    )}
                  </div>
                </div>
              ) : type === 'cta' ? (
                <div className='text-center'>
                  <h2 className='m-0 text-[28px] font-semibold' data-theme-edit={titleKey}>
                    {section?.title || 'New section'}
                  </h2>
                  <p
                    className='mx-auto mt-3 max-w-[720px] text-[14px] leading-[1.6] text-black/70'
                    data-theme-edit={bodyKey}
                  >
                    {section?.body || 'Click to edit text.'}
                  </p>
                  <a
                    href={href}
                    className='mt-6 inline-flex items-center justify-center bg-primary px-8 py-3 text-[12px] tracking-[1px] text-primary-foreground'
                    data-theme-edit={buttonLabelKey}
                  >
                    {section?.button_label || 'Shop now'}
                  </a>
                </div>
              ) : (
                <div className='text-center'>
                  <h2 className='m-0 text-[28px] font-semibold' data-theme-edit={titleKey}>
                    {section?.title || 'New section'}
                  </h2>
                  <p
                    className='mx-auto mt-3 max-w-[720px] text-[14px] leading-[1.6] text-black/70'
                    data-theme-edit={bodyKey}
                  >
                    {section?.body || 'Click to edit text.'}
                  </p>
                </div>
              )}
            </section>
          )
        })}

      {homeLoading ? (
        <p className='mb-8 text-center text-[13px] text-[#6b7280]' style={{ order: sectionOrder.loading }}>
          Syncing home data...
        </p>
      ) : null}

      </div>
      <Footer />
    </>
  )
}

export default App
