"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { createCampaign } from "../actions";
import type { ActionState } from "@/types/action-state";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

export default function NewCampaignPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createCampaign,
    null
  );

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "Campagnes", href: "/dashboard/campaigns" },
          { label: "Nouvelle campagne" },
        ]}
      />

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/campaigns"
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Nouvelle campagne
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Donnez un nom a votre campagne, puis editez le contenu
          </p>
        </div>
      </div>

      <form action={formAction}>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 space-y-4">
          <div>
            <label
              htmlFor="campaign-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Nom de la campagne <span className="text-red-500">*</span>
            </label>
            <input
              id="campaign-name"
              name="name"
              type="text"
              required
              autoFocus
              placeholder="Ex: Newsletter Mars 2026"
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Vous pourrez editer le sujet, le contenu et l&apos;expediteur ensuite.
            </p>
          </div>

          {state?.error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-700 dark:text-red-400">
              {state.error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/dashboard/campaigns"
              className="px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creation...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Creer la campagne
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
