"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE } from "./reveal";

type Token = { t: string; c?: "str" | "key" | "punct" | "dim" | "fn" };
type Line = Token[];

const s = (t: string): Token => ({ t, c: "str" });
const k = (t: string): Token => ({ t, c: "key" });
const p = (t: string): Token => ({ t, c: "punct" });
const d = (t: string): Token => ({ t, c: "dim" });
const f = (t: string): Token => ({ t, c: "fn" });
const x = (t: string): Token => ({ t });

// Aligned on POST /api/v1/messages (see content/docs/api-reference.mdx).
const SNIPPETS: Record<string, { label: string; lines: Line[] }> = {
  curl: {
    label: "cURL",
    lines: [
      [f("curl"), x(" -X POST "), s("$MAILPULSE_URL/api/v1/messages"), d(" \\")],
      [x("  -H "), s('"Authorization: Bearer mp_live_•••"'), d(" \\")],
      [x("  -H "), s('"Idempotency-Key: rdv-2026-03-14-42"'), d(" \\")],
      [x("  -H "), s('"Content-Type: application/json"'), d(" \\")],
      [x("  -d "), p("'{")],
      [x("    "), k('"channel"'), p(": "), s('"whatsapp"'), p(",")],
      [x("    "), k('"recipient"'), p(": { "), k('"type"'), p(": "), s('"phone"'), p(", "), k('"value"'), p(": "), s('"+2250700000000"'), p(" },")],
      [x("    "), k('"content"'), p(": { "), k('"type"'), p(": "), s('"template"'), p(", "), k('"template_key"'), p(": "), s('"rappel_rdv"'), p(",")],
      [x("                 "), k('"variables"'), p(": { "), k('"prenom"'), p(": "), s('"Awa"'), p(" } }")],
      [p("  }'")],
    ],
  },
  node: {
    label: "Node.js",
    lines: [
      [k("const"), x(" res "), p("= "), k("await "), f("fetch"), p("("), s("`${process.env.MAILPULSE_URL}/api/v1/messages`"), p(", {")],
      [x("  method"), p(": "), s('"POST"'), p(",")],
      [x("  headers"), p(": {")],
      [x("    Authorization"), p(": "), s("`Bearer ${process.env.MAILPULSE_API_KEY}`"), p(",")],
      [x("    "), s('"Idempotency-Key"'), p(": "), s('"rdv-2026-03-14-42"'), p(",")],
      [x("    "), s('"Content-Type"'), p(": "), s('"application/json"'), p(",")],
      [p("  },")],
      [x("  body"), p(": "), f("JSON.stringify"), p("({")],
      [x("    channel"), p(": "), s('"whatsapp"'), p(",")],
      [x("    recipient"), p(": { "), x("type"), p(": "), s('"phone"'), p(", "), x("value"), p(": "), s('"+2250700000000"'), p(" },")],
      [x("    content"), p(": { "), x("type"), p(": "), s('"template"'), p(", "), x("template_key"), p(": "), s('"rappel_rdv"'), p(", "), x("variables"), p(": { "), x("prenom"), p(": "), s('"Awa"'), p(" } },")],
      [p("  }),")],
      [p("});")],
    ],
  },
  python: {
    label: "Python",
    lines: [
      [k("import"), x(" os, requests")],
      [x("")],
      [x("res "), p("= "), f("requests.post"), p("(")],
      [x("    "), s('f"{os.environ[\'MAILPULSE_URL\']}/api/v1/messages"'), p(",")],
      [x("    headers"), p("={")],
      [x("        "), s('"Authorization"'), p(": "), s('f"Bearer {os.environ[\'MAILPULSE_API_KEY\']}"'), p(",")],
      [x("        "), s('"Idempotency-Key"'), p(": "), s('"rdv-2026-03-14-42"'), p(",")],
      [x("    "), p("},")],
      [x("    json"), p("={")],
      [x("        "), s('"channel"'), p(": "), s('"whatsapp"'), p(",")],
      [x("        "), s('"recipient"'), p(": {"), s('"type"'), p(": "), s('"phone"'), p(", "), s('"value"'), p(": "), s('"+2250700000000"'), p("},")],
      [x("        "), s('"content"'), p(": {"), s('"type"'), p(": "), s('"template"'), p(", "), s('"template_key"'), p(": "), s('"rappel_rdv"'), p(", "), s('"variables"'), p(": {"), s('"prenom"'), p(": "), s('"Awa"'), p("}},")],
      [x("    "), p("},")],
      [p(")")],
    ],
  },
  php: {
    label: "PHP · Laravel",
    lines: [
      [k("$res"), x(" "), p("= "), f("Http::withToken"), p("("), f("env"), p("("), s("'MAILPULSE_API_KEY'"), p("))")],
      [x("    "), p("->"), f("withHeaders"), p("(["), s("'Idempotency-Key'"), p(" => "), s("'rdv-2026-03-14-42'"), p("])")],
      [x("    "), p("->"), f("post"), p("("), f("env"), p("("), s("'MAILPULSE_URL'"), p(") . "), s("'/api/v1/messages'"), p(", [")],
      [x("        "), s("'channel'"), p(" => "), s("'whatsapp'"), p(",")],
      [x("        "), s("'recipient'"), p(" => ["), s("'type'"), p(" => "), s("'phone'"), p(", "), s("'value'"), p(" => "), s("'+2250700000000'"), p("],")],
      [x("        "), s("'content'"), p(" => ["), s("'type'"), p(" => "), s("'template'"), p(", "), s("'template_key'"), p(" => "), s("'rappel_rdv'"), p(",")],
      [x("                      "), s("'variables'"), p(" => ["), s("'prenom'"), p(" => "), s("'Awa'"), p("]],")],
      [x("    "), p("]);")],
    ],
  },
};

const TOKEN_CLASS: Record<NonNullable<Token["c"]>, string> = {
  str: "text-orange-300",
  key: "text-zinc-300",
  punct: "text-zinc-500",
  dim: "text-zinc-600",
  fn: "text-zinc-100",
};

function lineText(line: Line) {
  return line.map((tok) => tok.t).join("");
}

export function CodeBlock() {
  const [tab, setTab] = useState<keyof typeof SNIPPETS>("curl");
  const [copied, setCopied] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [typed, setTyped] = useState(false);

  const snippet = SNIPPETS[tab];
  // Reduced motion: everything is shown at once, no sequence.
  const isTyped = typed || Boolean(reduce);
  const isDelivered = delivered || Boolean(reduce && inView);

  // The request "writes" itself once, then the webhook reports delivery.
  useEffect(() => {
    if (!inView || reduce) return;
    const writeMs = SNIPPETS.curl.lines.length * 40 + 350;
    const t1 = window.setTimeout(() => setTyped(true), writeMs);
    const t2 = window.setTimeout(() => setDelivered(true), writeMs + 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [inView, reduce]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet.lines.map(lineText).join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div ref={ref} className="min-w-0 space-y-3">
      <div className="overflow-hidden rounded-[14px] border border-white/[0.08] bg-zinc-900/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pr-2">
          <div role="tablist" aria-label="Langage de l'exemple" className="flex min-w-0 overflow-x-auto">
            {Object.entries(SNIPPETS).map(([key, value]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key as keyof typeof SNIPPETS)}
                className={cn(
                  "relative min-h-11 shrink-0 px-4 font-mono text-[12px] transition-colors duration-150",
                  tab === key ? "text-zinc-50" : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {value.label}
                {tab === key ? (
                  <m.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-x-3 bottom-0 h-px bg-orange-500"
                  />
                ) : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 font-mono text-[12px] text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
          >
            {copied ? <Check aria-hidden className="size-3.5 text-orange-400" /> : <Copy aria-hidden className="size-3.5" />}
            <span>{copied ? "Copié" : "Copier"}</span>
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? "Code copié" : ""}
          </span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <m.pre
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mp-code overflow-x-auto p-4 font-mono text-[13px] leading-[1.7] md:p-5 md:text-[13.5px]"
          >
            <code>
              {snippet.lines.map((line, i) => (
                <m.span
                  key={i}
                  className="block whitespace-pre"
                  initial={tab === "curl" && !isTyped ? { opacity: 0, x: -4 } : false}
                  animate={inView ? { opacity: 1, x: 0 } : undefined}
                  transition={{ duration: 0.2, delay: tab === "curl" && !isTyped ? i * 0.04 : 0, ease: EASE }}
                >
                  {line.length === 0 || lineText(line) === "" ? " " : null}
                  {line.map((tok, j) => (
                    <span key={j} className={tok.c ? TOKEN_CLASS[tok.c] : "text-zinc-200"}>
                      {tok.t}
                    </span>
                  ))}
                </m.span>
              ))}
            </code>
          </m.pre>
        </AnimatePresence>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-[14px] border border-white/[0.06] bg-zinc-900/60 p-4">
          <p className="flex items-center justify-between font-mono text-[11px] text-zinc-500">
            <span>Réponse</span>
            <span className="text-zinc-400">202 Accepted</span>
          </p>
          <pre className="mp-code mt-3 overflow-x-auto font-mono text-[12px] leading-[1.7] text-zinc-300">
            <code>
              <span className="text-zinc-500">{"{"}</span>
              {"\n  "}
              <span className="text-zinc-300">&quot;dispatch&quot;</span>
              <span className="text-zinc-500">: {"{ "}</span>
              <span className="text-zinc-300">&quot;state&quot;</span>
              <span className="text-zinc-500">: </span>
              <span className="text-orange-300">&quot;accepted&quot;</span>
              <span className="text-zinc-500">{" },"}</span>
              {"\n  "}
              <span className="text-zinc-300">&quot;message&quot;</span>
              <span className="text-zinc-500">: {"{"}</span>
              {"\n    "}
              <span className="text-zinc-300">&quot;id&quot;</span>
              <span className="text-zinc-500">: </span>
              <span className="text-orange-300">&quot;cmf8x2k0p…&quot;</span>
              <span className="text-zinc-500">,</span>
              {"\n    "}
              <span className="text-zinc-300">&quot;channel&quot;</span>
              <span className="text-zinc-500">: </span>
              <span className="text-orange-300">&quot;whatsapp&quot;</span>
              <span className="text-zinc-500">,</span>
              {"\n    "}
              <span className="text-zinc-300">&quot;status&quot;</span>
              <span className="text-zinc-500">: </span>
              <span className="text-orange-300">&quot;sent&quot;</span>
              {"\n  "}
              <span className="text-zinc-500">{"}"}</span>
              {"\n"}
              <span className="text-zinc-500">{"}"}</span>
            </code>
          </pre>
        </div>

        <div className="min-w-0 rounded-[14px] border border-white/[0.06] bg-zinc-900/60 p-4">
          <p className="flex items-center justify-between font-mono text-[11px] text-zinc-500">
            <span>Webhook reçu</span>
            <span className="text-zinc-400">HMAC SHA-256</span>
          </p>
          <div className="mt-3 space-y-2 font-mono text-[12px]">
            <p className="truncate text-zinc-500">mailpulse-signature: v1=9f2c…</p>
            <div className="flex min-h-7 items-center gap-2">
              <span className="text-zinc-400">type</span>
              <AnimatePresence mode="wait" initial={false}>
                <m.span
                  key={isDelivered ? "d" : "s"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5",
                    isDelivered ? "bg-emerald-400/10 text-emerald-300" : "bg-zinc-800 text-zinc-300",
                  )}
                >
                  <span className="relative inline-flex size-1.5">
                    {isDelivered && !reduce ? (
                      <m.span
                        className="absolute inset-0 rounded-full bg-emerald-400"
                        initial={{ scale: 1, opacity: 0.9 }}
                        animate={{ scale: 2.6, opacity: 0 }}
                        transition={{ duration: 0.9 }}
                      />
                    ) : null}
                    <span className="relative size-1.5 rounded-full bg-current" />
                  </span>
                  {isDelivered ? "message.delivered" : "message.sent"}
                </m.span>
              </AnimatePresence>
            </div>
            <p className="text-zinc-500">Chaque livraison est journalisée, tentatives comprises.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
