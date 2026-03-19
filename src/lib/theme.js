import { resolveAssetUrl } from '@/lib/api'

export const DEFAULT_PRIMARY_COLOR = '#6C939B'
export const THEME_UPDATED_EVENT = 'theme:updated'

const OVERRIDABLE_VARS = [
  '--primary',
  '--primary-foreground',
  '--ring',
  '--radius',
  '--hero-bg-image',
  '--promo-bg-image',
  '--sidebar-background',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
]

function normalizeHexColor(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const hex = raw.startsWith('#') ? raw.slice(1) : raw
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null

  if (hex.length === 3) {
    const expanded = hex
      .split('')
      .map((ch) => `${ch}${ch}`)
      .join('')
    return `#${expanded.toUpperCase()}`
  }

  return `#${hex.toUpperCase()}`
}

function hexToRgb(hexColor) {
  const normalized = normalizeHexColor(hexColor)
  if (!normalized) return null
  const hex = normalized.slice(1)
  const value = parseInt(hex, 16)
  // eslint-disable-next-line no-bitwise
  const r = (value >> 16) & 255
  // eslint-disable-next-line no-bitwise
  const g = (value >> 8) & 255
  // eslint-disable-next-line no-bitwise
  const b = value & 255
  return { r, g, b }
}

function rgbToHsl({ r, g, b }) {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rNorm) h = ((gNorm - bNorm) / delta) % 6
    else if (max === gNorm) h = (bNorm - rNorm) / delta + 2
    else h = (rNorm - gNorm) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return {
    h,
    s: s * 100,
    l: l * 100,
  }
}

function clamp(number, min, max) {
  return Math.min(Math.max(number, min), max)
}

function shiftLightness(hsl, delta) {
  return { ...hsl, l: clamp(hsl.l + delta, 0, 100) }
}

function shiftSaturation(hsl, delta) {
  return { ...hsl, s: clamp(hsl.s + delta, 0, 100) }
}

function formatHslVar(hsl) {
  return `${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`
}

function isLightColor({ r, g, b }) {
  // Relative luminance approximation (sRGB, linearized enough for thresholding).
  const rLin = r / 255
  const gLin = g / 255
  const bLin = b / 255
  const luminance = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
  return luminance > 0.62
}

export function applyPrimaryColor(hexColor) {
  const rgb = hexToRgb(hexColor || DEFAULT_PRIMARY_COLOR)
  if (!rgb) return

  const base = rgbToHsl(rgb)
  const root = document.documentElement
  const light = isLightColor(rgb)
  const foreground = light ? '200 28% 18%' : '0 0% 98%'

  root.style.setProperty('--primary', formatHslVar(base))
  root.style.setProperty('--primary-foreground', foreground)
  root.style.setProperty('--ring', formatHslVar(base))

  root.style.setProperty('--sidebar-background', formatHslVar(shiftLightness(base, 6)))
  root.style.setProperty('--sidebar-foreground', foreground)
  root.style.setProperty('--sidebar-primary', formatHslVar(shiftLightness(shiftSaturation(base, 2), -4)))
  root.style.setProperty('--sidebar-primary-foreground', foreground)
  root.style.setProperty('--sidebar-accent', formatHslVar(shiftLightness(base, 2)))
  root.style.setProperty('--sidebar-accent-foreground', foreground)
  root.style.setProperty('--sidebar-border', formatHslVar(shiftLightness(base, 4)))
}

export function applyThemeSettings(settings) {
  const primary =
    normalizeHexColor(settings?.public_primary_color) ||
    normalizeHexColor(settings?.primary_color) ||
    DEFAULT_PRIMARY_COLOR
  applyPrimaryColor(primary)

  const radius = String(settings?.public_radius || '').trim()
  if (/^\d+(\.\d+)?(px|rem|em)$/.test(radius)) {
    document.documentElement.style.setProperty('--radius', radius)
  }

  const heroImage = resolveAssetUrl(settings?.public_home_hero_image || '')
  if (heroImage) {
    document.documentElement.style.setProperty('--hero-bg-image', `url("${heroImage}")`)
  }

  const promoImage = resolveAssetUrl(settings?.public_home_promo_image || '')
  if (promoImage) {
    document.documentElement.style.setProperty('--promo-bg-image', `url("${promoImage}")`)
  }

  return { public_primary_color: primary, primary_color: primary, public_radius: radius }
}

export function clearThemeOverrides() {
  const root = document.documentElement
  for (const key of OVERRIDABLE_VARS) {
    root.style.removeProperty(key)
  }
}
