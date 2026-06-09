<script setup lang="ts">
import { useOpenDockStore } from "../../store";
const store = useOpenDockStore();
const config = store.state.data.settings.webdavSync;

function updateCredential(event: Event) {
  config.credentialRef = (event.target as HTMLInputElement).value ? "secret:webdav-sync/default" : "";
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      WebDAV Sync
      <span>
        <button class="settings-action-button" @click="store.testWebdav()">测试连接</button>
        <button class="settings-action-button" @click="store.syncWebdavNow()">立即同步</button>
      </span>
    </div>
    <div class="sync-status-strip">
      <span>插件已启用</span>
      <span>{{ config.status }}</span>
      <span>最近同步：{{ config.lastSyncAt }}</span>
      <span>范围：{{ config.syncScope }}</span>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">连接配置</div>
    <div class="settings-grid">
      <label class="setting-field"><span>WebDAV 地址</span><input v-model="config.serverUrl" /></label>
      <label class="setting-field"><span>用户名</span><input v-model="config.username" /></label>
      <label class="setting-field"><span>密码 / Token</span><input type="password" placeholder="保存在 secret 引用中" @input="updateCredential" /></label>
      <label class="setting-field"><span>远程目录</span><input v-model="config.remotePath" /></label>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">同步策略</div>
    <div class="settings-grid">
      <label class="setting-field"><span>自动同步间隔</span>
        <select v-model="config.syncInterval">
          <option>关闭</option><option>每 15 分钟</option><option>每 30 分钟</option><option>每 1 小时</option><option>每天</option>
        </select>
      </label>
      <label class="setting-field"><span>同步范围</span>
        <select v-model="config.syncScope">
          <option>当前工作区</option><option>全部工作区</option>
        </select>
      </label>
      <label class="setting-field"><span>冲突策略</span>
        <select v-model="config.conflictPolicy">
          <option>本地优先</option><option>远程优先</option><option>保留两份</option><option>手动处理</option>
        </select>
      </label>
      <label class="setting-field"><span>自动同步</span>
        <span class="setting-switch"><input v-model="config.autoSync" type="checkbox" /><span></span></span>
      </label>
    </div>
  </section>
</template>
