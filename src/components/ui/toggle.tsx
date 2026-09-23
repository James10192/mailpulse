"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow,background-color,border-color] outline-none hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-orange-500/35 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
        // Selectable option (audience pills, onboarding answers, channel cards): neutral outline,
        // orange once chosen. Also styles a <label> wrapping a checked radio through `has-`.
        choice:
          "border border-zinc-200 bg-transparent font-normal text-zinc-500 hover:border-zinc-400 hover:bg-transparent hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200 data-[state=on]:border-orange-500/50 data-[state=on]:bg-orange-500/10 data-[state=on]:text-orange-600 data-[state=on]:hover:bg-orange-500/10 dark:data-[state=on]:text-orange-400 has-[[data-state=checked]]:border-orange-500/40 has-[[data-state=checked]]:bg-orange-500/5",
        // Editor formatting toggles (bold, alignment, lists). Keyed on aria-pressed, not data-state:
        // a wrapping TooltipTrigger passes its own data-state, which Radix Toggle lets override "on"/"off".
        toolbar:
          "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 aria-pressed:bg-orange-500/15 aria-pressed:text-orange-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:aria-pressed:text-orange-400",
      },
      size: {
        default: "h-9 min-w-9 px-2",
        sm: "h-8 min-w-8 px-1.5",
        lg: "h-10 min-w-10 px-2.5",
        // Same 44px mobile touch target as the `icon-sm` button.
        "icon-sm": "size-11 min-w-11 p-0 sm:size-8 sm:min-w-8",
        choice: "h-auto min-h-11 min-w-0 whitespace-normal rounded-lg px-3 py-2",
        "choice-sm": "h-auto min-h-9 min-w-0 whitespace-normal rounded-lg px-3 py-1.5 text-xs",
        card: "h-auto items-start justify-start gap-3 whitespace-normal rounded-xl p-3 text-left",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
