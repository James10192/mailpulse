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
  UserPlus,
  Mail,
  BarChart3,
  Zap,
  ChevronDown,
  Clock,
  User,
  Phone,
  Globe,
  Tag,
  Search,
  Filter,
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
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PhoneNumberInput } from "@/components/dashboard/phone-number-input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  availableTags: string[];
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
  SUBSCRIBED: { icon: UserPlus, label: "Abonne", color: "text-emerald-500" },
  SENT: { icon: Send, label: "Email envoye", color: "text-blue-400" },
  DELIVERED: { icon: CheckCircle, label: "Email delivre", color: "text-emerald-400" },
  OPENED: { icon: Eye, label: "Email ouvert", color: "text-sky-400" },
  CLICKED: { icon: MousePointerClick, label: "Email clique", color: "text-orange-400" },
  BOUNCED_SOFT: { icon: AlertTriangle, label: "Bounce soft", color: "text-amber-400" },
  BOUNCED_HARD: { icon: AlertTriangle, label: "Bounce hard", color: "text-red-400" },
  COMPLAINED: { icon: AlertOctagon, label: "Spam", color: "text-red-500" },
  UNSUBSCRIBED: { icon: UserMinus, label: "Desabonne", color: "text-zinc-400" },
  TAG_ADDED: { icon: Tag, label: "Tag ajoute", color: "text-purple-400" },
  TAG_REMOVED: { icon: Tag, label: "Tag retire", color: "text-zinc-400" },
  WORKFLOW_STARTED: { icon: Zap, label: "Automation demarree", color: "text-orange-500" },
  WORKFLOW_COMPLETED: { icon: CheckCircle, label: "Automation terminee", color: "text-emerald-500" },
};

const EVENT_FILTER_OPTIONS = Object.entries(EVENT_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

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

export function ContactDetail({ contact, stats, activeAutomations, customFields, availableTags }: ContactDetailProps) {
  const [isPending, startTransition] = useTransition();
  const [showUnsubConfirm, setShowUnsubConfirm] = useState(false);
  const [automationDropdown, setAutomationDropdown] = useState(false);

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
  const [eventFilter, setEventFilter] = useState<string>("ALL");
  const [eventFilterOpen, setEventFilterOpen] = useState(false);
  const [eventSearch, setEventSearch] = useState("");

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
    const referenceTime = Math.max(
      new Date(contact.updatedAt).getTime(),
      ...contact.campaignRecipients
        .map((r) => (r.sentAt ? new Date(r.sentAt).getTime() : 0))
        .filter((time) => Number.isFinite(time))
    );
    const thirtyDaysAgo = referenceTime - 30 * 24 * 60 * 60 * 1000;
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
  }, [contact.campaignRecipients, contact.updatedAt]);

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
        toast.success("Automation déclenchée");
      } else {
        toast.error(result?.error ?? "Erreur");
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
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-zinc-800 text-lg font-semibold text-zinc-300">
              {contact.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {contact.email}
            </h1>
            <Badge
              variant={contact.subscribed ? "success" : "destructive"}
              className={`mt-1 px-2.5 text-xs ${
                contact.subscribed ? "border-emerald-500/20" : "border-red-500/20"
              }`}
            >
              {contact.subscribed ? "ABONNÉ" : "DÉSABONNÉ"}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowUnsubConfirm(true)}
          disabled={isPending}
          className={
            contact.subscribed
              ? "bg-red-600/10 text-red-500 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2)] hover:bg-red-600/20 hover:shadow-[inset_0_0_0_1px_rgba(239,68,68,0.3)] dark:bg-red-600/10 dark:text-red-400 dark:hover:bg-red-600/20"
              : "bg-emerald-600/10 text-emerald-600 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)] hover:bg-emerald-600/20 hover:shadow-[inset_0_0_0_1px_rgba(16,185,129,0.3)] dark:bg-emerald-600/10 dark:text-emerald-400 dark:hover:bg-emerald-600/20"
          }
        >
          {contact.subscribed ? "Désabonner" : "Réabonner"}
        </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                className="h-7 px-2 text-orange-500 hover:text-orange-400 dark:text-orange-500 dark:hover:text-orange-400"
              >
                Modifier
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  className="h-7 px-2 text-zinc-500"
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-7 px-3"
                >
                  {saving ? "..." : "Enregistrer"}
                </Button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="contact-email" className="text-xs font-normal text-zinc-500 dark:text-zinc-500">Email</Label>
                <Input id="contact-email" disabled value={contact.email} className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="contact-first-name" className="text-xs font-normal text-zinc-500 dark:text-zinc-500">Prénom</Label>
                  <Input id="contact-first-name" value={editData.firstName} onChange={(e) => setEditData({ ...editData, firstName: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contact-last-name" className="text-xs font-normal text-zinc-500 dark:text-zinc-500">Nom</Label>
                  <Input id="contact-last-name" value={editData.lastName} onChange={(e) => setEditData({ ...editData, lastName: e.target.value })} className="h-10" />
                </div>
              </div>
              <PhoneNumberInput
                id="contact-phone"
                label="Téléphone"
                value={editData.phone}
                onChange={(phone) => setEditData({ ...editData, phone })}
              />
              {customFields.length > 0 && (
                <>
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-2">Champs personnalisés</p>
                  </div>
                  {customFields.map((f) => (
                    <div key={f.id} className="space-y-1">
                      <Label htmlFor={`custom-field-${f.id}`} className="text-xs font-normal text-zinc-500 dark:text-zinc-500">{f.label}</Label>
                      <Input
                        id={`custom-field-${f.id}`}
                        value={customFieldValues[f.name] || ""}
                        onChange={(e) => setCustomFieldValues({ ...customFieldValues, [f.name]: e.target.value })}
                        type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "url" ? "url" : f.type === "date" ? "date" : "text"}
                        className="h-10"
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
                <InfoRow icon={Phone} label="Téléphone" value={contact.phone ?? "—"} />
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
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="gap-1 px-2.5 py-1 text-xs"
                  style={{ borderColor: tag.color + "40", backgroundColor: tag.color + "15", color: tag.color }}
                >
                  {tag.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTag(tag.id)}
                    aria-label={`Retirer le tag ${tag.name}`}
                    className="h-auto w-auto p-0 text-xs leading-none text-current hover:bg-transparent hover:text-current hover:opacity-60 dark:hover:bg-transparent dark:hover:text-current"
                  >
                    ×
                  </Button>
                </Badge>
              ))}
              <div className="relative">
                <Input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Ajouter un tag..."
                  aria-label="Ajouter un tag"
                  className="h-7 w-40 border border-dashed border-zinc-300 bg-transparent px-2 py-1 text-xs shadow-none placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-transparent dark:shadow-none"
                />
                {newTag && (
                  <div className="absolute left-0 top-full mt-1 z-10 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg py-1 max-h-40 overflow-y-auto">
                    {availableTags
                      .filter((t) => t.toLowerCase().includes(newTag.toLowerCase()) && !contact.tags.some((ct) => ct.name === t))
                      .map((t) => (
                        <Button
                          key={t}
                          variant="ghost"
                          onClick={() => { setNewTag(""); addTagToContact(contact.id, t); }}
                          className="h-auto w-full justify-start rounded-none px-3 py-1.5 text-xs font-normal"
                        >
                          {t}
                        </Button>
                      ))}
                    {!availableTags.some((t) => t.toLowerCase() === newTag.toLowerCase()) && (
                      <Button
                        variant="ghost"
                        onClick={handleAddTag}
                        disabled={addingTag}
                        className="h-auto w-full justify-start rounded-none px-3 py-1.5 text-xs font-normal text-orange-500 hover:bg-orange-500/5 hover:text-orange-500 dark:text-orange-500 dark:hover:bg-orange-500/5 dark:hover:text-orange-500"
                      >
                        + Créer &quot;{newTag}&quot;
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <InfoRow icon={Clock} label="Créé le" value={formatDate(contact.createdAt)} />
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
            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                <Zap className="h-4 w-4" />
                Aucune automation active
              </div>
              <Link
                href="/dashboard/automations"
                className="text-xs text-orange-500 hover:text-orange-400"
              >
                Aller aux automations pour en créer une.
              </Link>
            </div>
          )}

          {/* Trigger automation dropdown */}
          <DropdownMenu
            open={automationDropdown && activeAutomations.length > 0}
            onOpenChange={setAutomationDropdown}
          >
            <DropdownMenuTrigger asChild>
              <Button
                disabled={activeAutomations.length === 0 || isPending}
                className="w-full"
              >
                <Zap className="h-4 w-4" />
                Déclencher une automation
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="max-h-48 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
            >
              {activeAutomations.map((auto) => (
                <DropdownMenuItem
                  key={auto.id}
                  onSelect={() => handleTriggerAutomation(auto.id)}
                  className="cursor-pointer text-zinc-600 focus:bg-orange-500/5 focus:text-orange-500 dark:text-zinc-300 dark:focus:bg-orange-500/5 dark:focus:text-orange-400"
                >
                  {auto.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Activité
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Rechercher..."
                aria-label="Rechercher dans l'activité"
                className="h-8 w-36 pl-8 pr-3 text-xs"
              />
            </div>
            <DropdownMenu open={eventFilterOpen} onOpenChange={setEventFilterOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 font-normal">
                  <Filter className="h-3.5 w-3.5" />
                  {eventFilter === "ALL" ? "Tous les types" : EVENT_CONFIG[eventFilter]?.label ?? eventFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 w-56 overflow-y-auto">
                <DropdownMenuRadioGroup value={eventFilter} onValueChange={setEventFilter}>
                  <DropdownMenuRadioItem value="ALL" className="text-xs">
                    Tous les types
                  </DropdownMenuRadioItem>
                  <DropdownMenuSeparator />
                  {EVENT_FILTER_OPTIONS.map((opt) => (
                    <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {(() => {
          // Build timeline: real events + "Subscribed" pseudo-event from createdAt
          const allEvents = [
            ...contact.emailEvents,
            { id: "subscribed-event", type: "SUBSCRIBED", metadata: null, createdAt: contact.createdAt },
          ]
            .filter((e) => eventFilter === "ALL" || e.type === eventFilter)
            .filter((e) => {
              if (!eventSearch) return true;
              const cfg = EVENT_CONFIG[e.type];
              return cfg?.label.toLowerCase().includes(eventSearch.toLowerCase());
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          return allEvents.length > 0 ? (
            <div className="space-y-1">
              {allEvents.map((event) => {
                const config = EVENT_CONFIG[event.type] ?? {
                  icon: Mail,
                  label: event.type,
                  color: "text-zinc-400",
                };
                const Icon = config.icon;
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
              Aucun événement {eventFilter !== "ALL" ? "de ce type" : ""}
            </div>
          );
        })()}
      </div>

      {/* Confirm dialog for subscription toggle */}
      <ConfirmDialog
        open={showUnsubConfirm}
        title={contact.subscribed ? "Désabonner ce contact" : "Réabonner ce contact"}
        message={
          contact.subscribed
            ? "Ce contact ne recevra plus vos campagnes email."
            : "Ce contact sera de nouveau éligible pour recevoir vos campagnes."
        }
        confirmLabel={contact.subscribed ? "Désabonner" : "Réabonner"}
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
