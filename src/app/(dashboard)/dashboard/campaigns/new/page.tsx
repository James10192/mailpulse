"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, MessageCircle, Plus } from "lucide-react";
import { createCampaign } from "../actions";
import type { ActionState } from "@/types/action-state";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";

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
            Donnez un nom à votre campagne, puis éditez le contenu
          </p>
        </div>
      </div>

      <form action={formAction}>
        <Card>
          <CardContent className="p-6 space-y-4">
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
              Vous pourrez éditer le sujet, le contenu et l&apos;expéditeur ensuite.
            </p>
          </div>

          <div>
            <p className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Canal de la campagne
            </p>
            <RadioGroup name="channel" defaultValue="EMAIL" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Label htmlFor="campaign-channel-email" className="flex cursor-pointer items-start gap-3 rounded-xl border border-orange-500/40 bg-orange-500/5 p-3 text-sm">
                <RadioGroupItem id="campaign-channel-email" value="EMAIL" className="mt-1" />
                <span>
                  <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                    <Mail className="h-4 w-4 text-orange-500" />
                    Email
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Sujet, aperçu, expéditeur et tracking email.
                  </span>
                </span>
              </Label>
              <Label htmlFor="campaign-channel-whatsapp" className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-3 text-sm">
                <RadioGroupItem id="campaign-channel-whatsapp" value="WHATSAPP" className="mt-1" />
                <span>
                  <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                    <MessageCircle className="h-4 w-4 text-orange-500" />
                    WhatsApp
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Message envoyé aux contacts avec numéro WhatsApp.
                  </span>
                </span>
              </Label>
            </RadioGroup>
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
            <Button
              type="submit"
              disabled={pending}
              className="gap-2 bg-orange-600 hover:bg-orange-500"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Créer la campagne
                </>
              )}
            </Button>
          </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
