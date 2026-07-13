import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export function generateStaticParams() {
  return source
    .generateParams("slug", "locale")
    .filter((param) => param.locale === "en")
    .map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug, "en");
  if (!page) return {};

  const path = `/en/docs${slug?.length ? `/${slug.join("/")}` : ""}`;

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "article",
      locale: "en_US",
      url: path,
      title: page.data.title,
      description: page.data.description,
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description: page.data.description,
    },
  };
}

export default async function EnglishDocPage({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug, "en");
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? <DocsDescription>{page.data.description}</DocsDescription> : null}
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}
