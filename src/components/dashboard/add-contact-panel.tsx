"use client";

import { useActionState, useRef, useState } from "react";
import { X, UserPlus, Loader2, Plus, Tag } from "lucide-react";
import { createContact } from "@/app/(dashboard)/dashboard/contacts/actions";
import { PhoneNumberInput } from "@/components/dashboard/phone-number-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { ActionState } from "@/types/action-state";

export function AddContactPanel({
  open,
  onClose,
  availableTags = [],
}: {
  open: boolean;
  onClose: () => void;
  availableTags?: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createContact(prev, formData);
      if (result?.success) {
        formRef.current?.reset();
        setSelectedTags([]);
        setShowSuccess(true);
        window.setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 1500);
      }
      return result;
    },
    null
  );

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function addNewTag() {
    const trimmed = newTag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setNewTag("");
    setShowTagInput(false);
  }

  function handleSubmit(formData: FormData) {
    formData.set("tags", selectedTags.join(","));
    formAction(formData);
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 p-0 shadow-2xl sm:max-w-md"
      >
        <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-orange-500" />
            <SheetTitle className="text-base text-zinc-900 dark:text-zinc-100">Nouveau contact</SheetTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fermer"
            className="h-8 w-8 text-zinc-400"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SheetDescription className="sr-only">
          Ajouter un contact à votre liste.
        </SheetDescription>

        <form ref={formRef} action={handleSubmit} className="p-6 space-y-4 overflow-y-auto h-[calc(100%-3.5rem)]">
          {showSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-sm text-emerald-700 dark:text-emerald-400">
              Contact ajouté avec succès !
            </div>
          )}

          {state?.error && !showSuccess && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-700 dark:text-red-400">
              {state.error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="contact@exemple.com"
            />
            {state?.fieldErrors?.email && (
              <p className="mt-1 text-xs text-red-500">{state.fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" name="firstName" type="text" placeholder="Jean" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" name="lastName" type="text" placeholder="Dupont" />
            </div>
          </div>

          <PhoneNumberInput id="phone" name="phone" label="Téléphone" />

          {/* Tags multi-select */}
          <div>
            <Label className="mb-1.5 block">Tags</Label>

            {/* Selected tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    className="gap-1 rounded-lg border-orange-500/20 px-2 py-1 text-xs"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleTag(tag)}
                      aria-label={`Retirer le tag ${tag}`}
                      className="ml-0.5 h-3.5 w-3.5 rounded-sm p-0 text-current hover:bg-transparent hover:text-orange-700 dark:hover:bg-transparent dark:hover:text-orange-200 [&_svg]:size-3"
                    >
                      <X />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Available tags to select */}
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {availableTags
                  .filter((t) => !selectedTags.includes(t))
                  .map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleTag(tag)}
                      className="h-7 px-2 text-xs font-normal text-zinc-500 dark:text-zinc-400"
                    >
                      + {tag}
                    </Button>
                  ))}
              </div>
            )}

            {/* Create new tag inline */}
            {showTagInput ? (
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addNewTag(); }
                    if (e.key === "Escape") setShowTagInput(false);
                  }}
                  autoFocus
                  aria-label="Nom du tag"
                  className="h-9 flex-1"
                  placeholder="Nom du tag..."
                />
                <Button type="button" size="sm" onClick={addNewTag}>
                  Ajouter
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTagInput(false)}
                  aria-label="Annuler la création du tag"
                  className="h-9 w-9 text-zinc-400"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="link"
                onClick={() => setShowTagInput(true)}
                className="h-auto gap-1 p-0 text-xs no-underline hover:no-underline hover:text-orange-400"
              >
                <Plus className="h-3 w-3" />
                Créer un tag
              </Button>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ajout...
                </>
              ) : (
                "Ajouter le contact"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
