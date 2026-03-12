import { Tooltip } from 'recharts'
import { cn } from '@/lib/utils'

function ChartContainer({ className, config = {}, style, ...props }) {
  const variableStyle = { ...(style || {}) }

  Object.entries(config).forEach(([key, value]) => {
    if (value && typeof value === 'object' && value.color) {
      variableStyle[`--color-${key}`] = value.color
    }
  })

  return <div className={cn('w-full', className)} style={variableStyle} {...props} />
}

const ChartTooltip = Tooltip

function ChartTooltipContent({ active, payload, label }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null

  return (
    <div className="rounded-md border bg-background p-2 text-xs shadow-md">
      {label ? <p className="mb-1 font-semibold">{label}</p> : null}
      {payload.map((entry) => (
        <div key={`${entry.name}-${entry.dataKey}`} className="flex items-center justify-between gap-2">
          <span>{entry.name || entry.dataKey}</span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent }

