"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, Save, Eye, Check, Loader2 } from "lucide-react";
import { MailPulseLogo } from "@/components/mailpulse-logo";
import { updateCapturePageFields } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Field {
  name: string;
  type: string;
  required: boolean;
  label: string;
}

const FIELD_TYPES = [
  { value: "email", label: "Email" },
  { value: "text", label: "Texte" },
  { value: "tel", label: "Téléphone" },
  { value: "textarea", label: "Zone de texte" },
  { value: "select", label: "Liste déroulante" },
];

export function FormBuilder({
  pageId,
  slug,
  initialFields,
  initialButtonLabel,
  initialSuccessMessage,
}: {
  pageId: string;
  slug: string;
  initialFields: Field[];
  initialButtonLabel: string;
  initialSuccessMessage: string;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [buttonLabel, setButtonLabel] = useState(initialButtonLabel);
  const [successMessage, setSuccessMessage] = useState(initialSuccessMessage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function addField() {
    const count = fields.length;
    setFields([
      ...fields,
      { name: `field_${Date.now()}`, type: "text", required: false, label: `Champ ${count + 1}` },
    ]);
  }

  function removeField(index: number) {
    if (fields[index].type === "email") return;
    setFields(fields.filter((_, i) => i !== index));
  }

  function updateField(index: number, patch: Partial<Field>) {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const result = await updateCapturePageFields(pageId, {
      fields,
      buttonLabel,
      successMessage,
    });
    setSaving(false);
    if (result?.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Éditeur de formulaire
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/capture-pages/${pageId}`)}
          >
            Retour
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="animate-spin" />
            ) : saved ? (
              <Check />
            ) : (
              <Save />
            )}
            {saved ? "Enregistré" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="p-3">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Field editor */}
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-4">
              Champs du formulaire
            </h2>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.name}
                  className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30"
                >
                  <GripVertical className="h-4 w-4 text-zinc-400 mt-2.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        className="h-9 flex-1"
                        placeholder="Label"
                        aria-label="Libellé du champ"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(value) => updateField(index, { type: value })}
                        disabled={field.type === "email"}
                      >
                        <SelectTrigger className="h-9 w-auto min-w-36" aria-label="Type de champ">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`required-${field.name}`}
                          checked={field.required}
                          onCheckedChange={(checked) => updateField(index, { required: checked === true })}
                          disabled={field.type === "email"}
                        />
                        <Label
                          htmlFor={`required-${field.name}`}
                          className="cursor-pointer text-xs font-normal text-zinc-500"
                        >
                          Obligatoire
                        </Label>
                      </div>
                      {field.type !== "email" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(index)}
                          className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 [&_svg]:size-3.5"
                          aria-label="Supprimer le champ"
                          title="Supprimer le champ"
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={addField}
              className="mt-3 w-full border border-dashed border-zinc-300 text-zinc-500 hover:border-orange-500/50 hover:bg-transparent hover:text-orange-500 dark:border-zinc-700 dark:hover:bg-transparent"
            >
              <Plus />
              Ajouter un champ
            </Button>
          </div>

          {/* Settings */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Paramètres
            </h2>
            <div className="space-y-1.5">
              <Label htmlFor="form-button-label" className="text-xs text-zinc-500">
                Texte du bouton
              </Label>
              <Input
                id="form-button-label"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="form-success-message" className="text-xs text-zinc-500">
                Message de succès
              </Label>
              <Input
                id="form-success-message"
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 p-6 sticky top-20 self-start">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Aperçu en direct
            </span>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-3">
                <MailPulseLogo className="h-6 w-10" sizes="40px" />
                <span className="text-lg font-semibold text-zinc-100">
                  Mail<span className="text-[var(--mailpulse-signal)]">Pulse</span>
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.name}>
                  <Label
                    htmlFor={`preview-${field.name}`}
                    className="mb-1 block text-sm font-medium text-zinc-300"
                  >
                    {field.label} {field.required && "*"}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={`preview-${field.name}`}
                      disabled
                      placeholder={`Entrez ${field.label.toLowerCase()}`}
                      className="h-20 min-h-20 resize-none rounded-xl border-zinc-700 bg-zinc-800/50 text-zinc-400 disabled:cursor-default disabled:opacity-100 dark:border-zinc-700 dark:bg-zinc-800/50"
                    />
                  ) : field.type === "select" ? (
                    <Select disabled>
                      <SelectTrigger
                        id={`preview-${field.name}`}
                        className="rounded-xl border-zinc-700 bg-zinc-800/50 text-zinc-400 disabled:cursor-default disabled:opacity-100"
                      >
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent />
                    </Select>
                  ) : (
                    <Input
                      id={`preview-${field.name}`}
                      disabled
                      type={field.type}
                      placeholder={field.type === "email" ? "vous@exemple.com" : field.type === "tel" ? "+225 XX XX XX XX" : ""}
                      className="h-auto rounded-xl bg-zinc-800/50 text-zinc-400 shadow-[inset_0_0_0_1px_rgb(63,63,70)] disabled:cursor-default disabled:opacity-100 dark:bg-zinc-800/50 dark:shadow-[inset_0_0_0_1px_rgb(63,63,70)]"
                    />
                  )}
                </div>
              ))}
              <Button
                disabled
                className="mt-2 h-auto w-full rounded-xl py-2.5 font-semibold shadow-none disabled:cursor-default disabled:opacity-100"
              >
                {buttonLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
