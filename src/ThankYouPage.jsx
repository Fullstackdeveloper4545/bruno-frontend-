import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import { getJson } from './lib/api'
import fallbackProductImage from './assets/product-card-test-image.png'

function formatEuro(value) {
  const amount = Number(value || 0)
  return `${amount.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`
}

function safeJsonParse(value) {
  try {
    return JSON.parse(String(value || ''))
  } catch {
    return null
  }
}

const ThankYouPage = () => {
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)
  const [snapshotItems, setSnapshotItems] = useState([])

  useEffect(() => {
    let active = true

    const run = async () => {
      setLoading(true)
      setError('')

      const params = new URLSearchParams(location.search)
      const latest = safeJsonParse(sessionStorage.getItem('latest_order'))
      const latestOrder = latest?.order || null

      const orderId =
        String(params.get('orderId') || '').trim() ||
        (latestOrder?.id != null ? String(latestOrder.id) : '')
      const email =
        String(params.get('email') || '').trim() ||
        String(latest?.customer_email || latestOrder?.customer_email || '').trim()

      setSnapshotItems(Array.isArray(latest?.cart_items) ? latest.cart_items : [])

      if (!orderId) {
        if (active) {
          setOrder(null)
          setLoading(false)
          setError('No order context found for this page.')
        }
        return
      }

      try {
        const endpoint = email
          ? `/api/orders/my/${encodeURIComponent(orderId)}?email=${encodeURIComponent(email)}`
          : `/api/orders/${encodeURIComponent(orderId)}`
        const fetched = await getJson(endpoint)
        if (!active) return
        setOrder(fetched)
      } catch (err) {
        if (!active) return
        setOrder(latestOrder)
        setError(err instanceof Error ? err.message : 'Failed to load order details.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [location.search])

  const previewItems = useMemo(() => {
    const orderItems = Array.isArray(order?.items) ? order.items : []
    if (orderItems.length === 0) {
      return snapshotItems.slice(0, 4).map((item, index) => ({
        key: `${item?.id || index}`,
        image: item?.image || fallbackProductImage,
        name: item?.name || 'Produto',
      }))
    }

    return orderItems.slice(0, 4).map((item, index) => {
      const match =
        snapshotItems.find((entry) => entry?.sku && item?.sku && entry.sku === item.sku) ||
        snapshotItems.find((entry) => String(entry?.name || '').trim() === String(item?.product_name || '').trim())
      return {
        key: `${item?.id || item?.sku || index}`,
        image: match?.image || fallbackProductImage,
        name: item?.product_name || 'Produto',
      }
    })
  }, [order, snapshotItems])

  const totalItems = useMemo(() => {
    const orderItems = Array.isArray(order?.items) ? order.items : []
    if (orderItems.length > 0) {
      return orderItems.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)
    }
    return snapshotItems.reduce((sum, item) => sum + Number(item?.qty || 0), 0)
  }, [order, snapshotItems])

  return (
    <>
      <Navbar />
      <section className='bg-white min-h-[70vh] font-["Poppins",sans-serif]'>
        <div className='pt-16 pb-12 text-center px-4'>
          <h1 className='m-0 text-[58px] font-medium leading-none text-[#111111]'>
            OBRIGADO PELA SUA ENCOMENDA!
          </h1>
          <p className='mt-6 mb-0 text-[14px] text-[#111111] tracking-[0.2px]'>
            Confirme o seu pagamento e os seus itens serao preparados para envio.
          </p>
          {order?.order_number ? (
            <p className='mt-4 text-[13px] text-[#111111]'>
              Encomenda: <span className='font-semibold'>{order.order_number}</span>
            </p>
          ) : null}
          {order?.total != null ? (
            <p className='mt-1 text-[13px] text-[#111111]'>
              Total: <span className='font-semibold'>{formatEuro(order.total)}</span>
            </p>
          ) : null}
          {loading ? <p className='mt-3 text-[12px] text-[#6b7280]'>A carregar dados da encomenda...</p> : null}
          {error ? <p className='mt-3 text-[12px] text-[#b42318]'>{error}</p> : null}
        </div>

        <div className='bg-[#7399a5] py-12'>
          <div className='flex items-center justify-center gap-4 px-4 flex-wrap'>
            {previewItems.length > 0 ? (
              previewItems.map((item) => (
                <div key={item.key} className='w-[132px] h-[100px] bg-[#f1f1f1] overflow-hidden'>
                  <img src={item.image} alt={item.name} className='w-full h-full object-cover' />
                </div>
              ))
            ) : (
              <div className='text-white text-[12px] tracking-[1px]'>SEM ITENS PARA MOSTRAR</div>
            )}
          </div>
          <p className='m-0 mt-5 text-center text-[10px] text-white tracking-[2px]'>
            {Math.max(0, totalItems)} ITENS
          </p>
        </div>

        <div className='py-16 flex justify-center px-4'>
          <Link
            to='/'
            className='w-full max-w-[328px] bg-[#242529] text-white text-[10px] tracking-[1px] py-3 text-center'
          >
            VOLTAR A LOJA
          </Link>
        </div>
      </section>
      <Footer />
    </>
  )
}

export default ThankYouPage
