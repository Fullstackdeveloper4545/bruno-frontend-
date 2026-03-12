import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

let nextId = 1
const listeners = new Set()

function emit(event) {
  listeners.forEach((listener) => listener(event))
}

function createToast(title, options = {}) {
  const id = nextId++
  emit({
    type: 'add',
    payload: {
      id,
      title: String(title || ''),
      description: options.description ? String(options.description) : '',
      variant: options.variant || 'default',
    },
  })

  const duration = Number(options.duration ?? 3000)
  if (duration > 0) {
    window.setTimeout(() => {
      emit({ type: 'remove', payload: { id } })
    }, duration)
  }

  return id
}

const toast = Object.assign(
  (title, options) => createToast(title, options),
  {
    success: (title, options = {}) => createToast(title, { ...options, variant: 'success' }),
    error: (title, options = {}) => createToast(title, { ...options, variant: 'error' }),
  }
)

function Toaster({ className }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    const listener = (event) => {
      if (event.type === 'add') {
        setItems((prev) => [event.payload, ...prev].slice(0, 5))
      }
      if (event.type === 'remove') {
        setItems((prev) => prev.filter((item) => item.id !== event.payload.id))
      }
    }

    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])

  if (items.length === 0) return null

  return (
    <div className={cn('fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2', className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'rounded-md border bg-background p-3 shadow-lg',
            item.variant === 'success' && 'border-emerald-300',
            item.variant === 'error' && 'border-rose-300'
          )}
        >
          <p className="text-sm font-semibold">{item.title}</p>
          {item.description ? <p className="mt-1 text-xs text-muted-foreground">{item.description}</p> : null}
        </div>
      ))}
    </div>
  )
}

export { toast, Toaster }

