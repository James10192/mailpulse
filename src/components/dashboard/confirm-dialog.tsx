"use client";

import { AlertTriangle, X } from "lucide-react";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            destructive ? "bg-red-500/10" : "bg-amber-500/10"
          }`}>
            <AlertTriangle className={`h-5 w-5 ${destructive ? "text-red-500" : "text-amber-500"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
            <p className="text-sm text-zinc-500 mt-1">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer rounded-lg"
          >
            {cancelLabel ?? "Annuler"}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              destructive
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-orange-600 hover:bg-orange-500 text-white"
            }`}
          >
            {confirmLabel ?? "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
