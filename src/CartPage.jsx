import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import { postJson } from './lib/api'
import {
  cartEvents,
  clearAppliedCoupon,
  getAppliedCoupon,
  getCartItems,
  removeCartItem,
  setAppliedCoupon,
  updateCartItemQuantity,
} from './lib/cart'

const CART_LAYOUT_STORAGE_KEY = 'cart_page_layout_v1'
const CART_LAYOUT_COLUMNS = {
  left: 'left',
  right: 'right',
}
const CART_LAYOUT_BLOCKS = {
  cartHeader: 'cartHeader',
  cartItems: 'cartItems',
  coupon: 'coupon',
  summary: 'summary',
}
const DEFAULT_CART_LAYOUT = {
  [CART_LAYOUT_COLUMNS.left]: [
    CART_LAYOUT_BLOCKS.cartHeader,
    CART_LAYOUT_BLOCKS.cartItems,
    CART_LAYOUT_BLOCKS.coupon,
  ],
  [CART_LAYOUT_COLUMNS.right]: [CART_LAYOUT_BLOCKS.summary],
}

function normalizeCartLayout(candidate) {
  const allBlocks = Object.values(CART_LAYOUT_BLOCKS)
  const hasLeft = Array.isArray(candidate?.[CART_LAYOUT_COLUMNS.left])
  const hasRight = Array.isArray(candidate?.[CART_LAYOUT_COLUMNS.right])
  if (!hasLeft && !hasRight) return DEFAULT_CART_LAYOUT

  const left = hasLeft ? candidate[CART_LAYOUT_COLUMNS.left].filter((block) => allBlocks.includes(block)) : []
  const right = hasRight ? candidate[CART_LAYOUT_COLUMNS.right].filter((block) => allBlocks.includes(block)) : []

  const seen = new Set()
  const uniqueLeft = left.filter((block) => {
    if (seen.has(block)) return false
    seen.add(block)
    return true
  })
  const uniqueRight = right.filter((block) => {
    if (seen.has(block)) return false
    seen.add(block)
    return true
  })

  const missing = allBlocks.filter((block) => !seen.has(block))
  const nextLeft = [...uniqueLeft]
  const nextRight = [...uniqueRight]

  missing.forEach((block) => {
    if (block === CART_LAYOUT_BLOCKS.summary) nextRight.push(block)
    else nextLeft.push(block)
  })

  return {
    [CART_LAYOUT_COLUMNS.left]: nextLeft,
    [CART_LAYOUT_COLUMNS.right]: nextRight,
  }
}

function readCartLayoutFromStorage() {
  try {
    const raw = window.localStorage.getItem(CART_LAYOUT_STORAGE_KEY)
    if (!raw) return DEFAULT_CART_LAYOUT
    return normalizeCartLayout(JSON.parse(raw))
  } catch {
    return DEFAULT_CART_LAYOUT
  }
}

function moveCartBlock(layout, blockId, toColumn, toIndex) {
  const left = layout[CART_LAYOUT_COLUMNS.left]
  const right = layout[CART_LAYOUT_COLUMNS.right]
  const fromColumn = left.includes(blockId) ? CART_LAYOUT_COLUMNS.left : CART_LAYOUT_COLUMNS.right
  const fromIndex = fromColumn === CART_LAYOUT_COLUMNS.left ? left.indexOf(blockId) : right.indexOf(blockId)

  const nextLeft = left.filter((block) => block !== blockId)
  const nextRight = right.filter((block) => block !== blockId)
  const next = {
    [CART_LAYOUT_COLUMNS.left]: nextLeft,
    [CART_LAYOUT_COLUMNS.right]: nextRight,
  }

  const target = next[toColumn]
  const maxIndex = target.length
  let insertAt = Math.max(0, Math.min(Number(toIndex ?? maxIndex), maxIndex))
  if (fromColumn === toColumn && fromIndex !== -1 && fromIndex < insertAt) insertAt -= 1
  target.splice(insertAt, 0, blockId)

  return next
}

function formatEuro(value) {
  const amount = Number(value || 0)
  return `${amount.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

const CartPage = () => {
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState([])
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [isEditingLayout, setIsEditingLayout] = useState(false)
  const [layout, setLayout] = useState(() => readCartLayoutFromStorage())
  const [draggingBlock, setDraggingBlock] = useState(null)

  useEffect(() => {
    const syncCart = () => {
      setCartItems(getCartItems())
      const applied = getAppliedCoupon()
      setCoupon(applied)
      setCouponCode(applied?.code || '')
    }

    syncCart()
    window.addEventListener('storage', syncCart)
    window.addEventListener(cartEvents.updated, syncCart)
    window.addEventListener(cartEvents.couponUpdated, syncCart)
    return () => {
      window.removeEventListener('storage', syncCart)
      window.removeEventListener(cartEvents.updated, syncCart)
      window.removeEventListener(cartEvents.couponUpdated, syncCart)
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_LAYOUT_STORAGE_KEY, JSON.stringify(normalizeCartLayout(layout)))
    } catch {
      // ignore storage failures
    }
  }, [layout])

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 0), 0),
    [cartItems]
  )
  const discount = useMemo(() => Math.min(Number(coupon?.discount || 0), subtotal), [coupon, subtotal])
  const total = Math.max(0, subtotal - discount)

  const handleRemoveItem = (id) => {
    removeCartItem(id)
    if (coupon) {
      clearAppliedCoupon()
      setMessage('Coupon removed because cart changed.')
    }
  }

  const handleQuantityChange = (id, nextQty) => {
    updateCartItemQuantity(id, nextQty)
    if (coupon) {
      clearAppliedCoupon()
      setMessage('Coupon removed because cart changed.')
    }
  }

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase()
    if (!code) {
      setError('Please enter a coupon code.')
      setMessage('')
      return
    }
    if (cartItems.length === 0) {
      setError('Your cart is empty.')
      setMessage('')
      return
    }

    try {
      setIsApplyingCoupon(true)
      setError('')
      setMessage('')
      const payloadItems = cartItems.map((item) => ({
        product_id: item.productId || null,
        category_id: item.categoryId || null,
        quantity: Number(item.qty || 0),
        unit_price: Number(item.unitPrice || 0),
        line_total: Number(item.qty || 0) * Number(item.unitPrice || 0),
      }))
      const response = await postJson('/api/discounts/apply', { code, items: payloadItems })
      const applied = {
        code,
        coupon_id: Number(response?.coupon_id),
        discount: Number(response?.discount || 0),
      }
      setAppliedCoupon(applied)
      setCoupon(applied)
      setMessage(`Coupon ${code} applied successfully.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply coupon.')
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      setError('Your cart is empty.')
      return
    }
    navigate('/checkout')
  }

  const blockLabels = {
    [CART_LAYOUT_BLOCKS.cartHeader]: 'Cabeçalho',
    [CART_LAYOUT_BLOCKS.cartItems]: 'Produtos',
    [CART_LAYOUT_BLOCKS.coupon]: 'Cupão',
    [CART_LAYOUT_BLOCKS.summary]: 'Total',
  }

  const startDragBlock = (blockId, column) => (event) => {
    if (!isEditingLayout) return
    setDraggingBlock({ id: blockId, column })
    try {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', blockId)
    } catch {
      // ignore
    }
  }

  const endDragBlock = () => {
    setDraggingBlock(null)
  }

  const handleDragOverPosition = (toColumn, toIndex, event) => {
    if (!isEditingLayout || !draggingBlock?.id) return
    event.preventDefault()
    setLayout((prev) => {
      const normalized = normalizeCartLayout(prev)
      const left = normalized[CART_LAYOUT_COLUMNS.left]
      const right = normalized[CART_LAYOUT_COLUMNS.right]
      const currentColumn = left.includes(draggingBlock.id) ? CART_LAYOUT_COLUMNS.left : CART_LAYOUT_COLUMNS.right
      const currentIndex =
        currentColumn === CART_LAYOUT_COLUMNS.left
          ? left.indexOf(draggingBlock.id)
          : right.indexOf(draggingBlock.id)

      if (currentColumn === toColumn && (currentIndex === toIndex || currentIndex + 1 === toIndex)) return prev
      return moveCartBlock(normalized, draggingBlock.id, toColumn, toIndex)
    })
  }

  const handleDrop = (event) => {
    if (!isEditingLayout) return
    event.preventDefault()
    setDraggingBlock(null)
  }

  const renderBlockShell = (blockId, column, index, children) => {
    const isDragging = draggingBlock?.id === blockId
    return (
      <div
        key={`${column}-${blockId}`}
        data-theme-layout-section={blockId}
        className={[
          'relative',
          isEditingLayout ? 'rounded-md border border-dashed border-black/20 bg-white' : '',
          isDragging ? 'opacity-70' : '',
        ].join(' ')}
        onDragOver={(event) => {
          if (!isEditingLayout) return
          const rect = event.currentTarget.getBoundingClientRect()
          const midpoint = rect.top + rect.height / 2
          const insertAt = event.clientY > midpoint ? index + 1 : index
          handleDragOverPosition(column, insertAt, event)
        }}
        onDrop={handleDrop}
      >
        {isEditingLayout ? (
          <div className='flex items-center justify-between px-3 py-2 border-b border-black/10'>
            <span className='text-[10px] tracking-[0.8px] uppercase text-black/60 font-medium'>
              {blockLabels[blockId] || blockId}
            </span>
            <button
              type='button'
              className='text-[14px] text-black/60 cursor-grab active:cursor-grabbing select-none'
              draggable={isEditingLayout}
              onDragStart={startDragBlock(blockId, column)}
              onDragEnd={endDragBlock}
              onClick={(event) => event.preventDefault()}
              aria-label='Arrastar secção'
              title='Arrastar para reorganizar'
            >
              ≡
            </button>
          </div>
        ) : null}
        <div className={isEditingLayout ? 'px-3 py-3' : ''}>{children}</div>
      </div>
    )
  }

  const renderCartHeader = () => (
    <div className='mb-[22px] flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-2.5'>
      <h1 className='m-0 text-[28px] leading-[1.05] tracking-[0.25px] font-medium text-[#111111] sm:text-[32px]'>CARRINHO</h1>
      <span className='mb-1 text-[#9ca3af] text-[12px] font-medium'>({cartItems.length} produtos)</span>
    </div>
  )

  const renderCartItems = () =>
    cartItems.length === 0 ? (
      <div className='py-12 text-center border border-black/10 rounded-md'>
        <p className='text-[16px] text-black/70'>O seu carrinho esta vazio.</p>
        <button
          type='button'
          className='mt-4 border-0 bg-primary text-primary-foreground text-[11px] tracking-[1px] py-[10px] px-[20px] cursor-pointer'
          onClick={() => navigate('/products')}
        >
          CONTINUAR COMPRAS
        </button>
      </div>
    ) : (
      <div className='grid gap-[22px] mb-[48px]'>
        {cartItems.map((item) => (
          <article key={item.id} className='grid grid-cols-[22px_72px_minmax(0,1fr)] gap-x-3 gap-y-3 rounded-xl border border-black/5 p-3 sm:grid-cols-[22px_80px_1fr_auto] sm:items-center sm:rounded-none sm:border-0 sm:p-0'>
            <button
              type='button'
              className='border-0 bg-transparent text-[#a1a1aa] text-[17px] leading-none p-0 cursor-pointer'
              aria-label='Remover item'
              onClick={() => handleRemoveItem(item.id)}
            >
              x
            </button>

            <div className='h-[62px] w-[72px] bg-[#f4f4f5] overflow-hidden sm:w-20'>
              <img src={item.image} alt={item.name} className='w-full h-full object-cover' />
            </div>

            <div className='grid gap-1.5 min-w-0'>
              <h2 className='m-0 text-[13px] font-normal text-[#202020] leading-[1.3]'>{item.name}</h2>
              <p className='m-0 text-[12px] text-[#9aa3af]'>
                {[item.color || 'Cor disponivel', item.size].filter(Boolean).join(' | ')}
              </p>
            </div>

            <div className='col-span-3 flex items-center justify-between gap-3 pl-[calc(22px+0.75rem)] sm:col-span-1 sm:pl-0'>
              <div className='flex items-center gap-[14px]'>
              <button
                type='button'
                className='w-6 h-6 rounded-full border border-[#b7b7b7] text-[#6b7280] inline-flex items-center justify-center text-[13px]'
                onClick={() => handleQuantityChange(item.id, Number(item.qty || 1) - 1)}
              >
                -
              </button>
              <span className='text-[13px] text-[#1f1f1f]'>{item.qty}</span>
              <button
                type='button'
                className='w-6 h-6 rounded-full border border-[#b7b7b7] text-[#6b7280] inline-flex items-center justify-center text-[13px]'
                onClick={() => handleQuantityChange(item.id, Number(item.qty || 1) + 1)}
              >
                +
              </button>
              </div>
              <span className='text-[20px] font-normal text-[#1f1f1f] tracking-[0.2px] min-w-[86px] text-right'>
                {formatEuro(Number(item.unitPrice || 0) * Number(item.qty || 0))}
              </span>
            </div>
          </article>
        ))}
      </div>
    )

  const renderCoupon = () => (
    <div className='max-w-[500px]'>
      <p className='m-0 mb-2 text-[12px] tracking-[0.3px] text-[#222]'>Tem um cupao? Insira o seu codigo.</p>
      <div className='flex flex-col gap-2.5 sm:flex-row sm:items-center'>
        <input
          type='text'
          placeholder='Codigo de cupao'
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value)}
          className='w-full max-w-full border-0 border-b border-[#c7c7c7] bg-transparent py-1.5 text-[11px] outline-none sm:max-w-[240px]'
        />
        <button
          type='button'
          className='border-0 bg-primary text-primary-foreground text-[10px] tracking-[0.8px] py-[7px] px-4 cursor-pointer disabled:opacity-50'
          onClick={handleApplyCoupon}
          disabled={isApplyingCoupon || cartItems.length === 0}
        >
          {isApplyingCoupon ? 'APLICAR...' : 'APLICAR'}
        </button>
      </div>
      {coupon ? (
        <p className='mt-2 text-[12px] text-[#0f766e]'>
          Coupon ativo: <span className='font-semibold'>{coupon.code}</span> (-{formatEuro(discount)})
        </p>
      ) : null}
      {message ? <p className='mt-2 text-[12px] text-[#0f766e]'>{message}</p> : null}
      {error ? <p className='mt-2 text-[12px] text-[#b42318]'>{error}</p> : null}
    </div>
  )

  const renderSummary = () => (
    <div>
      <h2 className='m-0 text-[28px] font-medium leading-[1.1] mb-[22px] text-[#171717]'>TOTAL</h2>
      <div className='grid gap-2.5 mb-[18px] pb-[14px] border-b border-[#d7d7d7]'>
        {cartItems.length === 0 ? (
          <p className='m-0 text-[14px] text-[#7a7a7a]'>Sem produtos no carrinho</p>
        ) : (
          cartItems.map((item) => (
            <p key={`summary-${item.id}`} className='m-0 text-[14px] text-[#202020]'>
              {item.name} x {item.qty}
            </p>
          ))
        )}
      </div>

      <div className='space-y-2 mb-6 text-[14px]'>
        <div className='flex justify-between items-center'>
          <span>Subtotal</span>
          <span>{formatEuro(subtotal)}</span>
        </div>
        <div className='flex justify-between items-center'>
          <span>Desconto</span>
          <span>-{formatEuro(discount)}</span>
        </div>
      </div>

      <div className='flex justify-between items-center mb-10'>
        <span className='text-[22px] text-[#1a1a1a] leading-none'>TOTAL</span>
        <span className='text-[21px] text-[#1a1a1a]'>{formatEuro(total)}</span>
      </div>

      <button
        type='button'
        className='w-full border-0 bg-primary text-primary-foreground text-[11px] tracking-[1px] py-[11px] px-[14px] cursor-pointer disabled:opacity-50'
        onClick={handleCheckout}
        disabled={cartItems.length === 0}
      >
        EFETUAR PAGAMENTO
      </button>
    </div>
  )

  const blockRenderers = {
    [CART_LAYOUT_BLOCKS.cartHeader]: renderCartHeader,
    [CART_LAYOUT_BLOCKS.cartItems]: renderCartItems,
    [CART_LAYOUT_BLOCKS.coupon]: renderCoupon,
    [CART_LAYOUT_BLOCKS.summary]: renderSummary,
  }

  const normalizedLayout = normalizeCartLayout(layout)
  const leftBlocks = normalizedLayout[CART_LAYOUT_COLUMNS.left]
  const rightBlocks = normalizedLayout[CART_LAYOUT_COLUMNS.right]

  return (
    <>
      <Navbar />

      <section className='bg-white min-h-[520px] px-4 pt-[24px] pb-6 font-["Poppins",sans-serif] sm:px-5 sm:pt-[34px]'>
        <div className='max-w-[1180px] mx-auto'>
          <div className='mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
            {isEditingLayout ? (
              <p className='m-0 text-[12px] text-black/60'>Modo layout: arraste as secções (≡) para reorganizar.</p>
            ) : (
              <span />
            )}
            <div className='flex flex-wrap items-center gap-2'>
              <button
                type='button'
                className='border border-black/15 bg-white text-[11px] tracking-[0.6px] py-[7px] px-3 cursor-pointer'
                onClick={() => setIsEditingLayout((prev) => !prev)}
              >
                {isEditingLayout ? 'FECHAR LAYOUT' : 'EDITAR LAYOUT'}
              </button>
              {isEditingLayout ? (
                <button
                  type='button'
                  className='border border-black/15 bg-white text-[11px] tracking-[0.6px] py-[7px] px-3 cursor-pointer'
                  onClick={() => setLayout(DEFAULT_CART_LAYOUT)}
                >
                  REPOR
                </button>
              ) : null}
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-9 items-start'>
            <div
              className='lg:pr-7 lg:border-r lg:border-[#e1e1e1] grid gap-5'
              data-theme-layout-root='cart-left'
              onDragOver={(event) => {
                if (!isEditingLayout) return
                event.preventDefault()
              }}
              onDrop={handleDrop}
            >
              {leftBlocks.map((blockId, index) => {
                const render = blockRenderers[blockId]
                if (!render) return null
                return renderBlockShell(blockId, CART_LAYOUT_COLUMNS.left, index, render())
              })}
              {isEditingLayout ? (
                <div
                  className='h-10 rounded-md border border-dashed border-black/15 bg-black/[0.02]'
                  onDragOver={(event) => handleDragOverPosition(CART_LAYOUT_COLUMNS.left, leftBlocks.length, event)}
                  onDrop={handleDrop}
                />
              ) : null}
            </div>

            <aside
              className='pt-8 lg:pt-[50px] pl-0 lg:pl-1 grid gap-5'
              data-theme-layout-root='cart-right'
              onDragOver={(event) => {
                if (!isEditingLayout) return
                event.preventDefault()
              }}
              onDrop={handleDrop}
            >
              {rightBlocks.map((blockId, index) => {
                const render = blockRenderers[blockId]
                if (!render) return null
                return renderBlockShell(blockId, CART_LAYOUT_COLUMNS.right, index, render())
              })}
              {isEditingLayout ? (
                <div
                  className='h-10 rounded-md border border-dashed border-black/15 bg-black/[0.02]'
                  onDragOver={(event) => handleDragOverPosition(CART_LAYOUT_COLUMNS.right, rightBlocks.length, event)}
                  onDrop={handleDrop}
                />
              ) : null}
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}

export default CartPage
