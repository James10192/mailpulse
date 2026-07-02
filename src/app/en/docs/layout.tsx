import { DocsLayout } from "fumadocs-ui/layouts/docs";
import Link from "next/link";
import type { ReactNode } from "react";

import { source } from "@/lib/source";

export default function EnglishDocsLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree("en")}
      nav={{
        title: (
          <Link href="/en/docs" className="font-semibold">
            MailPulse Docs
          </Link>
        ),
        url: "/en/docs",
      }}
      sidebar={{ defaultOpenLevel: 1 }}
    >
      {children}
    </DocsLayout>
  );
}
