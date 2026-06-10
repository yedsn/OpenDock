import { ask } from "@tauri-apps/plugin-dialog";

/**
 * Confirm a destructive action via a native dialog.
 * Falls back to window.confirm when running outside Tauri (e.g. vitest).
 */
export async function confirmDelete(message: string): Promise<boolean> {
  try {
    return await ask(message, { title: "确认删除", kind: "warning", okLabel: "删除", cancelLabel: "取消" });
  } catch {
    // Not running inside Tauri (tests / browser dev)
    return window.confirm(message);
  }
}