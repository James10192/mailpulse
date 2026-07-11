"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { subscribeViaCapturePage } from "./actions";

interface Field {
  name: string;
  type: string;
  required: boolean;
  label: string;
}

export function CaptureForm({
  pageId,
  fields,
  buttonLabel,
  successMessage,
}: {
  pageId: string;
  fields: Field[];
  buttonLabel: string;
  successMessage: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("pageId", pageId);

    const result = await subscribeViaCapturePage(formData);

    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <Check className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-zinc-100 font-medium">{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={`field-${field.name}`}
            className="block text-sm font-medium text-zinc-300 mb-1.5"
          >
            {field.label} {field.required && "*"}
          </label>
          <input
            id={`field-${field.name}`}
            name={field.name}
            type={field.type}
            required={field.required}
            placeholder={field.type === "email" ? "vous@exemple.com" : ""}
            className="h-11 w-full rounded-xl bg-zinc-900 px-3.5 text-sm text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-[background-color,box-shadow] placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:shadow-[inset_0_0_0_1px_rgba(249,115,22,0.5)]"
          />
        </div>
      ))}

      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_10px_24px_rgba(234,88,12,0.22)] transition-[scale,background-color,opacity] hover:bg-orange-500 active:scale-[0.99] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          buttonLabel
        )}
      </button>
    </form>
  );
}
