import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

function Checkbox({ className, checked, defaultChecked = false, onCheckedChange, disabled = false, ...props }) {
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
      role="checkbox"
      aria-checked={currentChecked}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        'inline-flex h-4 w-4 items-center justify-center rounded border border-input bg-background text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        currentChecked && 'bg-primary text-primary-foreground',
        className
      )}
      {...props}
    >
      {currentChecked ? '✓' : ''}
    </button>
  )
}

export { Checkbox }

