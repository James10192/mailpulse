import { DocsLayout } from "fumadocs-ui/layouts/docs";
import "fumadocs-ui/style.css";
import Link from "next/link";
import type { ReactNode } from "react";

import { DocsProvider } from "@/components/docs/docs-provider";
import { source } from "@/lib/source";

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <DocsProvider>
      <DocsLayout
        tree={source.getPageTree("fr")}
        nav={{
          title: (
            <Link href="/docs" className="font-semibold">
              MailPulse Docs
            </Link>
          ),
          url: "/docs",
        }}
        sidebar={{ defaultOpenLevel: 1 }}
      >
        {children}
      </DocsLayout>
    </DocsProvider>
  );
}
