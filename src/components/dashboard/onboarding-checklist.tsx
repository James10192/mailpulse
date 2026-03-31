"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, X,
  Users, Send, AtSign, Globe, FileEdit, Zap, Rocket,
} from "lucide-react";

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
    description: "Importez ou creez votre premier abonne",
    href: "/dashboard/contacts",
    icon: Users,
    completionPaths: ["/dashboard/contacts/import"],
  },
  {
    id: "create_sender",
    label: "Configurer un expediteur",
    description: "Definissez l'adresse d'envoi de vos campagnes",
    href: "/dashboard/senders",
    icon: AtSign,
    completionPaths: ["/dashboard/senders"],
  },
  {
    id: "create_snippet",
    label: "Creer un snippet",
    description: "Preparez un bloc de contenu reutilisable",
    href: "/dashboard/snippets",
    icon: FileEdit,
    completionPaths: ["/dashboard/snippets"],
  },
  {
    id: "create_campaign",
    label: "Creer une campagne",
    description: "Redigez votre premier email avec l'editeur riche",
    href: "/dashboard/campaigns/new",
    icon: Send,
    completionPaths: ["/dashboard/campaigns/new"],
  },
  {
    id: "send_campaign",
    label: "Envoyer une campagne",
    description: "Envoyez votre premier email a vos abonnes",
    href: "/dashboard/campaigns",
    icon: Rocket,
    completionPaths: [],
  },
  {
    id: "create_capture",
    label: "Creer une page de capture",
    description: "Collectez des emails avec un formulaire partage",
    href: "/dashboard/capture-pages",
    icon: Globe,
    completionPaths: ["/dashboard/capture-pages"],
  },
  {
    id: "create_automation",
    label: "Creer une automation",
    description: "Automatisez vos emails de bienvenue ou re-engagement",
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
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Load state from localStorage
  useEffect(() => {
    setCompleted(getCompletedTasks());
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
    setMounted(true);
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
      setCompleted(newCompleted);
      saveCompletedTasks(newCompleted);
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
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
            <Rocket className="h-4 w-4 text-orange-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Premiers pas avec MailPulse
            </p>
            <p className="text-xs text-zinc-500">
              {completedCount}/{totalCount} etapes completees
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            title="Masquer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {expanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </div>
      </button>

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tasks */}
      {expanded && (
        <div className="px-4 pb-4 space-y-1">
          {tasks.map((task) => {
            const done = completed.has(task.id);
            const Icon = task.icon;
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  done ? "opacity-60" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="shrink-0 cursor-pointer"
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
                  )}
                </button>
                <Icon className={`h-4 w-4 shrink-0 ${done ? "text-zinc-400" : "text-zinc-500"}`} />
                <div className="flex-1 min-w-0">
                  <Link
                    href={task.href}
                    className={`text-sm block ${
                      done
                        ? "text-zinc-500 line-through"
                        : "text-zinc-900 dark:text-zinc-100 hover:text-orange-500 transition-colors"
                    }`}
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
        </div>
      )}
    </div>
  );
}

/** Button to show the checklist again after dismissal */
export function ShowChecklistButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(DISMISSED_KEY) === "true");
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => {
        localStorage.removeItem(DISMISSED_KEY);
        window.location.reload();
      }}
      className="p-2 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors cursor-pointer"
      title="Guide de demarrage"
    >
      <Rocket className="h-4 w-4" />
    </button>
  );
}
