// WebDAV sync worker: handles the heavy JSON work off the main thread so UI
// clicks stay responsive during a running sync. Runs in a plain Worker context
// - no Tauri APIs available here. The main thread still owns invoke() calls.

interface SerializeRequest {
  kind: "serialize";
  id: number;
  raw: string;
  pretty?: boolean;
}

interface ParseRequest {
  kind: "parse";
  id: number;
  payload: string;
}

interface DiffRequest {
  kind: "diff";
  id: number;
  beforeRaw: string;
  afterRaw: string;
}

type WorkerRequest = SerializeRequest | ParseRequest | DiffRequest;

interface WorkerSuccess { id: number; ok: true; result: unknown }
interface WorkerFailure { id: number; ok: false; error: string }
type WorkerResponse = WorkerSuccess | WorkerFailure;

function stripCredentials(parsed: unknown): unknown {
  // Match exportAppData: blank out the WebDAV credential reference on export.
  const root = parsed as { settings?: { webdavSync?: { credentialRef?: string } }; activity?: unknown[] };
  if (root?.settings?.webdavSync) {
    root.settings.webdavSync.credentialRef = "";
  }
  if (root && typeof root === "object" && Array.isArray(root.activity)) {
    root.activity = [];
  }
  return parsed;
}

const diffLabels: Record<string, string> = {
  workspaces: "工作区",
  scenes: "场景",
  collections: "集合",
  items: "资源",
  tombstones: "删除记录",
};

function entityKey(collection: string, value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  if (collection === "tombstones") {
    const scope = typeof object.collection === "string" ? object.collection : "";
    const id = typeof object.id === "string" ? object.id : "";
    return scope && id ? `${scope}:${id}` : null;
  }
  return typeof object.id === "string" ? object.id : null;
}

function comparableEntity(value: unknown): string {
  if (!value || typeof value !== "object") return JSON.stringify(value);
  const copy = { ...(value as Record<string, unknown>) };
  delete copy.sort;
  delete copy.recent;
  delete copy.recentAt;
  delete copy.favorite;
  delete copy.usageCount;
  return JSON.stringify(copy);
}

function summarizeDiff(before: Record<string, unknown>, after: Record<string, unknown>): string {
  const collections = ["workspaces", "scenes", "collections", "items", "tombstones"];
  const parts: string[] = [];
  for (const collection of collections) {
    const beforeItems = (before[collection] as unknown[]) || [];
    const afterItems = (after[collection] as unknown[]) || [];
    const beforeMap = new Map<string, unknown>();
    const afterMap = new Map<string, unknown>();
    for (const item of beforeItems) {
      const key = entityKey(collection, item);
      if (key) beforeMap.set(key, item);
    }
    for (const item of afterItems) {
      const key = entityKey(collection, item);
      if (key) afterMap.set(key, item);
    }
    let added = 0;
    let removed = 0;
    let updated = 0;
    afterMap.forEach((item, key) => {
      const beforeItem = beforeMap.get(key);
      if (!beforeItem) added += 1;
      else if (comparableEntity(beforeItem) !== comparableEntity(item)) updated += 1;
    });
    beforeMap.forEach((_item, key) => {
      if (!afterMap.has(key)) removed += 1;
    });
    const label = diffLabels[collection] || collection;
    const details: string[] = [];
    if (added) details.push(`新增 ${added}`);
    if (updated) details.push(`更新 ${updated}`);
    if (removed) details.push(`删除 ${removed}`);
    if (details.length) parts.push(`${label}${details.join("、")}`);
  }
  if (!parts.length) return "无数据变化";
  const visible = parts.slice(0, 3);
  const extraCount = parts.length - visible.length;
  return extraCount > 0 ? `${visible.join("；")}；另 ${extraCount} 项变化` : visible.join("；");
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  const respond = (payload: WorkerResponse) => (self as unknown as { postMessage: (data: WorkerResponse) => void }).postMessage(payload);
  try {
    if (message.kind === "serialize") {
      const parsed = JSON.parse(message.raw);
      const stripped = stripCredentials(parsed);
      const json = message.pretty ? JSON.stringify(stripped, null, 2) : JSON.stringify(stripped);
      respond({ id: message.id, ok: true, result: json });
    } else if (message.kind === "parse") {
      const parsed = JSON.parse(message.payload);
      respond({ id: message.id, ok: true, result: parsed });
    } else if (message.kind === "diff") {
      const before = JSON.parse(message.beforeRaw) as Record<string, unknown>;
      const after = JSON.parse(message.afterRaw) as Record<string, unknown>;
      const summary = summarizeDiff(before, after);
      respond({ id: message.id, ok: true, result: summary });
    } else {
      respond({ id: (message as { id: number }).id, ok: false, error: "unknown request" });
    }
  } catch (error) {
    respond({ id: (message as { id: number }).id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
