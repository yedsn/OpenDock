<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Download, RefreshCw, RotateCw } from "lucide-vue-next";
import { useOpenDockStore } from "../../store";
const store = useOpenDockStore();

type AppUpdateSummary = {
  version: string;
  currentVersion: string;
  notes?: string | null;
  pubDate?: string | null;
  target: string;
  downloadUrl: string;
};

type AppUpdateCheckResult = {
  available: boolean;
  currentVersion: string;
  update?: AppUpdateSummary | null;
};

type AppUpdateEventPayload = {
  stage: string;
  downloadedBytes?: number | null;
  contentLength?: number | null;
  message?: string | null;
};

const currentVersion = ref("0.1.0");
const checking = ref(false);
const installing = ref(false);
const updateResult = ref<AppUpdateCheckResult | null>(null);
const updateStatus = ref("");
const updateError = ref("");
const updateInstalled = ref(false);
const downloadedBytes = ref(0);
const contentLength = ref(0);
let unlistenUpdate: UnlistenFn | null = null;

const downloadPercent = computed(() => {
  if (!contentLength.value) return 0;
  return Math.min(100, Math.round((downloadedBytes.value / contentLength.value) * 100));
});

function formatBytes(value: number): string {
  if (!value) return "0 MB";
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

async function checkUpdate() {
  checking.value = true;
  updateError.value = "";
  updateStatus.value = "";
  updateInstalled.value = false;
  try {
    updateResult.value = await invoke<AppUpdateCheckResult>("check_app_update");
    currentVersion.value = updateResult.value.currentVersion || currentVersion.value;
    updateStatus.value = updateResult.value.available ? "settings.updateAvailable" : "settings.noUpdateAvailable";
  } catch (error) {
    updateError.value = String(error);
  } finally {
    checking.value = false;
  }
}

async function installUpdate() {
  installing.value = true;
  updateError.value = "";
  updateStatus.value = "settings.updatePreparing";
  downloadedBytes.value = 0;
  contentLength.value = 0;
  try {
    await invoke("download_and_install_update");
    updateInstalled.value = true;
    updateStatus.value = "settings.updateInstalled";
  } catch (error) {
    updateError.value = String(error);
  } finally {
    installing.value = false;
  }
}

async function restartApp() {
  updateError.value = "";
  try {
    await invoke("restart_app");
  } catch (error) {
    updateError.value = String(error);
  }
}

onMounted(async () => {
  try {
    currentVersion.value = await invoke<string>("get_app_version");
  } catch {
    currentVersion.value = "0.1.0";
  }

  unlistenUpdate = await listen<AppUpdateEventPayload>("app-update-event", (event) => {
    const payload = event.payload;
    if (typeof payload.downloadedBytes === "number") downloadedBytes.value = payload.downloadedBytes;
    if (typeof payload.contentLength === "number") contentLength.value = payload.contentLength;
    if (payload.message) updateStatus.value = payload.message;
    if (payload.stage === "installed") updateInstalled.value = true;
    if (payload.stage === "failed" && payload.message) updateError.value = payload.message;
  });
});

onUnmounted(() => {
  if (unlistenUpdate) unlistenUpdate();
});
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">{{ $t("app.name") }}</div>
    <p>{{ $t("settings.version") }}: {{ currentVersion }} / {{ $t("settings.tauriVueDesktop") }}</p>
    <p>{{ $t("settings.positioning") }}: {{ $t("settings.positioningDesc") }}</p>
    <p>{{ $t("settings.currentWorkspace") }}: {{ store.activeWorkspace().name }} / {{ $t("settings.collectionCount", { count: store.state.data.collections.length }) }} / {{ $t("settings.pluginCount", { count: store.state.data.plugins.length }) }}</p>
  </section>

  <section class="settings-card update-settings-card">
    <div class="settings-card-title">
      <span>{{ $t("settings.appUpdate") }}</span>
      <button class="settings-action-button" type="button" :disabled="checking || installing" @click="checkUpdate"><RefreshCw />{{ checking ? $t("settings.checkingUpdate") : $t("settings.checkUpdate") }}</button>
    </div>
    <p class="settings-card-description">{{ $t("settings.appUpdateDesc") }}</p>

    <div v-if="updateResult?.available && updateResult.update" class="update-summary">
      <strong>{{ $t("settings.updateToVersion", { version: updateResult.update.version }) }}</strong>
      <small>{{ updateResult.update.pubDate || updateResult.update.target }}</small>
      <p v-if="updateResult.update.notes">{{ updateResult.update.notes }}</p>
    </div>
    <p v-else-if="updateStatus" class="update-status">{{ updateStatus.startsWith("settings.") ? $t(updateStatus) : updateStatus }}</p>
    <p v-if="updateError" class="update-error">{{ updateError }}</p>

    <div v-if="installing || downloadedBytes || contentLength" class="update-progress">
      <div><span :style="{ width: `${downloadPercent}%` }"></span></div>
      <small>{{ formatBytes(downloadedBytes) }} / {{ contentLength ? formatBytes(contentLength) : $t("settings.unknownSize") }}</small>
    </div>

    <div class="update-actions">
      <button class="settings-action-button" type="button" :disabled="!updateResult?.available || installing || checking" @click="installUpdate"><Download />{{ installing ? $t("settings.installingUpdate") : $t("settings.downloadAndInstall") }}</button>
      <button v-if="updateInstalled" class="settings-action-button" type="button" @click="restartApp"><RotateCw />{{ $t("settings.restartNow") }}</button>
    </div>
  </section>
</template>

<style scoped>
.update-settings-card { gap: 14px; }
.update-summary { display: grid; gap: 5px; padding: 10px; background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); }
.update-summary strong { font-size: 13px; font-weight: 600; color: var(--text); }
.update-summary small, .update-status { color: var(--muted); font-size: 11px; }
.update-summary p { color: var(--text); font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
.update-error { color: var(--danger); font-size: 12px; line-height: 1.5; }
.update-progress { display: grid; gap: 6px; }
.update-progress > div { height: 8px; overflow: hidden; background: var(--bg); border: 1px solid var(--line); border-radius: 999px; }
.update-progress span { display: block; height: 100%; background: var(--accent); transition: width .16s ease; }
.update-progress small { color: var(--muted); font-size: 11px; }
.update-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.settings-action-button svg { width: 14px; height: 14px; }
.settings-action-button:disabled { opacity: .58; cursor: wait; }
</style>
