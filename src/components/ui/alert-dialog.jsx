import { cloneElement, createContext, isValidElement, useContext, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

const AlertDialogContext = createContext(null)

function AlertDialog({ open, defaultOpen = false, onOpenChange, children }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const currentOpen = open !== undefined ? open : internalOpen

  const setOpen = (next) => {
    if (open === undefined) setInternalOpen(next)
    if (onOpenChange) onOpenChange(next)
  }

  const contextValue = useMemo(() => ({ open: currentOpen, setOpen }), [currentOpen])
  return <AlertDialogContext.Provider value={contextValue}>{children}</AlertDialogContext.Provider>
}

function AlertDialogTrigger({ asChild = false, children, ...props }) {
  const context = useContext(AlertDialogContext)
  const onClick = (event) => {
    props.onClick?.(event)
    context?.setOpen(true)
  }

  if (asChild && isValidElement(children)) {
    return cloneElement(children, { ...props, onClick })
  }

  return (
    <button type="button" {...props} onClick={onClick}>
      {children}
    </button>
  )
}

function AlertDialogContent({ className, children, ...props }) {
  const context = useContext(AlertDialogContext)
  if (!context?.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={cn('w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg', className)} {...props}>
        {children}
      </div>
    </div>
  )
}

function AlertDialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-2 text-left', className)} {...props} />
}

function AlertDialogFooter({ className, ...props }) {
  return <div className={cn('mt-4 flex justify-end gap-2', className)} {...props} />
}

function AlertDialogTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

function AlertDialogDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function AlertDialogAction({ className, onClick, ...props }) {
  const context = useContext(AlertDialogContext)
  const handleClick = (event) => {
    onClick?.(event)
    context?.setOpen(false)
  }

  return (
    <button
      type="button"
      className={cn('inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground', className)}
      onClick={handleClick}
      {...props}
    />
  )
}

function AlertDialogCancel({ className, onClick, ...props }) {
  const context = useContext(AlertDialogContext)
  const handleClick = (event) => {
    onClick?.(event)
    context?.setOpen(false)
  }

  return (
    <button
      type="button"
      className={cn('inline-flex items-center rounded-md border border-input px-4 py-2 text-sm', className)}
      onClick={handleClick}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
}

