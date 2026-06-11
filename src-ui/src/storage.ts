import { createSeedData, schemaVersion } from "./seed";
import {
  dbGetValue,
  dbSetValue,
  dbClearTable,
  dbListTable,
  dbBulkInsert,
  snapshotCreate as dbSnapshotCreate,
  snapshotList as dbSnapshotList,
  snapshotGet as dbSnapshotGet,
  snapshotDelete as dbSnapshotDelete,
  snapshotPrune as dbSnapshotPrune,
} from "./db";
import type { AppData, SnapshotKind, SnapshotRecord } from "./types";

const ACTIVE_WORKSPACE_KEY = "activeWorkspaceId";
const ACTIVE_SCENE_KEY = "activeSceneId";
const ACTIVE_COLLECTION_KEY = "activeCollectionId";
const SCHEMA_VERSION_KEY = "schemaVersion";

function parseJsonRows<T>(rows: string[]): T[] {
  return rows.map((raw) => JSON.parse(raw) as T);
}

/** Load full app data from SQLite. Falls back to seed data on first run. */
export async function loadAppData(): Promise<AppData> {
  const storedVersion = await dbGetValue(SCHEMA_VERSION_KEY);
  if (!storedVersion || storedVersion !== String(schemaVersion)) {
    const seed = createSeedData();
    await seedDb(seed);
    return seed;
  }

  return {
    schemaVersion,
    activeWorkspaceId: (await dbGetValue(ACTIVE_WORKSPACE_KEY)) || "default",
    activeSceneId: (await dbGetValue(ACTIVE_SCENE_KEY)) || "official",
    activeCollectionId: (await dbGetValue(ACTIVE_COLLECTION_KEY)) || "dev-web",
    workspaces: parseJsonRows(await dbListTable("workspaces")),
    scenes: parseJsonRows(await dbListTable("scenes")),
    collections: parseJsonRows(await dbListTable("collections")),
    items: parseJsonRows(await dbListTable("items")),
    tools: parseJsonRows(await dbListTable("tools")),
    plugins: parseJsonRows(await dbListTable("plugins")),
    pluginStore: parseJsonRows(await dbListTable("plugin_store")),
    settings: JSON.parse((await dbGetValue("settings")) || "{}"),
    activity: parseJsonRows(await dbListTable("activity")),
  };
}

/** Save full app data to SQLite. */
export async function saveAppData(data: AppData): Promise<void> {
  await dbSetValue(ACTIVE_WORKSPACE_KEY, data.activeWorkspaceId);
  await dbSetValue(ACTIVE_SCENE_KEY, data.activeSceneId);
  await dbSetValue(ACTIVE_COLLECTION_KEY, data.activeCollectionId);
  await dbSetValue(SCHEMA_VERSION_KEY, String(data.schemaVersion));
  await dbSetValue("settings", JSON.stringify(data.settings));

  const upsert = async (table: string, items: unknown[]) => {
    await dbClearTable(table);
    if (items.length === 0) return;
    const rows = items.map((item) => JSON.stringify(item));
    await dbBulkInsert(table, rows);
  };

  await upsert("workspaces", data.workspaces);
  await upsert("scenes", data.scenes);
  await upsert("collections", data.collections);
  await upsert("items", data.items);
  await upsert("tools", data.tools);
  await upsert("plugins", data.plugins);
  await upsert("plugin_store", data.pluginStore);
  await upsert("activity", data.activity);
}

/** Persist lightweight navigation state without rewriting entity tables. */
export async function saveActiveState(data: Pick<AppData, "activeWorkspaceId" | "activeSceneId" | "activeCollectionId">): Promise<void> {
  await dbSetValue(ACTIVE_WORKSPACE_KEY, data.activeWorkspaceId);
  await dbSetValue(ACTIVE_SCENE_KEY, data.activeSceneId);
  await dbSetValue(ACTIVE_COLLECTION_KEY, data.activeCollectionId);
}

/** Reset to seed data. */
export async function resetAppData(): Promise<AppData> {
  const seed = createSeedData();
  await seedDb(seed);
  return seed;
}

/** Export data as JSON, excluding sensitive credentials. */
export function exportAppData(data: AppData): string {
  const copy = JSON.parse(JSON.stringify(data));
  if (copy.settings?.webdavSync) {
    copy.settings.webdavSync.credentialRef = "";
  }
  return JSON.stringify(copy, null, 2);
}

/**
 * Normalize a potentially partial / older AppData object into a valid AppData by
 * filling missing top-level fields from seed defaults. This keeps import resilient
 * to older exports that lack newer keys without throwing on each missing field.
 */
export function normalizeAppData(input: unknown): AppData {
  if (!input || typeof input !== "object") {
    throw new Error("导入文件不是合法的 JSON 对象");
  }
  const raw = input as Partial<AppData> & Record<string, unknown>;
  const seed = createSeedData();
  const merged: AppData = {
    schemaVersion: typeof raw.schemaVersion === "number" ? raw.schemaVersion : seed.schemaVersion,
    activeWorkspaceId: typeof raw.activeWorkspaceId === "string" ? raw.activeWorkspaceId : seed.activeWorkspaceId,
    activeSceneId: typeof raw.activeSceneId === "string" ? raw.activeSceneId : seed.activeSceneId,
    activeCollectionId: typeof raw.activeCollectionId === "string" ? raw.activeCollectionId : seed.activeCollectionId,
    workspaces: Array.isArray(raw.workspaces) ? raw.workspaces : seed.workspaces,
    scenes: Array.isArray(raw.scenes) ? raw.scenes : seed.scenes,
    collections: Array.isArray(raw.collections) ? raw.collections : seed.collections,
    items: Array.isArray(raw.items) ? raw.items : seed.items,
    tools: Array.isArray(raw.tools) ? raw.tools : seed.tools,
    plugins: Array.isArray(raw.plugins) ? raw.plugins : seed.plugins,
    pluginStore: Array.isArray(raw.pluginStore) ? raw.pluginStore : seed.pluginStore,
    settings: mergeSettings(raw.settings as Partial<AppData["settings"]> | undefined, seed.settings),
    activity: Array.isArray(raw.activity) ? raw.activity : seed.activity,
  };
  // Always migrate the schemaVersion forward; downstream UI works against the current shape only.
  merged.schemaVersion = schemaVersion;
  return merged;
}

function mergeSettings(input: Partial<AppData["settings"]> | undefined, fallback: AppData["settings"]): AppData["settings"] {
  if (!input) return fallback;
  return {
    general: { ...fallback.general, ...(input.general || {}) },
    search: { ...fallback.search, ...(input.search || {}) },
    templates: Array.isArray(input.templates) ? input.templates : fallback.templates,
    shortcuts: Array.isArray(input.shortcuts) ? input.shortcuts : fallback.shortcuts,
    appearance: { ...fallback.appearance, ...(input.appearance || {}) },
    webdavSync: { ...fallback.webdavSync, ...(input.webdavSync || {}) },
  };
}

/** Import data from JSON string. Tolerant of older / partial exports. */
export async function importAppData(raw: string): Promise<AppData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON 解析失败：${(e as Error).message}`);
  }
  // Check the raw schemaVersion before normalize forces it forward.
  const rawVersion = (parsed as { schemaVersion?: number } | null)?.schemaVersion;
  if (typeof rawVersion === "number" && rawVersion > schemaVersion) {
    throw new Error(`导入文件 schema 版本 v${rawVersion} 高于当前 v${schemaVersion}，请升级应用后再导入`);
  }
  const data = normalizeAppData(parsed);
  await seedDb(data);
  return data;
}

async function seedDb(data: AppData): Promise<void> {
  await dbClearTable("app_state");
  await dbSetValue(SCHEMA_VERSION_KEY, String(data.schemaVersion));
  await dbSetValue(ACTIVE_WORKSPACE_KEY, data.activeWorkspaceId);
  await dbSetValue(ACTIVE_SCENE_KEY, data.activeSceneId);
  await dbSetValue(ACTIVE_COLLECTION_KEY, data.activeCollectionId);
  await dbSetValue("settings", JSON.stringify(data.settings));

  const insert = async (table: string, items: unknown[]) => {
    await dbClearTable(table);
    if (items.length === 0) return;
    const rows = items.map((item) => JSON.stringify(item));
    await dbBulkInsert(table, rows);
  };

  await insert("workspaces", data.workspaces);
  await insert("scenes", data.scenes);
  await insert("collections", data.collections);
  await insert("items", data.items);
  await insert("tools", data.tools);
  await insert("plugins", data.plugins);
  await insert("plugin_store", data.pluginStore);
  await insert("activity", data.activity);
}

// ---- Snapshots ----

/** Take a snapshot of the current data and persist it. Returns the new record. */
export async function createSnapshot(data: AppData, kind: SnapshotKind, label: string): Promise<SnapshotRecord> {
  const id = `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const payload = exportAppData(data);
  const createdAt = new Date().toISOString();
  await dbSnapshotCreate(id, kind, label, createdAt, payload);
  return { id, kind, label, createdAt, size: payload.length };
}

export async function listSnapshots(): Promise<SnapshotRecord[]> {
  return await dbSnapshotList();
}

export async function loadSnapshot(id: string): Promise<AppData> {
  const payload = await dbSnapshotGet(id);
  if (!payload) throw new Error(`快照不存在: ${id}`);
  return normalizeAppData(JSON.parse(payload));
}

export async function deleteSnapshot(id: string): Promise<void> {
  await dbSnapshotDelete(id);
}

/** Keep the newest `keep` snapshots of the given kind, delete the rest. */
export async function pruneSnapshots(kind: SnapshotKind, keep: number): Promise<number> {
  return await dbSnapshotPrune(kind, keep);
}
