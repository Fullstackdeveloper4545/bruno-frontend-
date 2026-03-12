import React, { useEffect, useMemo, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import { Pagination, Navigation } from 'swiper/modules'
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
  if (!haystack) return false
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
    return {
      id: variant?.id != null ? String(variant.id) : null,
      isActive: variant?.is_active !== false,
      price: toNumber(variant?.price ?? product?.base_price, 0),
      compareAt: toNumber(variant?.compare_at_price, 0),
      colorLabel,
      colorId: resolveColorId(colorLabel),
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
    images: images.length > 0 ? images : [productImage, productImage, productImage, productImage],
    imageOptions,
    variantOptions,
    defaultColorId,
    colors: visibleColors.length > 0 ? visibleColors : fallbackColor ? [fallbackColor] : [],
    cardColor: COLOR_SWATCHES.find((swatch) => swatch.id === defaultColorId)?.label || 'Cor disponivel',
    image: pickImageByColor(imageOptions, defaultColorId) || images[0] || productImage,
  }
}

function ProductDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState(null)
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadProduct = async () => {
      try {
        setLoading(true)
        setError('')
        const [productsResponse, stockSummaryResponse] = await Promise.allSettled([
          getJson('/api/products'),
          getJson(`/api/orders/dashboard/summary?threshold=${LOW_STOCK_THRESHOLD}&limit=2000`),
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
          setError('No products available.')
          return
        }

        const routeId = String(id || '').trim()
        const current =
          mapped.find((item) => String(item.id) === routeId) ||
          mapped.find((item) => encodeURIComponent(String(item.id)) === routeId) ||
          mapped[0]

        setProduct(current)
        setRecommended(mapped.filter((item) => item.id !== current.id).slice(0, 10))
      } catch (err) {
        if (!active) return
        setProduct(null)
        setRecommended([])
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
    setQuantity(1)
  }, [product])

  const selectedVariant = useMemo(() => {
    if (!product) return null
    return product.variantOptions.find((entry) => entry.colorId === selectedColor) || null
  }, [product, selectedColor])

  const selectedColorEntry = useMemo(
    () => (product?.colors || COLOR_SWATCHES).find((entry) => entry.id === selectedColor) || null,
    [product, selectedColor]
  )

  const activePrice = selectedVariant?.price ?? product?.price ?? 0
  const activeCompareAt = selectedVariant?.compareAt ?? product?.compareAt ?? 0
  const hasDiscount = Boolean(product && activeCompareAt > activePrice)

  const selectedImage = useMemo(() => {
    if (!product) return productImage
    const matched = (product.imageOptions || []).find((item) => colorMatches(item.searchText, selectedColor))?.url
    return matched || product.images?.[0] || productImage
  }, [product, selectedColor])

  const handleAddToCart = () => {
    if (!product) return
    addCartItem({
      id: `${product.id}:${selectedColor || 'default'}`,
      productId: product.id,
      variantId: selectedVariant?.id || product.primaryVariantId,
      categoryId: product.categoryId,
      sku: product.sku,
      name: product.title,
      color: selectedColorEntry?.label || 'Cor disponivel',
      qty: quantity,
      unitPrice: Number(activePrice || 0),
      image: selectedImage || product.images?.[0] || productImage,
    })
    navigate('/cart')
  }

  return (
    <>
      <Navbar />
      <section className='mt-[6vh] mb-[10vh]'>
        <div className='w-[90vw] mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10'>
          <div className='border border-black/5 flex items-center justify-center'>
            <img src={selectedImage} alt={product?.title || 'Product image'} className='w-full' />
          </div>

          <div>
            <p className='text-[12px] text-black/60'>Sapatilhas | {product?.category || 'Categoria'}</p>
            <div className='flex items-start justify-between gap-4 mt-2'>
              <h1 className='text-[24px] font-semibold'>{product?.title || 'Produto'}</h1>
              <div className='text-right flex gap-4'>
                {hasDiscount ? <p className='text-[24px] line-through text-black/40'>{formatPrice(activeCompareAt)}</p> : null}
                <p className='text-[24px] font-semibold'>{formatPrice(activePrice)}</p>
              </div>
            </div>

            {loading ? <p className='mt-3 text-[12px] text-black/60'>Loading product details...</p> : null}
            {error ? <p className='mt-3 text-[12px] text-red-600'>{error}</p> : null}

            <div className='mt-6'>
              <div className='flex items-center justify-between'>
                <span className='text-[12px] font-semibold'>Tamanhos</span>
                <button className='text-[11px] text-black/60'>Guia de Tamanhos</button>
              </div>
              <div className='mt-3 grid grid-cols-6 gap-2 text-[11px]'>
                {['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'].map((size) => (
                  <button
                    key={size}
                    className='border border-black/10 py-2 focus:bg-black focus:text-white focus:border-black'
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className='mt-6'>
              <span className='text-[12px] font-semibold'>Cor</span>
              <div className='mt-3 grid grid-cols-3 sm:grid-cols-5 gap-3 max-w-[360px]'>
                {(product?.colors || []).map((c) => (
                  <button
                    key={c.id}
                    type='button'
                    onClick={() => setSelectedColor(c.id)}
                    className='group flex flex-col items-center gap-1 outline-none'
                    aria-label={`Cor ${c.label}`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full transition-shadow ${
                        selectedColor === c.id
                          ? 'ring-2 ring-black ring-offset-2 ring-offset-white'
                          : c.light
                            ? 'ring-1 ring-black/10'
                            : ''
                      } ${c.available ? '' : 'opacity-45'} group-focus-visible:ring-2 group-focus-visible:ring-black group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white`}
                      style={{ backgroundColor: c.color }}
                    />
                    <span className={`text-[11px] ${selectedColor === c.id ? 'font-semibold' : 'text-black/70'} ${c.available ? '' : 'opacity-50'}`}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className='mt-6 flex items-center justify-between border border-black/10'>
              <button className='px-4 py-2 text-[14px]' onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                -
              </button>
              <span className='text-[12px]'>{quantity}</span>
              <button className='px-4 py-2 text-[14px]' onClick={() => setQuantity((q) => q + 1)}>
                +
              </button>
            </div>

            <button
              className='mt-4 w-full bg-black text-white py-3 text-[12px] tracking-[2px]'
              onClick={handleAddToCart}
              type='button'
            >
              ADICIONAR AO CARRINHO
            </button>

            <div className='mt-6 space-y-4 text-[12px]'>
              <div className='flex items-start gap-3'>
                <img className='h-8 w-8' src={IconEntrega} alt='Entregas gratis' />
                <div>
                  <p className='font-semibold text-[14px]'>Entregas gratis</p>
                  <p className='text-black/60'>Em encomendas acima de 100 EUR</p>
                </div>
              </div>
              <div className='flex items-start gap-3'>
                <img className='h-8 w-8' src={IconDevolucao} alt='Devolucoes' />
                <div>
                  <p className='font-semibold text-[14px]'>Devolucoes</p>
                  <p className='text-black/60'>Devolucoes simples e rapidas</p>
                </div>
              </div>
            </div>

            <div className='mt-8'>
              <h3 className='text-[13px] font-semibold'>Descricao de Produto</h3>
              <p className='text-[12px] text-black/70 mt-3'>{product?.description || 'Sem descricao.'}</p>
            </div>
          </div>
        </div>

        <div className='w-[90vw] mx-auto mt-12'>
          <details className='border-t border-black/10 py-4'>
            <summary className='cursor-pointer text-[16px] font-semibold flex items-center justify-between'>
              Descricao
              <span className='text-[14px]'>⌄</span>
            </summary>
          </details>
          <details className='border-t border-black/10 py-4'>
            <summary className='cursor-pointer text-[16px] font-semibold flex items-center justify-between'>
              Detalhes
              <span className='text-[14px]'>⌄</span>
            </summary>
          </details>
          <details className='border-t border-b border-black/10 py-4'>
            <summary className='cursor-pointer text-[16px] font-semibold flex items-center justify-between'>
              Tecnologia
              <span className='text-[14px]'>⌄</span>
            </summary>
          </details>
        </div>
      </section>

      <div className='w-[90vw] mx-auto mt-14'>
        <h3 className='text-[16px] font-semibold mb-6'>Produtos Recomendados</h3>
        <div>
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
            modules={[Pagination, Navigation]}
            className='mySwiper'
          >
            {(recommended.length > 0 ? recommended : [mapProductForDetails({}, 0)]).map((item, idx) => (
              <SwiperSlide key={`${item.id}-${idx}`}>
                <ProductCard
                  title={item.title}
                  color={item.cardColor}
                  price={formatPrice(item.price)}
                  oldPrice={item.compareAt > item.price ? formatPrice(item.compareAt) : null}
                  image={item.image}
                  stockLabel={item.stockLabel}
                  to={`/productDetails/${encodeURIComponent(String(item.id || idx))}`}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default ProductDetailsPage
