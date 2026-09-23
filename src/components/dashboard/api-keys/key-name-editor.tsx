"use client";

import { Check, Loader2, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_KEY_NAME_MAX_LENGTH } from "@/lib/mailpulse/api-key-name";

/**
 * A key name that can be renamed in place. Enter saves, Escape cancels. Editing
 * is controlled by the parent so the row menu can open it too.
 */
export function KeyNameEditor({
  name,
  editing,
  onEditingChange,
  onRename,
  disabled,
}: {
  name: string;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onRename: (name: string) => Promise<string | null>;
  disabled?: boolean;
}) {
  if (!editing) {
    return (
      <div className="group/name flex min-w-0 items-center gap-1">
        <span className="truncate font-medium" title={name}>{name}</span>
        {disabled ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground opacity-60 group-hover/name:opacity-100 focus-visible:opacity-100"
            onClick={() => onEditingChange(true)}
            aria-label={`Renommer la clé ${name}`}
          >
            <Pencil aria-hidden="true" />
          </Button>
        )}
      </div>
    );
  }

  return <NameForm name={name} onDone={() => onEditingChange(false)} onRename={onRename} />;
}

/** Mounted only while editing, so the draft always starts from the current name. */
function NameForm({ name, onDone, onRename }: { name: string; onDone: () => void; onRename: (name: string) => Promise<string | null> }) {
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    if (draft.trim() === name) {
      onDone();
      return;
    }
    startTransition(async () => {
      const failure = await onRename(draft);
      if (failure) setError(failure);
      else onDone();
    });
  }

  return (
    <form
      className="grid gap-1"
      onSubmit={(event) => { event.preventDefault(); save(); }}
    >
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onDone(); } }}
          maxLength={API_KEY_NAME_MAX_LENGTH}
          className="h-9 min-w-40"
          aria-label="Nouveau nom de la clé"
          aria-invalid={error ? true : undefined}
          disabled={isPending}
        />
        <Button type="submit" variant="ghost" size="icon" className="size-9 shrink-0" disabled={isPending} aria-label="Enregistrer le nom">
          {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" onClick={onDone} disabled={isPending} aria-label="Annuler le renommage">
          <X aria-hidden="true" />
        </Button>
      </div>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
