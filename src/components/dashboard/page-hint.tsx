import { Info } from "lucide-react";
import { HelpButton } from "@/components/dashboard/help-modal";
import { cn } from "@/lib/utils";

/**
 * Static explanation shown at the top of a dashboard page. It is not an alert
 * (nothing happened), so it is exposed as a note to assistive technologies.
 */
export function PageHint({
  children,
  onHelp,
  className,
}: {
  children: React.ReactNode;
  /** Opens the page's "Comment configurer ?" guide when provided. */
  onHelp?: () => void;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm sm:flex-row sm:items-start sm:justify-between dark:border-zinc-800 dark:bg-zinc-950",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 size-5 shrink-0 text-orange-500" aria-hidden="true" />
        <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">{children}</p>
      </div>
      {onHelp ? <HelpButton onClick={onHelp} /> : null}
    </div>
  );
}
