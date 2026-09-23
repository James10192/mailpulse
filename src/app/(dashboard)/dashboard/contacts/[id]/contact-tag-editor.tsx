"use client";

import { useState } from "react";
import { Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addTagToContact, removeTagFromContact } from "./actions";

// One row of the tag suggestion list under the "Ajouter un tag" field (44px on touch screens).
const TAG_OPTION_CLASS = "flex min-h-11 w-full items-center px-3 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:bg-zinc-100 disabled:opacity-50 sm:min-h-8 dark:focus-visible:bg-zinc-800";

const ADD_TAG_ERROR = "Impossible d'ajouter le tag. Réessayez.";

/** Contact tags: remove with ×, add from existing tags or create one from the field. */
export function ContactTagEditor({
  contactId,
  tags,
  availableTags,
}: {
  contactId: string;
  tags: { id: string; name: string; color: string }[];
  availableTags: string[];
}) {
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  // Used both by the field (Enter, « Créer ») and by the suggestion rows.
  async function handleAddTag(name: string) {
    const tagName = name.trim();
    if (!tagName) return;
    setAddingTag(true);
    try {
      const result = await addTagToContact(contactId, tagName);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setNewTag("");
    } catch {
      toast.error(ADD_TAG_ERROR);
    } finally {
      setAddingTag(false);
    }
  }

  async function handleRemoveTag(tagId: string) {
    await removeTagFromContact(contactId, tagId);
  }

  const suggestions = availableTags.filter(
    (t) => t.toLowerCase().includes(newTag.toLowerCase()) && !tags.some((ct) => ct.name === t),
  );
  const canCreate = !availableTags.some((t) => t.toLowerCase() === newTag.toLowerCase());

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
        <Tag className="h-3.5 w-3.5" />
        Tags
      </div>
      <div className="flex gap-1.5 flex-wrap items-center">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="gap-0.5 py-0 pl-2.5 pr-0 text-xs"
            style={{ borderColor: tag.color + "40", backgroundColor: tag.color + "15", color: tag.color }}
          >
            {tag.name}
            <Button
              type="button"
              variant="ghost-destructive"
              size="icon-xs"
              onClick={() => handleRemoveTag(tag.id)}
              aria-label={`Retirer le tag ${tag.name}`}
              className="rounded-full text-current"
            >
              <X />
            </Button>
          </Badge>
        ))}
        <div className="relative">
          <Input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAddTag(newTag); } }}
            placeholder="Ajouter un tag..."
            aria-label="Ajouter un tag"
            className="h-11 w-40 border border-dashed sm:h-8 border-zinc-300 bg-transparent px-2 py-1 text-xs shadow-none placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-transparent dark:shadow-none"
          />
          {newTag && (
            <div className="absolute left-0 top-full mt-1 z-10 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg py-1 max-h-40 overflow-y-auto">
              {suggestions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => void handleAddTag(t)}
                  disabled={addingTag}
                  className={cn(TAG_OPTION_CLASS, "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800")}
                >
                  {t}
                </button>
              ))}
              {canCreate && (
                <button
                  type="button"
                  onClick={() => void handleAddTag(newTag)}
                  disabled={addingTag}
                  className={cn(TAG_OPTION_CLASS, "text-orange-600 hover:bg-orange-500/5 dark:text-orange-400")}
                >
                  + Créer &quot;{newTag}&quot;
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
