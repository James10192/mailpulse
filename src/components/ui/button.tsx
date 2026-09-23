import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[scale,background-color,color,box-shadow,border-color,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-orange-600 text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_10px_24px_rgba(234,88,12,0.18)] hover:bg-orange-500",
        destructive: "bg-red-600 text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset] hover:bg-red-500",
        outline: "bg-white text-zinc-700 shadow-[var(--shadow-border)] hover:bg-zinc-50 hover:shadow-[var(--shadow-border-hover)] dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900",
        secondary: "bg-zinc-100 text-zinc-900 shadow-[inset_0_0_0_1px_rgba(24,24,27,0.06)] hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
        ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
        // Secondary row actions (edit, open): quiet at rest, accent on hover and focus.
        "ghost-accent": "text-zinc-500 hover:bg-orange-50 hover:text-orange-600 focus-visible:text-orange-600 dark:text-zinc-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 dark:focus-visible:text-orange-400",
        // Delete actions in lists and menus: quiet at rest, red on hover and focus.
        "ghost-destructive": "text-zinc-500 hover:bg-red-50 hover:text-red-600 focus-visible:text-red-600 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:focus-visible:text-red-400",
        // Dense toolbars (editor, bubble menus): no press scale. Highlighted while its menu is open
        // (Radix data-state) or while the editor reports the format as active (data-active).
        toolbar: "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 active:scale-100 disabled:opacity-40 data-[active=true]:bg-orange-500/15 data-[active=true]:text-orange-600 data-[state=open]:bg-orange-500/15 data-[state=open]:text-orange-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:data-[active=true]:text-orange-400 dark:data-[state=open]:text-orange-400",
        // Outlined secondary actions carrying the accent or a status colour
        // ("Passer au Pro", "Vérifier", "Désactiver", "Réabonner"...).
        "outline-accent": "bg-white text-orange-600 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.3)] hover:bg-orange-50 hover:text-orange-700 dark:bg-zinc-950 dark:text-orange-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-300",
        "outline-destructive": "bg-white text-red-600 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.3)] hover:bg-red-50 hover:text-red-700 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300",
        "outline-success": "bg-white text-emerald-700 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.3)] hover:bg-emerald-50 hover:text-emerald-800 dark:bg-zinc-950 dark:text-emerald-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300",
        link: "text-orange-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        // Every size keeps a 44px touch target on mobile and tightens from `sm` up.
        sm: "h-11 rounded-md px-3 text-xs sm:h-9",
        lg: "h-11 rounded-lg px-6",
        icon: "size-11 sm:size-10",
        // Compact icon buttons keep a 44px touch target on mobile and shrink from `sm` up.
        "icon-sm": "size-11 rounded-md sm:size-8",
        "icon-xs": "size-11 rounded-md sm:size-7 [&_svg]:size-3.5",
        // Text-only action inside a sentence or a caption (usually with variant="link").
        inline: "h-auto p-0",
        // Toolbar control carrying a short label (font size, "Variables").
        toolbar: "h-11 gap-1 rounded-md px-2 text-xs sm:h-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
