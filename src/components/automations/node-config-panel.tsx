"use client";

import { X, Trash2 } from "lucide-react";
import type { Node } from "@xyflow/react";
import type {
  WorkflowNodeData,
  SendEmailConfig,
  TagConfig,
  WaitConfig,
  ConditionConfig,
  WebhookConfig,
  TriggerConfig,
} from "./workflow-types";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function NodeConfigPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
}: {
  node: Node & { data: WorkflowNodeData };
  onUpdate: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}) {
  const { data } = node;

  function updateConfig(partial: Record<string, unknown>) {
    onUpdate(node.id, {
      ...data,
      config: { ...data.config, ...partial },
    });
  }

  return (
    <div className="absolute top-0 right-0 h-full w-80 border-l border-zinc-800 bg-zinc-900/95 backdrop-blur-xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-medium text-zinc-100">{data.label}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Config form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <div>
          <FieldLabel>Nom du noeud</FieldLabel>
          <Input
            value={data.label}
            onChange={(v) => onUpdate(node.id, { ...data, label: v })}
            placeholder="Nom..."
          />
        </div>

        {/* Type-specific config */}
        {data.type === "trigger" && (
          <TriggerConfigForm
            config={data.config as TriggerConfig}
            onChange={updateConfig}
          />
        )}
        {data.type === "send_email" && (
          <SendEmailConfigForm
            config={data.config as SendEmailConfig}
            onChange={updateConfig}
          />
        )}
        {(data.type === "add_tag" || data.type === "remove_tag") && (
          <TagConfigForm
            config={data.config as TagConfig}
            onChange={updateConfig}
          />
        )}
        {data.type === "wait" && (
          <WaitConfigForm
            config={data.config as WaitConfig}
            onChange={updateConfig}
          />
        )}
        {data.type === "condition" && (
          <ConditionConfigForm
            config={data.config as ConditionConfig}
            onChange={updateConfig}
          />
        )}
        {data.type === "webhook" && (
          <WebhookConfigForm
            config={data.config as WebhookConfig}
            onChange={updateConfig}
          />
        )}
      </div>

      {/* Delete button */}
      {data.type !== "trigger" && (
        <div className="p-4 border-t border-zinc-800 shrink-0">
          <button
            onClick={() => {
              onDelete(node.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer ce noeud
          </button>
        </div>
      )}
    </div>
  );
}

function TriggerConfigForm({ config, onChange }: { config: TriggerConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Type de declencheur</FieldLabel>
        <Select
          value={config.triggerType ?? "SUBSCRIBER_ADDED"}
          onChange={(v) => onChange({ triggerType: v })}
          options={[
            { value: "SUBSCRIBER_ADDED", label: "Nouvel abonne" },
            { value: "TAG_ADDED", label: "Tag ajoute" },
            { value: "CAMPAIGN_OPENED", label: "Campagne ouverte" },
            { value: "LINK_CLICKED", label: "Lien clique" },
            { value: "DATE_BASED", label: "Base sur la date" },
            { value: "CUSTOM_EVENT", label: "Evenement personnalise" },
          ]}
        />
      </div>

      {config.triggerType === "TAG_ADDED" && (
        <div>
          <FieldLabel>Nom du tag</FieldLabel>
          <Input
            value={config.tagName ?? ""}
            onChange={(v) => onChange({ tagName: v })}
            placeholder="ex: VIP"
          />
        </div>
      )}

      {config.triggerType === "CAMPAIGN_OPENED" && (
        <div>
          <FieldLabel>Campagne</FieldLabel>
          <Input
            value={config.campaignName ?? ""}
            onChange={(v) => onChange({ campaignName: v })}
            placeholder="ex: Newsletter Mars 2026"
          />
        </div>
      )}

      {config.triggerType === "LINK_CLICKED" && (
        <div>
          <FieldLabel>URL du lien</FieldLabel>
          <Input
            value={config.linkUrl ?? ""}
            onChange={(v) => onChange({ linkUrl: v })}
            placeholder="https://example.com/offre"
          />
        </div>
      )}

      {config.triggerType === "DATE_BASED" && (
        <>
          <div>
            <FieldLabel>Champ date</FieldLabel>
            <Select
              value={config.dateField ?? "subscribedAt"}
              onChange={(v) => onChange({ dateField: v })}
              options={[
                { value: "subscribedAt", label: "Date d'inscription" },
                { value: "birthday", label: "Anniversaire" },
                { value: "lastActivity", label: "Derniere activite" },
                { value: "custom", label: "Champ personnalise" },
              ]}
            />
          </div>
          <div>
            <FieldLabel>Delai (jours)</FieldLabel>
            <Input
              type="number"
              value={config.offsetDays ?? 0}
              onChange={(v) => onChange({ offsetDays: Number(v) })}
              placeholder="0"
            />
          </div>
        </>
      )}

      {config.triggerType === "CUSTOM_EVENT" && (
        <div>
          <FieldLabel>Nom de l&apos;evenement</FieldLabel>
          <Input
            value={config.eventName ?? ""}
            onChange={(v) => onChange({ eventName: v })}
            placeholder="ex: purchase_completed"
          />
        </div>
      )}
    </div>
  );
}

function SendEmailConfigForm({ config, onChange }: { config: SendEmailConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <div>
        <FieldLabel>Sujet de l&apos;email</FieldLabel>
        <Input
          value={config.subject ?? ""}
          onChange={(v) => onChange({ subject: v })}
          placeholder="Bienvenue chez MailPulse !"
        />
      </div>
      <div>
        <FieldLabel>Nom de l&apos;expediteur</FieldLabel>
        <Input
          value={config.fromName ?? ""}
          onChange={(v) => onChange({ fromName: v })}
          placeholder="MailPulse"
        />
      </div>
      <div>
        <FieldLabel>Email de l&apos;expediteur</FieldLabel>
        <Input
          value={config.fromEmail ?? ""}
          onChange={(v) => onChange({ fromEmail: v })}
          placeholder="hello@votredomaine.com"
        />
      </div>
    </>
  );
}

function TagConfigForm({ config, onChange }: { config: TagConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <div>
      <FieldLabel>Nom du tag</FieldLabel>
      <Input
        value={config.tagName ?? ""}
        onChange={(v) => onChange({ tagName: v })}
        placeholder="ex: onboarded"
      />
    </div>
  );
}

function WaitConfigForm({ config, onChange }: { config: WaitConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <FieldLabel>Duree</FieldLabel>
        <Input
          type="number"
          value={config.duration ?? 1}
          onChange={(v) => onChange({ duration: Number(v) })}
        />
      </div>
      <div className="flex-1">
        <FieldLabel>Unite</FieldLabel>
        <Select
          value={config.unit ?? "days"}
          onChange={(v) => onChange({ unit: v })}
          options={[
            { value: "hours", label: "Heures" },
            { value: "days", label: "Jours" },
            { value: "weeks", label: "Semaines" },
          ]}
        />
      </div>
    </div>
  );
}

function ConditionConfigForm({ config, onChange }: { config: ConditionConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <div>
        <FieldLabel>Champ</FieldLabel>
        <Select
          value={config.field ?? "tags"}
          onChange={(v) => onChange({ field: v })}
          options={[
            { value: "tags", label: "Tags" },
            { value: "engagementScore", label: "Score d'engagement" },
            { value: "subscribed", label: "Est abonne" },
            { value: "email", label: "Email" },
            { value: "firstName", label: "Prenom" },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Operateur</FieldLabel>
        <Select
          value={config.operator ?? "has_tag"}
          onChange={(v) => onChange({ operator: v })}
          options={[
            { value: "has_tag", label: "A le tag" },
            { value: "equals", label: "Egal a" },
            { value: "contains", label: "Contient" },
            { value: "greater_than", label: "Superieur a" },
            { value: "less_than", label: "Inferieur a" },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Valeur</FieldLabel>
        <Input
          value={config.value ?? ""}
          onChange={(v) => onChange({ value: v })}
          placeholder="ex: VIP"
        />
      </div>
    </>
  );
}

function WebhookConfigForm({ config, onChange }: { config: WebhookConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <div>
        <FieldLabel>URL</FieldLabel>
        <Input
          value={config.url ?? ""}
          onChange={(v) => onChange({ url: v })}
          placeholder="https://api.example.com/webhook"
        />
      </div>
      <div>
        <FieldLabel>Methode</FieldLabel>
        <Select
          value={config.method ?? "POST"}
          onChange={(v) => onChange({ method: v })}
          options={[
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
          ]}
        />
      </div>
    </>
  );
}
