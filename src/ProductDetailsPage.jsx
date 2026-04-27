import React, { useEffect, useMemo, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import { Navigation, Pagination } from 'swiper/modules'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import productImage from './assets/product-card-test-image.png'
import ProductCard from './components/ui/ProductCard'
import IconEntrega from './assets/image4.png'
import IconDevolucao from './assets/image5.png'
import { getJson, resolveAssetUrl } from './lib/api'
import { addCartItem } from './lib/cart'

const LOW_STOCK_THRESHOLD = 5
const COLOR_SWATCHES = [
  { id: 'preto', label: 'Preto', color: '#111111' },
  { id: 'azul', label: 'Azul', color: '#1f4f8f' },
  { id: 'castanho', label: 'Castanho', color: '#9a5b2a' },
  { id: 'verde', label: 'Verde', color: '#5f6b4f' },
  { id: 'cinzento', label: 'Cinzento', color: '#d9d9d9', light: true },
  { id: 'laranja', label: 'Laranja', color: '#d8892b' },
  { id: 'rosa', label: 'Rosa', color: '#f0c7bd' },
  { id: 'vermelho', label: 'Vermelho', color: '#c62828' },
  { id: 'bege', label: 'Bege', color: '#b8a892' },
]

const colorAliasMap = {
  preto: ['preto', 'preta', 'black', 'noir'],
  azul: ['azul', 'blue', 'navy'],
  castanho: ['castanho', 'marrom', 'brown'],
  verde: ['verde', 'green'],
  cinzento: ['cinzento', 'cinza', 'gris', 'grey', 'gray'],
  laranja: ['laranja', 'orange'],
  rosa: ['rosa', 'pink'],
  vermelho: ['vermelho', 'red', 'rojo'],
  bege: ['bege', 'beige'],
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function formatPrice(value) {
  const amount = toNumber(value, 0)
  return `${amount.toLocaleString('en-US', {
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

function parseAttributes(raw) {
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

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getColorTokens(colorId) {
  const swatch = COLOR_SWATCHES.find((entry) => entry.id === colorId)
  const key = normalizeText(swatch?.label || colorId)
  return colorAliasMap[key] || [key]
}

function colorMatches(value, selectedColorId) {
  const haystack = normalizeText(value)
  if (!haystack || !selectedColorId) return false
  return getColorTokens(selectedColorId).some((token) => haystack.includes(token))
}

function resolveColorId(value) {
  const normalized = normalizeText(value)
  if (!normalized) return ''

  for (const swatch of COLOR_SWATCHES) {
    const tokens = getColorTokens(swatch.id)
    if (tokens.some((token) => normalized.includes(token) || token.includes(normalized))) {
      return swatch.id
    }
  }

  return ''
}

function pickImageByColor(imageOptions, selectedColorId) {
  if (!Array.isArray(imageOptions) || imageOptions.length === 0) return ''
  const match = imageOptions.find((item) => colorMatches(item.searchText, selectedColorId))
  return match?.url || ''
}

function extractColorFromAttributes(attributes) {
  const entries = Object.entries(attributes || {})
  const found = entries.find(([key]) => {
    const normalizedKey = normalizeText(key)
    return normalizedKey.includes('cor') || normalizedKey.includes('color')
  })
  return String(found?.[1] || '').trim()
}

function extractSizeFromAttributes(attributes) {
  const entries = Object.entries(attributes || {})
  const found = entries.find(([key]) => {
    const normalizedKey = normalizeText(key)
    return normalizedKey.includes('size') || normalizedKey.includes('tamanho')
  })
  return String(found?.[1] || '').trim()
}

function dedupeUrls(values) {
  const seen = new Set()
  return values.filter((value) => {
    const key = String(value || '').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function shuffleItems(items) {
  const cloned = [...items]
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = cloned[index]
    cloned[index] = cloned[swapIndex]
    cloned[swapIndex] = current
  }
  return cloned
}

function isCouponCurrentlyActive(coupon) {
  if (!coupon || coupon.is_active === false) return false
  if (coupon.expiration) {
    const expiration = new Date(coupon.expiration)
    if (!Number.isNaN(expiration.getTime()) && expiration.getTime() < Date.now()) {
      return false
    }
  }
  if (coupon.usage_limit != null && Number(coupon.usage_count) >= Number(coupon.usage_limit)) {
    return false
  }
  return true
}

function isCouponApplicableToProduct(coupon, product) {
  if (!isCouponCurrentlyActive(coupon) || !product) return false
  const restrictionType = String(coupon.restriction_type || 'global').trim().toLowerCase()
  const restrictionId = String(coupon.restriction_id || '').trim()
  if (restrictionType === 'global') return true
  if (restrictionType === 'product') return restrictionId === String(product.id)
  if (restrictionType === 'category') return restrictionId === String(product.categoryId || '')
  return false
}

function formatCouponValue(coupon) {
  const type = String(coupon?.type || '').toLowerCase()
  const value = toNumber(coupon?.value, 0)
  if (type === 'fixed') return `${value.toFixed(2)} EUR`
  return `${Math.round(value)}%`
}

function getCouponScopeLabel(coupon) {
  const restrictionType = String(coupon?.restriction_type || 'global').toLowerCase()
  if (restrictionType === 'product') return 'Codigo extra para este produto'
  if (restrictionType === 'category') return 'Codigo extra para esta categoria'
  return 'Codigo extra disponivel'
}

function mapProductForDetails(product, index = 0) {
  const variants = Array.isArray(product?.variants) ? product.variants : []
  const imageOptions = Array.isArray(product?.images)
    ? product.images
        .map((item) => ({
          url: resolveAssetUrl(item?.image_url || ''),
          searchText: `${item?.alt_text || ''} ${item?.image_url || ''}`.trim(),
        }))
        .filter((item) => Boolean(item.url))
    : []
  const images = imageOptions.map((item) => item.url)
  const primaryVariant = variants.find((variant) => variant?.is_active !== false) || variants[0] || null
  const price = toNumber(primaryVariant?.price ?? product?.base_price, 0)
  const compareAt = toNumber(primaryVariant?.compare_at_price, 0)
  const variantOptions = variants.map((variant) => {
    const attrs = parseAttributes(variant?.attribute_values)
    const colorLabel = extractColorFromAttributes(attrs)
    const sizeLabel = extractSizeFromAttributes(attrs)
    return {
      id: variant?.id != null ? String(variant.id) : null,
      sku: variant?.sku || product?.sku || null,
      isActive: variant?.is_active !== false,
      price: toNumber(variant?.price ?? product?.base_price, 0),
      compareAt: toNumber(variant?.compare_at_price, 0),
      colorLabel,
      colorId: resolveColorId(colorLabel),
      sizeLabel,
      attributes: attrs,
    }
  })

  const colorFromActiveVariant =
    variantOptions.find((variant) => variant.isActive && variant.colorId)?.colorId ||
    variantOptions.find((variant) => variant.colorId)?.colorId ||
    ''
  const colorFromImages = COLOR_SWATCHES.find((swatch) =>
    imageOptions.some((item) => colorMatches(item.searchText, swatch.id))
  )?.id
  const defaultColorId = colorFromActiveVariant || colorFromImages || COLOR_SWATCHES[0].id
  const swatchesWithAvailability = COLOR_SWATCHES.map((swatch) => ({
    ...swatch,
    available:
      variantOptions.some((variant) => variant.colorId === swatch.id) ||
      imageOptions.some((item) => colorMatches(item.searchText, swatch.id)),
  }))
  const visibleColors = swatchesWithAvailability.filter((swatch) => swatch.available)
  const fallbackColor =
    swatchesWithAvailability.find((swatch) => swatch.id === defaultColorId) || swatchesWithAvailability[0]
  const visibleSizes = Array.from(
    new Set(
      variantOptions
        .map((variant) => String(variant.sizeLabel || '').trim())
        .filter(Boolean)
    )
  )

  return {
    id: String(product?.id || `fallback-${index}`),
    categoryId: product?.category_id != null ? String(product.category_id) : null,
    primaryVariantId: primaryVariant?.id != null ? String(primaryVariant.id) : null,
    sku: primaryVariant?.sku || product?.sku || null,
    title: product?.name_pt || product?.name_es || product?.sku || `Produto ${index + 1}`,
    category: product?.category_name_pt || product?.category_name_es || 'Sapatilhas',
    description:
      product?.description_pt ||
      product?.description_es ||
      'Produto sem descricao detalhada no momento.',
    price,
    compareAt,
    isPromoted: Boolean(product?.is_promoted),
    images: images.length > 0 ? images : [productImage, productImage, productImage, productImage],
    imageOptions,
    variantOptions,
    defaultColorId,
    defaultSize: visibleSizes[0] || '',
    colors: visibleColors.length > 0 ? visibleColors : fallbackColor ? [fallbackColor] : [],
    sizes: visibleSizes,
    cardColor: COLOR_SWATCHES.find((swatch) => swatch.id === defaultColorId)?.label || 'Cor disponivel',
    image: pickImageByColor(imageOptions, defaultColorId) || images[0] || productImage,
  }
}

function ProductCarouselSection({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <section className='mx-auto mt-14 w-full max-w-[1240px] px-4 sm:w-[90vw] sm:px-0'>
      <h3 className='mb-6 text-[18px] font-semibold text-black'>{title}</h3>
      <Swiper
        slidesPerView={1}
        spaceBetween={12}
        preventClicks={false}
        preventClicksPropagation={false}
        breakpoints={{
          640: { slidesPerView: 2, spaceBetween: 12 },
          768: { slidesPerView: 3, spaceBetween: 12 },
          1024: { slidesPerView: 4, spaceBetween: 12 },
        }}
        pagination={{ clickable: true }}
        navigation
        modules={[Pagination, Navigation]}
      >
        {items.map((item, idx) => (
          <SwiperSlide key={`${item.id}-${idx}`}>
            <ProductCard
              title={item.title}
              color={item.cardColor}
              price={formatPrice(item.price)}
              oldPrice={item.compareAt > item.price ? formatPrice(item.compareAt) : null}
              image={item.image}
              stockLabel={item.stockLabel}
              discountLabel={
                item.compareAt > item.price && item.compareAt > 0
                  ? `-${Math.round(((item.compareAt - item.price) / item.compareAt) * 100)}%`
                  : null
              }
              to={`/productDetails/${encodeURIComponent(String(item.id || idx))}`}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}

function ProductDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState(null)
  const [recommended, setRecommended] = useState([])
  const [completeTheLook, setCompleteTheLook] = useState([])
  const [extraDiscounts, setExtraDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false)

  useEffect(() => {
    let active = true

    const loadProduct = async () => {
      try {
        setLoading(true)
        setError('')

        const [productsResponse, stockSummaryResponse, categoriesResponse, couponsResponse] = await Promise.allSettled([
          getJson('/api/products'),
          getJson(`/api/orders/dashboard/summary?threshold=${LOW_STOCK_THRESHOLD}&limit=2000`),
          getJson('/api/catalog/categories'),
          getJson('/api/discounts/coupons'),
        ])

        if (!active) return

        const lowStockMap = new Map()
        if (
          stockSummaryResponse.status === 'fulfilled' &&
          Array.isArray(stockSummaryResponse.value?.low_stock_products)
        ) {
          for (const row of stockSummaryResponse.value.low_stock_products) {
            const key = String(row?.product_id || '').trim()
            if (!key) continue
            const qty = Number(row?.stock_left)
            if (!Number.isFinite(qty)) continue
            lowStockMap.set(key, Math.max(0, Math.floor(qty)))
          }
        }

        const mapped =
          productsResponse.status === 'fulfilled' && Array.isArray(productsResponse.value)
            ? productsResponse.value.map((entry, index) => {
                const item = mapProductForDetails(entry, index)
                const dbStock = lowStockMap.get(String(item.id || '').trim())
                return dbStock == null ? item : { ...item, stockLabel: createStockLabel(dbStock) }
              })
            : []

        if (mapped.length === 0) {
          setProduct(null)
          setRecommended([])
          setCompleteTheLook([])
          setExtraDiscounts([])
          setError('No products available.')
          return
        }

        const routeId = String(id || '').trim()
        const current =
          mapped.find((item) => String(item.id) === routeId) ||
          mapped.find((item) => encodeURIComponent(String(item.id)) === routeId) ||
          mapped[0]

        const categories =
          categoriesResponse.status === 'fulfilled' && Array.isArray(categoriesResponse.value)
            ? categoriesResponse.value
            : []
        const coupons =
          couponsResponse.status === 'fulfilled' && Array.isArray(couponsResponse.value)
            ? couponsResponse.value
            : []

        const currentCategory = categories.find((category) => String(category?.id || '') === String(current.categoryId || ''))
        const selectedLookCategories = Array.isArray(currentCategory?.complete_the_look_category_ids)
          ? currentCategory.complete_the_look_category_ids.map((item) => String(item))
          : []

        const recommendedProducts = shuffleItems(
          mapped.filter(
            (item) =>
              item.id !== current.id &&
              String(item.categoryId || '') !== '' &&
              String(item.categoryId || '') === String(current.categoryId || '')
          )
        ).slice(0, 10)

        const lookProducts = currentCategory?.show_complete_the_look
          ? selectedLookCategories
              .map((categoryId) => {
                const pool = shuffleItems(
                  mapped.filter(
                    (item) =>
                      item.id !== current.id && String(item.categoryId || '') === String(categoryId || '')
                  )
                )
                return pool[0] || null
              })
              .filter(Boolean)
          : []

        const applicableCoupons = coupons
          .filter((coupon) => isCouponApplicableToProduct(coupon, current))
          .sort((left, right) => toNumber(right?.value, 0) - toNumber(left?.value, 0))

        setProduct({ ...current, categoryConfig: currentCategory || null })
        setRecommended(recommendedProducts)
        setCompleteTheLook(lookProducts)
        setExtraDiscounts(applicableCoupons)
      } catch (err) {
        if (!active) return
        setProduct(null)
        setRecommended([])
        setCompleteTheLook([])
        setExtraDiscounts([])
        setError(err instanceof Error ? err.message : 'Failed to load product details')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadProduct()

    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (!product) return
    setSelectedColor(
      product.colors.find((entry) => entry.id === product.defaultColorId)?.id ||
        product.colors[0]?.id ||
        ''
    )
    setSelectedSize(product.defaultSize || '')
    setQuantity(1)
  }, [product])

  const galleryImages = useMemo(() => {
    if (!product) return [productImage]
    const matchingImages = (product.imageOptions || [])
      .filter((item) => colorMatches(item.searchText, selectedColor))
      .map((item) => item.url)
    const otherImages = (product.imageOptions || [])
      .filter((item) => !colorMatches(item.searchText, selectedColor))
      .map((item) => item.url)
    const orderedImages = dedupeUrls([...matchingImages, ...otherImages, ...(product.images || [])])
    return orderedImages.length > 0 ? orderedImages : [productImage]
  }, [product, selectedColor])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [selectedColor, product?.id])

  useEffect(() => {
    if (!isImagePopupOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsImagePopupOpen(false)
      }
      if (event.key === 'ArrowRight') {
        setActiveImageIndex((currentIndex) => (currentIndex + 1) % galleryImages.length)
      }
      if (event.key === 'ArrowLeft') {
        setActiveImageIndex((currentIndex) => (currentIndex - 1 + galleryImages.length) % galleryImages.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [galleryImages.length, isImagePopupOpen])

  const availableSizes = useMemo(() => {
    if (!product) return []
    const matchingColorVariants = product.variantOptions.filter((entry) => {
      if (!selectedColor) return true
      return !entry.colorId || entry.colorId === selectedColor
    })
    const sizes = Array.from(
      new Set(
        matchingColorVariants
          .map((entry) => String(entry.sizeLabel || '').trim())
          .filter(Boolean)
      )
    )
    return sizes.length > 0 ? sizes : product.sizes || []
  }, [product, selectedColor])

  useEffect(() => {
    if (!availableSizes.length) {
      setSelectedSize('')
      return
    }
    if (!selectedSize || !availableSizes.includes(selectedSize)) {
      setSelectedSize(availableSizes[0])
    }
  }, [availableSizes, selectedSize])

  const selectedVariant = useMemo(() => {
    if (!product) return null
    return (
      product.variantOptions.find((entry) => {
        const matchesColor = !selectedColor || !entry.colorId || entry.colorId === selectedColor
        const matchesSize = !selectedSize || !entry.sizeLabel || entry.sizeLabel === selectedSize
        return matchesColor && matchesSize
      }) ||
      product.variantOptions.find((entry) => !selectedColor || !entry.colorId || entry.colorId === selectedColor) ||
      null
    )
  }, [product, selectedColor, selectedSize])

  const selectedColorEntry = useMemo(
    () => (product?.colors || COLOR_SWATCHES).find((entry) => entry.id === selectedColor) || null,
    [product, selectedColor]
  )

  const activePrice = selectedVariant?.price ?? product?.price ?? 0
  const activeCompareAt = selectedVariant?.compareAt ?? product?.compareAt ?? 0
  const hasDiscount = Boolean(product && activeCompareAt > activePrice)
  const productDiscountPercent =
    hasDiscount && activeCompareAt > 0 ? Math.round(((activeCompareAt - activePrice) / activeCompareAt) * 100) : 0
  const activeImage = galleryImages[activeImageIndex] || galleryImages[0] || productImage
  const hasMoreGalleryImages = galleryImages.length > 4
  const visibleGalleryTiles = hasMoreGalleryImages ? galleryImages.slice(0, 3) : galleryImages.slice(0, 4)
  const hiddenGalleryCount = hasMoreGalleryImages ? galleryImages.length - 3 : 0

  const colorPreviewOptions = useMemo(() => {
    if (!product) return []
    return (product.colors || []).map((colorEntry) => ({
      ...colorEntry,
      previewImage: pickImageByColor(product.imageOptions || [], colorEntry.id) || product.images?.[0] || productImage,
    }))
  }, [product])

  const handleAddToCart = () => {
    if (!product) return
    addCartItem({
      id: `${product.id}:${selectedVariant?.id || selectedColor || 'default'}:${selectedSize || 'default'}`,
      productId: product.id,
      variantId: selectedVariant?.id || product.primaryVariantId,
      categoryId: product.categoryId,
      sku: selectedVariant?.sku || product.sku,
      name: product.title,
      color: selectedColorEntry?.label || 'Cor disponivel',
      size: selectedSize || null,
      selectedOptions: {
        ...(selectedVariant?.attributes || {}),
        color: selectedColorEntry?.label || 'Cor disponivel',
        size: selectedSize || null,
      },
      qty: quantity,
      unitPrice: Number(activePrice || 0),
      image: activeImage || product.images?.[0] || productImage,
    })
    navigate('/cart')
  }

  return (
    <>
      <Navbar />
      <div className='flex flex-col bg-[#fbfbf8]' data-theme-layout-root='product-details'>
        <section className='mb-[10vh] mt-[4vh] px-4 sm:px-0' data-theme-layout-section='details'>
          <div className='mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-8 sm:w-[90vw] lg:grid-cols-[1.05fr_0.95fr] lg:gap-12'>
            <div className='space-y-4'>
              <button
                type='button'
                onClick={() => setIsImagePopupOpen(true)}
                className='flex w-full items-center justify-center overflow-hidden rounded-[28px] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
              >
                <img
                  src={activeImage}
                  alt={product?.title || 'Product image'}
                  className='max-h-[620px] w-full rounded-[20px] object-cover'
                />
              </button>

              <div className='grid grid-cols-4 gap-3'>
                {visibleGalleryTiles.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type='button'
                    onClick={() => {
                      setActiveImageIndex(index)
                      setIsImagePopupOpen(true)
                    }}
                    className={`relative overflow-hidden rounded-[18px] border bg-white p-1 shadow-sm transition ${
                      activeImage === imageUrl ? 'border-black' : 'border-black/10'
                    }`}
                  >
                    <img src={imageUrl} alt={`${product?.title || 'Produto'} ${index + 1}`} className='h-24 w-full rounded-[14px] object-cover' />
                  </button>
                ))}
                {hiddenGalleryCount > 0 ? (
                  <button
                    type='button'
                    onClick={() => {
                      setActiveImageIndex(3)
                      setIsImagePopupOpen(true)
                    }}
                    className='flex h-[106px] items-center justify-center rounded-[18px] border border-black bg-black text-[24px] font-semibold text-white shadow-sm transition hover:bg-black'
                    aria-label={`Open ${hiddenGalleryCount} more product images`}
                  >
                    +{hiddenGalleryCount}
                  </button>
                ) : null}
              </div>
            </div>

            <div className='min-w-0 rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-8'>
              <p className='text-[12px] uppercase tracking-[0.32em] text-[#7da3ae]'>
                Backoffice | {product?.category || 'Categoria'}
              </p>

              <div className='mt-3 flex flex-wrap items-center gap-2'>
                {hasDiscount ? (
                  <span className='rounded-full bg-[#ffe4e2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c2410c]'>
                    Promocao -{productDiscountPercent}%
                  </span>
                ) : null}
                {product?.isPromoted ? (
                  <span className='rounded-full bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white'>
                    Produto em destaque
                  </span>
                ) : null}
                {product?.stockLabel ? (
                  <span className='rounded-full bg-[#f8f0d4] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a6a12]'>
                    {product.stockLabel}
                  </span>
                ) : null}
              </div>

              <div className='mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <h1 className='text-[34px] font-semibold leading-tight text-black'>{product?.title || 'Produto'}</h1>
                  <p className='mt-2 text-[14px] text-black/60'>SKU: {selectedVariant?.sku || product?.sku || '-'}</p>
                </div>
                <div className='text-left sm:text-right'>
                  {hasDiscount ? (
                    <p className='text-[18px] line-through text-black/35'>{formatPrice(activeCompareAt)}</p>
                  ) : null}
                  <p className='text-[32px] font-semibold text-black'>{formatPrice(activePrice)}</p>
                </div>
              </div>

              {extraDiscounts.length > 0 ? (
                <div className='mt-5 space-y-2'>
                  {extraDiscounts.slice(0, 3).map((coupon) => (
                    <div
                      key={coupon.id}
                      className='rounded-[16px] border border-black bg-black px-4 py-3 text-white'
                    >
                      <p className='text-[11px] uppercase tracking-[0.18em] text-white/70'>
                        {getCouponScopeLabel(coupon)}
                      </p>
                      <p className='mt-1 text-[14px] font-semibold text-white'>
                        Use o codigo {String(coupon.code || '').toUpperCase()} e receba {formatCouponValue(coupon)} de desconto
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {loading ? <p className='mt-4 text-[12px] text-black/60'>Loading product details...</p> : null}
              {error ? <p className='mt-4 text-[12px] text-red-600'>{error}</p> : null}

              <div className='mt-8'>
                <div className='flex items-center justify-between'>
                  <span className='text-[13px] font-semibold text-black'>Tamanhos</span>
                  <button type='button' className='rounded-full bg-black px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-black/85'>
                    Guia de tamanhos
                  </button>
                </div>
                <div className='mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5'>
                  {availableSizes.length > 0 ? (
                    availableSizes.map((size) => (
                      <button
                        key={size}
                        type='button'
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-[14px] border px-4 py-3 text-[12px] font-medium transition ${
                          selectedSize === size
                            ? 'border-black bg-black text-white ring-2 ring-black/20'
                            : 'border-black bg-black text-white hover:bg-black/85'
                        }`}
                      >
                        {size}
                      </button>
                    ))
                  ) : (
                    <p className='col-span-5 text-[12px] text-black/50'>Sem tamanhos disponiveis para este produto.</p>
                  )}
                </div>
              </div>

              <div className='mt-8'>
                <span className='text-[13px] font-semibold text-black'>Cores</span>
                <div className='mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3'>
                  {colorPreviewOptions.map((colorOption) => (
                    <button
                      key={colorOption.id}
                      type='button'
                      onClick={() => setSelectedColor(colorOption.id)}
                      className={`overflow-hidden rounded-[18px] border bg-black p-2 text-left text-white transition hover:bg-black/85 ${
                        selectedColor === colorOption.id ? 'border-black shadow-sm ring-2 ring-black/20' : 'border-black'
                      } ${colorOption.available ? '' : 'opacity-50'}`}
                    >
                      <div className='flex items-center gap-3'>
                        <img
                          src={colorOption.previewImage}
                          alt={colorOption.label}
                          className='h-14 w-14 rounded-[14px] object-cover'
                        />
                        <div className='min-w-0'>
                          <p className='text-[13px] font-medium text-white'>{colorOption.label}</p>
                          <span className='mt-1 inline-flex h-4 w-4 rounded-full border border-white/60' style={{ backgroundColor: colorOption.color }} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className='mt-8 flex max-w-[220px] items-center justify-between rounded-[16px] border border-[#d9e2e4] bg-[#fbfbf8] px-2'>
                <button type='button' className='my-2 rounded-[12px] bg-black px-4 py-2 text-[18px] leading-none text-white transition hover:bg-black/85' onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                  -
                </button>
                <span className='text-[13px] font-semibold'>{quantity}</span>
                <button type='button' className='my-2 rounded-[12px] bg-black px-4 py-2 text-[18px] leading-none text-white transition hover:bg-black/85' onClick={() => setQuantity((q) => q + 1)}>
                  +
                </button>
              </div>

              <button
                className='mt-5 w-full rounded-[16px] bg-black py-4 text-[12px] font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-black/90'
                onClick={handleAddToCart}
                type='button'
              >
                Adicionar ao carrinho
              </button>

              <div className='mt-8 space-y-4 text-[12px]'>
                <div className='flex items-start gap-3 rounded-[16px] bg-[#fbfbf8] px-4 py-4'>
                  <img className='h-8 w-8' src={IconEntrega} alt='Entregas gratis' />
                  <div>
                    <p className='text-[14px] font-semibold'>Entregas gratis</p>
                    <p className='text-black/60'>Em encomendas acima de 100 EUR</p>
                  </div>
                </div>
                <div className='flex items-start gap-3 rounded-[16px] bg-[#fbfbf8] px-4 py-4'>
                  <img className='h-8 w-8' src={IconDevolucao} alt='Devolucoes' />
                  <div>
                    <p className='text-[14px] font-semibold'>Devolucoes</p>
                    <p className='text-black/60'>Devolucoes simples e rapidas</p>
                  </div>
                </div>
              </div>

              <div className='mt-8 rounded-[18px] bg-[#fbfbf8] px-4 py-5'>
                <h3 className='text-[14px] font-semibold text-black'>Descricao do produto</h3>
                <p className='mt-3 text-[13px] leading-6 text-black/70'>{product?.description || 'Sem descricao.'}</p>
              </div>
            </div>
          </div>

          <div className='mx-auto mt-12 w-full max-w-[1240px] sm:w-[90vw]'>
            <details className='border-t border-black/10 py-4'>
              <summary className='flex cursor-pointer items-center justify-between text-[16px] font-semibold'>
                Descricao
                <span className='text-[14px]'>+</span>
              </summary>
              <p className='mt-3 max-w-[820px] text-[13px] leading-6 text-black/70'>{product?.description || 'Sem descricao.'}</p>
            </details>
            <details className='border-t border-black/10 py-4'>
              <summary className='flex cursor-pointer items-center justify-between text-[16px] font-semibold'>
                Detalhes
                <span className='text-[14px]'>+</span>
              </summary>
              <p className='mt-3 text-[13px] leading-6 text-black/70'>
                Categoria: {product?.category || '-'} | SKU: {selectedVariant?.sku || product?.sku || '-'}
              </p>
            </details>
            <details className='border-y border-black/10 py-4'>
              <summary className='flex cursor-pointer items-center justify-between text-[16px] font-semibold'>
                Tecnologia
                <span className='text-[14px]'>+</span>
              </summary>
              <p className='mt-3 text-[13px] leading-6 text-black/70'>
                Informacao tecnica configurada a partir das variantes e promocoes deste produto.
              </p>
            </details>
          </div>
        </section>

        <ProductCarouselSection title='Completa o look' items={completeTheLook} />
        <ProductCarouselSection title='Produtos recomendados' items={recommended} />
      </div>

      {isImagePopupOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6'>
          <div className='relative w-full max-w-[1080px] rounded-[28px] bg-white p-4 shadow-2xl sm:p-6'>
            <button
              type='button'
              className='absolute right-4 top-4 rounded-full bg-black px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white'
              onClick={() => setIsImagePopupOpen(false)}
            >
              Close
            </button>

            <div className='grid gap-4 lg:grid-cols-[1fr_180px]'>
              <div className='flex min-h-[420px] items-center justify-center rounded-[22px] bg-[#fbfbf8] p-4'>
                <img src={activeImage} alt={product?.title || 'Product image'} className='max-h-[72vh] w-full rounded-[18px] object-contain' />
              </div>

              <div className='grid grid-cols-4 gap-3 lg:grid-cols-1'>
                {galleryImages.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-popup-${index}`}
                    type='button'
                    onClick={() => setActiveImageIndex(index)}
                    className={`overflow-hidden rounded-[16px] border p-1 ${
                      index === activeImageIndex ? 'border-black' : 'border-black/10'
                    }`}
                  >
                    <img src={imageUrl} alt={`${product?.title || 'Produto'} ${index + 1}`} className='h-20 w-full rounded-[12px] object-cover lg:h-24' />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </>
  )
}

export default ProductDetailsPage
