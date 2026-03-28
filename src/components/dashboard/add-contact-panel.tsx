"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { createContact, type ContactActionState } from "@/app/(dashboard)/dashboard/contacts/actions";

export function AddContactPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<ContactActionState, FormData>(
    createContact,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setShowSuccess(true);
      formRef.current?.reset();
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);
    }
  }, [state, onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-orange-500" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Nouveau contact</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} action={formAction} className="p-6 space-y-4 overflow-y-auto h-[calc(100%-3.5rem)]">
          {/* Success message */}
          {showSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-sm text-emerald-700 dark:text-emerald-400">
              Contact ajoute avec succes !
            </div>
          )}

          {/* Error message */}
          {state?.error && !showSuccess && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-700 dark:text-red-400">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all"
              placeholder="contact@exemple.com"
            />
            {state?.fieldErrors?.email && (
              <p className="mt-1 text-xs text-red-500">{state.fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Prenom
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all"
                placeholder="Jean"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Nom
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all"
                placeholder="Dupont"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Telephone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all"
              placeholder="+225 07 00 00 00"
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tags
            </label>
            <input
              id="tags"
              name="tags"
              type="text"
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all"
              placeholder="client, vip, newsletter (separes par des virgules)"
            />
            <p className="mt-1 text-xs text-zinc-500">Separez les tags par des virgules</p>
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-sm bg-orange-600 hover:bg-orange-500 text-white font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ajout...
                </>
              ) : (
                "Ajouter le contact"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
