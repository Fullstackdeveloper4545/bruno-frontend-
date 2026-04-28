import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import productImage from '../../assets/product-card-test-image.png'
import { getJson, resolveAssetUrl } from '../../lib/api'
import ProductCard from '../ui/ProductCard'

const RESULTS_LIMIT = 12

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

function mapProduct(product, index) {
  const variants = Array.isArray(product?.variants) ? product.variants : []
  const primaryVariant = variants.find((variant) => variant?.is_active !== false) || variants[0] || null
  const color = extractColor(primaryVariant?.attribute_values)
  const price = formatPrice(primaryVariant?.price ?? product?.base_price)

  const imageOptions = Array.isArray(product?.images)
    ? product.images
        .map((image) => resolveAssetUrl(image?.image_url || ''))
        .filter(Boolean)
    : []

  return {
    id: product?.id ?? `search-product-${index}`,
    title: product?.name_pt || product?.name_es || product?.sku || `Produto ${index + 1}`,
    color,
    price,
    image: imageOptions[0] || productImage,
  }
}

function normalizeProductsResponse(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.products)) return payload.products
  if (Array.isArray(payload?.data?.products)) return payload.data.products
  return []
}

const SearchOverlay = ({ open, onClose }) => {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      setProducts([])
      setError('')
      setLoading(false)
      return
    }

    let active = true
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        const response = await getJson(`/api/products?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        })
        if (!active) return
        const mapped = normalizeProductsResponse(response).map(mapProduct)
        setProducts(mapped)
        setError('')
      } catch (err) {
        if (!active || err?.name === 'AbortError') return
        setProducts([])
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        if (active) setLoading(false)
      }
    }, 250)

    return () => {
      active = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [open, query])

  const visibleProducts = products.slice(0, RESULTS_LIMIT)
  const totalResults = products.length
  const searchLink = query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : '/products'

  if (!open) return null

  return (
    <div className='fixed inset-0 z-[60]'>
      <button
        type='button'
        className='absolute inset-0 bg-black/30'
        aria-label='Close search'
        onClick={onClose}
      />
      <div className='relative mx-auto mt-8 w-[92vw] max-w-[1200px] rounded-2xl bg-white p-5 shadow-2xl md:p-8'>
        <div className='flex flex-col gap-4 border-b border-black/10 pb-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex w-full items-center gap-3 rounded-full border border-black/10 px-4 py-2'>
            <Search size={18} className='text-black/50' />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Procurar produtos'
              className='w-full bg-transparent text-[14px] outline-none'
            />
          </div>
          <button
            type='button'
            onClick={onClose}
            className='inline-flex items-center gap-2 self-end text-[12px] font-medium text-black/60 md:self-auto'
          >
            Fechar
            <X size={16} />
          </button>
        </div>

        <div className='mt-6 flex items-center justify-between text-[13px] text-black/60'>
          <span>{loading ? 'A carregar...' : `${totalResults} resultados`}</span>
          <Link to={searchLink} onClick={onClose} className='font-medium text-black'>
            Ver tudo
          </Link>
        </div>

        {error ? (
          <p className='mt-6 text-[13px] text-red-500'>{error}</p>
        ) : null}

        {!loading && !error && !query.trim() ? (
          <p className='mt-6 text-[13px] text-black/60'>Escreva para pesquisar produtos.</p>
        ) : null}

        {!loading && !error && query.trim() && totalResults === 0 ? (
          <p className='mt-6 text-[13px] text-black/60'>Nenhum produto corresponde a pesquisa.</p>
        ) : null}

        <div className='mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {visibleProducts.map((product) => (
            <div key={product.id} onClick={onClose}>
              <ProductCard
                image={product.image}
                title={product.title}
                color={product.color}
                price={product.price}
                to={`/productDetails/${product.id}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SearchOverlay
