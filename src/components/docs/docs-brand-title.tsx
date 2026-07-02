"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

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
        <Mail className="h-4 w-4 text-orange-500" />
        <span>
          Mail<span className="text-orange-500">Pulse</span>
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
