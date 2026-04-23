import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  current: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
  awaiting_payment: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  processing: "bg-sky-100 text-sky-700",
  packaging: "bg-sky-100 text-sky-700",
  shipped: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  payment_failed: "bg-rose-100 text-rose-700",
  refunded: "bg-orange-100 text-orange-700",
  failed: "bg-rose-100 text-rose-700",
  delivered: "bg-emerald-100 text-emerald-700",
  not_created: "bg-slate-100 text-slate-600",
  retrying: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-100 text-amber-700"
};
const StatusBadge = ({ status, label, className }) => {
  const key = status.toLowerCase().trim().replace(/\s+/g, "_");
  const displayLabel = label || status.replace(/[_-]+/g, " ");
  return <Badge
    variant="outline"
    className={cn(
      "cursor-default select-none border-white/30 px-2.5 py-0.5 text-xs font-semibold capitalize transition-[background-color,backdrop-filter,box-shadow,border-color] duration-200 hover:bg-white/20 hover:backdrop-blur-sm hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
      STATUS_STYLES[key] || "bg-slate-100 text-slate-700",
      className
    )}
  >
      {displayLabel}
    </Badge>;
};
export {
  StatusBadge
};
