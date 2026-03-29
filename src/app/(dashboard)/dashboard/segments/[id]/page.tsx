import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { resolveSegmentContacts } from "../actions";
import { Users, Filter, CheckCircle, XCircle, Tag, Calendar, BarChart3 } from "lucide-react";
import Link from "next/link";

export default async function SegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { org } = await getCurrentUserAndOrg();
  if (!org) notFound();

  const segment = await prisma.contactList.findUnique({
    where: { id, organizationId: org.id },
    select: { id: true, name: true, description: true, type: true, dynamicFilter: true, contactCount: true, createdAt: true },
  });

  if (!segment) notFound();

  const contacts = await resolveSegmentContacts(id);
  const filters = segment.dynamicFilter as Record<string, unknown> | null;

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Contacts", href: "/dashboard/contacts" }, { label: "Segments", href: "/dashboard/segments" }, { label: segment.name }]} />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{segment.name}</h1>
            {segment.description && <p className="text-sm text-zinc-500 mt-1">{segment.description}</p>}
          </div>
          <div className="text-sm text-zinc-500 flex items-center gap-2">
            <Users className="h-4 w-4" />
            {contacts.length} contacts
          </div>
        </div>

        {/* Active filters */}
        {filters && Object.keys(filters).length > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" />
              Filtres actifs
            </h2>
            <div className="flex flex-wrap gap-2">
              {filters.subscribed === true && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle className="h-3 w-3" /> Abonnes
                </span>
              )}
              {filters.subscribed === false && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  <XCircle className="h-3 w-3" /> Desabonnes
                </span>
              )}
              {Array.isArray(filters.includeTags) && filters.includeTags.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Tag className="h-3 w-3" /> Tags: {(filters.includeTags as string[]).join(", ")}
                </span>
              )}
              {typeof filters.engagementMin === "number" && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <BarChart3 className="h-3 w-3" /> Score &ge; {filters.engagementMin as number}
                </span>
              )}
              {typeof filters.createdAfter === "string" && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Calendar className="h-3 w-3" /> Apres {new Date(filters.createdAfter).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Contacts table */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
          {contacts.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Nom</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Statut</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Score</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">
                      <Link href={`/dashboard/contacts/${c.id}`} className="text-zinc-900 dark:text-zinc-100 hover:text-orange-500 transition-colors">
                        {c.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-3">
                      {c.subscribed ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Abonne</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">Desabonne</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-zinc-500">{c.engagementScore}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{c.createdAt.toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-sm text-zinc-500">
              Aucun contact ne correspond a ces criteres.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
