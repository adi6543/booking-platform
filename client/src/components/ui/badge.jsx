import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default:   "bg-blue-50 text-blue-700 border-blue-200",
    available: "bg-emerald-50 text-emerald-700 border-emerald-200",
    booked:    "bg-zinc-100 text-zinc-700 border-zinc-200",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    cancelled: "bg-zinc-100 text-zinc-600 border-zinc-200",
    paid:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending:   "bg-amber-50 text-amber-800 border-amber-200",
    failed:    "bg-rose-50 text-rose-700 border-rose-200",
    outline:   "bg-white text-zinc-700 border-border",
  }
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
        variants[variant] ?? variants.default,
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }
