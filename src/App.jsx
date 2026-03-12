import React, { useEffect, useMemo, useState } from 'react'
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
    return source.slice(0, 10)
  }, [homeProducts])

  const performanceProducts = useMemo(() => {
    const source = homeProducts.length > 0 ? homeProducts : fallbackProducts
    const promoted = source.filter((product) => product.isPromoted)
    return (promoted.length > 0 ? promoted : source).slice(0, 10)
  }, [homeProducts])

  const categories = useMemo(() => {
    const source = homeCategories.length > 0 ? homeCategories : fallbackCategories
    return source.slice(0, 6)
  }, [homeCategories])

  const stores = useMemo(() => {
    const source = homeStores.length > 0 ? homeStores : fallbackStores
    return source.slice(0, 3)
  }, [homeStores])

  return (
    <>
      <Navbar />

      <section className='bg-white'>
        <div className='hero-bg h-[90vh]'>
          <div className='w-full md:w-3/12 text-white flex flex-col justify-center h-[90vh] md:ml-[10%] px-6 md:px-0'>
            <h1 className='text-[32px] md:text-[46px]'>Corre mais longe. Corre melhor.</h1>
            <p className='w-full md:w-9/12 py-4 text-[14px]'>
              Equipamento tecnico para corrida e trail running, testado por atletas e escolhido
              para quem leva a performance a serio.
            </p>
            <button className='bg-white py-2 w-full md:w-6/12 text-black'>COMPRAR AGORA</button>
          </div>
        </div>
      </section>

      {homeError ? <p className='mt-4 text-center text-[13px] text-[#b42318]'>{homeError}</p> : null}

      <section className='mt-[10vh] flex flex-col items-center'>
        <div className='text-center'>
          <h1 className='text-[24px]'>Escolhas dos atletas</h1>
          <p className='py-4'>
            Os modelos e equipamentos mais procurados por quem corre todos os dias - estrada,
            trilho e ultra trail.
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
              1024: { slidesPerView: 5, spaceBetween:6  },
            }}
            pagination={{ clickable: true }}
            navigation={true}
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
        <button className='py-2 px-10 bg-black text-white my-10'>COMPRAR AGORA</button>
      </section>

      <section>
        <h1 className='text-[24px] text-center'>Tudo o que precisas para correr melhor</h1>

        <div className='mt-6 w-full md:hidden'>
          <Swiper
            slidesPerView={1}
            spaceBetween={12}
            pagination={{ clickable: true }}
            navigation={true}
            modules={[Pagination, Navigation]}
            className='mySwiper '
          >
            {categories.map((category) => (
              <SwiperSlide key={`cat-mobile-${category.id}`} className='py-4'>
                <CategoryCard title={category.title} image={category.image} to={category.to} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className='hidden md:flex flex-wrap justify-center gap-4 mt-10'>
          {categories.map((category) => (
            <CategoryCard
              key={`cat-desktop-${category.id}`}
              title={category.title}
              image={category.image}
              to={category.to}
            />
          ))}
        </div>
      </section>

      <section className='mt-[10vh] flex flex-col items-center'>
        <div className='text-center'>
          <h1 className='text-[24px]'>Performance comprovada</h1>
          <p className='py-4'>
            Selecionamos apenas marcas e modelos que cumprem os nossos criterios de qualidade,
            durabilidade e eficiencia.
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

      <section className='mt-[10vh]'>
        <div className='promo-bg h-[50vh] w-[90vw] mx-auto flex items-center justify-center'>
          <div className='text-center text-white px-8 py-6'>
            <h2 className='text-[32px]'>Corre para as oportunidades</h2>
            <p className='py-3 text-[16px]'>
              Ate 30% de desconto em artigos selecionados. So por tempo limitado.
            </p>
            <button className='bg-white text-black px-10 py-2 tracking-[2px] text-[14px]'>
              COMPRAR AGORA
            </button>
          </div>
        </div>
      </section>

      <section className='mt-[10vh] mb-[10vh]'>
        <h2 className='text-[32px] text-center mb-6'>Marcas</h2>

        <div className='w-[90vw] mx-auto md:hidden'>
          <Swiper
            slidesPerView={1}
            spaceBetween={12}
            pagination={{ clickable: true }}
            navigation={true}
            modules={[Pagination, Navigation]}
            className='mySwiper'
          >
            {brandLogos.map((brand) => (
              <SwiperSlide key={brand.alt}>
                <div className='flex items-center justify-center py-6'>
                  <img className='h-16 object-contain' src={brand.src} alt={brand.alt} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className='hidden md:flex w-[90vw] mx-auto flex-wrap items-center justify-between gap-y-6'>
          {brandLogos.map((brand) => (
            <img key={`brand-${brand.alt}`} className='h-16 object-contain' src={brand.src} alt={brand.alt} />
          ))}
        </div>
      </section>

      <section className='mx-auto max-w-[1366px] px-5 sm:px-8 lg:px-[42px] py-[40px] sm:py-[55px] lg:py-[70px] text-center'>
        <h2 className='m-0 text-[28px] sm:text-[32px] leading-[1.04] font-normal text-[#262626]'>
          Estamos perto de ti
        </h2>
        <p className='m-0 mt-3 text-[14px] sm:text-[16px] leading-[1.5] tracking-[0.04em] text-[#333]'>
          Visita-nos numa das nossas lojas fisicas e recebe aconselhamento especializado.
        </p>

        <div className='mt-6 md:hidden'>
          <Swiper
            slidesPerView={1}
            spaceBetween={12}
            pagination={{ clickable: true }}
            navigation={true}
            modules={[Pagination, Navigation]}
            className='mySwiper py-2'
          >
            {stores.map((store) => (
              <SwiperSlide key={`store-mobile-${store.id}`} className='py-2'>
                <StoreCard image={store.image} title={store.name} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className='mt-6 hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
          {stores.map((store) => (
            <StoreCard key={`store-desktop-${store.id}`} image={store.image} title={store.name} />
          ))}
        </div>
      </section>

      <section className='mt-[10vh] mb-[10vh] flex flex-col items-center'>
        <div className='text-center'>
          <h2 className='text-[32px]'>Ana Dias sempre contigo</h2>
          <p className='py-3 text-[16px]'>
            A tua corrida e a nossa inspiracao. Partilha os teus momentos, treinos e conquistas
            com #anadiasrun e faz parte da nossa comunidade.
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

      <section className='mt-[10vh] mb-[10vh]'>
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

      {homeLoading ? <p className='mb-8 text-center text-[13px] text-[#6b7280]'>Syncing home data...</p> : null}

      <Footer />
    </>
  )
}

export default App
