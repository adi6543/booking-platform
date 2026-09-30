import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default:   "bg-primary/20 text-primary border-primary/30",
    available: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    booked:    "bg-rose-500/20 text-rose-400 border-rose-500/30",
    confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    paid:      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    pending:   "bg-amber-500/20 text-amber-400 border-amber-500/30",
    failed:    "bg-rose-500/20 text-rose-400 border-rose-500/30",
  }
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variants[variant] ?? variants.default,
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }
