"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FormDialogSubmit {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
}

/**
 * Creation/edition dialog shared by the dashboard list screens: a title, the
 * form fields, the server error and a harmonised "Annuler" / submit footer.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  action,
  error,
  pending,
  submit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  action: (formData: FormData) => void | Promise<void>;
  error?: string | null;
  pending: boolean;
  submit: FormDialogSubmit;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {children}
          {error ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || submit.disabled}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  {submit.pendingLabel}
                </>
              ) : (
                submit.label
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
