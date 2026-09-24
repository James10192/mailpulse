"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, Loader2, AlertTriangle } from "lucide-react";
import Papa from "papaparse";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { importContacts } from "../actions";

type Step = "upload" | "mapping" | "result";

// Radix Select items cannot use "" as a value: the "ignore" option is mapped to this sentinel.
const IGNORE_FIELD = "__ignore__";

const CONTACT_FIELDS = [
  { value: IGNORE_FIELD, label: "Ignorer cette colonne" },
  { value: "email", label: "Email *" },
  { value: "firstName", label: "Prénom" },
  { value: "lastName", label: "Nom" },
  { value: "phone", label: "Téléphone" },
  { value: "tags", label: "Tags (séparés par des virgules)" },
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
      setError("Seuls les fichiers .csv sont acceptés.");
      return;
    }

    setError("");
    setFileName(file.name);

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length < 2) {
          setError("Le fichier CSV doit contenir au moins une ligne de données.");
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
      // The ignore sentinel only exists for the Select: an ignored column has no mapping.
      if (field === IGNORE_FIELD) {
        delete next[colIndex];
        return next;
      }
      // Remove field if already mapped to another column
      for (const [key, val] of Object.entries(next)) {
        if (val === field && Number(key) !== colIndex) delete next[Number(key)];
      }
      next[colIndex] = field;
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
          { id: "result", label: "3. Résultat" },
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
        <Alert variant="destructive" className="flex items-center gap-2 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </Alert>
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
            Glissez-déposez votre fichier CSV ici
          </p>
          <p className="text-xs text-zinc-400">ou cliquez pour sélectionner</p>
          <p className="text-xs text-zinc-500 mt-4">
            Format attendu : une colonne email obligatoire, colonnes prénom/nom/téléphone optionnelles
          </p>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <FileSpreadsheet className="h-4 w-4" />
              {fileName} · {csvData.length} lignes détectées
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStep("upload"); setCsvHeaders([]); setCsvData([]); setColumnMapping({}); }}
              className="text-zinc-500"
            >
              Changer de fichier
            </Button>
          </div>

          {/* Column mapping */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Associez les colonnes CSV aux champs contact
            </h2>
            <div className="space-y-3">
              {csvHeaders.map((header, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span id={`csv-column-${i}`} className="text-sm font-mono text-zinc-500 w-40 truncate" title={header}>
                    {header}
                  </span>
                  <ArrowRight className="h-3 w-3 text-zinc-600 shrink-0" />
                  <Select
                    value={columnMapping[i] ?? IGNORE_FIELD}
                    onValueChange={(value) => updateMapping(i, value)}
                  >
                    <SelectTrigger aria-labelledby={`csv-column-${i}`} className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {!hasEmailMapping && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Associez au moins une colonne à &quot;Email&quot;
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
              Aperçu (5 premières lignes)
            </div>
            <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    {csvHeaders.map((h, i) => (
                      <TableHead key={i} className="px-3 py-2 text-xs font-medium normal-case tracking-normal text-zinc-500">
                        {columnMapping[i] ? (
                          <span className="text-orange-500">{CONTACT_FIELDS.find((f) => f.value === columnMapping[i])?.label}</span>
                        ) : (
                          <span className="text-zinc-400 line-through">{h}</span>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 5).map((row, ri) => (
                    <TableRow key={ri} className="border-zinc-100 dark:border-zinc-800/50">
                      {row.map((cell, ci) => (
                        <TableCell key={ci} className={`px-3 py-2 ${columnMapping[ci] ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}`}>
                          {cell || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep("upload")} className="text-zinc-500">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button
              size="lg"
              onClick={handleImport}
              disabled={!hasEmailMapping || importing}
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
            </Button>
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
            Import terminé !
          </h2>
          <div className="flex justify-center gap-6 mt-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-emerald-500">{result.imported}</div>
              <div className="text-xs text-zinc-500">importés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-amber-500">{result.skipped}</div>
              <div className="text-xs text-zinc-500">doublons ignorés</div>
            </div>
            {result.errors > 0 && (
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-red-500">{result.errors}</div>
                <div className="text-xs text-zinc-500">erreurs</div>
              </div>
            )}
          </div>
          <Button onClick={() => router.push("/dashboard/contacts")}>
            Voir les contacts
          </Button>
        </div>
      )}
    </div>
  );
}
