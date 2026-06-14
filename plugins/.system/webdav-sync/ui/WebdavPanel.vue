<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { AlertTriangle, CloudUpload, DownloadCloud, X } from "lucide-vue-next";
import { useOpenDockStore } from "../../../../src-ui/src/store";
import { useI18n } from "../../../../src-ui/src/i18n";
const store = useOpenDockStore();
const { t } = useI18n();
const config = computed(() => store.state.data.settings.webdavSync);
const pendingConflict = computed(() => store.state.webdavPendingConflict);
const webdavPassword = ref("");
const syncBusy = ref(false);

onMounted(async () => {
  const { webdavGetCredential } = await import("../../../../src-ui/src/db");
  webdavPassword.value = await webdavGetCredential();
});

const statusColor = computed(() => {
  if (config.value.status === "连接正常" || config.value.status === "同步成功" || config.value.status === "同步成功（远程优先）") return "var(--green, #4d8064)";
  if (config.value.status === "连接失败" || config.value.status === "同步失败" || config.value.status === "同步失败（远程数据解析错误）") return "var(--red, #b65a54)";
  if (config.value.status === "需要手动处理冲突") return "#d19a66";
  return "var(--muted, #8193a6)";
});

async function handleTest() {
  syncBusy.value = true;
  config.value.status = t("webdav.testing");
  await store.saveWebdavPassword(webdavPassword.value);
  await store.testWebdav();
  syncBusy.value = false;
}

async function handleSync() {
  syncBusy.value = true;
  config.value.status = t("webdav.syncing");
  await store.saveWebdavPassword(webdavPassword.value);
  await store.syncWebdavNow();
  syncBusy.value = false;
}

async function handleOverwriteLocal() {
  syncBusy.value = true;
  await store.webdavOverwriteLocal();
  syncBusy.value = false;
}

async function handleOverwriteRemote() {
  syncBusy.value = true;
  await store.webdavOverwriteRemote();
  syncBusy.value = false;
}

function handleConfigChange() {
  store.startWebdavAutoSync();
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      WebDAV Sync
      <span>
        <button class="settings-action-button" :disabled="syncBusy" @click="handleTest">{{ t("webdav.testConnection") }}</button>
        <button class="settings-action-button" :disabled="syncBusy" @click="handleSync">{{ t("webdav.syncNow") }}</button>
      </span>
    </div>
    <div class="sync-status-strip">
      <span>{{ t("webdav.status") }}<span :style="{ color: statusColor }">{{ config.status }}</span></span>
      <span>{{ t("webdav.lastSync") }}{{ config.lastSyncAt }}</span>
      <span>{{ t("webdav.scope") }}{{ config.syncScope }}</span>
    </div>
    <div v-if="pendingConflict" class="webdav-conflict-panel">
      <div class="webdav-conflict-head">
        <AlertTriangle />
        <div>
          <strong>{{ t("webdav.conflictDetected") }}</strong>
          <p>{{ t("webdav.conflictDetectedDesc") }}</p>
        </div>
      </div>
      <div class="webdav-conflict-compare">
        <div><span>{{ t("webdav.localVersion") }}</span><strong>{{ pendingConflict.localSummary }}</strong></div>
        <div><span>{{ t("webdav.remoteVersion") }}</span><strong>{{ pendingConflict.remoteSummary }}</strong></div>
      </div>
      <div class="webdav-conflict-actions">
        <button class="settings-action-button danger" type="button" :disabled="syncBusy" @click="handleOverwriteLocal"><DownloadCloud />{{ t("webdav.overwriteLocal") }}</button>
        <button class="settings-action-button" type="button" :disabled="syncBusy" @click="handleOverwriteRemote"><CloudUpload />{{ t("webdav.overwriteRemote") }}</button>
        <button class="settings-action-button ghost" type="button" :disabled="syncBusy" @click="store.clearWebdavPendingConflict"><X />{{ t("webdav.cancelConflict") }}</button>
      </div>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">{{ t("webdav.connectionConfig") }}</div>
    <div class="settings-grid">
      <label class="setting-field"><span>{{ t("webdav.serverUrl") }}</span><input v-model="config.serverUrl" @change="handleConfigChange" /></label>
      <label class="setting-field"><span>{{ t("webdav.username") }}</span><input v-model="config.username" @change="handleConfigChange" /></label>
      <label class="setting-field"><span>{{ t("webdav.password") }}</span><input v-model="webdavPassword" type="password" :placeholder="t('webdav.passwordPlaceholder')" /></label>
      <label class="setting-field"><span>{{ t("webdav.remoteDir") }}</span><input v-model="config.remotePath" @change="handleConfigChange" placeholder="/OpenDock/workspaces" /></label>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">{{ t("webdav.syncPolicy") }}</div>
    <div class="settings-grid">
      <label class="setting-field"><span>{{ t("webdav.syncInterval") }}</span>
        <select v-model="config.syncInterval" @change="handleConfigChange">
          <option>关闭</option><option>每 15 分钟</option><option>每 30 分钟</option><option>每 1 小时</option><option>每天</option>
        </select>
      </label>
      <label class="setting-field"><span>{{ t("webdav.syncScope") }}</span>
        <select v-model="config.syncScope" @change="handleConfigChange">
          <option>当前工作区</option><option>全部工作区</option>
        </select>
      </label>
      <label class="setting-field"><span>{{ t("webdav.conflictPolicy") }}</span>
        <select v-model="config.conflictPolicy" @change="handleConfigChange">
          <option>本地优先</option><option>远程优先</option><option>保留两份</option><option>手动处理</option>
        </select>
      </label>
      <label class="setting-field"><span>{{ t("webdav.autoSync") }}</span>
        <span class="setting-switch"><input v-model="config.autoSync" type="checkbox" @change="handleConfigChange" /><span></span></span>
      </label>
    </div>
    <p class="sync-policy-note">{{ t("webdav.syncTimingNote") }}</p>
  </section>
</template>

<style scoped>
.sync-status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 0;
  font-size: 12px;
  color: var(--muted);
}
.sync-status-strip span {
  white-space: nowrap;
}
.webdav-conflict-panel {
  display: grid;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid rgba(209, 154, 102, 0.45);
  border-radius: 8px;
  background: rgba(209, 154, 102, 0.08);
}
.webdav-conflict-head {
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 10px;
  align-items: start;
}
.webdav-conflict-head svg {
  width: 18px;
  height: 18px;
  color: #d19a66;
}
.webdav-conflict-head p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}
.webdav-conflict-compare {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.webdav-conflict-compare div {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg2);
}
.webdav-conflict-compare span {
  color: var(--muted);
  font-size: 12px;
}
.webdav-conflict-compare strong {
  font-size: 12px;
  font-weight: 600;
}
.webdav-conflict-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.webdav-conflict-actions svg {
  width: 14px;
  height: 14px;
}
.settings-action-button.danger {
  color: var(--red, #b65a54);
}
.settings-action-button.ghost {
  color: var(--muted);
}
.sync-policy-note {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}
@media (max-width: 720px) {
  .webdav-conflict-compare {
    grid-template-columns: 1fr;
  }
}
</style>

