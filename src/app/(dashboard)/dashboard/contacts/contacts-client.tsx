"use client";

import { useState } from "react";
import { Plus, Upload, Search, Trash2, Users } from "lucide-react";
import { AddContactPanel } from "@/components/dashboard/add-contact-panel";
import { deleteContact } from "./actions";

interface ContactData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  subscribed: boolean;
  engagementScore: number;
  createdAt: string;
  tags: { id: string; name: string; color: string }[];
}

export function ContactsClient({
  stats,
  contacts,
}: {
  stats: { total: number; subscribed: number; unsubscribed: number };
  contacts: ContactData[];
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = contacts.filter(
    (c) =>
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.firstName?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
      (c.lastName?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce contact ?")) return;
    setDeleting(id);
    await deleteContact(id);
    setDeleting(null);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Contacts
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Gerez vos listes de contacts et segments
            </p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm transition-colors bg-white dark:bg-transparent cursor-pointer">
              <Upload className="h-4 w-4" />
              Importer CSV
            </button>
            <button
              onClick={() => setPanelOpen(true)}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total contacts", value: stats.total },
            { label: "Abonnes", value: stats.subscribed },
            { label: "Desabonnes", value: stats.unsubscribed },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
            >
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {stat.label}
              </div>
              <div className="text-xl font-semibold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
                {stat.value.toLocaleString("fr-FR")}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un contact..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Email
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Nom
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Tags
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                      Score
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Statut
                    </th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filtered.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                        {contact.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                        {contact.firstName} {contact.lastName}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-zinc-500 hidden sm:table-cell">
                        {contact.engagementScore}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            contact.subscribed
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {contact.subscribed ? "Abonne" : "Desabonne"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(contact.id)}
                          disabled={deleting === contact.id}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-4">
                Aucun contact pour le moment.
              </p>
              <button
                onClick={() => setPanelOpen(true)}
                className="text-orange-500 hover:text-orange-400 text-sm font-medium cursor-pointer"
              >
                Ajouter votre premier contact
              </button>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-zinc-500">
              Aucun resultat pour &quot;{search}&quot;
            </div>
          )}
        </div>
      </div>

      <AddContactPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
