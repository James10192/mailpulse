"use client";

import Link from "next/link";

import { MailPulseLogo } from "@/components/mailpulse-logo";

export function DocsBrandTitle({ docsHref }: { docsHref: string }) {
  function leaveDocs(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.location.assign("/");
  }

  return (
    <div className="flex items-center gap-2.5">
      <Link
        href="/"
        onClick={leaveDocs}
        className="inline-flex items-center gap-2.5 text-lg font-semibold text-fd-foreground"
      >
        <MailPulseLogo
          className="h-8 w-14 sm:h-9 sm:w-16"
          sizes="(min-width: 640px) 64px, 56px"
        />
        <span>
          Mail<span className="text-[var(--mailpulse-signal)]">Pulse</span>
        </span>
      </Link>
      <span className="text-fd-muted-foreground">/</span>
      <Link
        href={docsHref}
        className="font-medium text-fd-muted-foreground hover:text-fd-foreground"
      >
        Docs
      </Link>
    </div>
  );
}
