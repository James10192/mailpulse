"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  X,
  Users, Send, AtSign, Globe, FileEdit, Zap, Rocket,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mailpulse-onboarding";
const DISMISSED_KEY = "mailpulse-onboarding-dismissed";

interface ChecklistTask {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  /** Pages that auto-complete this task when visited */
  completionPaths: string[];
}

const tasks: ChecklistTask[] = [
  {
    id: "add_contact",
    label: "Ajouter un contact",
    description: "Importez ou créez votre premier abonné",
    href: "/dashboard/contacts",
    icon: Users,
    completionPaths: ["/dashboard/contacts/import"],
  },
  {
    id: "create_sender",
    label: "Configurer un expéditeur",
    description: "Définissez l'adresse d'envoi de vos campagnes",
    href: "/dashboard/senders",
    icon: AtSign,
    completionPaths: ["/dashboard/senders"],
  },
  {
    id: "create_snippet",
    label: "Créer un snippet",
    description: "Préparez un bloc de contenu réutilisable",
    href: "/dashboard/snippets",
    icon: FileEdit,
    completionPaths: ["/dashboard/snippets"],
  },
  {
    id: "create_campaign",
    label: "Créer une campagne",
    description: "Rédigez votre premier email avec l'éditeur riche",
    href: "/dashboard/campaigns/new",
    icon: Send,
    completionPaths: ["/dashboard/campaigns/new"],
  },
  {
    id: "send_campaign",
    label: "Envoyer une campagne",
    description: "Envoyez votre premier email à vos abonnés",
    href: "/dashboard/campaigns",
    icon: Rocket,
    completionPaths: [],
  },
  {
    id: "create_capture",
    label: "Créer une page de capture",
    description: "Collectez des emails avec un formulaire partagé",
    href: "/dashboard/capture-pages",
    icon: Globe,
    completionPaths: ["/dashboard/capture-pages"],
  },
  {
    id: "create_automation",
    label: "Créer une automation",
    description: "Automatisez vos emails de bienvenue ou de réengagement",
    href: "/dashboard/automations",
    icon: Zap,
    completionPaths: ["/dashboard/automations"],
  },
];

function getCompletedTasks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveCompletedTasks(completed: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
}

export function OnboardingChecklist() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Load state from localStorage
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCompleted(getCompletedTasks());
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Auto-complete tasks based on page visits
  useEffect(() => {
    if (!mounted) return;
    const newCompleted = new Set(completed);
    let changed = false;

    for (const task of tasks) {
      if (newCompleted.has(task.id)) continue;
      for (const path of task.completionPaths) {
        if (pathname.startsWith(path)) {
          newCompleted.add(task.id);
          changed = true;
        }
      }
    }

    if (changed) {
      saveCompletedTasks(newCompleted);
      window.setTimeout(() => setCompleted(newCompleted), 0);
    }
  }, [pathname, mounted, completed]);

  const toggleTask = useCallback((id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveCompletedTasks(next);
      return next;
    });
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "true");
  }, []);

  if (!mounted || dismissed) return null;

  const completedCount = completed.size;
  const totalCount = tasks.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;

  // Don't show if all tasks completed (auto-dismiss after a delay)
  if (allDone) return null;

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="tasks"
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden"
    >
      <AccordionItem value="tasks">
        {/* Header: the dismiss button is a sibling of the trigger, never inside it. */}
        <div className="flex items-center gap-2 pr-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
          <div className="min-w-0 flex-1">
            <AccordionTrigger className="min-h-11 items-center gap-3 rounded-none p-4 font-normal hover:no-underline focus-visible:ring-inset">
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                  <Rocket className="h-4 w-4 text-orange-500" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Premiers pas avec MailPulse</span>
                  <span className="block text-xs text-zinc-500">{completedCount}/{totalCount} étapes complétées</span>
                </span>
              </span>
            </AccordionTrigger>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleDismiss}
            className="text-zinc-500 dark:text-zinc-400"
            title="Masquer"
            aria-label="Masquer la checklist"
          >
            <X />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-2">
          <Progress
            value={progress}
            aria-label={`Progression : ${progress} %`}
            className="h-1.5 bg-zinc-100 dark:bg-zinc-800"
          />
        </div>

        {/* Tasks */}
        <AccordionContent className="px-4 pb-4 space-y-1">
          {tasks.map((task) => {
            const done = completed.has(task.id);
            const Icon = task.icon;
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg p-2 transition-colors",
                  done ? "opacity-60" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30",
                )}
              >
                <Checkbox
                  checked={done}
                  onCheckedChange={() => toggleTask(task.id)}
                  aria-label={done ? `Marquer « ${task.label} » comme à faire` : `Marquer « ${task.label} » comme fait`}
                  // 20px visual, 44px hit area through the padded ::after.
                  className="relative size-5 rounded-full after:absolute after:-inset-3 after:content-['']"
                />
                <Icon className={cn("h-4 w-4 shrink-0", done ? "text-zinc-400" : "text-zinc-500")} />
                <div className="flex-1 min-w-0">
                  <Link
                    href={task.href}
                    className={cn(
                      "block text-sm",
                      done
                        ? "text-zinc-500 line-through"
                        : "text-zinc-900 transition-colors hover:text-orange-500 dark:text-zinc-100",
                    )}
                  >
                    {task.label}
                  </Link>
                  {!done && (
                    <p className="text-[11px] text-zinc-500 truncate">{task.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** Button to show the checklist again after dismissal */
export function ShowChecklistButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(localStorage.getItem(DISMISSED_KEY) === "true");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => {
        localStorage.removeItem(DISMISSED_KEY);
        window.location.reload();
      }}
      className="text-zinc-400 hover:bg-orange-50 hover:text-orange-500 active:scale-[0.96] dark:hover:bg-orange-500/10"
      title="Guide de démarrage"
      aria-label="Guide de démarrage"
    >
      <Rocket className="h-4 w-4" />
    </Button>
  );
}
