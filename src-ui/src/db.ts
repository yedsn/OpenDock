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
