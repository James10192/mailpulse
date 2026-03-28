import { Plus, Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getTags() {
  // Get all unique tag names with subscriber counts
  const tags = await prisma.contactTag.groupBy({
    by: ["name"],
    _count: { id: true },
  });
  return tags.map((t) => ({ name: t.name, count: t._count.id }));
}

export default async function TagsPage() {
  const tags = await getTags();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Tags</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gerez vos tags pour organiser vos contacts
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <Plus className="h-4 w-4" />
          Creer un tag
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
        {tags.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Nom du tag</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Contacts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tags.map((tag) => (
                <tr key={tag.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{tag.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-zinc-500">{tag.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <Tag className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm mb-2">Aucun tag pour le moment.</p>
            <p className="text-zinc-400 text-xs">Creez un tag ou ajoutez des tags lors de la creation de contacts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
