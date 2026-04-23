import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

function Switch({ className, checked, defaultChecked = false, onCheckedChange, disabled = false, ...props }) {
  const isControlled = useMemo(() => checked !== undefined, [checked])
  const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked))
  const currentChecked = isControlled ? Boolean(checked) : internalChecked

  const handleToggle = () => {
    if (disabled) return
    const next = !currentChecked
    if (!isControlled) setInternalChecked(next)
    if (onCheckedChange) onCheckedChange(next)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={currentChecked}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        'inline-flex h-6 w-11 items-center rounded-full border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        currentChecked ? 'bg-primary' : 'bg-input',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'h-5 w-5 rounded-full bg-background shadow transition-transform',
          currentChecked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

export { Switch }

