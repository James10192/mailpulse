"use client";

import Link from "next/link";

import { MailPulseLogo } from "@/components/mailpulse-logo";

export function DocsBrandTitle({ docsHref }: { docsHref: string }) {
  function leaveDocs(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.location.assign("/");
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/"
        onClick={leaveDocs}
        className="inline-flex items-center gap-2 font-semibold text-fd-foreground"
      >
        <MailPulseLogo className="h-6 w-6" sizes="24px" />
        <span>
          Mail<span className="text-primary">Pulse</span>
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
