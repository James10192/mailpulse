// The only way a webhook leaves our servers. Built on node:https rather than
// fetch for one reason: the `lookup` hook sees every address the name resolves
// to, at connection time. A name pointing at a private address is refused
// there, which a check on the URL alone cannot do (a public name can resolve
// to 10.0.0.5, and change between the check and the call).

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import type { LookupFunction } from "node:net";
import { isPrivateAddress, webhookUrlProblem, type AttemptResult } from "./webhook-policy";

export const PRIVATE_DESTINATION = "Adresse privée refusée";

type Resolver = (hostname: string, callback: (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void) => void;

const systemResolver: Resolver = (hostname, callback) => dnsLookup(hostname, { all: true }, callback);

/**
 * A `lookup` for node:https that resolves every address of the name and
 * refuses the connection if any of them is private.
 */
export function guardedLookup(resolve: Resolver = systemResolver): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname, (error, addresses) => {
      if (error) return callback(error, "", 0);
      if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
        const refused = Object.assign(new Error(PRIVATE_DESTINATION), { code: "EPRIVATEDESTINATION" });
        return callback(refused, "", 0);
      }
      const wanted = typeof options === "object" && options?.family ? addresses.filter((entry) => entry.family === options.family) : addresses;
      const chosen = wanted[0] ?? addresses[0];
      if (typeof options === "object" && options?.all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, wanted.length ? wanted : addresses);
      return callback(null, chosen.address, chosen.family);
    });
  };
}

function httpsPost(url: string, headers: Record<string, string>, body: string, timeoutMs: number): Promise<AttemptResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: AttemptResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const req = request(url, {
      method: "POST",
      headers: { ...headers, "content-length": Buffer.byteLength(body).toString() },
      lookup: guardedLookup(),
      timeout: timeoutMs,
    }, (response) => {
      // The body is not read for any purpose: drain it so the socket is freed.
      response.resume();
      const status = response.statusCode ?? 0;
      finish(status >= 200 && status < 300 ? { kind: "delivered" } : { kind: "http", status });
    });
    // An overall deadline, not only an idle one: a server trickling bytes must not hold the call.
    const deadline = setTimeout(() => {
      req.destroy();
      finish({ kind: "timeout" });
    }, timeoutMs);
    req.on("timeout", () => {
      req.destroy();
      finish({ kind: "timeout" });
    });
    req.on("error", (error: NodeJS.ErrnoException) => {
      finish(error.code === "EPRIVATEDESTINATION" ? { kind: "blocked", reason: PRIVATE_DESTINATION } : { kind: "network" });
    });
    req.on("close", () => clearTimeout(deadline));
    req.end(body);
  });
}

/** Swappable in tests; the application never replaces it. */
export const webhookTransport = {
  async post(url: string, headers: Record<string, string>, body: string, timeoutMs: number): Promise<AttemptResult> {
    const problem = webhookUrlProblem(url);
    if (problem) return { kind: "blocked", reason: problem };
    return httpsPost(url, headers, body, timeoutMs);
  },
};
