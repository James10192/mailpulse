export type WorkflowNodeType = "trigger" | "send_email" | "add_tag" | "remove_tag" | "wait" | "condition" | "webhook";

export interface TriggerConfig {
  triggerType: string;
  tagName?: string;
  field?: string;
  offsetDays?: number;
}

export interface SendEmailConfig {
  templateId?: string;
  subject?: string;
  fromName?: string;
  fromEmail?: string;
}

export interface TagConfig {
  tagName: string;
}

export interface WaitConfig {
  duration: number;
  unit: "hours" | "days" | "weeks";
}

export interface ConditionConfig {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "has_tag" | "opened_email";
  value: string;
}

export interface WebhookConfig {
  url: string;
  method: "GET" | "POST" | "PUT";
}

export type NodeConfig = TriggerConfig | SendEmailConfig | TagConfig | WaitConfig | ConditionConfig | WebhookConfig;

export interface WorkflowNodeData {
  type: WorkflowNodeType;
  label: string;
  config: NodeConfig;
}

export const NODE_CATALOG = [
  {
    category: "Actions",
    items: [
      { type: "send_email" as const, label: "Envoyer un email", icon: "Mail" },
      { type: "add_tag" as const, label: "Ajouter un tag", icon: "TagIcon" },
      { type: "remove_tag" as const, label: "Retirer un tag", icon: "TagIcon" },
      { type: "webhook" as const, label: "Webhook", icon: "Globe" },
    ],
  },
  {
    category: "Conditions",
    items: [
      { type: "condition" as const, label: "Si / Sinon", icon: "GitBranch" },
    ],
  },
  {
    category: "Timing",
    items: [
      { type: "wait" as const, label: "Attendre", icon: "Clock" },
    ],
  },
];

export function getNodeColor(type: WorkflowNodeType) {
  switch (type) {
    case "trigger":
      return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-500" };
    case "send_email":
      return { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-500" };
    case "add_tag":
    case "remove_tag":
      return { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-500" };
    case "condition":
      return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-500" };
    case "wait":
      return { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", dot: "bg-purple-500" };
    case "webhook":
      return { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", dot: "bg-cyan-500" };
  }
}

export function getNodeLabel(type: WorkflowNodeType) {
  switch (type) {
    case "trigger": return "Declencheur";
    case "send_email": return "Envoyer un email";
    case "add_tag": return "Ajouter un tag";
    case "remove_tag": return "Retirer un tag";
    case "wait": return "Attendre";
    case "condition": return "Condition";
    case "webhook": return "Webhook";
  }
}

export function getDefaultConfig(type: WorkflowNodeType): NodeConfig {
  switch (type) {
    case "trigger": return { triggerType: "SUBSCRIBER_ADDED" } as TriggerConfig;
    case "send_email": return { subject: "", templateId: "" } as SendEmailConfig;
    case "add_tag": return { tagName: "" } as TagConfig;
    case "remove_tag": return { tagName: "" } as TagConfig;
    case "wait": return { duration: 1, unit: "days" } as WaitConfig;
    case "condition": return { field: "tags", operator: "has_tag", value: "" } as ConditionConfig;
    case "webhook": return { url: "", method: "POST" } as WebhookConfig;
  }
}
