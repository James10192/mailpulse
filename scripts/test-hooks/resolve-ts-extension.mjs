import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RELATIVE = /^\.{1,2}\//;
const HAS_EXTENSION = /\.[cm]?[jt]sx?$/;

export async function resolve(specifier, context, nextResolve) {
  if (RELATIVE.test(specifier) && !HAS_EXTENSION.test(specifier) && context.parentURL) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
}
