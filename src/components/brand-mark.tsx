import Link from "next/link";

import { cn } from "@/lib/utils";
import { MailPulseLogo } from "@/components/mailpulse-logo";

export function BrandMark({
  href = "/",
  compact = false,
  className,
  logoClassName,
  logoSizes = "56px",
}: {
  href?: string;
  compact?: boolean;
  className?: string;
  logoClassName?: string;
  logoSizes?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="MailPulse"
      className={cn(
        "inline-flex items-center gap-2.5 text-foreground transition-colors hover:text-primary",
        className,
      )}
    >
      <MailPulseLogo className={cn("h-8 w-14", logoClassName)} sizes={logoSizes} />
      {!compact && (
        <span className="font-semibold">
          Mail<span className="text-[var(--mailpulse-signal)]">Pulse</span>
        </span>
      )}
    </Link>
  );
}
