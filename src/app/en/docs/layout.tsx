import { DocsLayout } from "fumadocs-ui/layouts/docs";
import "fumadocs-ui/style.css";
import Link from "next/link";
import type { ReactNode } from "react";

import { DocsProvider } from "@/components/docs/docs-provider";
import { source } from "@/lib/source";

export default function EnglishDocsLayout({ children }: { children: ReactNode }) {
  return (
    <DocsProvider>
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
    </DocsProvider>
  );
}
