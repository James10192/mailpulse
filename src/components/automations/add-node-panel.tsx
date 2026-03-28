"use client";

import { X, Mail, Tag, Clock, GitBranch, Globe } from "lucide-react";
import { NODE_CATALOG, type WorkflowNodeType } from "./workflow-types";

const iconMap: Record<string, React.ElementType> = {
  Mail,
  TagIcon: Tag,
  Clock,
  GitBranch,
  Globe,
};

export function AddNodePanel({
  onAdd,
  onClose,
}: {
  onAdd: (type: WorkflowNodeType) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-20 right-6 z-50 w-64 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-100">Ajouter un noeud</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-2 max-h-72 overflow-y-auto">
        {NODE_CATALOG.map((category) => (
          <div key={category.category} className="mb-2">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
              {category.category}
            </div>
            {category.items.map((item) => {
              const Icon = iconMap[item.icon] ?? Mail;
              return (
                <button
                  key={item.type}
                  onClick={() => {
                    onAdd(item.type);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-zinc-500" />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
