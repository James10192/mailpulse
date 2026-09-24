"use client";

import { X, Mail, Tag, Clock, GitBranch, Globe } from "lucide-react";
import { NODE_CATALOG, type WorkflowNodeType } from "./workflow-types";
import { Button } from "@/components/ui/button";

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
    // Floats over the always-dark canvas: the `dark` scope gives buttons their dark styles.
    <div className="dark absolute bottom-20 right-6 z-50 w-64 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-100">Ajouter un nœud</h3>
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
      <div className="p-2 max-h-72 overflow-y-auto">
        {NODE_CATALOG.map((category) => (
          <div key={category.category} className="mb-2">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
              {category.category}
            </div>
            {category.items.map((item) => {
              const Icon = iconMap[item.icon] ?? Mail;
              return (
                <Button
                  key={item.type}
                  variant="ghost"
                  onClick={() => {
                    onAdd(item.type);
                    onClose();
                  }}
                  size="sm"
                  className="w-full justify-start gap-3 text-sm font-normal"
                >
                  <Icon className="text-zinc-500" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
