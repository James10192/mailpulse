import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RELATIVE = /^\.{1,2}\//;
const HAS_EXTENSION = /\.[cm]?[jt]sx?$/;
// The `@/*` path alias of tsconfig.json, resolved the way the bundler does.
const ALIAS = "@/";
const SOURCE_ROOT = new URL("../../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(ALIAS)) {
    const target = new URL(specifier.slice(ALIAS.length), SOURCE_ROOT);
    for (const candidate of HAS_EXTENSION.test(specifier) ? [target.href] : [`${target.href}.ts`, `${target.href}/index.ts`]) {
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate, context);
    }
  }
  if (RELATIVE.test(specifier) && !HAS_EXTENSION.test(specifier) && context.parentURL) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
}
