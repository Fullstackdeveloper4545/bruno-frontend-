const CART_STORAGE_KEY = 'storefront:cart:v1'
const COUPON_STORAGE_KEY = 'storefront:coupon:v1'
const CART_UPDATED_EVENT = 'cart:updated'
const COUPON_UPDATED_EVENT = 'cart:coupon-updated'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function emit(name) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(name))
}

function parseJson(raw, fallback) {
  try {
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function normalizeCartItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id || '').trim()
  const name = String(raw.name || '').trim()
  const image = String(raw.image || '').trim()
  const qty = Number(raw.qty)
  const unitPrice = Number(raw.unitPrice)
  if (!id || !name || !image) return null
  if (!Number.isFinite(qty) || qty <= 0) return null
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return null

  return {
    id,
    productId: raw.productId != null ? String(raw.productId) : '',
    variantId: raw.variantId != null && String(raw.variantId).trim() ? String(raw.variantId) : null,
    categoryId: raw.categoryId != null && String(raw.categoryId).trim() ? String(raw.categoryId) : null,
    sku: raw.sku != null && String(raw.sku).trim() ? String(raw.sku) : null,
    name,
    color: String(raw.color || 'Cor disponivel'),
    qty: Math.max(1, Math.floor(qty)),
    unitPrice,
    image,
  }
}

export function getCartItems() {
  if (!canUseStorage()) return []
  const raw = window.localStorage.getItem(CART_STORAGE_KEY)
  if (!raw) return []
  const list = parseJson(raw, [])
  if (!Array.isArray(list)) return []
  return list.map(normalizeCartItem).filter(Boolean)
}

function writeCart(items) {
  if (!canUseStorage()) return
  if (!Array.isArray(items) || items.length === 0) {
    window.localStorage.removeItem(CART_STORAGE_KEY)
  } else {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }
  emit(CART_UPDATED_EVENT)
}

export function addCartItem(item) {
  const normalized = normalizeCartItem(item)
  if (!normalized) return
  const current = getCartItems()
  const existing = current.find((entry) => entry.id === normalized.id)
  if (existing) {
    const next = current.map((entry) =>
      entry.id === normalized.id ? { ...entry, qty: entry.qty + normalized.qty } : entry
    )
    writeCart(next)
    return
  }
  writeCart([...current, normalized])
}

export function updateCartItemQuantity(id, qty) {
  const key = String(id || '').trim()
  if (!key) return
  const quantity = Number(qty)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    removeCartItem(key)
    return
  }
  const current = getCartItems()
  const next = current.map((entry) =>
    entry.id === key ? { ...entry, qty: Math.max(1, Math.floor(quantity)) } : entry
  )
  writeCart(next)
}

export function removeCartItem(id) {
  const key = String(id || '').trim()
  if (!key) return
  const current = getCartItems()
  writeCart(current.filter((entry) => entry.id !== key))
}

export function clearCart() {
  writeCart([])
  clearAppliedCoupon()
}

export function getCartCount() {
  return getCartItems().reduce((sum, item) => sum + Number(item.qty || 0), 0)
}

export function getCartSubtotal() {
  return getCartItems().reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0), 0)
}

export function getAppliedCoupon() {
  if (!canUseStorage()) return null
  const raw = window.localStorage.getItem(COUPON_STORAGE_KEY)
  if (!raw) return null
  const coupon = parseJson(raw, null)
  if (!coupon || typeof coupon !== 'object') return null
  const code = String(coupon.code || '').trim().toUpperCase()
  const discount = Number(coupon.discount)
  const couponId = Number(coupon.coupon_id || coupon.id)
  if (!code || !Number.isFinite(discount) || discount < 0) return null
  return {
    code,
    discount,
    coupon_id: Number.isFinite(couponId) ? couponId : null,
  }
}

export function setAppliedCoupon(coupon) {
  if (!canUseStorage()) return
  const code = String(coupon?.code || '').trim().toUpperCase()
  const discount = Number(coupon?.discount)
  if (!code || !Number.isFinite(discount) || discount < 0) return
  const payload = {
    code,
    discount,
    coupon_id: coupon?.coupon_id != null ? Number(coupon.coupon_id) : null,
  }
  window.localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(payload))
  emit(COUPON_UPDATED_EVENT)
}

export function clearAppliedCoupon() {
  if (!canUseStorage()) return
  window.localStorage.removeItem(COUPON_STORAGE_KEY)
  emit(COUPON_UPDATED_EVENT)
}

export const cartEvents = {
  updated: CART_UPDATED_EVENT,
  couponUpdated: COUPON_UPDATED_EVENT,
}
