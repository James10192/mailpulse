import Link from "next/link";
import { Mail } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 text-zinc-950 transition-colors hover:text-orange-600 dark:text-zinc-50 dark:hover:text-orange-400",
        className,
      )}
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        <Mail className="h-5 w-5 text-orange-500" />
        <span className="absolute inset-0 rounded-full bg-orange-500/20 blur-md" />
      </span>
      {!compact && (
        <span className="font-semibold tracking-tight">
          Mail<span className="text-orange-500">Pulse</span>
        </span>
      )}
    </Link>
  );
}
