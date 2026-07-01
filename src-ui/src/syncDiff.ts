// Shared diff logic used by both the main thread (fallback) and the WebDAV sync
// worker. Kept dependency-free so it can run in a Worker context.

type SyncDiffCollection = "workspaces" | "scenes" | "collections" | "items" | "tombstones";

const syncDiffLabels: Record<SyncDiffCollection, string> = {
  workspaces: "工作区",
  scenes: "场景",
  collections: "集合",
  items: "资源",
  tombstones: "删除记录",
};

export function syncEntityKey(collection: SyncDiffCollection, value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  if (collection === "tombstones") {
    const scope = typeof object.collection === "string" ? object.collection : "";
    const id = typeof object.id === "string" ? object.id : "";
    return scope && id ? `${scope}:${id}` : null;
  }
  return typeof object.id === "string" ? object.id : null;
}

export function comparableSyncEntity(value: unknown): string {
  if (!value || typeof value !== "object") return JSON.stringify(value);
  const copy = { ...(value as Record<string, unknown>) };
  delete copy.sort;
  delete copy.recent;
  delete copy.recentAt;
  delete copy.favorite;
  return JSON.stringify(copy);
}

export function summarizeSyncChanges(before: Record<string, unknown>, after: Record<string, unknown>): string {
  const collections: SyncDiffCollection[] = ["workspaces", "scenes", "collections", "items", "tombstones"];
  const parts: string[] = [];
  for (const collection of collections) {
    const beforeItems = (before[collection] as unknown[]) || [];
    const afterItems = (after[collection] as unknown[]) || [];
    const beforeMap = new Map<string, unknown>();
    const afterMap = new Map<string, unknown>();
    beforeItems.forEach((item) => {
      const key = syncEntityKey(collection, item);
      if (key) beforeMap.set(key, item);
    });
    afterItems.forEach((item) => {
      const key = syncEntityKey(collection, item);
      if (key) afterMap.set(key, item);
    });
    let added = 0;
    let removed = 0;
    let updated = 0;
    afterMap.forEach((item, key) => {
      const beforeItem = beforeMap.get(key);
      if (!beforeItem) added += 1;
      else if (comparableSyncEntity(beforeItem) !== comparableSyncEntity(item)) updated += 1;
    });
    beforeMap.forEach((_item, key) => {
      if (!afterMap.has(key)) removed += 1;
    });
    const label = syncDiffLabels[collection];
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
