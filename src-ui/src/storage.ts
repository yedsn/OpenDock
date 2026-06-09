import { createSeedData, schemaVersion } from "./seed";
import { dbGetValue, dbSetValue, dbClearTable, dbListTable, dbBulkInsert } from "./db";
import type { AppData } from "./types";

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

/** Reset to seed data. */
export async function resetAppData(): Promise<AppData> {
  const seed = createSeedData();
  await seedDb(seed);
  return seed;
}

/** Export data as JSON, excluding sensitive credentials. */
export function exportAppData(data: AppData): string {
  const copy = JSON.parse(JSON.stringify(data));
  copy.settings.webdavSync.credentialRef = "";
  return JSON.stringify(copy, null, 2);
}

/** Import data from JSON string. */
export async function importAppData(raw: string): Promise<AppData> {
  const data = JSON.parse(raw) as AppData;
  if (!data.schemaVersion || data.schemaVersion !== schemaVersion) {
    throw new Error("Incompatible schema version");
  }
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
