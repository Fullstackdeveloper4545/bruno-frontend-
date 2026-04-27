import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getJson } from '@/lib/api'
import { applyThemeSettings, clearThemeOverrides, THEME_UPDATED_EVENT } from '@/lib/theme'

function safeTextValue(value) {
  return String(value ?? '')
}

function cssEscape(value) {
  const raw = String(value ?? '')
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(raw)
  return raw.replace(/["\\]/g, '\\$&')
}

function getXPathForElement(element) {
  if (!(element instanceof Element)) return ''
  const segments = []
  let node = element

  // Build an absolute XPath starting from the root <html> element.
  // (Older versions omitted <html>, producing paths like `/body[1]/...` that don't resolve.)
  while (node && node.nodeType === 1) {
    const tag = String(node.tagName || '').toLowerCase()
    if (!tag) break

    let index = 1
    let sibling = node.previousElementSibling
    while (sibling) {
      if (String(sibling.tagName || '').toLowerCase() === tag) index += 1
      sibling = sibling.previousElementSibling
    }
    segments.unshift(`${tag}[${index}]`)
    node = node.parentElement
  }

  return segments.length > 0 ? `/${segments.join('/')}` : ''
}

function findElementByXPath(xpath) {
  const safe = String(xpath || '').trim()
  if (!safe) return null
  try {
    const evaluate = (expression) => {
      const result = document.evaluate(expression, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      const node = result.singleNodeValue
      return node instanceof Element ? node : null
    }

    const direct = evaluate(safe)
    if (direct) return direct

    // Back-compat: older saved overrides may omit the `/html[1]` prefix.
    if (safe.startsWith('/') && !safe.startsWith('/html')) {
      return evaluate(`/html[1]${safe}`)
    }

    return null
  } catch {
    return null
  }
}

function applyLayoutOverrides(settings, routePath) {
  const overrides =
    settings?.public_layout_overrides && typeof settings.public_layout_overrides === 'object'
      ? settings.public_layout_overrides
      : null
  if (!overrides) return

  const route = String(routePath || window?.location?.pathname || '/')
  const buckets = []
  if (overrides['*'] && typeof overrides['*'] === 'object') buckets.push(overrides['*'])
  if (overrides[route] && typeof overrides[route] === 'object') buckets.push(overrides[route])

  // Prefix matching: allow keys like "/productDetails/*" to match "/productDetails/123".
  let bestPrefix = null
  for (const [key, value] of Object.entries(overrides)) {
    if (!key || key === '*' || key === route) continue
    if (!key.endsWith('/*')) continue
    const prefix = key.slice(0, -1) // keep trailing "/"
    if (!prefix || !route.startsWith(prefix)) continue
    if (!value || typeof value !== 'object') continue
    if (!bestPrefix || prefix.length > bestPrefix.prefix.length) bestPrefix = { prefix, value }
  }
  if (bestPrefix?.value) buckets.push(bestPrefix.value)

  for (const bucket of buckets) {
    const rootId = String(bucket?.root_id || '').trim()
    const order = Array.isArray(bucket?.order) ? bucket.order : []
    const hidden = Array.isArray(bucket?.hidden) ? bucket.hidden : []
    if (!rootId || order.length < 2) continue

    const root = document.querySelector(`[data-theme-layout-root="${cssEscape(rootId)}"]`)
    if (!(root instanceof Element)) continue

    const children = Array.from(root.children).filter(
      (child) => child instanceof HTMLElement && String(child.getAttribute('data-theme-layout-section') || '').trim()
    )
    if (children.length < 2) continue

    const byId = new Map(children.map((child) => [String(child.getAttribute('data-theme-layout-section') || '').trim(), child]))
    const used = new Set()
    const ordered = []
    for (const raw of order) {
      const id = String(raw || '').trim()
      const el = id ? byId.get(id) : null
      if (!el || used.has(el)) continue
      used.add(el)
      ordered.push(el)
    }

    if (ordered.length < 2) continue

    const remaining = children.filter((child) => !used.has(child))
    for (const node of [...ordered, ...remaining]) {
      try {
        root.appendChild(node)
      } catch {
        // ignore
      }
    }

    const hiddenSet = new Set(hidden.map((value) => String(value || '').trim()).filter(Boolean))
    for (const [id, el] of byId.entries()) {
      try {
        if (hiddenSet.has(id)) {
          el.setAttribute('data-theme-layout-hidden', '1')
          el.style.display = 'none'
        } else {
          el.removeAttribute('data-theme-layout-hidden')
          el.style.display = ''
        }
      } catch {
        // ignore
      }
    }
  }
}

function applyContentOverrides(settings, routePath) {
  const overrides =
    settings?.public_content_overrides && typeof settings.public_content_overrides === 'object'
      ? settings.public_content_overrides
      : null
  if (!overrides) return

  const route = String(routePath || window?.location?.pathname || '/')
  const buckets = []
  if (Array.isArray(overrides['*'])) buckets.push(overrides['*'])
  if (Array.isArray(overrides[route])) buckets.push(overrides[route])

  const attrOverrides = new Map()
  const styleOverrides = new Map()
  for (const list of buckets) {
    for (const item of list) {
      const xpath = String(item?.xpath || '').trim()
      const attr = String(item?.attr || '').trim()
      if (!xpath || !attr) continue
      attrOverrides.set(`${xpath}::${attr}`, item)
    }
  }

  for (const list of buckets) {
    for (const item of list) {
      const xpath = String(item?.xpath || '').trim()
      if (!xpath) continue
      const styles = item?.styles
      if (!styles || typeof styles !== 'object' || Array.isArray(styles)) continue
      styleOverrides.set(xpath, styles)
    }
  }

  // Revert old attr overrides that no longer exist.
  try {
    const previouslyOverridden = document.querySelectorAll('[data-theme-override-attr="1"]')
    previouslyOverridden.forEach((element) => {
      const xpath = String(element.getAttribute('data-theme-override-xpath') || '').trim()
      const attr = String(element.getAttribute('data-theme-override-attr-name') || '').trim()
      if (!xpath || !attr) return
      const key = `${xpath}::${attr}`
      if (attrOverrides.has(key)) return

      if (attr === 'src' && element instanceof HTMLImageElement) {
        const original = String(element.getAttribute('data-theme-original-src') || '')
        if (original) element.setAttribute('src', original)
        element.style.removeProperty('display')
        element.removeAttribute('data-theme-original-src')
      }

      if (attr === 'backgroundImage') {
        const original = String(element.getAttribute('data-theme-original-bg') || '')
        element.style.backgroundImage = original || ''
        element.removeAttribute('data-theme-original-bg')
      }

      if (attr === 'icon') {
        const originalDisplay = element.getAttribute('data-theme-original-display')
        if (originalDisplay != null) {
          element.style.display = originalDisplay
          element.removeAttribute('data-theme-original-display')
        } else {
          element.style.removeProperty('display')
        }

        try {
          const candidates = document.querySelectorAll('img[data-theme-icon-replacement="1"]')
          candidates.forEach((img) => {
            const forXPath = String(img.getAttribute('data-theme-icon-xpath') || '').trim()
            if (forXPath !== xpath) return
            img.remove()
          })
        } catch {
          // ignore
        }
      }

      element.removeAttribute('data-theme-override-attr')
      element.removeAttribute('data-theme-override-xpath')
      element.removeAttribute('data-theme-override-attr-name')
    })
  } catch {
    // ignore
  }

  // Revert old style overrides that no longer exist.
  try {
    const previouslyStyled = document.querySelectorAll('[data-theme-override-style="1"]')
    previouslyStyled.forEach((element) => {
      const xpath = String(element.getAttribute('data-theme-override-xpath') || '').trim()
      if (!xpath) return
      if (styleOverrides.has(xpath)) return

      const appliedList = String(element.getAttribute('data-theme-style-props') || '').trim()
      const props = appliedList ? appliedList.split(',').map((p) => p.trim()).filter(Boolean) : []
      for (const prop of props) {
        const attrName = `data-theme-original-style-${prop}`
        const original = element.getAttribute(attrName)
        if (original != null) {
          element.style[prop] = original
          element.removeAttribute(attrName)
        } else {
          element.style[prop] = ''
        }
      }

      element.removeAttribute('data-theme-style-props')
      element.removeAttribute('data-theme-override-style')
      element.removeAttribute('data-theme-override-xpath')
    })
  } catch {
    // ignore
  }

  for (const list of buckets) {
    for (const item of list) {
      const xpath = String(item?.xpath || '').trim()
      const value = item?.value
      const attr = String(item?.attr || '').trim()
      if (!xpath) continue
      const element = findElementByXPath(xpath)
      if (!element) continue

      const styles = item?.styles
      if (styles && typeof styles === 'object' && !Array.isArray(styles)) {
        const supported = [
          'backgroundColor',
          'color',
          'width',
          'height',
          'padding',
          'borderRadius',
          'borderWidth',
          'borderColor',
          'fontSize',
          'fontWeight',
          'fontFamily',
          'lineHeight',
          'letterSpacing',
          'textAlign',
          'textTransform',
        ]

        const mergedStyles = styleOverrides.get(xpath) || styles
        const nextApplied = []

        for (const prop of supported) {
          const attrName = `data-theme-original-style-${prop}`
          const nextValueRaw = mergedStyles?.[prop]
          const nextValue = typeof nextValueRaw === 'string' ? nextValueRaw.trim() : ''

          if (nextValue) {
            if (!element.getAttribute(attrName)) {
              element.setAttribute(attrName, String(element.style[prop] || ''))
            }
            element.style[prop] = nextValue
            nextApplied.push(prop)
          } else if (element.getAttribute(attrName) != null) {
            const original = String(element.getAttribute(attrName) || '')
            element.style[prop] = original
            element.removeAttribute(attrName)
          }
        }

        if (nextApplied.length > 0) {
          element.setAttribute('data-theme-override-style', '1')
          element.setAttribute('data-theme-override-xpath', xpath)
          element.setAttribute('data-theme-style-props', nextApplied.join(','))
        }
      }

      if (attr) {
        const nextValue = safeTextValue(value).trim()

        if (attr === 'icon') {
          if (!element.getAttribute('data-theme-original-display')) {
            element.setAttribute('data-theme-original-display', String(element.style.display || ''))
          }

          element.setAttribute('data-theme-override-attr', '1')
          element.setAttribute('data-theme-override-xpath', xpath)
          element.setAttribute('data-theme-override-attr-name', 'icon')

          const removeReplacement = () => {
            try {
              const candidates = document.querySelectorAll('img[data-theme-icon-replacement="1"]')
              candidates.forEach((img) => {
                const forXPath = String(img.getAttribute('data-theme-icon-xpath') || '').trim()
                if (forXPath !== xpath) return
                img.remove()
              })
            } catch {
              // ignore
            }
          }

          if (!nextValue) {
            const originalDisplay = element.getAttribute('data-theme-original-display')
            if (originalDisplay != null) element.style.display = originalDisplay
            else element.style.removeProperty('display')
            removeReplacement()
            continue
          }

          element.style.display = 'none'

          let replacement = null
          try {
            const candidates = document.querySelectorAll('img[data-theme-icon-replacement="1"]')
            candidates.forEach((img) => {
              if (replacement) return
              const forXPath = String(img.getAttribute('data-theme-icon-xpath') || '').trim()
              if (forXPath !== xpath) return
              replacement = img
            })
          } catch {
            // ignore
          }

          if (!(replacement instanceof HTMLImageElement)) {
            replacement = document.createElement('img')
            replacement.setAttribute('alt', '')
            replacement.setAttribute('data-theme-icon-replacement', '1')
            replacement.setAttribute('data-theme-icon-xpath', xpath)
            replacement.style.display = 'inline-block'
            replacement.style.verticalAlign = 'middle'
            replacement.style.flexShrink = '0'
            try {
              element.insertAdjacentElement('afterend', replacement)
            } catch {
              // ignore
            }
          }

          const computed = window.getComputedStyle ? window.getComputedStyle(element) : null
          if (computed) {
            replacement.style.width = computed.width
            replacement.style.height = computed.height
          }

          replacement.src = nextValue
          continue
        }

        if (attr === 'src' && element instanceof HTMLImageElement) {
          const current = String(element.getAttribute('src') || '')
          if (!element.getAttribute('data-theme-original-src')) {
            element.setAttribute('data-theme-original-src', current)
          }

          element.setAttribute('data-theme-override-attr', '1')
          element.setAttribute('data-theme-override-xpath', xpath)
          element.setAttribute('data-theme-override-attr-name', 'src')

          if (!nextValue) {
            element.setAttribute('src', '')
            element.style.display = 'none'
          } else {
            element.setAttribute('src', nextValue)
            element.style.removeProperty('display')
          }
          continue
        }

        if (attr === 'backgroundImage') {
          if (!element.getAttribute('data-theme-original-bg')) {
            element.setAttribute('data-theme-original-bg', String(element.style.backgroundImage || ''))
          }

          element.setAttribute('data-theme-override-attr', '1')
          element.setAttribute('data-theme-override-xpath', xpath)
          element.setAttribute('data-theme-override-attr-name', 'backgroundImage')

          if (!nextValue) {
            element.style.backgroundImage = 'none'
          } else {
            element.style.backgroundImage = `url("${nextValue}")`
          }
          continue
        }

        continue
      }

      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) continue
      const nextText = safeTextValue(value).trim()
      if (!nextText) continue
      element.textContent = nextText
    }
  }
}

export default function ThemeBootstrap() {
  const location = useLocation()
  const lastSettingsRef = useRef(null)
  const pathRef = useRef(String(location.pathname || ''))
  const editorRef = useRef({ enabled: false, mode: 'edit', selected: null, cleanup: null, layoutCleanup: null })

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const onMessage = (event) => {
      const origin = String(window?.location?.origin || '')
      if (origin && event?.origin && event.origin !== origin) return
      const data = event?.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'theme-editor:setMode') {
        const mode = String(data.mode || '').trim().toLowerCase()
        if (mode === 'edit' || mode === 'navigate' || mode === 'layout') {
          editorRef.current.mode = mode
          if (mode !== 'edit') {
            const selected = editorRef.current.selected
            if (selected) {
              try {
                selected.blur()
              } catch {
                // ignore
              }
            }
          }
        }
        return
      }

      if (data.type !== 'theme-preview') return
      const payloadSettings = data.settings && typeof data.settings === 'object' ? data.settings : null
      if (!payloadSettings) return

      lastSettingsRef.current = payloadSettings
      if (!String(pathRef.current || '').startsWith('/admin')) {
        applyThemeSettings(payloadSettings)
        applyContentOverrides(payloadSettings, String(pathRef.current || ''))
        applyLayoutOverrides(payloadSettings, String(pathRef.current || ''))
        window.dispatchEvent(new CustomEvent(THEME_UPDATED_EVENT, { detail: { settings: payloadSettings } }))
      }
    }

    const enableEditorMode = () => {
      const searchParams = new URLSearchParams(String(window?.location?.search || ''))
      const isEditor = String(searchParams.get('editor') || '').trim() === '1'
      editorRef.current.enabled = isEditor
      editorRef.current.mode = 'edit'
      if (!isEditor || String(pathRef.current || '').startsWith('/admin')) return

      const state = editorRef.current
      if (state.cleanup) return

      const clearSelected = () => {
        const previous = state.selected
        if (!previous) return
        try {
          previous.style.outline = ''
          previous.removeAttribute('contenteditable')
          previous.removeAttribute('data-theme-editing')
        } catch {
          // ignore
        }
        state.selected = null
      }

      const setSelected = (el) => {
        clearSelected()
        state.selected = el
        try {
          el.style.outline = '2px solid rgb(59 130 246)'
          el.setAttribute('data-theme-editing', '1')
        } catch {
          // ignore
        }
      }

      const postToParent = (payload) => {
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(payload, window.location.origin)
          }
        } catch {
          // ignore
        }
      }

      const findLayoutRoot = () => {
        const roots = Array.from(document.querySelectorAll('[data-theme-layout-root]')).filter((el) => el instanceof HTMLElement)
        if (roots.length === 0) return null
        roots.sort((a, b) => {
          const aCount = Array.from(a.children).filter((c) => c instanceof HTMLElement && c.getAttribute('data-theme-layout-section')).length
          const bCount = Array.from(b.children).filter((c) => c instanceof HTMLElement && c.getAttribute('data-theme-layout-section')).length
          return bCount - aCount
        })
        return roots[0] || null
      }

      const installLayoutHandles = () => {
        if (!state.enabled || state.mode !== 'layout') return
        if (state.layoutCleanup) return

        const route = String(window?.location?.pathname || '/') || '/'
        const routeKey = (() => {
          if (route.startsWith('/productDetails/')) return '/productDetails/*'
          if (route.startsWith('/blog/')) return '/blog/*'
          return route
        })()
        const container = findLayoutRoot()
        if (!container) return

        const rootId = String(container.getAttribute('data-theme-layout-root') || '').trim()
        if (!rootId) return

        const blocks = Array.from(container.children).filter((child) => {
          if (!(child instanceof HTMLElement)) return false
          const id = String(child.getAttribute('data-theme-layout-section') || '').trim()
          return Boolean(id)
        })
        if (blocks.length < 2) return

        let dragging = null

        const computeOrderPayload = () => {
          const order = Array.from(container.children)
            .filter((child) => child instanceof HTMLElement)
            .map((child) => String(child.getAttribute('data-theme-layout-section') || '').trim())
            .filter(Boolean)
          const hidden = Array.from(container.children)
            .filter((child) => child instanceof HTMLElement && String(child.getAttribute('data-theme-layout-hidden') || '').trim() === '1')
            .map((child) => String(child.getAttribute('data-theme-layout-section') || '').trim())
            .filter(Boolean)
          return { route: routeKey, root_id: rootId, order, hidden }
        }

        const commitOrder = () => {
          const payload = computeOrderPayload()
          if (!payload.order || payload.order.length < 2) return
          if (payload.route === '/' && payload.root_id === 'home') {
            postToParent({ type: 'theme-editor:home-sections-order', order: payload.order })
            // Home "deletes" are stored as layout hidden ids, while ordering is stored in public_home_sections.
            postToParent({ type: 'theme-editor:layout', ...payload })
            return
          }
          postToParent({ type: 'theme-editor:layout', ...payload })
        }

        const syncHomeCssOrder = () => {
          if (route !== '/' || rootId !== 'home') return
          let order = 10
          for (const child of Array.from(container.children)) {
            if (!(child instanceof HTMLElement)) continue
            if (!String(child.getAttribute('data-theme-layout-section') || '').trim()) continue
            child.style.order = String(order)
            order += 10
          }
        }

        const decorateBlock = (block) => {
          const existing = block.querySelector(':scope > [data-theme-layout-handle="1"]')
          if (existing) return

          block.setAttribute('data-theme-layout-item', '1')
          if (!block.getAttribute('data-theme-layout-prev-position')) {
            block.setAttribute('data-theme-layout-prev-position', String(block.style.position || ''))
          }
          if (!block.getAttribute('data-theme-layout-prev-outline')) {
            block.setAttribute('data-theme-layout-prev-outline', String(block.style.outline || ''))
          }

          const computed = window.getComputedStyle ? window.getComputedStyle(block) : null
          if (computed && computed.position === 'static') {
            block.style.position = 'relative'
          }
          block.style.outline = '2px dashed rgba(59, 130, 246, 0.6)'

          const handle = document.createElement('button')
          handle.type = 'button'
          handle.textContent = '≡'
          handle.setAttribute('data-theme-layout-handle', '1')
          handle.setAttribute('draggable', 'true')
          handle.setAttribute('aria-label', 'Drag section')
          handle.style.position = 'absolute'
          handle.style.top = '10px'
          handle.style.right = '10px'
          handle.style.zIndex = '2147483647'
          handle.style.width = '32px'
          handle.style.height = '28px'
          handle.style.borderRadius = '8px'
          handle.style.border = '1px solid rgba(0,0,0,0.15)'
          handle.style.background = 'rgba(255,255,255,0.9)'
          handle.style.boxShadow = '0 1px 8px rgba(0,0,0,0.12)'
          handle.style.color = 'rgba(0,0,0,0.65)'
          handle.style.cursor = 'grab'
          handle.style.fontSize = '18px'
          handle.style.lineHeight = '1'
          handle.style.display = 'inline-flex'
          handle.style.alignItems = 'center'
          handle.style.justifyContent = 'center'
          handle.style.userSelect = 'none'

          const hideButton = document.createElement('button')
          hideButton.type = 'button'
          hideButton.textContent = '×'
          hideButton.setAttribute('data-theme-layout-hide', '1')
          hideButton.setAttribute('aria-label', 'Delete section')
          hideButton.style.position = 'absolute'
          hideButton.style.top = '10px'
          hideButton.style.right = '46px'
          hideButton.style.zIndex = '2147483647'
          hideButton.style.width = '28px'
          hideButton.style.height = '28px'
          hideButton.style.borderRadius = '8px'
          hideButton.style.border = '1px solid rgba(0,0,0,0.15)'
          hideButton.style.background = 'rgba(255,255,255,0.9)'
          hideButton.style.boxShadow = '0 1px 8px rgba(0,0,0,0.12)'
          hideButton.style.color = 'rgba(0,0,0,0.65)'
          hideButton.style.cursor = 'pointer'
          hideButton.style.fontSize = '18px'
          hideButton.style.lineHeight = '1'
          hideButton.style.display = 'inline-flex'
          hideButton.style.alignItems = 'center'
          hideButton.style.justifyContent = 'center'
          hideButton.style.userSelect = 'none'

          const onDragStart = (event) => {
            if (state.mode !== 'layout') return
            const id = String(block.getAttribute('data-theme-layout-section') || '').trim()
            if (!id) return
            dragging = id
            try {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', id)
            } catch {
              // ignore
            }
          }

          const onDragEnd = () => {
            dragging = null
          }

          const onDragOver = (event) => {
            if (state.mode !== 'layout') return
            if (!dragging) return
            event.preventDefault()

            const draggedEl = Array.from(container.children).find(
              (child) => child instanceof HTMLElement && String(child.getAttribute('data-theme-layout-section') || '').trim() === dragging
            )
            if (!(draggedEl instanceof HTMLElement) || draggedEl.parentElement !== container) return
            if (draggedEl === block) return

            const rect = block.getBoundingClientRect?.()
            if (!rect) return
            const midpoint = rect.top + rect.height / 2
            const insertAfter = typeof event.clientY === 'number' && event.clientY > midpoint
            try {
              if (insertAfter) {
                container.insertBefore(draggedEl, block.nextSibling)
              } else {
                container.insertBefore(draggedEl, block)
              }
              syncHomeCssOrder()
            } catch {
              // ignore
            }
          }

          const onDrop = (event) => {
            if (state.mode !== 'layout') return
            event.preventDefault()
            commitOrder()
          }

          const onHideClick = (event) => {
            if (state.mode !== 'layout') return
            event.preventDefault()
            event.stopPropagation()
            const sectionId = String(block.getAttribute('data-theme-layout-section') || '').trim()
            if (!sectionId) return

            const isHidden = String(block.getAttribute('data-theme-layout-hidden') || '').trim() === '1'
            if (isHidden) {
              block.removeAttribute('data-theme-layout-hidden')
              block.style.opacity = ''
            } else {
              block.setAttribute('data-theme-layout-hidden', '1')
              block.style.opacity = '0.35'
            }
            commitOrder()
          }

          handle.addEventListener('dragstart', onDragStart)
          handle.addEventListener('dragend', onDragEnd)
          hideButton.addEventListener('click', onHideClick)
          block.addEventListener('dragover', onDragOver)
          block.addEventListener('drop', onDrop)

          block.insertBefore(handle, block.firstChild)
          block.insertBefore(hideButton, block.firstChild)

          const isHidden = String(block.getAttribute('data-theme-layout-hidden') || '').trim() === '1'
          if (!block.getAttribute('data-theme-layout-prev-opacity')) {
            block.setAttribute('data-theme-layout-prev-opacity', String(block.style.opacity || ''))
          }
          if (isHidden) {
            block.style.display = ''
            block.style.opacity = '0.35'
          }

          return {
            handle,
            hideButton,
            onDragStart,
            onDragEnd,
            onHideClick,
            onDragOver,
            onDrop,
          }
        }

        const decorated = []
        for (const block of blocks) {
          const result = decorateBlock(block)
          if (result) decorated.push({ block, ...result })
        }

        state.layoutCleanup = () => {
          for (const row of decorated) {
            try {
              row.handle?.removeEventListener('dragstart', row.onDragStart)
              row.handle?.removeEventListener('dragend', row.onDragEnd)
              row.hideButton?.removeEventListener('click', row.onHideClick)
              row.block?.removeEventListener('dragover', row.onDragOver)
              row.block?.removeEventListener('drop', row.onDrop)
              row.handle?.remove()
              row.hideButton?.remove()

              const prevPos = String(row.block?.getAttribute('data-theme-layout-prev-position') || '')
              const prevOutline = String(row.block?.getAttribute('data-theme-layout-prev-outline') || '')
              if (row.block) {
                row.block.style.position = prevPos
                row.block.style.outline = prevOutline
                const prevOpacity = String(row.block?.getAttribute('data-theme-layout-prev-opacity') || '')
                row.block.style.opacity = prevOpacity
                row.block.removeAttribute('data-theme-layout-prev-opacity')
                row.block.removeAttribute('data-theme-layout-item')
                row.block.removeAttribute('data-theme-layout-prev-position')
                row.block.removeAttribute('data-theme-layout-prev-outline')
              }
            } catch {
              // ignore
            }
          }
          dragging = null
          state.layoutCleanup = null
        }
      }

      const syncEditorDecorations = () => {
        if (!state.enabled) return
        if (state.mode === 'layout') {
          installLayoutHandles()
          return
        }
        if (state.layoutCleanup) {
          try {
            state.layoutCleanup()
          } catch {
            // ignore
          }
          // Re-apply layout overrides so hidden sections disappear outside layout mode.
          if (lastSettingsRef.current) {
            try {
              applyLayoutOverrides(lastSettingsRef.current, String(pathRef.current || ''))
            } catch {
              // ignore
            }
          }
        }
      }

      const commitEdit = (el) => {
        if (!el) return
        const key = String(el.getAttribute('data-theme-edit') || '').trim()
        const value = String(el.innerText || '').trim()
        if (key) {
          postToParent({ type: 'theme-editor:change', mode: 'key', key, value })
          return
        }

        const xpath = getXPathForElement(el)
        if (!xpath) return
        const route = String(window?.location?.pathname || '/')
        postToParent({ type: 'theme-editor:change', mode: 'xpath', route, xpath, value })
      }

      const onClick = (event) => {
        if (editorRef.current.mode !== 'edit') return
        const rawTarget = event?.target
        if (!(rawTarget instanceof Element)) return

        const textSelector = '[data-theme-edit],h1,h2,h3,h4,h5,h6,p,span,button,a,label,li,small,strong,em'
        let target = rawTarget

        const backgroundTarget = rawTarget.closest('[data-theme-image]')
        // If click targeting is captured by the background container (e.g. pointer-events on children),
        // try to resolve a text/button element under the cursor by geometry so text over images remains editable.
        if (
          backgroundTarget &&
          !event.altKey &&
          typeof event.clientX === 'number' &&
          typeof event.clientY === 'number' &&
          typeof backgroundTarget.querySelectorAll === 'function'
        ) {
          try {
            const candidates = Array.from(backgroundTarget.querySelectorAll(textSelector)).slice(0, 80)
            const hit = candidates
              .map((el) => {
                const rect = el.getBoundingClientRect?.()
                if (!rect) return null
                const within =
                  event.clientX >= rect.left &&
                  event.clientX <= rect.right &&
                  event.clientY >= rect.top &&
                  event.clientY <= rect.bottom
                if (!within) return null
                const area = Math.max(1, rect.width * rect.height)
                return { el, area }
              })
              .filter(Boolean)
              .sort((a, b) => a.area - b.area)[0]
            if (hit?.el instanceof Element) target = hit.el
          } catch {
            // ignore
          }
        }

        const clickedImg = target.closest('img')
        const clickedSvg = target.closest('svg')
        const clickedText = target.closest(textSelector)

        const imageTarget = target.closest('[data-theme-image]')
        // Background areas (data-theme-image) should only open the image dialog when clicking the "empty" background.
        // If you click text/button inside the background, you most likely want to edit the text instead.
        // Hold Alt while clicking to force editing the background image even when clicking on child content.
        if (imageTarget && (event.altKey || (!clickedText && !(clickedImg instanceof HTMLImageElement) && !(clickedSvg instanceof SVGElement)))) {
          const key = String(imageTarget.getAttribute('data-theme-image') || '').trim()
          if (!key) return

          event.preventDefault()
          event.stopPropagation()
          setSelected(imageTarget)

          postToParent({
            type: 'theme-editor:image',
            mode: 'key',
            key,
            label: String(imageTarget.getAttribute('data-theme-image-label') || '').trim(),
            value: '',
          })
          return
        }

        if (clickedSvg instanceof SVGElement) {
          event.preventDefault()
          event.stopPropagation()
          setSelected(clickedSvg)

          const xpath = getXPathForElement(clickedSvg)
          if (!xpath) return
          const route = String(window?.location?.pathname || '/')
          const overrides =
            lastSettingsRef.current?.public_content_overrides && typeof lastSettingsRef.current.public_content_overrides === 'object'
              ? lastSettingsRef.current.public_content_overrides
              : null
          const list = overrides && Array.isArray(overrides[route]) ? overrides[route] : []
          const starList = overrides && Array.isArray(overrides['*']) ? overrides['*'] : []
          const current = [...starList, ...list].find(
            (item) => String(item?.xpath || '').trim() === xpath && String(item?.attr || '').trim() === 'icon'
          )

          postToParent({
            type: 'theme-editor:image',
            mode: 'xpath',
            route,
            xpath,
            attr: 'icon',
            value: String(current?.value || ''),
          })
          return
        }

        if (clickedImg instanceof HTMLImageElement) {
          const src = String(clickedImg.getAttribute('src') || '')
          const xpath = getXPathForElement(clickedImg)
          if (!xpath) return

          event.preventDefault()
          event.stopPropagation()
          setSelected(clickedImg)

          postToParent({
            type: 'theme-editor:image',
            mode: 'xpath',
            route: String(window?.location?.pathname || '/'),
            xpath,
            attr: 'src',
            value: src,
          })
          return
        }

        const tagged = target.closest('[data-theme-edit]')
        const fallbackText = target.closest('h1,h2,h3,p,span,button,a,label,li')
        const fallbackContainer = target.closest('section,div,header,footer,main,nav,article,aside,form')
        const editable = tagged || fallbackText || fallbackContainer
        if (editable && (tagged || fallbackContainer || String(editable.textContent || '').trim())) {
          event.preventDefault()
          event.stopPropagation()

          setSelected(editable)

          const tag = String(editable.tagName || '').toLowerCase()
          const editableTags = new Set(['h1', 'h2', 'h3', 'p', 'span', 'button', 'a'])
          if (editableTags.has(tag)) {
            editable.setAttribute('contenteditable', 'true')
            editable.focus({ preventScroll: true })
            const selection = window.getSelection?.()
            if (selection) {
              const range = document.createRange()
              range.selectNodeContents(editable)
              selection.removeAllRanges()
              selection.addRange(range)
            }
          }

          const computed = window.getComputedStyle ? window.getComputedStyle(editable) : null
          const stylePayload = computed
            ? {
                color: computed.color,
                backgroundColor: computed.backgroundColor,
                fontSize: computed.fontSize,
                fontWeight: computed.fontWeight,
                fontFamily: computed.fontFamily,
                lineHeight: computed.lineHeight,
                letterSpacing: computed.letterSpacing,
                textAlign: computed.textAlign,
                textTransform: computed.textTransform,
                width: computed.width,
                height: computed.height,
                padding: computed.padding,
                borderRadius: computed.borderRadius,
                borderWidth: computed.borderWidth,
                borderColor: computed.borderColor,
              }
            : null

          const key = String(editable.getAttribute('data-theme-edit') || '').trim()
          const xpath = getXPathForElement(editable)
          if (key) {
            postToParent({
              type: 'theme-editor:select',
              mode: 'key',
              key,
              xpath,
              route: String(window?.location?.pathname || '/'),
              tag,
              value: String(editable.innerText || ''),
              styles: stylePayload,
            })
          } else {
            postToParent({
              type: 'theme-editor:select',
              mode: 'xpath',
              route: String(window?.location?.pathname || '/'),
              xpath,
              tag,
              value: String(editable.innerText || ''),
              styles: stylePayload,
            })
          }
          return
        }
      }

      const onBlur = (event) => {
        const target = event?.target
        if (!(target instanceof Element)) return
        const editable = target.closest('[data-theme-editing="1"]')
        if (!editable) return
        commitEdit(editable)
      }

      const onKeyDown = (event) => {
        if (editorRef.current.mode !== 'edit') return
        if (event.key !== 'Enter') return
        const target = event?.target
        if (!(target instanceof Element)) return
        const editable =
          target.closest('[data-theme-editing="1"]') ||
          target.closest('[data-theme-edit]') ||
          target.closest('h1,h2,h3,p,span,button,a,label,li')
        if (!editable) return
        event.preventDefault()
        commitEdit(editable)
        try {
          editable.blur()
        } catch {
          // ignore
        }
      }

      window.addEventListener('click', onClick, true)
      window.addEventListener('blur', onBlur, true)
      window.addEventListener('keydown', onKeyDown, true)

      state.cleanup = () => {
        window.removeEventListener('click', onClick, true)
        window.removeEventListener('blur', onBlur, true)
        window.removeEventListener('keydown', onKeyDown, true)
        clearSelected()
        if (state.layoutCleanup) state.layoutCleanup()
        state.cleanup = null
      }

      // Initial decoration sync.
      syncEditorDecorations()
      // Re-run occasionally in case route loads content after mount (e.g., async renders).
      const syncTimer = window.setInterval(() => {
        if (!state.enabled) return
        syncEditorDecorations()
      }, 900)
      const previousCleanup = state.cleanup
      state.cleanup = () => {
        try {
          window.clearInterval(syncTimer)
        } catch {
          // ignore
        }
        previousCleanup?.()
      }
    }

    const load = async () => {
      try {
        const searchParams = new URLSearchParams(String(window?.location?.search || ''))
        const previewThemeId = String(searchParams.get('previewThemeId') || '').trim()
        const settings = previewThemeId
          ? await getJson(`/api/system/public-themes/${encodeURIComponent(previewThemeId)}`, { signal: controller.signal })
          : await getJson('/api/system/theme', { signal: controller.signal })
        if (!active) return
        const payloadSettings = previewThemeId
          ? (settings?.preset?.settings && typeof settings.preset.settings === 'object' ? settings.preset.settings : null)
          : settings
        lastSettingsRef.current = payloadSettings
        if (!String(pathRef.current || '').startsWith('/admin')) {
          if (payloadSettings) {
            applyThemeSettings(payloadSettings)
            applyContentOverrides(payloadSettings, String(pathRef.current || ''))
            applyLayoutOverrides(payloadSettings, String(pathRef.current || ''))
          }
          if (previewThemeId && payloadSettings) {
            window.dispatchEvent(new CustomEvent(THEME_UPDATED_EVENT, { detail: { settings: payloadSettings } }))
          }
        }

        enableEditorMode()
      } catch {
        // Ignore theme load failures and keep default CSS variables.
        enableEditorMode()
      }
    }

    const onThemeUpdated = (event) => {
      const payload = event?.detail?.settings ?? event?.detail ?? null
      if (!payload) return
      lastSettingsRef.current = payload
      if (!String(pathRef.current || '').startsWith('/admin')) {
        applyThemeSettings(payload)
        applyContentOverrides(payload, String(pathRef.current || ''))
        applyLayoutOverrides(payload, String(pathRef.current || ''))
      }
    }

    void load()
    window.addEventListener(THEME_UPDATED_EVENT, onThemeUpdated)
    window.addEventListener('message', onMessage)

    return () => {
      active = false
      controller.abort()
      window.removeEventListener(THEME_UPDATED_EVENT, onThemeUpdated)
      window.removeEventListener('message', onMessage)
      if (editorRef.current.cleanup) editorRef.current.cleanup()
    }
  }, [])

  useEffect(() => {
    pathRef.current = String(location.pathname || '')
    const isAdmin = String(pathRef.current || '').startsWith('/admin')
    if (isAdmin) {
      clearThemeOverrides()
      return
    }
    if (lastSettingsRef.current) {
      applyThemeSettings(lastSettingsRef.current)
      applyContentOverrides(lastSettingsRef.current, String(pathRef.current || ''))
      applyLayoutOverrides(lastSettingsRef.current, String(pathRef.current || ''))
    }
  }, [location.pathname])

  return null
}
