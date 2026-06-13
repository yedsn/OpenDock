import { ask } from "@tauri-apps/plugin-dialog";
import { useI18n } from "./i18n";

/**
 * Confirm a destructive action via a native dialog.
 * Falls back to window.confirm when running outside Tauri (e.g. vitest).
 */
export async function confirmDelete(message: string): Promise<boolean> {
  try {
    return await ask(message, { title: useI18n().t("confirm.title"), kind: "warning", okLabel: useI18n().t("confirm.ok"), cancelLabel: useI18n().t("confirm.cancel") });
  } catch {
    // Not running inside Tauri (tests / browser dev)
    return window.confirm(message);
  }
}