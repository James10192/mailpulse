"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, Save, Eye, Check, Loader2, Mail } from "lucide-react";
import { updateCapturePageFields } from "../../actions";

interface Field {
  name: string;
  type: string;
  required: boolean;
  label: string;
}

const FIELD_TYPES = [
  { value: "email", label: "Email" },
  { value: "text", label: "Texte" },
  { value: "tel", label: "Telephone" },
  { value: "textarea", label: "Zone de texte" },
  { value: "select", label: "Liste deroulante" },
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
          Editeur de formulaire
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/capture-pages/${pageId}`)}
            className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            Retour
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Enregistre" : "Enregistrer"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
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
                      <input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        className="flex-1 px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        placeholder="Label"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, { type: e.target.value })}
                        disabled={field.type === "email"}
                        className="px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          disabled={field.type === "email"}
                          className="rounded border-zinc-300 dark:border-zinc-600"
                        />
                        Obligatoire
                      </label>
                      {field.type !== "email" && (
                        <button
                          onClick={() => removeField(index)}
                          className="p-1 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addField}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-500 hover:text-orange-500 hover:border-orange-500/50 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Ajouter un champ
            </button>
          </div>

          {/* Settings */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Parametres
            </h2>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Texte du bouton
              </label>
              <input
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Message de succes
              </label>
              <input
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 p-6 sticky top-20 self-start">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Apercu en direct
            </span>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-3">
                <Mail className="h-5 w-5 text-orange-500" />
                <span className="text-lg font-semibold text-zinc-100">
                  Mail<span className="text-orange-500">Pulse</span>
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    {field.label} {field.required && "*"}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      disabled
                      placeholder={`Entrez ${field.label.toLowerCase()}`}
                      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-zinc-400 resize-none h-20"
                    />
                  ) : field.type === "select" ? (
                    <select
                      disabled
                      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-zinc-400"
                    >
                      <option>Choisir...</option>
                    </select>
                  ) : (
                    <input
                      disabled
                      type={field.type}
                      placeholder={field.type === "email" ? "vous@exemple.com" : field.type === "tel" ? "+225 XX XX XX XX" : ""}
                      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-zinc-400"
                    />
                  )}
                </div>
              ))}
              <button
                disabled
                className="w-full py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold mt-2"
              >
                {buttonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
