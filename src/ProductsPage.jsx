import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ProductCard from './components/ui/ProductCard'
import productImage from './assets/product-card-test-image.png'
import { getJson, resolveAssetUrl } from './lib/api'

const LOW_STOCK_THRESHOLD = 5

const fallbackProducts = [
  {
    id: 'fallback-1',
    categoryId: 'fallback-category',
    categoryName: 'Produtos',
    title: 'Adidas Adizero Boston 13 W',
    color: 'Branco e Rosa',
    price: '132.00 EUR',
    oldPrice: '188.00 EUR',
    discountLabel: '30% off',
    image: productImage,
    stockLabel: null,
  },
  {
    id: 'fallback-2',
    categoryId: 'fallback-category',
    categoryName: 'Produtos',
    title: 'Adidas Adizero Takumi SEN 10 W',
    color: 'Azul',
    price: '135.00 EUR',
    image: productImage,
    stockLabel: null,
  },
  {
    id: 'fallback-3',
    categoryId: 'fallback-category',
    categoryName: 'Produtos',
    title: 'Adizero Adios Pro 4 W',
    color: 'Branco e Laranja',
    price: '97.00 EUR',
    image: productImage,
    stockLabel: null,
  },
]

const colorSwatches = [
  { name: 'Preto', color: '#111111' },
  { name: 'Azul', color: '#1f4f8f' },
  { name: 'Castanho', color: '#9a5b2a' },
  { name: 'Verde', color: '#5f6b4f' },
  { name: 'Cinzento', color: '#d9d9d9', light: true },
  { name: 'Laranja', color: '#d8892b' },
  { name: 'Rosa', color: '#f0c7bd' },
  { name: 'Vermelho', color: '#c62828' },
  { name: 'Bege', color: '#b8a892' },
]

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

function extractColor(attributes) {
  const source = parseAttributes(attributes)
  const entries = Object.entries(source)
  if (entries.length === 0) return 'Cor disponivel'
  const hit = entries.find(([key]) => ['cor', 'color', 'colour'].includes(String(key).toLowerCase()))
  if (hit) return String(hit[1] || 'Cor disponivel')
  return 'Cor disponivel'
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

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

function getColorTokens(colorName) {
  const key = normalizeText(colorName)
  return colorAliasMap[key] || [key]
}

function colorMatches(value, selectedColor) {
  const haystack = normalizeText(value)
  if (!haystack) return false
  return getColorTokens(selectedColor).some((token) => haystack.includes(token))
}

function pickImageByColor(imageOptions, selectedColor) {
  if (!Array.isArray(imageOptions) || imageOptions.length === 0) return ''
  const match = imageOptions.find((item) => colorMatches(item.searchText, selectedColor))
  return match?.url || ''
}

function mapProductToCard(product, index) {
  const variants = Array.isArray(product?.variants) ? product.variants : []
  const variantOptions = variants.map((variant) => {
    const variantPrice = toNumber(variant?.price ?? product?.base_price, 0)
    const variantCompareAt = toNumber(variant?.compare_at_price, 0)
    const hasDiscount = variantCompareAt > variantPrice && variantCompareAt > 0
    const discountPct = hasDiscount ? Math.round(((variantCompareAt - variantPrice) / variantCompareAt) * 100) : 0
    return {
      variantId: variant?.id ?? null,
      color: extractColor(variant?.attribute_values),
      price: formatPrice(variantPrice),
      oldPrice: hasDiscount ? formatPrice(variantCompareAt) : null,
      discountLabel: hasDiscount ? `${discountPct}% off` : null,
      isActive: variant?.is_active !== false,
    }
  })

  const primaryVariant = variantOptions.find((variant) => variant.isActive) || variantOptions[0] || null

  const imageOptions = Array.isArray(product?.images)
    ? product.images
        .map((image) => ({
          url: resolveAssetUrl(image?.image_url || ''),
          searchText: `${image?.alt_text || ''} ${image?.image_url || ''}`,
        }))
        .filter((item) => Boolean(item.url))
    : []

  const image = imageOptions[0]?.url || productImage

  return {
    id: product?.id || `api-product-${index}`,
    categoryId: product?.category_id != null ? String(product.category_id) : '',
    categoryName: product?.category_name_pt || product?.category_name_es || 'Sem categoria',
    title: product?.name_pt || product?.name_es || product?.sku || `Produto ${index + 1}`,
    color: primaryVariant?.color || 'Cor disponivel',
    price: primaryVariant?.price || formatPrice(product?.base_price),
    oldPrice: primaryVariant?.oldPrice || null,
    discountLabel: primaryVariant?.discountLabel || null,
    image,
    stockLabel: null,
    variantOptions,
    imageOptions,
  }
}

function buildCategoryLink(category, index) {
  const categoryId = category?.id != null ? String(category.id) : `category-${index}`
  const categoryName = category?.name_pt || category?.name_es || category?.slug || `Categoria ${index + 1}`
  return {
    id: categoryId,
    name: categoryName,
    to: `/products?categoryId=${encodeURIComponent(categoryId)}&categoryName=${encodeURIComponent(categoryName)}`,
  }
}

function ProductsPage() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const [selectedColor, setSelectedColor] = useState(null)
  const selectedCategoryId = String(searchParams.get('categoryId') || '').trim()
  const selectedCategoryName = String(searchParams.get('categoryName') || '').trim()

  useEffect(() => {
    let active = true

    const loadProducts = async () => {
      try {
        const [productsResponse, categoriesResponse, stockSummaryResponse] = await Promise.allSettled([
          getJson('/api/products'),
          getJson('/api/catalog/categories'),
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

        const mappedProducts =
          productsResponse.status === 'fulfilled' && Array.isArray(productsResponse.value)
            ? productsResponse.value.map((product, index) => {
                const card = mapProductToCard(product, index)
                const dbStock = lowStockMap.get(String(card.id || '').trim())
                return dbStock == null ? card : { ...card, stockLabel: createStockLabel(dbStock) }
              })
            : []

        const mappedCategories =
          categoriesResponse.status === 'fulfilled' && Array.isArray(categoriesResponse.value)
            ? categoriesResponse.value
                .filter((category) => category?.is_active !== false)
                .map(buildCategoryLink)
            : []

        setProducts(mappedProducts)
        setCategories(mappedCategories)
        setError('')
      } catch (err) {
        if (!active) return
        setProducts([])
        setCategories([])
        setError(err instanceof Error ? err.message : 'Failed to load products')
      }
    }

    void loadProducts()

    return () => {
      active = false
    }
  }, [])

  const baseProducts = products.length > 0 ? products : fallbackProducts

  const filteredProducts = useMemo(() => {
    const filteredByCategory = selectedCategoryId
      ? baseProducts.filter((product) => String(product?.categoryId || '').trim() === selectedCategoryId)
      : baseProducts

    if (!selectedColor) return filteredByCategory

    return filteredByCategory
      .map((product) => {
        const matchedVariant = Array.isArray(product?.variantOptions)
          ? product.variantOptions.find((variant) => colorMatches(variant.color, selectedColor))
          : null
        const matchedImage = pickImageByColor(product?.imageOptions, selectedColor)

        if (matchedVariant) {
          return {
            ...product,
            color: matchedVariant.color === 'Cor disponivel' ? selectedColor : matchedVariant.color,
            price: matchedVariant.price,
            oldPrice: matchedVariant.oldPrice,
            discountLabel: matchedVariant.discountLabel,
            image: matchedImage || product.image,
          }
        }

        if (colorMatches(product?.color, selectedColor) || matchedImage) {
          return {
            ...product,
            color: colorMatches(product?.color, selectedColor) ? product.color : selectedColor,
            image: matchedImage || product.image,
          }
        }

        return null
      })
      .filter(Boolean)
  }, [baseProducts, selectedCategoryId, selectedColor])

  const resolvedCategoryName = useMemo(() => {
    if (selectedCategoryId) {
      const match = categories.find((category) => category.id === selectedCategoryId)
      if (match?.name) return match.name
    }
    if (selectedCategoryName) return selectedCategoryName
    return 'Todos os produtos'
  }, [categories, selectedCategoryId, selectedCategoryName])

  const groupedProducts = useMemo(() => {
    if (selectedCategoryId) {
      return [
        {
          id: selectedCategoryId,
          name: resolvedCategoryName,
          products: filteredProducts,
        },
      ]
    }

    const groups = new Map()

    for (const product of filteredProducts) {
      const key = String(product?.categoryId || 'uncategorized').trim() || 'uncategorized'
      const name = product?.categoryName || 'Sem categoria'
      if (!groups.has(key)) {
        groups.set(key, { id: key, name, products: [] })
      }
      groups.get(key).products.push(product)
    }

    const orderedGroups = categories.map((category) => {
      return groups.get(category.id) || { id: category.id, name: category.name, products: [] }
    })

    for (const [key, group] of groups.entries()) {
      if (!categories.some((category) => category.id === key)) {
        orderedGroups.push(group)
      }
    }

    return orderedGroups
  }, [categories, filteredProducts, resolvedCategoryName, selectedCategoryId])

  const visibleCount = filteredProducts.length

  const toggleColor = (name) => {
    setSelectedColor((prev) => (prev === name ? null : name))
  }

  return (
    <>
      <Navbar />
      <section className='bg-[#fcfcfc] py-8 md:py-12'>
        <div className='mx-auto flex w-[92vw] max-w-[1380px] flex-col gap-8 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12'>
          <aside className='rounded-2xl border border-black/10 bg-white p-5 lg:sticky lg:top-6 lg:h-fit lg:p-6'>
            <div className='flex items-center justify-between border-b border-black/10 pb-4'>
              <div>
                <p className='text-[12px] uppercase tracking-[0.2em] text-black/45'>Catalogo</p>
                <p className='mt-1 text-[22px] font-semibold'>{visibleCount}</p>
                <p className='text-[12px] text-black/55'>produtos visiveis</p>
              </div>
              {selectedColor ? (
                <button
                  type='button'
                  onClick={() => setSelectedColor(null)}
                  className='text-[12px] font-medium text-black/60 underline underline-offset-4'
                >
                  Limpar cor
                </button>
              ) : null}
            </div>

            <details open className='border-b border-black/10 py-4'>
              <summary className='flex cursor-pointer items-center justify-between text-[14px] font-semibold'>
                Categorias
                <ChevronDown size={16} />
              </summary>
              <div className='mt-4 flex flex-col gap-3 text-[13px]'>
                <Link
                  to='/products'
                  className={`rounded-full px-3 py-2 transition ${!selectedCategoryId ? 'bg-black text-white' : 'bg-black/[0.04] hover:bg-black/[0.07]'}`}
                >
                  Todos os produtos
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    to={category.to}
                    className={`rounded-full px-3 py-2 transition ${
                      selectedCategoryId === category.id ? 'bg-black text-white' : 'bg-black/[0.04] hover:bg-black/[0.07]'
                    }`}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </details>

            <details open className='py-4'>
              <summary className='flex cursor-pointer items-center justify-between text-[14px] font-semibold'>
                Cor
                <ChevronDown size={16} />
              </summary>
              <div className='mt-4 grid grid-cols-3 gap-4 text-[11px]'>
                {colorSwatches.map((swatch) => {
                  const isSelected = selectedColor === swatch.name
                  return (
                    <button
                      key={swatch.name}
                      type='button'
                      aria-pressed={isSelected}
                      onClick={() => toggleColor(swatch.name)}
                      className='group flex flex-col items-center gap-2 outline-none'
                    >
                      <span
                        className={`h-6 w-6 rounded-full transition-shadow ${
                          isSelected
                            ? 'ring-2 ring-black ring-offset-2 ring-offset-white'
                            : swatch.light
                              ? 'ring-1 ring-black/10'
                              : ''
                        } group-focus-visible:ring-2 group-focus-visible:ring-black group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white`}
                        style={{ backgroundColor: swatch.color }}
                      />
                      <span className={isSelected ? 'font-semibold' : ''}>{swatch.name}</span>
                    </button>
                  )
                })}
              </div>
            </details>
          </aside>

          <div>
            <div className='rounded-[28px] bg-white px-6 py-8 shadow-[0_16px_48px_rgba(0,0,0,0.06)] md:px-8'>
              <p className='text-[12px] uppercase tracking-[0.24em] text-black/45'>
                Home / {resolvedCategoryName}
              </p>
              <div className='mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
                <div>
                  <h1 className='text-[32px] font-semibold leading-tight md:text-[40px]'>{resolvedCategoryName}</h1>
                  <p className='mt-2 max-w-[680px] text-[14px] text-black/60'>
                    Explore produtos organizados pelas categorias que estao definidas no catalogo.
                  </p>
                </div>
                <div className='rounded-full bg-black/[0.05] px-4 py-2 text-[13px] text-black/70'>
                  {visibleCount} artigos
                </div>
              </div>
              {error ? <p className='mt-3 text-[12px] text-red-600'>Live products unavailable. Showing fallback items.</p> : null}
            </div>

            <div className='mt-8 space-y-10'>
              {groupedProducts.length === 0 ? (
                <section className='rounded-[28px] bg-white px-6 py-8 shadow-[0_16px_48px_rgba(0,0,0,0.05)] md:px-8'>
                  <div className='rounded-2xl border border-dashed border-black/15 bg-black/[0.02] px-6 py-12 text-center text-[14px] text-black/60'>
                    No products in this category.
                  </div>
                </section>
              ) : (
                groupedProducts.map((group) => (
                  <section key={group.id} className='rounded-[28px] bg-white px-6 py-8 shadow-[0_16px_48px_rgba(0,0,0,0.05)] md:px-8'>
                    {!selectedCategoryId ? (
                      <div className='mb-6 flex flex-col gap-3 border-b border-black/10 pb-5 md:flex-row md:items-center md:justify-between'>
                        <div>
                          <p className='text-[11px] uppercase tracking-[0.22em] text-black/40'>Categoria</p>
                          <h2 className='mt-2 text-[26px] font-semibold'>{group.name}</h2>
                        </div>
                        <Link
                          to={`/products?categoryId=${encodeURIComponent(group.id)}&categoryName=${encodeURIComponent(group.name)}`}
                          className='text-[13px] font-medium text-black underline underline-offset-4'
                        >
                          Ver categoria
                        </Link>
                      </div>
                    ) : null}

                    {group.products.length === 0 ? (
                      <div className='rounded-2xl border border-dashed border-black/15 bg-black/[0.02] px-6 py-12 text-center text-[14px] text-black/60'>
                        No products in this category.
                      </div>
                    ) : (
                      <div className='grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3'>
                        {group.products.map((product, index) => (
                          <ProductCard
                            key={`${group.id}-${product.id || product.title}-${index}`}
                            image={product.image}
                            title={product.title}
                            color={product.color}
                            price={product.price}
                            oldPrice={product.oldPrice}
                            discountLabel={product.discountLabel}
                            stockLabel={product.stockLabel}
                            to={`/productDetails/${encodeURIComponent(String(product.id || index))}`}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}

export default ProductsPage
