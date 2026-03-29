"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, Loader2, AlertTriangle, X } from "lucide-react";
import Papa from "papaparse";
import { importContacts } from "../actions";

type Step = "upload" | "mapping" | "result";

const CONTACT_FIELDS = [
  { value: "", label: "— Ignorer —" },
  { value: "email", label: "Email *" },
  { value: "firstName", label: "Prenom" },
  { value: "lastName", label: "Nom" },
  { value: "phone", label: "Telephone" },
  { value: "tags", label: "Tags (separes par des virgules)" },
];

export function CsvImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Seuls les fichiers .csv sont acceptes.");
      return;
    }

    setError("");
    setFileName(file.name);

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length < 2) {
          setError("Le fichier CSV doit contenir au moins une ligne de donnees.");
          return;
        }

        const headers = rows[0];
        const data = rows.slice(1);
        setCsvHeaders(headers);
        setCsvData(data);

        // Auto-map columns by name matching
        const autoMapping: Record<number, string> = {};
        headers.forEach((h, i) => {
          const lower = h.toLowerCase().trim();
          if (lower === "email" || lower === "e-mail" || lower === "mail") autoMapping[i] = "email";
          else if (lower === "prenom" || lower === "firstname" || lower === "first_name" || lower === "first name") autoMapping[i] = "firstName";
          else if (lower === "nom" || lower === "lastname" || lower === "last_name" || lower === "last name") autoMapping[i] = "lastName";
          else if (lower === "telephone" || lower === "phone" || lower === "tel") autoMapping[i] = "phone";
          else if (lower === "tags" || lower === "tag" || lower === "labels") autoMapping[i] = "tags";
        });
        setColumnMapping(autoMapping);
        setStep("mapping");
      },
      error: () => {
        setError("Erreur lors de la lecture du fichier CSV.");
      },
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function updateMapping(colIndex: number, field: string) {
    setColumnMapping((prev) => {
      const next = { ...prev };
      // Remove field if already mapped to another column
      for (const [key, val] of Object.entries(next)) {
        if (val === field && Number(key) !== colIndex) delete next[Number(key)];
      }
      if (field) next[colIndex] = field;
      else delete next[colIndex];
      return next;
    });
  }

  const hasEmailMapping = Object.values(columnMapping).includes("email");

  async function handleImport() {
    if (!hasEmailMapping) return;
    setImporting(true);
    setError("");

    const emailCol = Number(Object.entries(columnMapping).find(([, v]) => v === "email")![0]);
    const firstNameCol = Number(Object.entries(columnMapping).find(([, v]) => v === "firstName")?.[0] ?? -1);
    const lastNameCol = Number(Object.entries(columnMapping).find(([, v]) => v === "lastName")?.[0] ?? -1);
    const phoneCol = Number(Object.entries(columnMapping).find(([, v]) => v === "phone")?.[0] ?? -1);
    const tagsCol = Number(Object.entries(columnMapping).find(([, v]) => v === "tags")?.[0] ?? -1);

    const contacts = csvData
      .map((row) => ({
        email: row[emailCol]?.trim() || "",
        firstName: firstNameCol >= 0 ? row[firstNameCol]?.trim() || "" : "",
        lastName: lastNameCol >= 0 ? row[lastNameCol]?.trim() || "" : "",
        phone: phoneCol >= 0 ? row[phoneCol]?.trim() || "" : "",
        tags: tagsCol >= 0 ? row[tagsCol]?.trim() || "" : "",
      }))
      .filter((c) => c.email && c.email.includes("@"));

    const res = await importContacts(contacts);
    setImporting(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setResult({
        imported: (res as { imported?: number }).imported ?? 0,
        skipped: (res as { skipped?: number }).skipped ?? 0,
        errors: contacts.length - ((res as { imported?: number }).imported ?? 0) - ((res as { skipped?: number }).skipped ?? 0),
      });
      setStep("result");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Importer des contacts
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Importez vos contacts depuis un fichier CSV
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { id: "upload", label: "1. Fichier" },
          { id: "mapping", label: "2. Mapping" },
          { id: "result", label: "3. Resultat" },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-3 w-3 text-zinc-600" />}
            <span className={step === s.id ? "text-orange-500 font-medium" : "text-zinc-500"}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 p-12 text-center cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5 transition-all"
        >
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
          <Upload className="h-10 w-10 text-zinc-400 mx-auto mb-4" />
          <p className="text-sm text-zinc-500 mb-1">
            Glissez-deposez votre fichier CSV ici
          </p>
          <p className="text-xs text-zinc-400">ou cliquez pour selectionner</p>
          <p className="text-xs text-zinc-500 mt-4">
            Format attendu : une colonne email obligatoire, colonnes prenom/nom/telephone optionnelles
          </p>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <FileSpreadsheet className="h-4 w-4" />
              {fileName} — {csvData.length} lignes detectees
            </div>
            <button
              onClick={() => { setStep("upload"); setCsvHeaders([]); setCsvData([]); setColumnMapping({}); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              Changer de fichier
            </button>
          </div>

          {/* Column mapping */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Associez les colonnes CSV aux champs contact
            </h2>
            <div className="space-y-3">
              {csvHeaders.map((header, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-mono text-zinc-500 w-40 truncate" title={header}>
                    {header}
                  </span>
                  <ArrowRight className="h-3 w-3 text-zinc-600 shrink-0" />
                  <select
                    value={columnMapping[i] || ""}
                    onChange={(e) => updateMapping(i, e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  >
                    {CONTACT_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {!hasEmailMapping && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Associez au moins une colonne a &quot;Email&quot;
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
              Apercu (5 premieres lignes)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    {csvHeaders.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium text-zinc-500">
                        {columnMapping[i] ? (
                          <span className="text-orange-500">{CONTACT_FIELDS.find((f) => f.value === columnMapping[i])?.label}</span>
                        ) : (
                          <span className="text-zinc-400 line-through">{h}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 5).map((row, ri) => (
                    <tr key={ri} className="border-b border-zinc-100 dark:border-zinc-800/50">
                      {row.map((cell, ci) => (
                        <td key={ci} className={`px-3 py-2 ${columnMapping[ci] ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}`}>
                          {cell || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep("upload")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <button
              onClick={handleImport}
              disabled={!hasEmailMapping || importing}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  Importer {csvData.length} contacts
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === "result" && result && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Check className="h-7 w-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Import termine !
          </h2>
          <div className="flex justify-center gap-6 mt-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-emerald-500">{result.imported}</div>
              <div className="text-xs text-zinc-500">importes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-amber-500">{result.skipped}</div>
              <div className="text-xs text-zinc-500">doublons ignores</div>
            </div>
            {result.errors > 0 && (
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-red-500">{result.errors}</div>
                <div className="text-xs text-zinc-500">erreurs</div>
              </div>
            )}
          </div>
          <button
            onClick={() => router.push("/dashboard/contacts")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Voir les contacts
          </button>
        </div>
      )}
    </div>
  );
}
