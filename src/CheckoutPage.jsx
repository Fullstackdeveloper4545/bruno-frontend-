import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import { postJson, toApiUrl } from './lib/api'
import { cartEvents, clearCart, getAppliedCoupon, getCartItems } from './lib/cart'

const PAYMENT_OPTIONS = [
  { id: 'mbway', label: 'MB Way', provider: 'ifthenpay', method: 'mbway' },
  { id: 'mb_reference', label: 'MB Reference', provider: 'ifthenpay', method: 'mb_reference' },
  { id: 'klarna', label: 'Klarna', provider: 'klarna', method: 'klarna' },
]

function formatEuro(value) {
  const amount = Number(value || 0)
  return `${amount.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`
}

function normalizeText(value) {
  return String(value || '').trim()
}

const CheckoutPage = () => {
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState([])
  const [coupon, setCoupon] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_OPTIONS[0].id)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [address, setAddress] = useState('')
  const [addressExtra, setAddressExtra] = useState('')

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const syncCheckoutState = () => {
      setCartItems(getCartItems())
      setCoupon(getAppliedCoupon())
    }

    syncCheckoutState()
    window.addEventListener('storage', syncCheckoutState)
    window.addEventListener(cartEvents.updated, syncCheckoutState)
    window.addEventListener(cartEvents.couponUpdated, syncCheckoutState)
    return () => {
      window.removeEventListener('storage', syncCheckoutState)
      window.removeEventListener(cartEvents.updated, syncCheckoutState)
      window.removeEventListener(cartEvents.couponUpdated, syncCheckoutState)
    }
  }, [])

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 0), 0),
    [cartItems]
  )
  const discount = useMemo(() => Math.min(Number(coupon?.discount || 0), subtotal), [coupon, subtotal])
  const total = Math.max(0, subtotal - discount)

  const handleSubmitOrder = async () => {
    setError('')
    setMessage('')
    setPaymentInfo(null)

    if (cartItems.length === 0) {
      setError('Your cart is empty.')
      return
    }

    const customerName = `${normalizeText(firstName)} ${normalizeText(lastName)}`.trim()
    const customerEmail = normalizeText(email)
    const shippingAddress = [normalizeText(address), normalizeText(addressExtra), normalizeText(postalCode), normalizeText(city)]
      .filter(Boolean)
      .join(', ')

    if (!customerName || !customerEmail || !shippingAddress) {
      setError('Please fill name, email and shipping address.')
      return
    }

    const selectedPayment = PAYMENT_OPTIONS.find((option) => option.id === paymentMethod) || PAYMENT_OPTIONS[0]
    let createdOrder = null

    try {
      setIsSubmitting(true)

      createdOrder = await postJson('/api/orders', {
        customer_name: customerName,
        customer_email: customerEmail,
        shipping_address: shippingAddress,
        shipping_region: normalizeText(region) || normalizeText(city) || null,
        discount_total: discount,
        items: cartItems.map((item) => ({
          product_name: item.name,
          sku: item.sku || null,
          quantity: Number(item.qty || 0),
          unit_price: Number(item.unitPrice || 0),
          product_id: item.productId || null,
          variant_id: item.variantId || null,
        })),
      })

      const webhookPath =
        selectedPayment.provider === 'klarna'
          ? '/api/payments/webhooks/klarna'
          : '/api/payments/webhooks/ifthenpay'

      const checkout = await postJson('/api/payments/checkout', {
        order_id: createdOrder.id,
        provider: selectedPayment.provider,
        method: selectedPayment.method,
        customer: {
          phone: normalizeText(phone),
          email: customerEmail,
        },
        callback_url: toApiUrl(webhookPath),
        return_url: `${window.location.origin}/thank-you?orderId=${encodeURIComponent(
          String(createdOrder.id)
        )}&email=${encodeURIComponent(customerEmail)}`,
      })

      if (checkout?.instructions) {
        setPaymentInfo(checkout.instructions)
      }

      if (checkout?.payment_url) {
        window.open(checkout.payment_url, '_blank', 'noopener,noreferrer')
      }

      sessionStorage.setItem(
        'latest_order',
        JSON.stringify({
          order: createdOrder,
          payment: checkout,
          discount_total: discount,
          total,
          coupon_code: coupon?.code || null,
          customer_email: customerEmail,
          cart_items: cartItems.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku || null,
            qty: Number(item.qty || 0),
            unitPrice: Number(item.unitPrice || 0),
            image: item.image || null,
          })),
        })
      )

      clearCart()
      setMessage('Order created and payment initiated successfully.')
      navigate(
        `/thank-you?orderId=${encodeURIComponent(String(createdOrder.id))}&email=${encodeURIComponent(
          customerEmail
        )}`,
        { replace: true }
      )
    } catch (err) {
      const baseMessage = err instanceof Error ? err.message : 'Failed to submit checkout.'
      if (createdOrder?.order_number) {
        setError(`${baseMessage} Order ${createdOrder.order_number} was created.`)
      } else {
        setError(baseMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />

      <section className='bg-white px-5 py-10 font-["Poppins",sans-serif]'>
        <div className='w-[85%] mx-auto max-w-[1180px]'>
          <h1 className='m-0 text-[32px] tracking-[1px] text-[#111]'>CHECKOUT</h1>
          <p className='mt-2 text-[14px] tracking-[1.5px] text-[#8b93a7] uppercase'>Carrinho | Pagamento</p>
        </div>

        <div className='w-[85%] mx-auto max-w-[1180px] mt-8 grid grid-cols-1 lg:grid-cols-[1fr_1px_360px] gap-8 items-start'>
          <div>
            <div className='flex items-center justify-between mb-6'>
              <label className='text-[16px] tracking-[1.2px] text-[#222] uppercase'>Email</label>
              <p className='text-[14px] text-[#8b93a7]'>Ja tem uma conta? <span className='text-[#111] underline cursor-pointer'>Log in</span></p>
            </div>
            <input
              type='email'
              placeholder='you@email.com'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className='w-full max-w-[520px] border-0 border-b border-[#d6d6d6] pb-2 outline-none text-[12px]'
            />

            <div className='mt-10'>
              <h2 className='m-0 text-[16px] tracking-[1.2px] text-[#222] uppercase font-semibold'>
                Escolha um metodo de pagamento
              </h2>

              <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                {PAYMENT_OPTIONS.map((option) => {
                  const isActive = option.id === paymentMethod
                  return (
                    <button
                      key={option.id}
                      type='button'
                      onClick={() => setPaymentMethod(option.id)}
                      className={`border px-4 py-3 text-left text-[13px] transition ${
                        isActive
                          ? 'border-[#111] bg-[#f3f4f6] text-[#111]'
                          : 'border-[#d7dbe5] text-[#6b7280] hover:border-[#111]'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className='mt-12'>
              <h2 className='m-0 text-[16px] tracking-[1.2px] text-[#222] uppercase font-semibold'>
                Detalhes de envio
              </h2>

              <div className='mt-4 grid gap-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <input
                    type='text'
                    placeholder='Nome'
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className='border border-[#cfd6e4] px-4 py-3 text-[13px] outline-none'
                  />
                  <input
                    type='text'
                    placeholder='Apelido'
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className='border border-[#cfd6e4] px-4 py-3 text-[13px] outline-none'
                  />
                </div>

                <input
                  type='text'
                  placeholder='Telemovel'
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className='border border-[#cfd6e4] px-4 py-3 text-[13px] outline-none'
                />
                <input
                  type='text'
                  placeholder='Pais/Regiao'
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className='border border-[#cfd6e4] px-4 py-3 text-[13px] outline-none'
                />

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <input
                    type='text'
                    placeholder='Cidade'
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className='border border-[#cfd6e4] px-4 py-3 text-[13px] outline-none'
                  />
                  <input
                    type='text'
                    placeholder='Codigo Postal'
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    className='border border-[#cfd6e4] px-4 py-3 text-[13px] outline-none'
                  />
                </div>

                <input
                  type='text'
                  placeholder='Morada'
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className='border border-[#cfd6e4] px-4 py-3 text-[13px] outline-none'
                />
                <input
                  type='text'
                  placeholder='N de Porta, Apartamento (OPCIONAL)'
                  value={addressExtra}
                  onChange={(event) => setAddressExtra(event.target.value)}
                  className='border border-[#cfd6e4] px-4 py-3 text-[13px] outline-none'
                />

                <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <button
                    type='button'
                    className='border border-[#2b2b2b] text-[#111] text-[12px] tracking-[1px] py-3'
                    onClick={() => navigate('/cart')}
                  >
                    VOLTAR
                  </button>
                  <button
                    type='button'
                    className='bg-[#2b2b2b] text-white text-[12px] tracking-[1px] py-3 disabled:opacity-50'
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting || cartItems.length === 0}
                  >
                    {isSubmitting ? 'A PROCESSAR...' : 'CONTINUAR'}
                  </button>
                </div>

                {message ? <p className='text-[12px] text-[#0f766e]'>{message}</p> : null}
                {error ? <p className='text-[12px] text-[#b42318]'>{error}</p> : null}
                {paymentInfo ? (
                  <div className='rounded-md border border-[#d7dbe5] bg-[#f8fafc] p-3 text-[12px] text-[#374151]'>
                    <p className='font-semibold mb-1'>Payment Instructions</p>
                    {Object.entries(paymentInfo).map(([key, value]) => (
                      <p key={key}>
                        <span className='font-medium'>{key}:</span> {String(value)}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className='hidden lg:block w-px bg-[#e2e5ec] h-[50%]' />

          <aside>
            <h2 className='m-0 text-[28px] tracking-[1px] text-[#111] uppercase'>O seu carrinho</h2>

            <div className='mt-6 grid gap-6'>
              {cartItems.length === 0 ? (
                <p className='text-[14px] text-[#8b93a7]'>Sem produtos no carrinho.</p>
              ) : (
                cartItems.map((item) => (
                  <div key={`checkout-${item.id}`} className='flex gap-4 items-start'>
                    <img
                      src={item.image}
                      alt={item.name}
                      className='w-[66px] h-[66px] object-cover bg-[#f3f4f6]'
                    />
                    <div>
                      <p className='m-0 text-[16px] text-[#111]'>{item.name}</p>
                      <p className='m-0 text-[14px] text-[#8b93a7]'>
                        {item.color || 'Cor disponivel'} | Qtd: {item.qty}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className='mt-6 border-t border-[#e2e5ec] pt-4 text-[16px] text-[#111] grid gap-2'>
              <div className='flex justify-between'>
                <span>Subtotal</span>
                <span>{formatEuro(subtotal)}</span>
              </div>
              <div className='flex justify-between'>
                <span>Desconto</span>
                <span>-{formatEuro(discount)}</span>
              </div>
              <div className='flex justify-between font-semibold'>
                <span>Total</span>
                <span>{formatEuro(total)}</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </>
  )
}

export default CheckoutPage
