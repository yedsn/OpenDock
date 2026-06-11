<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useOpenDockStore } from "../../store";
const store = useOpenDockStore();
const config = store.state.data.settings.webdavSync;
const webdavPassword = ref("");
const syncBusy = ref(false);

onMounted(async () => {
  const { webdavGetCredential } = await import("../../db");
  webdavPassword.value = await webdavGetCredential();
});

const statusColor = computed(() => {
  if (config.status === "连接正常" || config.status === "同步成功") return "var(--green, #4d8064)";
  if (config.status === "连接失败" || config.status === "同步失败") return "var(--red, #b65a54)";
  return "var(--muted, #8193a6)";
});

async function handleTest() {
  syncBusy.value = true;
  config.status = "测试中...";
  await store.saveWebdavPassword(webdavPassword.value);
  await store.testWebdav();
  syncBusy.value = false;
}

async function handleSync() {
  syncBusy.value = true;
  config.status = "同步中...";
  await store.saveWebdavPassword(webdavPassword.value);
  await store.syncWebdavNow();
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
        <button class="settings-action-button" :disabled="syncBusy" @click="handleTest">测试连接</button>
        <button class="settings-action-button" :disabled="syncBusy" @click="handleSync">立即同步</button>
      </span>
    </div>
    <div class="sync-status-strip">
      <span>状态：<span :style="{ color: statusColor }">{{ config.status }}</span></span>
      <span>最近同步：{{ config.lastSyncAt }}</span>
      <span>范围：{{ config.syncScope }}</span>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">连接配置</div>
    <div class="settings-grid">
      <label class="setting-field"><span>WebDAV 地址</span><input v-model="config.serverUrl" @change="handleConfigChange" /></label>
      <label class="setting-field"><span>用户名</span><input v-model="config.username" @change="handleConfigChange" /></label>
      <label class="setting-field"><span>密码 / Token</span><input v-model="webdavPassword" type="password" placeholder="输入后自动保存" /></label>
      <label class="setting-field"><span>远程目录</span><input v-model="config.remotePath" @change="handleConfigChange" placeholder="/OpenDock/workspaces" /></label>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">同步策略</div>
    <div class="settings-grid">
      <label class="setting-field"><span>自动同步间隔</span>
        <select v-model="config.syncInterval" @change="handleConfigChange">
          <option>关闭</option><option>每 15 分钟</option><option>每 30 分钟</option><option>每 1 小时</option><option>每天</option>
        </select>
      </label>
      <label class="setting-field"><span>同步范围</span>
        <select v-model="config.syncScope" @change="handleConfigChange">
          <option>当前工作区</option><option>全部工作区</option>
        </select>
      </label>
      <label class="setting-field"><span>冲突策略</span>
        <select v-model="config.conflictPolicy" @change="handleConfigChange">
          <option>本地优先</option><option>远程优先</option><option>保留两份</option><option>手动处理</option>
        </select>
      </label>
      <label class="setting-field"><span>自动同步</span>
        <span class="setting-switch"><input v-model="config.autoSync" type="checkbox" @change="handleConfigChange" /><span></span></span>
      </label>
    </div>
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
</style>