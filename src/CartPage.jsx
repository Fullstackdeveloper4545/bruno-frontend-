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

  return (
    <>
      <Navbar />

      <section className='bg-white min-h-[520px] px-5 pt-[34px] pb-6 font-["Poppins",sans-serif]'>
        <div className='max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-9 items-start'>
          <div className='lg:pr-7 lg:border-r lg:border-[#e1e1e1]'>
            <div className='flex items-end gap-2.5 mb-[22px]'>
              <h1 className='m-0 text-[32px] leading-[1.05] tracking-[0.25px] font-medium text-[#111111]'>
                CARRINHO
              </h1>
              <span className='mb-1 text-[#9ca3af] text-[12px] font-medium'>
                ({cartItems.length} produtos)
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className='py-12 text-center border border-black/10 rounded-md'>
                <p className='text-[16px] text-black/70'>O seu carrinho esta vazio.</p>
                <button
                  type='button'
                  className='mt-4 border-0 bg-[#212326] text-white text-[11px] tracking-[1px] py-[10px] px-[20px] cursor-pointer'
                  onClick={() => navigate('/products')}
                >
                  CONTINUAR COMPRAS
                </button>
              </div>
            ) : (
              <div className='grid gap-[22px] mb-[48px]'>
                {cartItems.map((item) => (
                  <article
                    key={item.id}
                    className='grid grid-cols-[22px_80px_1fr_auto] items-center gap-x-3'
                  >
                    <button
                      type='button'
                      className='border-0 bg-transparent text-[#a1a1aa] text-[17px] leading-none p-0 cursor-pointer'
                      aria-label='Remover item'
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      x
                    </button>

                    <div className='w-20 h-[62px] bg-[#f4f4f5] overflow-hidden'>
                      <img src={item.image} alt={item.name} className='w-full h-full object-cover' />
                    </div>

                    <div className='grid gap-1.5 min-w-0'>
                      <h2 className='m-0 text-[13px] font-normal text-[#202020] leading-[1.3]'>{item.name}</h2>
                      <p className='m-0 text-[12px] text-[#9aa3af]'>{item.color || 'Cor disponivel'}</p>
                    </div>

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
                      <span className='text-[20px] font-normal text-[#1f1f1f] tracking-[0.2px] min-w-[86px] text-right'>
                        {formatEuro(Number(item.unitPrice || 0) * Number(item.qty || 0))}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className='max-w-[500px]'>
              <p className='m-0 mb-2 text-[12px] tracking-[0.3px] text-[#222]'>
                Tem um cupao? Insira o seu codigo.
              </p>
              <div className='flex items-center gap-2.5'>
                <input
                  type='text'
                  placeholder='Codigo de cupao'
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  className='w-full max-w-[240px] border-0 border-b border-[#c7c7c7] text-[11px] py-1.5 outline-none bg-transparent'
                />
                <button
                  type='button'
                  className='border-0 bg-[#212326] text-white text-[10px] tracking-[0.8px] py-[7px] px-4 cursor-pointer disabled:opacity-50'
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
          </div>

          <aside className='pt-8 lg:pt-[50px] pl-0 lg:pl-1'>
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
              className='w-full border-0 bg-[#212326] text-white text-[11px] tracking-[1px] py-[11px] px-[14px] cursor-pointer disabled:opacity-50'
              onClick={handleCheckout}
              disabled={cartItems.length === 0}
            >
              EFETUAR PAGAMENTO
            </button>
          </aside>
        </div>
      </section>

      <Footer />
    </>
  )
}

export default CartPage
