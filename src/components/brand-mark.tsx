import Link from "next/link";

import { cn } from "@/lib/utils";
import { MailPulseLogo } from "@/components/mailpulse-logo";

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
        "inline-flex items-center gap-2.5 text-foreground transition-colors hover:text-primary",
        className,
      )}
    >
      <MailPulseLogo className="h-7 w-7" sizes="28px" />
      {!compact && (
        <span className="font-semibold">
          Mail<span className="text-primary">Pulse</span>
        </span>
      )}
    </Link>
  );
}
