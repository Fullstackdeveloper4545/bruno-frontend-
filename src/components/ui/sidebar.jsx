import { cloneElement, createContext, isValidElement, useContext, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SidebarContext = createContext(null)

function SidebarProvider({ children, open, defaultOpen = true, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = open !== undefined ? open : internalOpen

  const setOpen = (next) => {
    if (open === undefined) setInternalOpen(next)
    if (onOpenChange) onOpenChange(next)
  }

  const contextValue = useMemo(() => ({ open: isOpen, setOpen }), [isOpen])

  return <SidebarContext.Provider value={contextValue}>{children}</SidebarContext.Provider>
}

function useSidebar() {
  return useContext(SidebarContext)
}

function Sidebar({ className, collapsible, children, ...props }) {
  const sidebar = useSidebar()
  const isIconCollapsed = collapsible === 'icon' && !sidebar?.open
  return (
    <aside
      data-collapsible={isIconCollapsed ? 'icon' : undefined}
      className={cn(
        'group flex shrink-0 flex-col gap-2 overflow-hidden transition-[width] duration-200 ease-in-out',
        isIconCollapsed ? 'w-20' : 'w-72',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

function SidebarHeader({ className, ...props }) {
  return <div className={cn('p-2', className)} {...props} />
}

function SidebarContent({ className, ...props }) {
  return <div className={cn('flex-1 overflow-y-auto p-2', className)} {...props} />
}

function SidebarFooter({ className, ...props }) {
  return <div className={cn('p-2', className)} {...props} />
}

function SidebarInset({ className, ...props }) {
  return <div className={cn('relative min-w-0 flex-1', className)} {...props} />
}

function SidebarRail({ className, ...props }) {
  return <div className={cn('w-0', className)} {...props} />
}

function SidebarTrigger({ className, onClick, ...props }) {
  const sidebar = useSidebar()
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('inline-flex', className)}
      onClick={(event) => {
        onClick?.(event)
        sidebar?.setOpen(!sidebar.open)
      }}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }) {
  return <section className={cn('space-y-2', className)} {...props} />
}

function SidebarGroupLabel({ className, ...props }) {
  return (
    <p
      className={cn('px-2 text-[10px] uppercase tracking-wide text-white group-data-[collapsible=icon]:hidden', className)}
      {...props}
    />
  )
}

function SidebarGroupContent({ className, ...props }) {
  return <div className={cn('mb-4', className)} {...props} />
}

function SidebarMenu({ className, ...props }) {
  return <ul className={cn('space-y-1 text-[14px]', className)} {...props} />
}

function SidebarMenuItem({ className, ...props }) {
  return <li className={cn('relative', className)} {...props} />
}

function SidebarMenuBadge({ className, ...props }) {
  return (
    <span
      className={cn(
        'absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold group-data-[collapsible=icon]:hidden',
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuButton({ className, asChild = false, isActive = false, tooltip, children, ...props }) {
  const classes = cn(
    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors group-data-[collapsible=icon]:justify-center',
    className
  )

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      className: cn(classes, children.props.className),
      title: tooltip,
      ...props,
    })
  }

  return (
    <button type="button" className={classes} title={tooltip} {...props}>
      {children}
    </button>
  )
}

function SidebarSeparator({ className, ...props }) {
  return <hr className={cn('my-2 border-border/60', className)} {...props} />
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
}
