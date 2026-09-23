"use client";

import { useState, useTransition, type ReactNode } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_KEY_NAME_MAX_LENGTH } from "@/lib/mailpulse/api-key-name";

export type CreateKeyResult = { key?: string; error?: string };

/**
 * Creation form shared by every kind of integration key. The name comes first:
 * once the dialog closes, the secret is gone and the name is all that tells two
 * keys apart. Screens add their own fields (environment, sender) as children.
 */
export function CreateKeyDialog({
  title,
  description,
  triggerLabel,
  namePlaceholder,
  disabled,
  disabledReason,
  children,
  onCreate,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  namePlaceholder: string;
  disabled?: boolean;
  disabledReason?: string;
  children?: ReactNode;
  onCreate: (data: FormData) => Promise<CreateKeyResult>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(data: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await onCreate(data);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" disabled={disabled} title={disabled ? disabledReason : undefined}>
          <KeyRound aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="key-name">Nom de la clé</Label>
            <Input
              id="key-name"
              name="name"
              required
              autoFocus
              maxLength={API_KEY_NAME_MAX_LENGTH}
              placeholder={namePlaceholder}
              aria-invalid={error ? true : undefined}
              aria-describedby="key-name-hint"
            />
            <p id="key-name-hint" className="text-xs text-muted-foreground">
              L&apos;application ou le site qui l&apos;utilisera. Vous pourrez le changer plus tard.
            </p>
          </div>
          {children}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Annuler</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Créer la clé
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
