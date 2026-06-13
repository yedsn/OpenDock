import { invoke } from "@tauri-apps/api/core";

let dbReady = false;

export async function ensureDb(): Promise<void> {
  if (dbReady) return;
  await invoke("db_init");
  dbReady = true;
}

/** Execute a single SQL statement with no params (e.g. DELETE FROM table). */
export async function dbExecute(sql: string): Promise<number> {
  await ensureDb();
  return await invoke<number>("db_execute", { sql });
}

/** Execute SQL with params (array of string | null). */
export async function dbExecuteParams(sql: string, params: (string | null)[]): Promise<number> {
  await ensureDb();
  return await invoke<number>("db_execute_params", { sql, params });
}

/** Get a single value from app_state by key. */
export async function dbGetValue(key: string): Promise<string | undefined> {
  await ensureDb();
  const result = await invoke<string | null>("db_get_value", { key });
  return result ?? undefined;
}

/** Set a key-value pair in app_state. */
export async function dbSetValue(key: string, value: string): Promise<void> {
  await ensureDb();
  await invoke("db_set_value", { key, value });
}

/** List all values from a table (returns raw JSON strings). */
export async function dbListTable(table: string): Promise<string[]> {
  await ensureDb();
  return await invoke<string[]>("db_list_table", { table });
}

/** Bulk insert rows (each row is a JSON string of the entity). */
export async function dbBulkInsert(table: string, rows: string[]): Promise<number> {
  await ensureDb();
  return await invoke<number>("db_bulk_insert", { table, rows });
}

/** Delete all rows from a table. */
export async function dbClearTable(table: string): Promise<void> {
  await dbExecute("DELETE FROM " + table);
}

// ---- Snapshot helpers ----

import type { SnapshotKind, SnapshotRecord } from "./types";

function snapshotUnavailable(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  return new Error(
    `快照功能不可用: ${msg}。请重启应用以加载新功能，或确认当前运行环境支持 Tauri。`
  );
}

export async function snapshotCreate(id: string, kind: SnapshotKind, label: string, note: string, createdAt: string, payload: string): Promise<void> {
  await ensureDb();
  try {
    await invoke("snapshot_create", { id, kind, label, note, createdAt, payload });
  } catch (e) { throw snapshotUnavailable(e); }
}

export async function snapshotUpdateMeta(id: string, label: string, note: string): Promise<void> {
  await ensureDb();
  try {
    await invoke("snapshot_update_meta", { id, label, note });
  } catch (e) { throw snapshotUnavailable(e); }
}

export async function snapshotList(): Promise<SnapshotRecord[]> {
  await ensureDb();
  try {
    return await invoke<SnapshotRecord[]>("snapshot_list");
  } catch (e) { throw snapshotUnavailable(e); }
}

export async function snapshotGet(id: string): Promise<string | undefined> {
  await ensureDb();
  try {
    const result = await invoke<string | null>("snapshot_get", { id });
    return result ?? undefined;
  } catch (e) { throw snapshotUnavailable(e); }
}

export async function snapshotDelete(id: string): Promise<void> {
  await ensureDb();
  try {
    await invoke("snapshot_delete", { id });
  } catch (e) { throw snapshotUnavailable(e); }
}

export async function snapshotPrune(kind: SnapshotKind, keep: number): Promise<number> {
  await ensureDb();
  try {
    return await invoke<number>("snapshot_prune", { kind, keep });
  } catch (e) { throw snapshotUnavailable(e); }
}

// ---- WebDAV credential helpers ----

export async function webdavSetCredential(password: string): Promise<void> {
  await ensureDb();
  await invoke("webdav_set_credential", { password });
}

export async function webdavGetCredential(): Promise<string> {
  await ensureDb();
  const result = await invoke<string>("webdav_get_credential");
  return result ?? "";
}
