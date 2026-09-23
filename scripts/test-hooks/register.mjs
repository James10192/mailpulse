// Lets `node --experimental-strip-types --test` load modules that import their
// siblings without an extension, as the Next.js bundler allows.
import { register } from "node:module";

register("./resolve-ts-extension.mjs", import.meta.url);
