import { DocsLayout } from "fumadocs-ui/layouts/docs";
import "fumadocs-ui/style.css";
import type { ReactNode } from "react";

import { DocsBrandTitle } from "@/components/docs/docs-brand-title";
import { DocsProvider } from "@/components/docs/docs-provider";
import { source } from "@/lib/source";

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <DocsProvider>
      <DocsLayout
        tree={source.getPageTree("fr")}
        nav={{
          title: <DocsBrandTitle docsHref="/docs" />,
          url: "/docs",
        }}
        sidebar={{ defaultOpenLevel: 1 }}
      >
        {children}
      </DocsLayout>
    </DocsProvider>
  );
}
