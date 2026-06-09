<script setup lang="ts">
import { Download, Upload } from "lucide-vue-next";
import { useOpenDockStore } from "../../store";
import { importAppData } from "../../storage";
const store = useOpenDockStore();

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const text = String(reader.result || "");
      const data = await importAppData(text);
      await store.replaceData(data);
      store.log("已导入数据");
    } catch (error) {
      store.log(`导入失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  reader.readAsText(file);
  input.value = "";
}

function downloadExport() {
  store.exportData();
  const blob = new Blob([store.state.selectedExport], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `opendock-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">数据与备份</div>
    <div class="settings-card-description">导出不会包含 WebDAV 凭据明文（仅保留引用占位）。</div>
    <div class="settings-actions">
      <button class="settings-action-button" @click="downloadExport"><Download />导出 JSON</button>
      <label class="settings-action-button" style="cursor:pointer;">
        <Upload />导入 JSON
        <input type="file" accept="application/json" style="display:none" @change="onImport" />
      </label>
      <button class="settings-action-button" @click="store.clearRecent()">清空最近</button>
      <button class="settings-action-button" @click="store.resetData()">重置数据</button>
    </div>
    <textarea v-if="store.state.selectedExport" class="setting-field full" :value="store.state.selectedExport" readonly></textarea>
  </section>
</template>
