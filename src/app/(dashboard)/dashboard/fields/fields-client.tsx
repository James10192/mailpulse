"use client";

import { useState, useActionState } from "react";
import { Plus, FormInput, Trash2, Info } from "lucide-react";
import { createField, deleteField } from "./actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface FieldData {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  createdAt: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Texte" },
  { value: "number", label: "Nombre" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "date", label: "Date" },
  { value: "select", label: "Liste" },
  { value: "boolean", label: "Oui/Non" },
];

export function FieldsClient({ fields }: { fields: FieldData[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createField(prev, formData);
      if (result?.success) setModalOpen(false);
      return result;
    },
    null
  );

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeleting(id);
    await deleteField(id);
    setDeleting(null);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Champs personnalisés
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Stockez des informations supplémentaires sur vos contacts
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Créer un champ
          </Button>
        </div>

        <Alert className="flex items-start gap-3 p-4">
          <Info className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <AlertDescription className="text-zinc-600 dark:text-zinc-400">
            Les champs personnalisés stockent des données supplémentaires sur vos contacts (entreprise, ville, etc.). Utilisez-les dans vos campagnes avec {"{{nom_du_champ}}"}.
          </AlertDescription>
        </Alert>

        {fields.length > 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                  <TableHead className="px-4">Label</TableHead>
                  <TableHead className="px-4">Nom (variable)</TableHead>
                  <TableHead className="px-4">Type</TableHead>
                  <TableHead className="px-4">Obligatoire</TableHead>
                  <TableHead className="px-4 text-right w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="px-4 text-sm text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <FormInput className="h-4 w-4 text-zinc-400" />
                        {field.label}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-sm font-mono text-zinc-500">
                      {`{{${field.name}}}`}
                    </TableCell>
                    <TableCell className="px-4">
                      <Badge variant="secondary" className="rounded-md text-xs text-zinc-500 dark:text-zinc-400">
                        {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 text-xs text-zinc-500">
                      {field.required ? "Oui" : "Non"}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDeleteId(field.id)}
                        disabled={deleting === field.id}
                        aria-label={`Supprimer le champ ${field.label}`}
                        className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-500 [&_svg]:size-3.5"
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
            <FormInput className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              Aucun champ personnalisé. Créez des champs pour enrichir vos contacts.
            </p>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="mb-2">
            <DialogTitle>Nouveau champ</DialogTitle>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="field-label">Label (affiché) *</Label>
              <Input
                id="field-label"
                name="label"
                type="text"
                required
                placeholder="Nom de l'entreprise"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="field-name">Nom technique (variable) *</Label>
              <Input
                id="field-name"
                name="name"
                type="text"
                required
                placeholder="company_name"
                pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                className="h-10 font-mono"
              />
              <p className="text-xs text-zinc-500 mt-1">Utilisable dans les emails : {"{{company_name}}"}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="field-type">Type</Label>
              <Select name="type" defaultValue={FIELD_TYPES[0].value}>
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="field-required" name="required" value="on" />
              <Label htmlFor="field-required" className="font-normal">Obligatoire</Label>
            </div>

            {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Supprimer ce champ ?"
        message="Les données associées à ce champ sur vos contacts seront perdues."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}
