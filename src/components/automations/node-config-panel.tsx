"use client";

import { useId } from "react";
import { X, Trash2 } from "lucide-react";
import type { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  WorkflowNodeData,
  SendEmailConfig,
  TagConfig,
  WaitConfig,
  ConditionConfig,
  WebhookConfig,
  TriggerConfig,
} from "./workflow-types";


function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-zinc-400">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="sm:h-9"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-zinc-400">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        {/* "nokey": React Flow must not treat Backspace/Delete here as a node deletion. */}
        <SelectTrigger id={id} className="nokey h-11 sm:h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="nokey">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
    // The panel sits on the always-dark canvas: the `dark` scope gives every field its dark styles.
    <div className="dark absolute top-0 right-0 h-full w-80 border-l border-zinc-800 bg-zinc-900/95 backdrop-blur-xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-medium text-zinc-100">{data.label}</h3>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="Fermer"
          title="Fermer"
          className="text-zinc-400"
        >
          <X />
        </Button>
      </div>

      {/* Config form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <TextField
          label="Nom du nœud"
          value={data.label}
          onChange={(v) => onUpdate(node.id, { ...data, label: v })}
          placeholder="Nom..."
        />

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
          <Button
            variant="ghost-destructive"
            onClick={() => {
              onDelete(node.id);
              onClose();
            }}
            className="w-full border border-red-500/20"
          >
            <Trash2 />
            Supprimer ce nœud
          </Button>
        </div>
      )}
    </div>
  );
}

function TriggerConfigForm({ config, onChange }: { config: TriggerConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <SelectField
        label="Type de déclencheur"
        value={config.triggerType ?? "SUBSCRIBER_ADDED"}
        onChange={(v) => onChange({ triggerType: v })}
        options={[
          { value: "SUBSCRIBER_ADDED", label: "Nouvel abonné" },
          { value: "TAG_ADDED", label: "Tag ajouté" },
          { value: "CAMPAIGN_OPENED", label: "Campagne ouverte" },
          { value: "LINK_CLICKED", label: "Lien cliqué" },
          { value: "DATE_BASED", label: "Basé sur la date" },
          { value: "CUSTOM_EVENT", label: "Événement personnalisé" },
        ]}
      />

      {config.triggerType === "TAG_ADDED" && (
        <TextField
          label="Nom du tag"
          value={config.tagName ?? ""}
          onChange={(v) => onChange({ tagName: v })}
          placeholder="ex: VIP"
        />
      )}

      {config.triggerType === "CAMPAIGN_OPENED" && (
        <TextField
          label="Campagne"
          value={config.campaignName ?? ""}
          onChange={(v) => onChange({ campaignName: v })}
          placeholder="ex: Newsletter Mars 2026"
        />
      )}

      {config.triggerType === "LINK_CLICKED" && (
        <TextField
          label="URL du lien"
          value={config.linkUrl ?? ""}
          onChange={(v) => onChange({ linkUrl: v })}
          placeholder="https://example.com/offre"
        />
      )}

      {config.triggerType === "DATE_BASED" && (
        <>
          <SelectField
            label="Champ date"
            value={config.dateField ?? "subscribedAt"}
            onChange={(v) => onChange({ dateField: v })}
            options={[
              { value: "subscribedAt", label: "Date d'inscription" },
              { value: "birthday", label: "Anniversaire" },
              { value: "lastActivity", label: "Dernière activité" },
              { value: "custom", label: "Champ personnalisé" },
            ]}
          />
          <TextField
            label="Délai (jours)"
            type="number"
            value={config.offsetDays ?? 0}
            onChange={(v) => onChange({ offsetDays: Number(v) })}
            placeholder="0"
          />
        </>
      )}

      {config.triggerType === "CUSTOM_EVENT" && (
        <TextField
          label="Nom de l'événement"
          value={config.eventName ?? ""}
          onChange={(v) => onChange({ eventName: v })}
          placeholder="ex: purchase_completed"
        />
      )}
    </div>
  );
}

function SendEmailConfigForm({ config, onChange }: { config: SendEmailConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <TextField
        label="Sujet de l'email"
        value={config.subject ?? ""}
        onChange={(v) => onChange({ subject: v })}
        placeholder="Bienvenue chez MailPulse !"
      />
      <TextField
        label="Nom de l'expéditeur"
        value={config.fromName ?? ""}
        onChange={(v) => onChange({ fromName: v })}
        placeholder="MailPulse"
      />
      <TextField
        label="Email de l'expéditeur"
        value={config.fromEmail ?? ""}
        onChange={(v) => onChange({ fromEmail: v })}
        placeholder="hello@votredomaine.com"
      />
    </>
  );
}

function TagConfigForm({ config, onChange }: { config: TagConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <TextField
      label="Nom du tag"
      value={config.tagName ?? ""}
      onChange={(v) => onChange({ tagName: v })}
      placeholder="ex: onboarded"
    />
  );
}

function WaitConfigForm({ config, onChange }: { config: WaitConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <TextField
          label="Durée"
          type="number"
          value={config.duration ?? 1}
          onChange={(v) => onChange({ duration: Number(v) })}
        />
      </div>
      <div className="flex-1">
        <SelectField
          label="Unité"
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
      <SelectField
        label="Champ"
        value={config.field ?? "tags"}
        onChange={(v) => onChange({ field: v })}
        options={[
          { value: "tags", label: "Tags" },
          { value: "engagementScore", label: "Score d'engagement" },
          { value: "subscribed", label: "Est abonné" },
          { value: "email", label: "Email" },
          { value: "firstName", label: "Prénom" },
        ]}
      />
      <SelectField
        label="Opérateur"
        value={config.operator ?? "has_tag"}
        onChange={(v) => onChange({ operator: v })}
        options={[
          { value: "has_tag", label: "A le tag" },
          { value: "equals", label: "Égal à" },
          { value: "contains", label: "Contient" },
          { value: "greater_than", label: "Supérieur à" },
          { value: "less_than", label: "Inférieur à" },
        ]}
      />
      <TextField
        label="Valeur"
        value={config.value ?? ""}
        onChange={(v) => onChange({ value: v })}
        placeholder="ex: VIP"
      />
    </>
  );
}

function WebhookConfigForm({ config, onChange }: { config: WebhookConfig; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <TextField
        label="URL"
        value={config.url ?? ""}
        onChange={(v) => onChange({ url: v })}
        placeholder="https://api.example.com/webhook"
      />
      <SelectField
        label="Méthode"
        value={config.method ?? "POST"}
        onChange={(v) => onChange({ method: v })}
        options={[
          { value: "GET", label: "GET" },
          { value: "POST", label: "POST" },
          { value: "PUT", label: "PUT" },
        ]}
      />
    </>
  );
}
