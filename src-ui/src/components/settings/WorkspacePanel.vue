<script setup lang="ts">
import { useOpenDockStore } from "../../store";
const store = useOpenDockStore();
const workspace = store.activeWorkspace();

function openManage() {
  store.state.workspaceMenuOpen = true;
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      当前工作区
      <button class="settings-action-button" @click="openManage">管理工作区</button>
    </div>
    <div class="settings-grid">
      <label class="setting-field"><span>工作区名称</span><input v-model="workspace.name" /></label>
      <label class="setting-field"><span>存储说明</span><input v-model="workspace.storage" /></label>
      <label class="setting-field full"><span>备注</span><textarea v-model="workspace.remark"></textarea></label>
    </div>
  </section>
</template>
