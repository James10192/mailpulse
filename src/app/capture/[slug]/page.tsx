import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { CaptureForm } from "./capture-form";
import { ViewTracker } from "./view-tracker";

export default async function CapturePublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const page = await prisma.capturePage.findFirst({
    where: { slug, published: true },
    select: {
      id: true,
      name: true,
      slug: true,
      fields: true,
      successMessage: true,
      buttonLabel: true,
      organization: { select: { name: true } },
    },
  });

  if (!page) notFound();

  const fields = page.fields as Array<{
    name: string;
    type: string;
    required: boolean;
    label: string;
  }>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandMark className="mb-4 text-xl" />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {page.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            par {page.organization.name}
          </p>
        </div>

        <ViewTracker pageId={page.id} />
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-[var(--shadow-border)] dark:border-zinc-800 dark:bg-zinc-900">
          <CaptureForm
            pageId={page.id}
            fields={fields}
            buttonLabel={page.buttonLabel}
            successMessage={page.successMessage}
          />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Propulsé par MailPulse
        </p>
      </div>
    </div>
  );
}
