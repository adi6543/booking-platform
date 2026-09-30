import * as React from "react"
import { cn } from "@/lib/utils"

const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm",
      "text-foreground placeholder:text-muted-foreground",
      "focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "backdrop-blur-sm transition-colors",
      className
    )}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = "Select"

export { Select }
