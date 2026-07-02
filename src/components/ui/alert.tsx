import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        default: "border-zinc-200 bg-white text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
        success: "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
        warning: "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300",
        destructive: "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed", className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle };
