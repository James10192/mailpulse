"use client";

import { memo, useContext } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Mail, Tag, Clock, GitBranch, Globe, Zap, Plus } from "lucide-react";
import { getNodeColor, type WorkflowNodeData, type WorkflowNodeType } from "./workflow-types";
import { WorkflowContext } from "./workflow-editor";

function NodeIcon({ type, className }: { type: WorkflowNodeType; className: string }) {
  switch (type) {
    case "trigger": return <Zap className={className} />;
    case "send_email": return <Mail className={className} />;
    case "add_tag":
    case "remove_tag": return <Tag className={className} />;
    case "wait": return <Clock className={className} />;
    case "condition": return <GitBranch className={className} />;
    case "webhook": return <Globe className={className} />;
  }
}

function getSubtitle(data: WorkflowNodeData) {
  const c = data.config;
  switch (data.type) {
    case "trigger": {
      const labels: Record<string, string> = {
        SUBSCRIBER_ADDED: "Nouvel abonne",
        TAG_ADDED: "Tag ajoute",
        CAMPAIGN_OPENED: "Campagne ouverte",
        LINK_CLICKED: "Lien clique",
        DATE_BASED: "Base sur la date",
        CUSTOM_EVENT: "Evenement personnalise",
      };
      return labels[(c as { triggerType?: string }).triggerType ?? ""] ?? "Configurer...";
    }
    case "send_email":
      return (c as { subject?: string }).subject || "Configurer l'email...";
    case "add_tag":
    case "remove_tag":
      return (c as { tagName?: string }).tagName || "Choisir un tag...";
    case "wait": {
      const w = c as { duration?: number; unit?: string };
      if (!w.duration) return "Configurer...";
      const unitLabels: Record<string, string> = { hours: "heures", days: "jours", weeks: "semaines" };
      return `${w.duration} ${unitLabels[w.unit ?? "days"] ?? w.unit}`;
    }
    case "condition":
      return (c as { value?: string }).value || "Configurer la condition...";
    case "webhook":
      return (c as { url?: string }).url || "Configurer le webhook...";
  }
}

const handleStyle = {
  width: 12,
  height: 12,
  background: "#52525b",
  border: "2px solid #71717a",
};

const handleStyleGreen = {
  ...handleStyle,
  background: "#10b981",
  border: "2px solid #34d399",
};

const handleStyleRed = {
  ...handleStyle,
  background: "#ef4444",
  border: "2px solid #f87171",
};

function WorkflowNodeComponent({ data, selected, id }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const { onAddFromNode } = useContext(WorkflowContext);
  const colors = getNodeColor(nodeData.type);
  const isCondition = nodeData.type === "condition";

  return (
    <div
      className={`
        relative px-4 py-3 rounded-xl border-2 min-w-[200px] max-w-[240px]
        ${colors.bg} ${colors.border}
        ${selected ? "ring-2 ring-orange-500/50 shadow-lg shadow-orange-500/10" : ""}
        transition-shadow group
      `}
    >
      {/* Target handle (top) — not for trigger */}
      {nodeData.type !== "trigger" && (
        <Handle
          type="target"
          position={Position.Top}
          style={handleStyle}
        />
      )}

      <div className="flex items-center gap-3">
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg} ${colors.border} border`}>
          <NodeIcon type={nodeData.type} className={`h-4 w-4 ${colors.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-100 truncate">
            {nodeData.label}
          </div>
          <div className="text-[11px] text-zinc-500 truncate mt-0.5">
            {getSubtitle(nodeData)}
          </div>
        </div>
      </div>

      {/* Source handle (bottom) */}
      {isCondition ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{ ...handleStyleGreen, left: "35%" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            style={{ ...handleStyleRed, left: "65%" }}
          />
          <div className="flex justify-between px-6 mt-1">
            <span className="text-[9px] text-emerald-500 font-mono">OUI</span>
            <span className="text-[9px] text-red-500 font-mono">NON</span>
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          style={handleStyle}
        />
      )}

      {/* Per-node "+" button */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddFromNode(id);
          }}
          className="w-6 h-6 rounded-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 transition-all cursor-pointer hover:scale-110"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
