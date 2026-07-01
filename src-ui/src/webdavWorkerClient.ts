// Bridge to the WebDAV sync worker. Lazy-instantiated so non-sync paths never
// pay the worker spin-up cost. Falls back to inline execution when Workers are
// unavailable (e.g. Vitest node environment) so behavior stays correct.

import WebdavWorker from "./webdavWorker?worker";

type RequestKind = "serialize" | "parse" | "diff";

interface WorkerRequest { kind: RequestKind; id: number; raw?: string; payload?: string; beforeRaw?: string; afterRaw?: string; pretty?: boolean }
interface WorkerResponse { id: number; ok: boolean; result?: unknown; error?: string }

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (res: WorkerResponse) => void>();

function ensureWorker(): Worker | null {
  if (worker) return worker;
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  worker = new WebdavWorker();
  worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
    const res = event.data;
    const resolve = pending.get(res.id);
    if (resolve) { pending.delete(res.id); resolve(res); }
  });
  return worker;
}

function callWorker(req: Omit<WorkerRequest, "id">): Promise<WorkerResponse> {
  const w = ensureWorker();
  if (!w) return Promise.resolve<WorkerResponse>({ id: 0, ok: false, error: "worker-unavailable" });
  const id = ++seq;
  return new Promise<WorkerResponse>((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ ...req, id });
  });
}

/**
 * Serialize app data to JSON off the main thread. The main thread does one
 * JSON.stringify (which reads through Vue reactive getters and produces a plain
 * string) so postMessage never sees a Proxy; the worker then parses, strips the
 * stored credential, and re-stringifies. Falls back to inline when no worker.
 */
export async function serializeAppDataOffThread(data: unknown, pretty: boolean): Promise<string> {
  const raw = JSON.stringify(data);
  const res = await callWorker({ kind: "serialize", raw, pretty });
  if (res.ok && typeof res.result === "string") return res.result;
  const { exportAppData } = await import("./storage");
  return exportAppData(JSON.parse(raw) as never, pretty);
}

/** Parse a JSON payload off the main thread. Falls back to JSON.parse. */
export async function parseJsonOffThread(payload: string): Promise<unknown> {
  const res = await callWorker({ kind: "parse", payload });
  if (res.ok) return res.result;
  return JSON.parse(payload);
}

/** Compute a human-readable sync diff summary off the main thread. */
export async function summarizeDiffOffThread(before: unknown, after: unknown): Promise<string> {
  const beforeRaw = JSON.stringify(before);
  const afterRaw = JSON.stringify(after);
  const res = await callWorker({ kind: "diff", beforeRaw, afterRaw });
  if (res.ok && typeof res.result === "string") return res.result;
  const { summarizeSyncChanges } = await import("./syncDiff");
  return summarizeSyncChanges(JSON.parse(beforeRaw) as Record<string, unknown>, JSON.parse(afterRaw) as Record<string, unknown>);
}
