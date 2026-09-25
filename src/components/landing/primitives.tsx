import { cn } from "@/lib/utils";

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 md:px-6 lg:px-8", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-mono text-xs font-medium uppercase leading-none tracking-[0.08em] text-orange-400",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function H2({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <h2
      id={id}
      className={cn(
        "text-balance text-[clamp(1.875rem,3.4vw+0.9rem,3rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-zinc-50",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Lead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-pretty text-[17px] leading-[1.5] tracking-[-0.01em] text-zinc-400 md:text-xl", className)}>
      {children}
    </p>
  );
}

export type Status = "queued" | "sent" | "delivered" | "opened" | "read" | "clicked" | "failed";

const STATUS: Record<Status, { label: string; className: string }> = {
  queued: { label: "En file", className: "text-zinc-400 bg-zinc-800/70" },
  sent: { label: "Envoyé", className: "text-zinc-300 bg-zinc-800/70" },
  delivered: { label: "Livré", className: "text-emerald-300 bg-emerald-400/10" },
  opened: { label: "Ouvert", className: "text-orange-300 bg-orange-500/10" },
  read: { label: "Lu", className: "text-orange-300 bg-orange-500/10" },
  clicked: { label: "Clic", className: "text-orange-300 bg-orange-500/10" },
  failed: { label: "Échec", className: "text-red-300 bg-red-500/10" },
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] leading-5 whitespace-nowrap",
        s.className,
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

/** Product-window chrome: three dots and a title tab. */
export function WindowFrame({
  title,
  children,
  className,
  bodyClassName,
  right,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] border border-white/[0.08] bg-zinc-900/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_30px_80px_-30px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      <div className="flex h-10 items-center gap-3 border-b border-white/[0.06] px-4">
        <div aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-700" />
        </div>
        <p className="min-w-0 truncate font-mono text-[11px] text-zinc-500">{title}</p>
        {right ? <div className="ml-auto shrink-0">{right}</div> : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-1.5", className)}>
      <span className="mp-ping absolute inset-0 rounded-full bg-orange-500" />
      <span className="relative size-1.5 rounded-full bg-orange-500" />
    </span>
  );
}

/** Card surface used across the landing (surface 1 + lit top edge). */
export const cardClass =
  "relative rounded-[14px] border border-white/[0.06] bg-zinc-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]";

export const primaryCta =
  "group inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-orange-500 px-6 text-[15px] font-medium text-zinc-950 shadow-[0_0_0_1px_rgba(249,115,22,.4),0_8px_24px_-8px_rgba(249,115,22,.5)] transition-[background-color,scale] duration-150 hover:bg-orange-400 active:scale-[0.985]";

export const ghostCta =
  "group inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-white/[0.1] bg-white/[0.02] px-6 text-[15px] font-medium text-zinc-200 transition-[background-color,border-color,color,scale] duration-150 hover:border-white/[0.18] hover:bg-white/[0.05] hover:text-zinc-50 active:scale-[0.985]";
