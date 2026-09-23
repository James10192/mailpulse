"use client";

import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/**
 * Confirmation before an action. Built on the shadcn AlertDialog: focus stays in
 * the dialog, Escape cancels, and screen readers announce it as an alert.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader className="flex-row items-start gap-3 text-left">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              destructive ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            )}
            aria-hidden="true"
          >
            <AlertTriangle className="size-5" />
          </span>
          <div className="grid gap-1">
            <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel ?? "Annuler"}</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-red-600 text-white hover:bg-red-500" : undefined}
            onClick={onConfirm}
          >
            {confirmLabel ?? "Confirmer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
