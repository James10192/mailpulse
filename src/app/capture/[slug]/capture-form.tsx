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
            className="w-full px-3.5 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all text-zinc-100 placeholder:text-zinc-600"
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
        className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-orange-500/20"
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
