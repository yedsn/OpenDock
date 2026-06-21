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

/**
 * Confirm a non-destructive action (e.g. opening resources) via a native dialog.
 * window.confirm is unavailable inside the macOS WKWebView, so we must use the
 * Tauri dialog plugin. Falls back to window.confirm when running outside Tauri
 * (e.g. vitest / browser dev).
 */
export async function confirmAction(message: string): Promise<boolean> {
  try {
    return await ask(message, { title: useI18n().t("confirm.actionTitle"), kind: "info", okLabel: useI18n().t("confirm.actionOk"), cancelLabel: useI18n().t("confirm.cancel") });
  } catch {
    // Not running inside Tauri (tests / browser dev)
    return window.confirm(message);
  }
}
