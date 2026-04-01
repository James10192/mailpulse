"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions<T extends Record<string, unknown>> {
  /** Initial values (used as baseline for dirty-check) */
  initial: T;
  /** Server action to call with current values. Return { error?: string } */
  onSave: (values: T) => Promise<{ error?: string } | undefined | null>;
  /** Debounce delay in ms (default 2000) */
  delay?: number;
}

/**
 * Generic autosave hook with dirty-check, debounce, and beforeunload warning.
 * Works for any form with a flat key-value state.
 */
export function useAutosave<T extends Record<string, unknown>>({
  initial,
  onSave,
  delay = 2000,
}: UseAutosaveOptions<T>) {
  const [autoStatus, setAutoStatus] = useState<AutosaveStatus>("idle");
  const valuesRef = useRef<T>(initial);
  const lastSaved = useRef<T>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doAutoSave = useCallback(async () => {
    const current = valuesRef.current;
    // Dirty-check: skip if nothing changed
    const isDirty = Object.keys(current).some(
      (key) => current[key] !== lastSaved.current[key]
    );
    if (!isDirty) return;

    setAutoStatus("saving");
    const result = await onSave(current);
    if (result?.error) {
      setAutoStatus("error");
    } else {
      lastSaved.current = { ...current };
      setAutoStatus("saved");
      setTimeout(() => setAutoStatus("idle"), 2000);
    }
  }, [onSave]);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doAutoSave, delay);
  }, [doAutoSave, delay]);

  /** Update a value and schedule autosave */
  const setValue = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      valuesRef.current = { ...valuesRef.current, [key]: value };
      schedule();
    },
    [schedule]
  );

  /** Flush: cancel timer and save immediately */
  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await doAutoSave();
  }, [doAutoSave]);

  /** Whether there are unsaved changes */
  const hasPendingChanges = useCallback(() => {
    return timerRef.current !== null;
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (timerRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return { autoStatus, schedule, setValue, flush, hasPendingChanges };
}
