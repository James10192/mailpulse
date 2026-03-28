import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { CaptureForm } from "./capture-form";

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
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="relative">
              <Mail className="h-6 w-6 text-orange-500" />
              <div className="absolute inset-0 bg-orange-500/20 blur-lg rounded-full" />
            </div>
            <span className="text-xl font-semibold text-zinc-100">
              Mail<span className="text-orange-500">Pulse</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            {page.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            par {page.organization.name}
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <CaptureForm
            pageId={page.id}
            fields={fields}
            buttonLabel={page.buttonLabel}
            successMessage={page.successMessage}
          />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Propulse par MailPulse
        </p>
      </div>
    </div>
  );
}
