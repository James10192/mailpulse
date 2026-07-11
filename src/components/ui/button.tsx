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
        link: "text-orange-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6",
        icon: "h-10 w-10",
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
