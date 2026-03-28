"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  Share2,
  Users,
  MessageSquare,
  Search,
  Mail,
  Zap,
  Megaphone,
  Bell,
  Target,
  UserPlus,
  MoreHorizontal,
  Plus,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Send,
  AtSign,
  Reply,
} from "lucide-react";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingData {
  // Step 1
  organizationName: string;
  website: string;
  socialProfile: string;
  subscriberRange: string;
  usageDescription: string;
  // Step 2
  discoverySource: string;
  goals: string[];
  // Step 3
  domainName: string;
  // Step 4
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
}

const INITIAL_DATA: OnboardingData = {
  organizationName: "",
  website: "https://",
  socialProfile: "",
  subscriberRange: "",
  usageDescription: "",
  discoverySource: "",
  goals: [],
  domainName: "",
  senderName: "",
  senderEmail: "",
  replyToEmail: "",
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Details", title: "Parlez-nous de votre entreprise" },
  { label: "Besoins", title: "Parlez-nous de vos besoins" },
  { label: "Domaine", title: "Configurez votre domaine d'envoi" },
  { label: "Expediteur", title: "Configurez votre expediteur" },
  { label: "Termine", title: "Vous etes pret !" },
];

const SUBSCRIBER_OPTIONS = [
  { value: "<1000", label: "Moins de 1 000" },
  { value: "1000-10000", label: "1 000 - 10 000" },
  { value: "10000-250000", label: "10 000 - 250 000" },
  { value: ">250000", label: "Plus de 250 000" },
];

const DISCOVERY_SOURCES = [
  "Twitter",
  "YouTube",
  "Google",
  "Ami",
  "LinkedIn",
  "Product Hunt",
  "Autre",
];

const GOAL_OPTIONS = [
  { value: "newsletters", label: "Envoyer des newsletters", icon: Mail },
  { value: "automations", label: "Automatiser les emails", icon: Zap },
  { value: "marketing", label: "Marketing", icon: Megaphone },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "lead-generation", label: "Lead generation", icon: Target },
  { value: "user-onboarding", label: "User onboarding", icon: UserPlus },
  { value: "autre", label: "Autre", icon: MoreHorizontal },
];

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }, (_, i) => {
        const filled = i < current;
        return (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all duration-500 ${
              filled
                ? "bg-gradient-to-r from-blue-500 to-orange-500"
                : "border border-dashed border-zinc-700 bg-transparent"
            }`}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 - Company details
// ---------------------------------------------------------------------------

function StepDetails({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Organization name */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Building2 size={16} className="text-zinc-500" />
          Nom de l&apos;organisation
        </label>
        <input
          type="text"
          value={data.organizationName}
          onChange={(e) => onChange({ organizationName: e.target.value })}
          placeholder="Acme Inc."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25"
        />
      </div>

      {/* Website */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Globe size={16} className="text-zinc-500" />
          Site web
        </label>
        <input
          type="url"
          value={data.website}
          onChange={(e) => onChange({ website: e.target.value })}
          placeholder="https://example.com"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25"
        />
      </div>

      {/* Social media */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Share2 size={16} className="text-zinc-500" />
          Profil de reseau social
        </label>
        <input
          type="text"
          value={data.socialProfile}
          onChange={(e) => onChange({ socialProfile: e.target.value })}
          placeholder="https://twitter.com/acme"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25"
        />
      </div>

      {/* Subscriber range */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Users size={16} className="text-zinc-500" />
          Combien d&apos;abonnes avez-vous ?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {SUBSCRIBER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ subscriberRange: option.value })}
              className={`rounded-lg border px-4 py-3 text-sm transition ${
                data.subscriberRange === option.value
                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Usage description */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <MessageSquare size={16} className="text-zinc-500" />
          Comment allez-vous utiliser MailPulse ?
        </label>
        <textarea
          value={data.usageDescription}
          onChange={(e) => onChange({ usageDescription: e.target.value })}
          placeholder="Decrivez brievement votre cas d'utilisation..."
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 - Survey / needs
// ---------------------------------------------------------------------------

function StepSurvey({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  function toggleGoal(value: string) {
    const current = data.goals;
    const next = current.includes(value)
      ? current.filter((g) => g !== value)
      : [...current, value];
    onChange({ goals: next });
  }

  return (
    <div className="space-y-8">
      {/* Discovery source */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Search size={16} className="text-zinc-500" />
          Comment avez-vous connu MailPulse ?
        </label>
        <div className="flex flex-wrap gap-2">
          {DISCOVERY_SOURCES.map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => onChange({ discoverySource: source })}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                data.discoverySource === source
                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              {source}
            </button>
          ))}
        </div>
      </div>

      {/* Goals (multi-select) */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Target size={16} className="text-zinc-500" />
          Que souhaitez-vous faire ?
        </label>
        <p className="text-xs text-zinc-500">
          Selectionnez tous les objectifs qui vous correspondent.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {GOAL_OPTIONS.map((goal) => {
            const Icon = goal.icon;
            const selected = data.goals.includes(goal.value);
            return (
              <button
                key={goal.value}
                type="button"
                onClick={() => toggleGoal(goal.value)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                  selected
                    ? "border-orange-500 bg-orange-500/10 text-orange-400"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {goal.label}
                {selected && <Check size={14} className="ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 - Domain
// ---------------------------------------------------------------------------

function StepDomain({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        Ajoutez votre propre domaine pour envoyer des emails depuis votre
        adresse professionnelle, ou utilisez notre domaine de test pour
        commencer rapidement.
      </p>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Globe size={16} className="text-zinc-500" />
          Nom de domaine
        </label>
        <input
          type="text"
          value={data.domainName}
          onChange={(e) => onChange({ domainName: e.target.value })}
          placeholder="exemple.com"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25"
        />
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-orange-500 bg-orange-500/10 px-4 py-3 text-sm font-medium text-orange-400 transition hover:bg-orange-500/20"
      >
        <Plus size={16} />
        Ajouter un domaine
      </button>

      <div className="relative flex items-center gap-4 py-2">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs text-zinc-600">ou</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <button
        type="button"
        onClick={() => onChange({ domainName: "test.mailpulse.app" })}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-300"
      >
        <Send size={16} />
        Utiliser test.mailpulse.app
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 - Sender configuration
// ---------------------------------------------------------------------------

function StepSender({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        Configurez les informations qui apparaitront dans les emails envoyes a
        vos contacts.
      </p>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Users size={16} className="text-zinc-500" />
          Nom de l&apos;expediteur
        </label>
        <input
          type="text"
          value={data.senderName}
          onChange={(e) => onChange({ senderName: e.target.value })}
          placeholder="Equipe Marketing"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <AtSign size={16} className="text-zinc-500" />
          Adresse email
        </label>
        <input
          type="email"
          value={data.senderEmail}
          onChange={(e) => onChange({ senderEmail: e.target.value })}
          placeholder="newsletter@exemple.com"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Reply size={16} className="text-zinc-500" />
          Adresse de reponse
          <span className="text-xs text-zinc-600">(optionnel)</span>
        </label>
        <input
          type="email"
          value={data.replyToEmail}
          onChange={(e) => onChange({ replyToEmail: e.target.value })}
          placeholder="support@exemple.com"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 - Complete
// ---------------------------------------------------------------------------

function StepComplete() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {/* Success animation */}
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping rounded-full bg-orange-500/20" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-orange-500">
          <Check size={40} className="text-white" strokeWidth={3} />
        </div>
      </div>

      <h2 className="mb-3 text-2xl font-semibold text-zinc-100">
        Felicitations !
      </h2>
      <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
        Votre compte MailPulse est configure. Vous pouvez maintenant creer votre
        premiere campagne, importer vos contacts, ou explorer le tableau de
        bord.
      </p>

      <div className="mt-8 flex items-center gap-2 text-xs text-zinc-600">
        <Sparkles size={14} />
        Pret a envoyer vos premiers emails
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Onboarding Page
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);

  function handleChange(patch: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleContinue() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Final step — redirect to dashboard
      // TODO: persist onboarding data via API call
      router.push("/dashboard");
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-lg">
        <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Onboarding" }]} />
        {/* Logo / Brand */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-orange-500">
            <Mail size={16} className="text-white" />
          </div>
          <span className="text-lg font-semibold text-zinc-100">
            MailPulse
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <ProgressBar current={step + 1} total={STEPS.length} />
          <p className="mt-3 text-center text-xs text-zinc-500">
            Etape {step + 1} sur {STEPS.length} &mdash; {STEPS[step].label}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8">
          {/* Step title */}
          {step < STEPS.length - 1 && (
            <h1 className="mb-6 text-xl font-semibold text-zinc-100">
              {STEPS[step].title}
            </h1>
          )}

          {/* Step content */}
          {step === 0 && (
            <StepDetails data={data} onChange={handleChange} />
          )}
          {step === 1 && (
            <StepSurvey data={data} onChange={handleChange} />
          )}
          {step === 2 && (
            <StepDomain data={data} onChange={handleChange} />
          )}
          {step === 3 && (
            <StepSender data={data} onChange={handleChange} />
          )}
          {step === 4 && <StepComplete />}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            {step > 0 && !isLastStep ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-300"
              >
                <ArrowLeft size={16} />
                Retour
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleContinue}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition ${
                isLastStep
                  ? "w-full justify-center bg-gradient-to-r from-blue-500 to-orange-500 text-white hover:from-blue-600 hover:to-orange-600"
                  : "ml-auto bg-orange-500 text-white hover:bg-orange-600"
              }`}
            >
              {isLastStep ? (
                <>
                  Acceder au dashboard
                  <ArrowRight size={16} />
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Skip link */}
        {!isLastStep && (
          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-xs text-zinc-600 underline-offset-4 transition hover:text-zinc-400 hover:underline"
            >
              Passer cette etape
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
