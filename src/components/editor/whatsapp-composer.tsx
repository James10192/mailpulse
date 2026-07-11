"use client";

import { useRef, useState } from "react";
import { Loader2, MessageCircle, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { htmlToPlainText } from "@/lib/message-content";

type SnippetOption = {
  id: string;
  name: string;
  htmlContent: string;
  channel: "EMAIL" | "WHATSAPP";
  whatsappImageUrl?: string | null;
  whatsappImageName?: string | null;
};

type WhatsAppComposerProps = {
  value: string;
  onChange: (value: string) => void;
  imageUrl?: string | null;
  imageName?: string | null;
  onImageChange: (image: { url: string | null; name: string | null }) => void;
  snippets?: SnippetOption[];
  placeholder?: string;
};

const variables = ["{{firstName}}", "{{lastName}}", "{{phone}}"];

export function WhatsAppComposer({
  value,
  onChange,
  imageUrl,
  imageName,
  onImageChange,
  snippets = [],
  placeholder = "Écrivez votre message WhatsApp...",
}: WhatsAppComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const text = htmlToPlainText(value);
  const characterCount = text.length;
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

  function insertVariable(variable: string) {
    const input = inputRef.current;
    if (!input) {
      onChange(`${value}${variable}`);
      return;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const nextValue = `${value.slice(0, start)}${variable}${value.slice(end)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + variable.length, start + variable.length);
    });
  }

  function applySnippet(snippetId: string) {
    const snippet = snippets.find((item) => item.id === snippetId);
    if (!snippet) return;
    onChange(htmlToPlainText(snippet.htmlContent));
    onImageChange({
      url: snippet.whatsappImageUrl ?? null,
      name: snippet.whatsappImageName ?? null,
    });
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const body = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !body.url) {
        throw new Error(body.error || "Upload impossible.");
      }

      onImageChange({ url: body.url, name: file.name });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload impossible.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="whatsapp-message">Message</Label>
          <Textarea
            ref={inputRef}
            id="whatsapp-message"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="min-h-64 resize-y text-[15px] leading-6"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {variables.map((variable) => (
            <Button
              key={variable}
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => insertVariable(variable)}
            >
              {variable}
            </Button>
          ))}

          {snippets.length > 0 && (
            <Select onValueChange={applySnippet}>
              <SelectTrigger className="h-10 w-full sm:w-56">
                <SelectValue placeholder="Insérer un snippet" />
              </SelectTrigger>
              <SelectContent>
                {snippets.map((snippet) => (
                  <SelectItem key={snippet.id} value={snippet.id}>
                    {snippet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label>Média WhatsApp</Label>
              <p className="mt-1 text-sm text-zinc-500 text-pretty">
                L’image est envoyée à côté du texte, avec le message comme légende.
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadImage(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              {imageUrl ? "Remplacer" : "Ajouter une image"}
            </Button>
          </div>

          {uploadError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{uploadError}</p>}

          {imageUrl && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-16 w-16 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {imageName || "Image WhatsApp"}
                </p>
                <p className="text-xs text-zinc-500">Sera envoyée avec la campagne.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-zinc-500 hover:text-red-600"
                onClick={() => onImageChange({ url: null, name: null })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          <Badge variant="secondary" className="tabular-nums">{characterCount} caractères</Badge>
          <Badge variant="secondary" className="tabular-nums">{wordCount} mots</Badge>
          <Badge variant={imageUrl ? "success" : "outline"}>
            {imageUrl ? "Image prête" : "Texte seul"}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-[#efe7dd] p-3 dark:border-zinc-800">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-800">
          <MessageCircle className="h-4 w-4" />
          Aperçu WhatsApp
        </div>
        <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-sm bg-[#d9fdd3] p-2 text-sm leading-5 text-zinc-900 shadow-sm">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="mb-2 max-h-48 w-full rounded-md object-cover" />
          )}
          {text ? (
            <p className="whitespace-pre-wrap text-pretty">{text}</p>
          ) : (
            <p className="text-zinc-500">Votre message apparaîtra ici.</p>
          )}
        </div>
      </div>
    </div>
  );
}
