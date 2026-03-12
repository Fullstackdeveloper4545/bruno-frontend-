import { cloneElement, createContext, isValidElement, useContext, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

const PopoverContext = createContext(null)

function Popover({ open, defaultOpen = false, onOpenChange, children }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const currentOpen = open !== undefined ? open : internalOpen

  const setOpen = (next) => {
    if (open === undefined) setInternalOpen(next)
    if (onOpenChange) onOpenChange(next)
  }

  const contextValue = useMemo(() => ({ open: currentOpen, setOpen }), [currentOpen])

  return <PopoverContext.Provider value={contextValue}>{children}</PopoverContext.Provider>
}

function PopoverTrigger({ asChild = false, children, ...props }) {
  const context = useContext(PopoverContext)

  const onClick = (event) => {
    props.onClick?.(event)
    context?.setOpen(!context.open)
  }

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      ...props,
      onClick,
    })
  }

  return (
    <button type="button" {...props} onClick={onClick}>
      {children}
    </button>
  )
}

function PopoverContent({ className, children, ...props }) {
  const context = useContext(PopoverContext)
  if (!context?.open) return null

  return (
    <div
      className={cn(
        'z-50 min-w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Popover, PopoverContent, PopoverTrigger }

