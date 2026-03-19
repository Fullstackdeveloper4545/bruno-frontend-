import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getJson } from '@/lib/api'
import { applyThemeSettings, clearThemeOverrides, THEME_UPDATED_EVENT } from '@/lib/theme'

function safeTextValue(value) {
  return String(value ?? '')
}

function getXPathForElement(element) {
  if (!(element instanceof Element)) return ''
  const segments = []
  let node = element

  while (node && node.nodeType === 1 && node !== document.documentElement) {
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
    const result = document.evaluate(safe, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    const node = result.singleNodeValue
    return node instanceof Element ? node : null
  } catch {
    return null
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

  for (const list of buckets) {
    for (const item of list) {
      const xpath = String(item?.xpath || '').trim()
      const value = item?.value
      if (!xpath) continue
      const element = findElementByXPath(xpath)
      if (!element) continue
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
  const editorRef = useRef({ enabled: false, mode: 'edit', selected: null, cleanup: null })

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
        if (mode === 'edit' || mode === 'navigate') {
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
        const target = event?.target
        if (!(target instanceof Element)) return
        const tagged = target.closest('[data-theme-edit]')
        const fallback = target.closest('h1,h2,h3,p,span,button,a,label,li')
        const editable = tagged || fallback
        if (!editable) return
        if (!String(editable.textContent || '').trim()) return

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

        const key = String(editable.getAttribute('data-theme-edit') || '').trim()
        if (key) {
          postToParent({ type: 'theme-editor:select', mode: 'key', key, value: String(editable.innerText || '') })
        } else {
          const xpath = getXPathForElement(editable)
          postToParent({
            type: 'theme-editor:select',
            mode: 'xpath',
            route: String(window?.location?.pathname || '/'),
            xpath,
            value: String(editable.innerText || ''),
          })
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
        state.cleanup = null
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
    }
  }, [location.pathname])

  return null
}
