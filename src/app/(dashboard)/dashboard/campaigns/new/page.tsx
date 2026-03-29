"use client";

import { useActionState, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  FileText,
  Mail,
  Eye,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createCampaign } from "../actions";
import type { ActionState } from "@/types/action-state";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

const steps = [
  { id: "info", label: "Informations", icon: FileText },
  { id: "content", label: "Contenu", icon: Mail },
  { id: "preview", label: "Apercu", icon: Eye },
];

export default function NewCampaignPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createCampaign,
    null
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    previewText: "",
    htmlContent: "",
  });

  const hasUnsavedData = formData.name || formData.subject || formData.htmlContent;

  // Warn before leaving with unsaved data (browser close/refresh)
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedData) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedData]);

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
    formAction(fd);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Campagnes", href: "/dashboard/campaigns" }, { label: "Nouvelle campagne" }]} />
      {/* Header */}
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
            Creez et envoyez une campagne email
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                isCurrent
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                  : isCompleted
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <step.icon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          );
        })}
      </div>

      {state?.error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-700 dark:text-red-400">
          {state.error}
        </div>
      )}

      {/* Step content */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6">
        {currentStep === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Nom de la campagne <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                placeholder="Newsletter Mars 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Sujet de l&apos;email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  placeholder="Decouvrez nos nouveautes de mars"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-orange-500 hover:bg-orange-500/10 transition-colors cursor-pointer"
                  title="Generer avec l'IA"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Cliquez sur l&apos;icone pour generer un sujet avec l&apos;IA
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Texte d&apos;apercu
              </label>
              <input
                type="text"
                value={formData.previewText}
                onChange={(e) => updateField("previewText", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                placeholder="Le texte qui apparait apres le sujet dans la boite de reception"
              />
            </div>
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
              L&apos;expediteur sera choisi a l&apos;etape suivante lors de l&apos;envoi. Configurez vos expediteurs dans{" "}
              <Link href="/dashboard/senders" className="text-orange-500 hover:text-orange-400">Envoi → Expediteurs</Link>.
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Contenu HTML de l&apos;email
            </label>
            <textarea
              value={formData.htmlContent}
              onChange={(e) => updateField("htmlContent", e.target.value)}
              rows={16}
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-y"
              placeholder={`<h1>Bonjour {{firstName}},</h1>\n<p>Decouvrez nos nouveautes...</p>\n<a href="https://monsite.com">Voir plus</a>`}
            />
            <p className="text-xs text-zinc-500">
              Utilisez du HTML. Les variables disponibles : {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}
            </p>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                Resume de la campagne
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Nom", value: formData.name || "—" },
                  { label: "Sujet", value: formData.subject || "—" },
                  { label: "Apercu", value: formData.previewText || "—" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">{row.label}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {formData.htmlContent && (
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                  Apercu du contenu
                </h3>
                <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: formData.htmlContent }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-4 py-2.5 rounded-xl text-sm border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 cursor-pointer"
        >
          Precedent
        </button>

        {currentStep < steps.length - 1 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="px-6 py-2.5 rounded-xl text-sm bg-orange-600 hover:bg-orange-500 text-white font-medium transition-colors cursor-pointer"
          >
            Suivant
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={pending || !formData.name || !formData.subject}
            className="px-6 py-2.5 rounded-xl text-sm bg-orange-600 hover:bg-orange-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creation...
              </>
            ) : (
              "Creer et configurer l'envoi"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
