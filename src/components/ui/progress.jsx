import { cn } from '@/lib/utils'

function Progress({ className, value = 0, ...props }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))

  return (
    <div className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)} {...props}>
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${safeValue}%` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      />
    </div>
  )
}

export { Progress }

