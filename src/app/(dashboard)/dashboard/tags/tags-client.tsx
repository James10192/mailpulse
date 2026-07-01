"use client";

import { useActionState, useState, useMemo } from "react";
import { Plus, Tag, Trash2, X, Info, Search, ArrowUpDown, Users } from "lucide-react";
import { createTag, deleteTag } from "./actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import type { ActionState } from "@/types/action-state";

type TagData = { name: string; count: number };

type SortKey = "name-asc" | "name-desc" | "count-desc" | "count-asc";

export function TagsClient({ tags }: { tags: TagData[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name-asc");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createTag(prev, formData);
      if (result?.success) setOpen(false);
      return result;
    },
    null
  );

  const filtered = useMemo(() => {
    let result = tags;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q));
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name, "fr");
        case "name-desc":
          return b.name.localeCompare(a.name, "fr");
        case "count-desc":
          return b.count - a.count;
        case "count-asc":
          return a.count - b.count;
        default:
          return 0;
      }
    });

    return result;
  }, [tags, search, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Tags
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gerez vos tags pour organiser vos contacts
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Creer un tag
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300/80">
          Les tags categorisent vos contacts. Ajoutez des tags lors de la creation de contacts ou via les pages de capture pour faciliter le ciblage.
        </p>
      </div>

      {/* Search and sort controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un tag..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="pl-9 pr-8 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
          >
            <option value="name-asc">Nom A-Z</option>
            <option value="name-desc">Nom Z-A</option>
            <option value="count-desc">Plus de contacts</option>
            <option value="count-asc">Moins de contacts</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
        {filtered.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Nom du tag
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Contacts
                </th>
                <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filtered.map((tag) => (
                <TagRow key={tag.name} tag={tag} />
              ))}
            </tbody>
          </table>
        ) : tags.length > 0 && filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              Aucun tag ne correspond a votre recherche.
            </p>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Tag className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm mb-2">
              Aucun tag pour le moment.
            </p>
            <p className="text-zinc-400 text-xs">
              Creez un tag ou ajoutez des tags lors de la creation de contacts.
            </p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Nouveau tag
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form action={formAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom
                </label>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="ex: VIP, Newsletter..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Couleur
                </label>
                <input
                  name="color"
                  type="color"
                  defaultValue="#f97316"
                  className="h-10 w-16 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                />
              </div>
              {state?.error && (
                <p className="text-sm text-red-500">{state.error}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium disabled:opacity-50 cursor-pointer"
                >
                  {pending ? "Creation..." : "Creer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TagRow({ tag }: { tag: TagData }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDelete() {
    setConfirmOpen(false);
    setDeleting(true);
    try {
      const result = await deleteTag(tag.name);
      if (result?.error) {
        setErrorMsg(result.error);
        setErrorOpen(true);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {tag.name}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500">
            <Users className="h-3.5 w-3.5" />
            <span className="text-sm font-semibold font-mono">{tag.count}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-400 disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "..." : "Supprimer"}
          </button>
        </td>
      </tr>
      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer le tag"
        message={`Etes-vous sur de vouloir supprimer le tag "${tag.name}" ? Cette action est irreversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        destructive
      />
      <ConfirmDialog
        open={errorOpen}
        title="Erreur"
        message={errorMsg}
        confirmLabel="OK"
        onConfirm={() => setErrorOpen(false)}
        onCancel={() => setErrorOpen(false)}
      />
    </>
  );
}
