import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RELATIVE = /^\.{1,2}\//;
const HAS_EXTENSION = /\.[cm]?[jt]sx?$/;
// The `@/*` path alias of tsconfig.json, resolved the way the bundler does.
const ALIAS = "@/";
const SOURCE_ROOT = new URL("../../src/", import.meta.url);
const ALIAS_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx", "/index.js"];

function resolveAlias(specifier) {
  const target = new URL(specifier.slice(ALIAS.length), SOURCE_ROOT).href;
  const candidates = HAS_EXTENSION.test(specifier) ? [target] : ALIAS_SUFFIXES.map((suffix) => `${target}${suffix}`);
  const found = candidates.find((candidate) => existsSync(fileURLToPath(candidate)));
  if (!found) {
    throw new Error(`Cannot resolve "${specifier}" under src/ (tried ${candidates.map((candidate) => fileURLToPath(candidate)).join(", ")}).`);
  }
  return found;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(ALIAS)) return nextResolve(resolveAlias(specifier), context);
  if (RELATIVE.test(specifier) && !HAS_EXTENSION.test(specifier) && context.parentURL) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
}
