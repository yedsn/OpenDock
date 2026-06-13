<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Camera, Download, Eraser, LoaderCircle, Pencil, RefreshCw, RotateCcw, Save as SaveIcon, ShieldAlert, Trash2, Upload, X } from "lucide-vue-next";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useOpenDockStore } from "../../store";
import { useI18n } from "../../i18n";
import { importAppData } from "../../storage";
import { schemaVersion } from "../../seed";
import { confirmDelete } from "../../dialog";
import type { SnapshotRecord } from "../../types";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const store = useOpenDockStore();
const { t } = useI18n();
const general = store.state.data.settings.general;
watch(() => general.autoSnapshotIntervalMinutes, () => store.startAutoSnapshotTimer());

type FeedbackKind = "info" | "success" | "error";
interface Feedback {
  kind: FeedbackKind;
  text: string;
}

const importFeedback = ref<Feedback | null>(null);
const exportFeedback = ref<Feedback | null>(null);
const snapshotFeedback = ref<Feedback | null>(null);
const resetFeedback = ref<Feedback | null>(null);

// Progress/busy state per operation section
const exportBusy = ref(false);
const importBusy = ref(false);
const snapshotBusy = ref(false);
const webdavBusy = ref(false);
const resetBusy = ref(false);
const manualSnapshotForm = ref({ label: store.createSnapshotLabel("manual"), note: "" });
const snapshotEditingId = ref<string | null>(null);
const snapshotEditForm = ref({ label: "", note: "" });

const data = computed(() => store.state.data);
const webdav = computed(() => data.value.settings.webdavSync);
const webdavPlugin = computed(() => data.value.plugins.find((p) => p.id === "webdav-sync"));
const webdavInstalled = computed(() => Boolean(webdavPlugin.value?.installed));

interface StatTile {
  label: string;
  value: string | number;
  hint?: string;
}

const stats = computed<StatTile[]>(() => {
  const d = data.value;
  const recentCount = d.collections.filter((c) => c.recent).length;
  const favoriteCount = d.collections.filter((c) => c.favorite).length;
  return [
    { label: t("settings.workspaces"), value: d.workspaces.length },
    { label: t("settings.scenes"), value: d.scenes.length },
    { label: t("settings.collections"), value: d.collections.length, hint: ` ${favoriteCount} ·  ${recentCount}` },
    { label: t("settings.resources"), value: d.items.length },
    { label: t("settings.tools"), value: d.tools.length },
    { label: t("settings.plugins"), value: d.plugins.filter((p) => p.installed).length, hint: ` ${d.plugins.length}` },
    { label: t("settings.activityLog"), value: d.activity.length },
    { label: "Schema", value: `v${d.schemaVersion}`, hint: d.schemaVersion === schemaVersion ? t("settings.currentVersion") : `${schemaVersion}` }
  ];
});

const lastActivityAt = computed(() => data.value.activity[0]?.createdAt || "—");

function suggestedFileName(): string {
  return `opendock-export-${formatStamp(new Date())}.json`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function downloadExport() {
  exportBusy.value = true;
  exportFeedback.value = { kind: "info", text: t("settings.exporting") };
  try {
    store.exportData();
    const content = store.state.selectedExport;
    const fileName = suggestedFileName();

    if (isTauri) {
      try {
        const filePath = await save({
          defaultPath: fileName,
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
        if (!filePath) { exportFeedback.value = null; return; }
        const size = await invoke<number>("write_text_file", { path: filePath, contents: content });
      exportFeedback.value = { kind: "success", text: t("settings.savedTo", { path: filePath, size: formatBytes(size) }) };
      } catch {
        browserDownload(fileName, content);
      }
    } else {
      browserDownload(fileName, content);
    }
  } catch (error) {
      exportFeedback.value = { kind: "error", text: t("settings.exportFailed", { error: describeError(error) }) };
  } finally {
    exportBusy.value = false;
  }
}

function browserDownload(fileName: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
      exportFeedback.value = { kind: "success", text: t("settings.savedTo", { path: fileName, size: formatBytes(blob.size) }) };
}


async function onImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  importBusy.value = true;
      importFeedback.value = { kind: "info", text: t("settings.readingFile", { name: file.name }) };
  const reader = new FileReader();
  reader.onload = async () => {
      importFeedback.value = { kind: "info", text: t("settings.parsingFile", { name: file.name }) };
    try {
      if (!(await confirmDelete(t("settings.importConfirm", { name: file.name })))) {
        importFeedback.value = { kind: "info", text: t("settings.importCancelled") };
        return;
      }
      const text = String(reader.result || "");
      const parsed = await importAppData(text);
      await store.replaceData(parsed);
      store.log(t("log.importedData", { name: file.name }));
      importFeedback.value = {
        kind: "success",
        text: t("settings.imported", { name: file.name, collections: parsed.collections.length, items: parsed.items.length })
      };
    } catch (error) {
      const message = describeError(error);
      store.log(`import failed: `);
      importFeedback.value = { kind: "error", text: t("settings.importFailed", { error: message }) };
    } finally {
      importBusy.value = false;
      input.value = "";
    }
  };
  reader.onerror = () => {
    importBusy.value = false;
      importFeedback.value = { kind: "error", text: t("settings.readFileFailed", { error: describeError(reader.error) }) };
    input.value = "";
  };
  reader.readAsText(file);
}

async function confirmClearRecent() {
  const count = data.value.collections.filter((c) => c.recent).length;
  if (count === 0) {
    importFeedback.value = null;
    store.log(t("log.noRecentToClear"));
    return;
  }
    if (!(await confirmDelete(t("settings.clearRecentConfirm", { count })))) return;
  store.clearRecent();
}

async function confirmReset() {
  resetBusy.value = true;
  resetFeedback.value = null;
  if (!(await confirmDelete(t("settings.resetConfirm")))) { resetBusy.value = false; return; }
  if (!(await confirmDelete(t("settings.resetConfirmAgain")))) { resetBusy.value = false; return; }
  resetFeedback.value = { kind: "info", text: t("settings.resetting") };
  try {
    await store.resetData();
    resetFeedback.value = { kind: "success", text: t("settings.resetDone") };
  } catch (error) {
    resetFeedback.value = { kind: "error", text: t("settings.resetFailed", { error: describeError(error) }) };
  } finally {
    resetBusy.value = false;
  }
}

function jumpToWebdav() {
  if (!webdavPlugin.value) {
    store.state.settingsCategory = "plugins";
    return;
  }
  store.state.settingsCategory = `plugin:${webdavPlugin.value.id}`;
}

async function onTestWebdav() {
  webdavBusy.value = true;
  try {
    await store.testWebdav();
  } finally {
    webdavBusy.value = false;
  }
}

async function onSyncWebdavNow() {
  webdavBusy.value = true;
  try {
    await store.syncWebdavNow();
  } finally {
    webdavBusy.value = false;
  }
}

function describeError(error: unknown): string {
  if (!error) return t("settings.unknownError");
  if (error instanceof Error) return error.message;
  return String(error);
}

function formatStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "-" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}


async function takeManualSnapshot() {
  const label = manualSnapshotForm.value.label.trim();
  if (!label) {
    snapshotFeedback.value = { kind: "error", text: t("settings.snapshotNameRequired") };
    return;
  }
  snapshotBusy.value = true;
  snapshotFeedback.value = { kind: "info", text: t("settings.capturing") };
  try {
    await store.takeSnapshot(label, "manual", manualSnapshotForm.value.note);
    manualSnapshotForm.value = { label: store.createSnapshotLabel("manual"), note: "" };
    snapshotFeedback.value = { kind: "success", text: t("settings.snapshotCreated") };
  } catch (e) {
    snapshotFeedback.value = { kind: "error", text: t("settings.snapshotCreateFailed", { error: describeError(e) }) };
  } finally {
    snapshotBusy.value = false;
  }
}

async function refreshSnapshotList() {
  snapshotBusy.value = true;
  try {
    await store.refreshSnapshots();
    snapshotFeedback.value = { kind: "success", text: t("settings.snapshotListRefreshed") };
  } catch (e) {
    snapshotFeedback.value = { kind: "error", text: t("settings.snapshotRefreshFailed", { error: describeError(e) }) };
  } finally {
    snapshotBusy.value = false;
  }
}

async function onRestoreSnapshot(id: string, label: string) {
  if (!(await confirmDelete(t("settings.confirmRestore", { label })))) return;
  snapshotBusy.value = true;
  snapshotFeedback.value = { kind: "info", text: t("settings.restoring") };
  try {
    await store.restoreSnapshot(id);
    snapshotFeedback.value = { kind: "success", text: t("settings.snapshotRestored") };
  } catch (e) {
    snapshotFeedback.value = { kind: "error", text: t("settings.restoreFailed", { error: describeError(e) }) };
  } finally {
    snapshotBusy.value = false;
  }
}

async function onDeleteSnapshot(id: string, label: string) {
  if (!(await confirmDelete(t("settings.confirmDeleteSnapshot", { label })))) return;
  snapshotBusy.value = true;
  try {
    await store.removeSnapshot(id);
    snapshotFeedback.value = { kind: "success", text: t("settings.snapshotDeleted") };
  } catch (e) {
    snapshotFeedback.value = { kind: "error", text: t("settings.deleteSnapshotFailed", { error: describeError(e) }) };
  } finally {
    snapshotBusy.value = false;
  }
}

function beginEditSnapshot(snap: SnapshotRecord) {
  snapshotEditingId.value = snap.id;
  snapshotEditForm.value = { label: snap.label, note: snap.note || "" };
  snapshotFeedback.value = null;
}

function cancelEditSnapshot() {
  snapshotEditingId.value = null;
  snapshotEditForm.value = { label: "", note: "" };
}

async function saveSnapshotMeta(id: string) {
  const label = snapshotEditForm.value.label.trim();
  if (!label) {
    snapshotFeedback.value = { kind: "error", text: t("settings.snapshotNameRequired") };
    return;
  }
  snapshotBusy.value = true;
  try {
    await store.updateSnapshot(id, label, snapshotEditForm.value.note);
    cancelEditSnapshot();
    snapshotFeedback.value = { kind: "success", text: t("settings.snapshotUpdated") };
  } catch (e) {
    snapshotFeedback.value = { kind: "error", text: t("settings.snapshotUpdateFailed", { error: describeError(e) }) };
  } finally {
    snapshotBusy.value = false;
  }
}

function snapshotKindLabel(kind: string): string {
  if (kind === "auto") return t("settings.snapshotKindAuto");
  if (kind === "pre-import") return t("settings.snapshotKindPreImport");
  return t("settings.snapshotKindManual");
}

function formatSnapshotTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      <span>{{ $t("settings.dataOverview") }}</span>
      <span class="data-meta">{{ $t("settings.recentActivity") }} {{ lastActivityAt }}</span>
    </div>
    <div class="settings-card-description">{{ $t("settings.dataOverviewDesc") }}</div>
    <div class="data-stats">
      <div v-for="tile in stats" :key="tile.label" class="data-stat-tile">
        <div class="data-stat-value">{{ tile.value }}</div>
        <div class="data-stat-label">{{ tile.label }}</div>
        <div v-if="tile.hint" class="data-stat-hint">{{ tile.hint }}</div>
      </div>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">{{ $t("settings.exportBackup") }}</div>
    <div class="settings-card-description">{{ $t("settings.exportDesc") }}</div>
    <div class="data-actions">
      <button class="settings-action-button" type="button" :disabled="exportBusy" @click="downloadExport">
        <template v-if="exportBusy"><LoaderCircle class="spin-icon" />{{ $t("settings.exporting") }}</template>
        <template v-else><Download />{{ $t("settings.downloadJson") }}</template>
      </button>
    </div>
    <div v-if="exportBusy" class="progress-bar"><div class="progress-bar-indeterminate"></div></div>
    <p v-if="exportFeedback" class="data-feedback" :class="exportFeedback.kind">{{ exportFeedback.text }}</p>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">{{ $t("settings.importData") }}</div>
    <div class="settings-card-description">
      {{ $t("settings.importDesc", { version: schemaVersion }) }}
    </div>
    <div class="data-actions">
      <label class="settings-action-button file-trigger" :class="{ 'is-busy': importBusy }">
        <template v-if="importBusy"><LoaderCircle class="spin-icon" />{{ $t("settings.exporting") }}</template>
        <template v-else><Upload />{{ $t("settings.selectingFile") }}</template>
        <input type="file" accept="application/json,.json" :disabled="importBusy" @change="onImport" />
      </label>
    </div>
    <div v-if="importBusy" class="progress-bar"><div class="progress-bar-indeterminate"></div></div>
    <p v-if="importFeedback" class="data-feedback" :class="importFeedback.kind">{{ importFeedback.text }}</p>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">
      <span>{{ $t("settings.cloudSync") }}</span>
      <button class="settings-action-button" type="button" @click="jumpToWebdav">
        <RefreshCw />{{ $t("settings.openWebdavSettings") }}
      </button>
    </div>
    <div class="settings-card-description">{{ $t("settings.cloudSyncDesc") }}</div>
    <div class="sync-status-strip">
      <span>{{ webdavInstalled ? t("settings.webdavPluginEnabled") : t("settings.webdavPluginDisabled") }}</span>
      <span>{{ $t("settings.status") }}{{ webdav.status || t("settings.notConfigured") }}</span>
      <span>{{ $t("settings.lastSync") }}{{ webdav.lastSyncAt || "—" }}</span>
      <span>{{ $t("settings.scope") }}{{ webdav.syncScope || "—" }}</span>
    </div>
    <div class="data-actions" v-if="webdavInstalled">
      <button class="settings-action-button" type="button" :disabled="webdavBusy" @click="onTestWebdav">
        <template v-if="webdavBusy"><LoaderCircle class="spin-icon" />{{ $t("settings.testing") }}</template>
        <template v-else>{{ $t("settings.testConnection") }}</template>
      </button>
      <button class="settings-action-button" type="button" :disabled="webdavBusy" @click="onSyncWebdavNow">
        <template v-if="webdavBusy"><LoaderCircle class="spin-icon" />{{ $t("settings.syncing") }}</template>
        <template v-else>{{ $t("settings.syncNow") }}</template>
      </button>
    </div>
    <div v-if="webdavBusy" class="progress-bar"><div class="progress-bar-indeterminate"></div></div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">
      <span>{{ $t("settings.dataSnapshots") }}</span>
      <div class="snapshot-title-actions">
        <button class="settings-action-button" type="button" :disabled="snapshotBusy" @click="takeManualSnapshot">
          <template v-if="snapshotBusy"><LoaderCircle class="spin-icon" />{{ $t("settings.capturing") }}</template>
          <template v-else><Camera />{{ $t("settings.takeSnapshotNow") }}</template>
        </button>
        <button class="settings-action-button" type="button" :disabled="snapshotBusy" @click="refreshSnapshotList"><RefreshCw />{{ $t("settings.refresh") }}</button>
      </div>
    </div>
    <div class="settings-card-description">
      {{ $t("settings.snapshotDesc") }}
    </div>
    <div class="snapshot-create-form">
      <label class="setting-field">
        <span>{{ $t("settings.snapshotName") }}</span>
        <input v-model="manualSnapshotForm.label" type="text" :placeholder="$t('settings.snapshotNamePlaceholder')" />
      </label>
      <label class="setting-field full">
        <span>{{ $t("settings.snapshotNote") }}</span>
        <textarea v-model="manualSnapshotForm.note" :placeholder="$t('settings.snapshotNotePlaceholder')"></textarea>
      </label>
    </div>
    <div class="snapshot-config">
      <label class="setting-field">
        <span>{{ $t("settings.autoSnapshotInterval") }}</span>
        <div class="snapshot-interval-input">
          <input v-model.number="general.autoSnapshotIntervalMinutes" type="number" min="0" max="1440" />
          <small>{{ $t("settings.setZeroToDisable") }}</small>
        </div>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.maxAutoSnapshots") }}</span>
        <div class="snapshot-interval-input">
          <input v-model.number="general.autoSnapshotKeepCount" type="number" min="1" max="100" />
          <small>{{ $t("settings.excessCleanedNext") }}</small>
        </div>
      </label>
    </div>
    <div v-if="snapshotBusy" class="progress-bar"><div class="progress-bar-indeterminate"></div></div>
    <p v-if="snapshotFeedback" class="data-feedback" :class="snapshotFeedback.kind">{{ snapshotFeedback.text }}</p>
    <div v-if="!store.state.snapshots.length" class="snapshot-empty">{{ $t("settings.noSnapshots") }}</div>
    <ul v-else class="snapshot-list">
      <li v-for="snap in store.state.snapshots" :key="snap.id" class="snapshot-row">
        <span class="snapshot-kind" :class="snap.kind">{{ snapshotKindLabel(snap.kind) }}</span>
        <span v-if="snapshotEditingId === snap.id" class="snapshot-main snapshot-edit-form">
          <input v-model="snapshotEditForm.label" type="text" :placeholder="$t('settings.snapshotNamePlaceholder')" />
          <textarea v-model="snapshotEditForm.note" :placeholder="$t('settings.snapshotNotePlaceholder')"></textarea>
          <small>{{ formatSnapshotTime(snap.createdAt) }} · {{ formatBytes(snap.size) }}</small>
        </span>
        <span v-else class="snapshot-main">
          <strong>{{ snap.label }}</strong>
          <em v-if="snap.note">{{ snap.note }}</em>
          <small>{{ formatSnapshotTime(snap.createdAt) }} · {{ formatBytes(snap.size) }}</small>
        </span>
        <span class="snapshot-actions">
          <template v-if="snapshotEditingId === snap.id">
            <button class="settings-action-button" type="button" :disabled="snapshotBusy" @click="saveSnapshotMeta(snap.id)"><SaveIcon />{{ $t("settings.save") }}</button>
            <button class="settings-action-button" type="button" :disabled="snapshotBusy" @click="cancelEditSnapshot"><X />{{ $t("settings.cancel") }}</button>
          </template>
          <template v-else>
            <button class="settings-action-button" type="button" :disabled="snapshotBusy" @click="beginEditSnapshot(snap)"><Pencil />{{ $t("settings.edit") }}</button>
            <button class="settings-action-button" type="button" :disabled="snapshotBusy" @click="onRestoreSnapshot(snap.id, snap.label)"><RotateCcw />{{ $t("settings.restore") }}</button>
            <button class="settings-action-button" type="button" :disabled="snapshotBusy" @click="onDeleteSnapshot(snap.id, snap.label)"><Trash2 /></button>
          </template>
        </span>
      </li>
    </ul>
  </section>

  <section class="settings-card danger-card">
    <div class="settings-card-title">
      <span class="danger-title"><ShieldAlert />{{ $t("settings.maintenance") }}</span>
    </div>
    <div class="settings-card-description">{{ $t("settings.maintenanceDesc") }}</div>
    <div class="data-actions danger-actions">
      <button class="settings-action-button" type="button" @click="confirmClearRecent">
        <Eraser />{{ $t("settings.clearRecentBtn") }}
      </button>
      <button class="settings-action-button data-danger" type="button" :disabled="resetBusy" @click="confirmReset">
        <template v-if="resetBusy"><LoaderCircle class="spin-icon" />{{ $t("settings.resetting") }}</template>
        <template v-else><RotateCcw />{{ $t("settings.resetData") }}</template>
      </button>
    </div>
    <div v-if="resetBusy" class="progress-bar"><div class="progress-bar-indeterminate"></div></div>
    <p v-if="resetFeedback" class="data-feedback" :class="resetFeedback.kind">{{ resetFeedback.text }}</p>
  </section>
</template>

<style scoped>
.data-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.data-stat-tile {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.data-stat-value {
  color: var(--text);
  font-size: 18px;
  font-weight: 600;
}
.data-stat-label {
  color: var(--faint);
  font-size: 11px;
}
.data-stat-hint {
  color: var(--muted);
  font-size: 10px;
}
.data-meta {
  color: var(--muted);
  font-size: 11px;
  font-weight: 400;
}
.data-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.file-trigger {
  position: relative;
  cursor: pointer;
}
.file-trigger input[type="file"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.data-feedback {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--radius);
  font-size: 12px;
  line-height: 1.4;
}
.data-feedback.info {
  color: var(--muted);
  background: var(--bg-3);
  border: 1px solid var(--line);
}
.data-feedback.success {
  color: #4ade80;
  background: color-mix(in srgb, #4ade80 8%, var(--bg-3));
  border: 1px solid color-mix(in srgb, #4ade80 24%, var(--line));
}
.data-feedback.error {
  color: #f87171;
  background: color-mix(in srgb, #f87171 8%, var(--bg-3));
  border: 1px solid color-mix(in srgb, #f87171 24%, var(--line));
}
.sync-status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  padding: 8px 10px;
  color: var(--muted);
  font-size: 11px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.danger-card {
  border-color: color-mix(in srgb, #f87171 36%, var(--line));
}
.danger-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.danger-actions {
  margin-top: 2px;
}
.data-danger {
  color: #f87171 !important;
  background: color-mix(in srgb, #f87171 12%, var(--accent-soft)) !important;
  border-color: color-mix(in srgb, #f87171 42%, transparent) !important;
}
.data-danger:hover {
  background: color-mix(in srgb, #f87171 22%, var(--accent-soft)) !important;
  border-color: color-mix(in srgb, #f87171 62%, transparent) !important;
}
.snapshot-title-actions {
  display: flex;
  gap: 8px;
}
.snapshot-create-form {
  display: grid;
  grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
  gap: 10px 12px;
  padding: 10px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.snapshot-create-form textarea,
.snapshot-edit-form textarea {
  min-height: 54px;
}
.snapshot-empty {
  color: var(--muted);
  font-size: 12px;
  padding: 8px 0;
}
.snapshot-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow-y: auto;
}
.snapshot-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.snapshot-main {
  flex: 1;
  min-width: 0;
}
.snapshot-main strong { display: block; }
.snapshot-main em { display: block; margin-top: 2px; color: var(--muted); font-size: 12px; font-style: normal; white-space: pre-wrap; }
.snapshot-main small { color: var(--muted); font-size: 11px; }
.snapshot-edit-form {
  display: grid;
  gap: 6px;
}
.snapshot-edit-form input,
.snapshot-edit-form textarea {
  width: 100%;
  min-width: 0;
  color: var(--text);
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  outline: 0;
  font-size: 12px;
}
.snapshot-edit-form input { height: 30px; padding: 0 8px; }
.snapshot-edit-form textarea { padding: 8px; resize: vertical; }
.snapshot-kind {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
}
.snapshot-kind.manual { background: color-mix(in srgb, #60a5fa 16%, var(--bg-3)); color: #60a5fa; }
.snapshot-kind.auto { background: color-mix(in srgb, #4ade80 16%, var(--bg-3)); color: #4ade80; }
.snapshot-kind.pre-import { background: color-mix(in srgb, #fbbf24 16%, var(--bg-3)); color: #fbbf24; }
.snapshot-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}
.snapshot-config { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; }
.snapshot-config .setting-field { max-width: 360px; }
.snapshot-interval-input { display: flex; align-items: center; gap: 10px; }
.snapshot-interval-input input { flex: 0 0 96px; height: 28px; padding: 0 8px; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); font-size: 12px; }
.snapshot-interval-input small { color: var(--muted); font-size: 11px; }

/* Progress bar - indeterminate animated stripe */
.progress-bar {
  position: relative;
  width: 100%;
  height: 3px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--bg-3);
}
.progress-bar-indeterminate {
  position: absolute;
  inset: 0;
  width: 300%;
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 6px,
    color-mix(in srgb, var(--accent) 50%, transparent) 6px,
    color-mix(in srgb, var(--accent) 50%, transparent) 12px
  );
  animation: progress-stripe 0.8s linear infinite;
  border-radius: 2px;
}
@keyframes progress-stripe {
  from { transform: translateX(-66.666%); }
  to   { transform: translateX(0%); }
}

/* Spinning icon */
.spin-icon {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Busy file trigger */
.file-trigger.is-busy {
  pointer-events: none;
  opacity: 0.7;
}

@media (max-width: 760px) {
  .snapshot-create-form,
  .snapshot-config {
    grid-template-columns: 1fr;
  }
  .snapshot-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .snapshot-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
