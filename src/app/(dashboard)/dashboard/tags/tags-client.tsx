"use client";

import { useActionState, useState, useMemo } from "react";
import { Plus, Tag, Trash2, Info, Search, ArrowUpDown, Users } from "lucide-react";
import { createTag, deleteTag } from "./actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
            Gérez vos tags pour organiser vos contacts
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Créer un tag
        </Button>
      </div>

      {/* Info banner */}
      <Alert className="flex items-start gap-3 p-4">
        <Info className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
        <AlertDescription className="text-zinc-600 dark:text-zinc-400">
          Les tags catégorisent vos contacts. Ajoutez des tags lors de la création de contacts ou via les pages de capture pour faciliter le ciblage.
        </AlertDescription>
      </Alert>

      {/* Search and sort controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un tag..."
            aria-label="Rechercher un tag"
            className="h-10 pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="sm:w-52" aria-label="Trier les tags">
            {/* A div, not a span: the trigger line-clamps its direct span children. */}
            <div className="flex min-w-0 items-center gap-2">
              <ArrowUpDown className="h-4 w-4 shrink-0 text-zinc-400" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Nom A-Z</SelectItem>
            <SelectItem value="name-desc">Nom Z-A</SelectItem>
            <SelectItem value="count-desc">Plus de contacts</SelectItem>
            <SelectItem value="count-asc">Moins de contacts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
        {filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                <TableHead className="px-4">Nom du tag</TableHead>
                <TableHead className="px-4">Contacts</TableHead>
                <TableHead className="px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tag) => (
                <TagRow key={tag.name} tag={tag} />
              ))}
            </TableBody>
          </Table>
        ) : tags.length > 0 && filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              Aucun tag ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Tag className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm mb-2">
              Aucun tag pour le moment.
            </p>
            <p className="text-zinc-400 text-xs">
              Créez un tag ou ajoutez des tags lors de la création de contacts.
            </p>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau tag</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tag-name">Nom</Label>
              <Input
                id="tag-name"
                name="name"
                required
                className="h-10"
                placeholder="ex: VIP, Newsletter..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tag-color">Couleur</Label>
              <Input
                id="tag-color"
                name="color"
                type="color"
                defaultValue="#f97316"
                className="h-10 w-16 cursor-pointer p-1"
              />
            </div>
            {state?.error && (
              <p className="text-sm text-red-500">{state.error}</p>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
      <TableRow>
        <TableCell className="px-4">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {tag.name}
            </span>
          </div>
        </TableCell>
        <TableCell className="px-4">
          <Badge className="gap-1.5 px-2.5 py-1 text-orange-500 dark:text-orange-500 [&_svg]:size-3.5">
            <Users />
            <span className="text-sm font-semibold font-mono">{tag.count}</span>
          </Badge>
        </TableCell>
        <TableCell className="px-4 text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            className="h-8 gap-1 text-red-500 hover:bg-red-500/10 hover:text-red-400 dark:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "..." : "Supprimer"}
          </Button>
        </TableCell>
      </TableRow>
      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer le tag"
        message={`Êtes-vous sûr de vouloir supprimer le tag "${tag.name}" ? Cette action est irréversible.`}
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
