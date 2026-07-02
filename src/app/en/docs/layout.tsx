import { DocsLayout } from "fumadocs-ui/layouts/docs";
import "fumadocs-ui/style.css";
import type { ReactNode } from "react";

import { DocsBrandTitle } from "@/components/docs/docs-brand-title";
import { DocsProvider } from "@/components/docs/docs-provider";
import { source } from "@/lib/source";

export default function EnglishDocsLayout({ children }: { children: ReactNode }) {
  return (
    <DocsProvider>
      <DocsLayout
        tree={source.getPageTree("en")}
        nav={{
          title: <DocsBrandTitle docsHref="/en/docs" />,
          url: "/en/docs",
        }}
        sidebar={{ defaultOpenLevel: 1 }}
      >
        {children}
      </DocsLayout>
    </DocsProvider>
  );
}
