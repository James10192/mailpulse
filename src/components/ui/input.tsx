import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn("flex h-11 w-full rounded-lg bg-white px-3 py-2 text-sm text-zinc-900 shadow-[inset_0_0_0_1px_rgba(24,24,27,0.12)] transition-[background-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:shadow-[inset_0_0_0_1px_rgba(249,115,22,0.5)] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-100 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]", className)}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
