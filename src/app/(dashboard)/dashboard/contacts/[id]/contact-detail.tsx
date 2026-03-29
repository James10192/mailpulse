"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Send,
  CheckCircle,
  Eye,
  MousePointerClick,
  AlertTriangle,
  AlertOctagon,
  UserMinus,
  Mail,
  BarChart3,
  Zap,
  ChevronDown,
  Clock,
  User,
  Phone,
  Globe,
  Tag,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { toggleContactSubscription, triggerAutomation, updateContact, addTagToContact, removeTagFromContact } from "./actions";

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

interface CampaignRecipient {
  id: string;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  campaign: { id: string; name: string; subject: string | null };
}

interface EmailEvent {
  id: string;
  type: string;
  metadata: unknown;
  createdAt: string;
}

interface ContactData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  subscribed: boolean;
  engagementScore: number;
  metadata: unknown;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  tags: { id: string; name: string; color: string }[];
  campaignRecipients: CampaignRecipient[];
  emailEvents: EmailEvent[];
}

interface AutomationData {
  id: string;
  name: string;
  trigger: string;
}

interface CustomFieldData {
  id: string;
  name: string;
  label: string;
  type: string;
}

interface ContactDetailProps {
  contact: ContactData;
  stats: {
    totalEmails: number;
    openRate: number;
    clickRate: number;
    bounced: number;
    spam: number;
  };
  activeAutomations: AutomationData[];
  customFields: CustomFieldData[];
}

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EVENT_CONFIG: Record<string, { icon: typeof Send; label: string; color: string }> = {
  SENT: { icon: Send, label: "Envoye", color: "text-blue-400" },
  DELIVERED: { icon: CheckCircle, label: "Delivre", color: "text-emerald-400" },
  OPENED: { icon: Eye, label: "Ouvert", color: "text-sky-400" },
  CLICKED: { icon: MousePointerClick, label: "Clique", color: "text-orange-400" },
  BOUNCED_SOFT: { icon: AlertTriangle, label: "Bounce soft", color: "text-amber-400" },
  BOUNCED_HARD: { icon: AlertTriangle, label: "Bounce hard", color: "text-red-400" },
  COMPLAINED: { icon: AlertOctagon, label: "Spam", color: "text-red-500" },
  UNSUBSCRIBED: { icon: UserMinus, label: "Desabonne", color: "text-zinc-400" },
};

const TRIGGER_LABELS: Record<string, string> = {
  SUBSCRIBER_ADDED: "Nouvel abonne",
  TAG_ADDED: "Tag ajoute",
  CAMPAIGN_OPENED: "Campagne ouverte",
  LINK_CLICKED: "Lien clique",
  DATE_BASED: "Date",
  CUSTOM_EVENT: "Evenement custom",
};

// ────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────

export function ContactDetail({ contact, stats, activeAutomations, customFields }: ContactDetailProps) {
  const [isPending, startTransition] = useTransition();
  const [showUnsubConfirm, setShowUnsubConfirm] = useState(false);
  const [automationDropdown, setAutomationDropdown] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    phone: contact.phone || "",
  });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(() => {
    const meta = (contact.metadata as Record<string, unknown>) || {};
    const vals: Record<string, string> = {};
    for (const f of customFields) {
      vals[f.name] = String(meta[f.name] ?? "");
    }
    return vals;
  });
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  async function handleSave() {
    setSaving(true);
    const metadata: Record<string, unknown> = { ...((contact.metadata as Record<string, unknown>) || {}) };
    for (const f of customFields) {
      if (customFieldValues[f.name]) metadata[f.name] = customFieldValues[f.name];
      else delete metadata[f.name];
    }
    await updateContact(contact.id, {
      firstName: editData.firstName,
      lastName: editData.lastName,
      phone: editData.phone,
      metadata,
    });
    setSaving(false);
    setEditing(false);
  }

  async function handleAddTag() {
    if (!newTag.trim()) return;
    setAddingTag(true);
    await addTagToContact(contact.id, newTag.trim());
    setNewTag("");
    setAddingTag(false);
  }

  async function handleRemoveTag(tagId: string) {
    await removeTagFromContact(contact.id, tagId);
  }

  // Build chart data from campaign recipients (last 30 days)
  const chartData = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentRecipients = contact.campaignRecipients.filter(
      (r) => r.sentAt && new Date(r.sentAt).getTime() >= thirtyDaysAgo
    );

    if (recentRecipients.length === 0) return [];

    // Group by date
    const byDate = new Map<string, { opens: number; clicks: number }>();
    for (const r of recentRecipients) {
      const dateKey = new Date(r.sentAt!).toISOString().split("T")[0];
      const entry = byDate.get(dateKey) ?? { opens: 0, clicks: 0 };
      if (r.openedAt) entry.opens++;
      if (r.clickedAt) entry.clicks++;
      byDate.set(dateKey, entry);
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        opens: vals.opens,
        clicks: vals.clicks,
      }));
  }, [contact.campaignRecipients]);

  function handleToggleSubscription() {
    setShowUnsubConfirm(false);
    startTransition(async () => {
      await toggleContactSubscription(contact.id);
    });
  }

  function handleTriggerAutomation(automationId: string) {
    setAutomationDropdown(false);
    startTransition(async () => {
      const result = await triggerAutomation(contact.id, automationId);
      if (result?.success) {
        setTriggerResult("Automation declenchee");
        setTimeout(() => setTriggerResult(null), 3000);
      } else {
        setTriggerResult(result?.error ?? "Erreur");
        setTimeout(() => setTriggerResult(null), 3000);
      }
    });
  }

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "—";
  const lastEngaged = contact.emailEvents[0]?.createdAt ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-semibold text-zinc-300">
            {contact.email[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {contact.email}
            </h1>
            <span
              className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                contact.subscribed
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {contact.subscribed ? "ABONNE" : "DESABONNE"}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowUnsubConfirm(true)}
          disabled={isPending}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
            contact.subscribed
              ? "bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600/20"
              : "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/20"
          }`}
        >
          {contact.subscribed ? "Desabonner" : "Reabonner"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Emails", value: stats.totalEmails, icon: Mail },
          { label: "Taux ouverture", value: `${stats.openRate}%`, icon: Eye },
          { label: "Taux clic", value: `${stats.clickRate}%`, icon: MousePointerClick },
          { label: "Bounces", value: stats.bounced, icon: AlertTriangle },
          { label: "Score", value: contact.engagementScore, icon: BarChart3 },
          { label: "Source", value: contact.source ?? "—", icon: Globe },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
          >
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              <stat.icon className="h-3.5 w-3.5" />
              {stat.label}
            </div>
            <div className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Email Performance chart */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Performance email
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 12 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Area
                type="monotone"
                dataKey="opens"
                name="Ouvertures"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorOpens)"
              />
              <Area
                type="monotone"
                dataKey="clicks"
                name="Clics"
                stroke="#f97316"
                fillOpacity={1}
                fill="url(#colorClicks)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-sm text-zinc-500">
            Pas d&apos;emails dans les 30 derniers jours
          </div>
        )}
      </div>

      {/* Two-column: Information + Automations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Information card */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Informations
            </h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-orange-500 hover:text-orange-400 cursor-pointer"
              >
                Modifier
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer">
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs text-orange-500 hover:text-orange-400 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "..." : "Enregistrer"}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Email</label>
                <input disabled value={contact.email} className="w-full px-3 py-2 bg-zinc-800/30 border border-zinc-700 rounded-lg text-sm text-zinc-400 cursor-not-allowed" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Prenom</label>
                  <input value={editData.firstName} onChange={(e) => setEditData({ ...editData, firstName: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Nom</label>
                  <input value={editData.lastName} onChange={(e) => setEditData({ ...editData, lastName: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Telephone</label>
                <input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
              </div>
              {customFields.length > 0 && (
                <>
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-2">Champs personnalises</p>
                  </div>
                  {customFields.map((f) => (
                    <div key={f.id}>
                      <label className="block text-xs text-zinc-500 mb-1">{f.label}</label>
                      <input
                        value={customFieldValues[f.name] || ""}
                        onChange={(e) => setCustomFieldValues({ ...customFieldValues, [f.name]: e.target.value })}
                        type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "url" ? "url" : f.type === "date" ? "date" : "text"}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Mail} label="Email" value={contact.email} />
                <InfoRow icon={User} label="Nom complet" value={fullName} />
                <InfoRow icon={Phone} label="Telephone" value={contact.phone ?? "—"} />
                <InfoRow icon={Globe} label="Source" value={contact.source ?? "—"} />
              </div>
              {customFields.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  {customFields.map((f) => {
                    const meta = (contact.metadata as Record<string, unknown>) || {};
                    const val = meta[f.name];
                    return <InfoRow key={f.id} icon={Globe} label={f.label} value={val ? String(val) : "—"} />;
                  })}
                </div>
              )}
            </>
          )}

          {/* Tags */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {contact.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border border-zinc-700 bg-zinc-800 text-zinc-300"
                  style={{ borderColor: tag.color + "40", backgroundColor: tag.color + "15", color: tag.color }}
                >
                  {tag.name}
                  <button onClick={() => handleRemoveTag(tag.id)} className="hover:opacity-60 cursor-pointer">×</button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Ajouter..."
                  className="w-24 px-2 py-1 text-xs bg-transparent border border-dashed border-zinc-700 rounded-lg text-zinc-400 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50"
                />
                {newTag && (
                  <button
                    onClick={handleAddTag}
                    disabled={addingTag}
                    className="text-xs text-orange-500 hover:text-orange-400 cursor-pointer disabled:opacity-50"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <InfoRow icon={Clock} label="Cree le" value={formatDate(contact.createdAt)} />
            <InfoRow
              icon={Clock}
              label="Dernier engagement"
              value={lastEngaged ? formatDate(lastEngaged) : "—"}
            />
          </div>
        </div>

        {/* Active Automations card */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Automations actives
          </h2>

          {triggerResult && (
            <div className="text-xs px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {triggerResult}
            </div>
          )}

          {activeAutomations.length > 0 ? (
            <div className="space-y-2">
              {activeAutomations.map((auto) => (
                <Link
                  key={auto.id}
                  href={`/dashboard/automations/${auto.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/30 hover:bg-orange-500/5 transition-colors group"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-orange-400 transition-colors">
                      {auto.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {TRIGGER_LABELS[auto.trigger] ?? auto.trigger}
                    </div>
                  </div>
                  <Zap className="h-4 w-4 text-zinc-500 group-hover:text-orange-400 transition-colors" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-sm text-zinc-500">
              Aucune automation active
            </div>
          )}

          {/* Trigger automation dropdown */}
          <div className="relative">
            <button
              onClick={() => setAutomationDropdown(!automationDropdown)}
              disabled={activeAutomations.length === 0 || isPending}
              className="w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              Declencher une automation
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {automationDropdown && activeAutomations.length > 0 && (
              <div className="absolute z-20 bottom-full mb-1 left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
                {activeAutomations.map((auto) => (
                  <button
                    key={auto.id}
                    onClick={() => handleTriggerAutomation(auto.id)}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-orange-500/5 hover:text-orange-400 transition-colors cursor-pointer"
                  >
                    {auto.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Activite recente
        </h2>
        {contact.emailEvents.length > 0 ? (
          <div className="space-y-1">
            {contact.emailEvents.map((event) => {
              const config = EVENT_CONFIG[event.type] ?? {
                icon: Mail,
                label: event.type,
                color: "text-zinc-400",
              };
              const Icon = config.icon;
              // Try to find campaign name from metadata
              const meta = event.metadata as Record<string, string> | null;
              const campaignName = meta?.campaignName ?? null;

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <div className={`shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-900 dark:text-zinc-100">
                      {config.label}
                    </span>
                    {campaignName && (
                      <span className="text-sm text-zinc-500"> — {campaignName}</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0">
                    {formatDateTime(event.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-20 text-sm text-zinc-500">
            Aucune activite
          </div>
        )}
      </div>

      {/* Confirm dialog for subscription toggle */}
      <ConfirmDialog
        open={showUnsubConfirm}
        title={contact.subscribed ? "Desabonner ce contact" : "Reabonner ce contact"}
        message={
          contact.subscribed
            ? "Ce contact ne recevra plus vos campagnes email."
            : "Ce contact sera de nouveau eligible pour recevoir vos campagnes."
        }
        confirmLabel={contact.subscribed ? "Desabonner" : "Reabonner"}
        cancelLabel="Annuler"
        destructive={contact.subscribed}
        onConfirm={handleToggleSubscription}
        onCancel={() => setShowUnsubConfirm(false)}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm text-zinc-900 dark:text-zinc-100 font-mono">{value}</div>
    </div>
  );
}
