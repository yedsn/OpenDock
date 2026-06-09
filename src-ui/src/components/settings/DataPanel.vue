<script setup lang="ts">
import { computed, ref } from "vue";
import { Archive, Check, ClipboardCopy, Download, Eraser, RefreshCw, RotateCcw, ShieldAlert, Upload } from "lucide-vue-next";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useOpenDockStore } from "../../store";
import { importAppData } from "../../storage";
import { schemaVersion } from "../../seed";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const store = useOpenDockStore();

type FeedbackKind = "info" | "success" | "error";
interface Feedback {
  kind: FeedbackKind;
  text: string;
}

const importFeedback = ref<Feedback | null>(null);
const exportFeedback = ref<Feedback | null>(null);
const exportCopied = ref(false);

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
    { label: "工作区", value: d.workspaces.length },
    { label: "场景", value: d.scenes.length },
    { label: "集合", value: d.collections.length, hint: `收藏 ${favoriteCount} · 最近 ${recentCount}` },
    { label: "资源", value: d.items.length },
    { label: "工具", value: d.tools.length },
    { label: "插件", value: d.plugins.filter((p) => p.installed).length, hint: `共 ${d.plugins.length}` },
    { label: "活动日志", value: d.activity.length },
    { label: "Schema", value: `v${d.schemaVersion}`, hint: d.schemaVersion === schemaVersion ? "当前版本" : `当前 v${schemaVersion}` }
  ];
});

const exportSize = computed(() => {
  const text = store.state.selectedExport;
  if (!text) return "";
  return formatBytes(new Blob([text]).size);
});

const lastActivityAt = computed(() => data.value.activity[0]?.createdAt || "—");

function generateExport() {
  store.exportData();
  exportFeedback.value = { kind: "success", text: `已生成导出预览（${exportSize.value}），未包含 WebDAV 凭据。` };
  exportCopied.value = false;
}

function suggestedFileName(): string {
  return `opendock-export-${formatStamp(new Date())}.json`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function downloadExport() {
  if (!store.state.selectedExport) store.exportData();
  const content = store.state.selectedExport;
  const fileName = suggestedFileName();

  if (isTauri) {
    try {
      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!filePath) return;
      const size = await invoke<number>("write_text_file", { path: filePath, contents: content });
      exportFeedback.value = { kind: "success", text: `已保存到 ${filePath} (${formatBytes(size)})` };
    } catch {
      browserDownload(fileName, content);
    }
  } else {
    browserDownload(fileName, content);
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
  exportFeedback.value = { kind: "success", text: `已保存到 ${fileName} (${formatBytes(blob.size)})` };
}


async function copyExport() {
  if (!store.state.selectedExport) store.exportData();
  try {
    await navigator.clipboard.writeText(store.state.selectedExport);
    exportCopied.value = true;
    exportFeedback.value = { kind: "success", text: "导出 JSON 已写入剪贴板。" };
    setTimeout(() => { exportCopied.value = false; }, 1600);
  } catch (error) {
    exportFeedback.value = { kind: "error", text: `复制失败：${describeError(error)}` };
  }
}

function clearExportPreview() {
  store.state.selectedExport = "";
  exportFeedback.value = null;
  exportCopied.value = false;
}

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  importFeedback.value = { kind: "info", text: `正在读取 ${file.name} ...` };
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const text = String(reader.result || "");
      const parsed = await importAppData(text);
      await store.replaceData(parsed);
      store.log(`已从 ${file.name} 导入数据`);
      importFeedback.value = {
        kind: "success",
        text: `已导入 ${file.name}：${parsed.collections.length} 个集合、${parsed.items.length} 个资源。`
      };
    } catch (error) {
      const message = describeError(error);
      store.log(`导入失败: ${message}`);
      importFeedback.value = { kind: "error", text: `导入失败：${message}` };
    } finally {
      input.value = "";
    }
  };
  reader.onerror = () => {
    importFeedback.value = { kind: "error", text: `读取文件失败：${describeError(reader.error)}` };
    input.value = "";
  };
  reader.readAsText(file);
}

function confirmClearRecent() {
  const count = data.value.collections.filter((c) => c.recent).length;
  if (count === 0) {
    importFeedback.value = null;
    store.log("没有最近打开记录可清空");
    return;
  }
  if (!window.confirm(`将清空 ${count} 条最近打开记录，并移除相关活动日志，确认继续？`)) return;
  store.clearRecent();
}

async function confirmReset() {
  if (!window.confirm("重置后将恢复到内置示例数据，当前的工作区、集合、资源都会被清除。建议先导出备份。是否继续？")) return;
  if (!window.confirm("再次确认：此操作不可撤销。")) return;
  await store.resetData();
  exportFeedback.value = null;
  importFeedback.value = { kind: "success", text: "已重置为内置示例数据。" };
}

function jumpToWebdav() {
  if (!webdavPlugin.value) {
    store.state.settingsCategory = "plugins";
    return;
  }
  store.state.settingsCategory = `plugin:${webdavPlugin.value.id}`;
}

function describeError(error: unknown): string {
  if (!error) return "未知错误";
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
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      <span>数据概览</span>
      <span class="data-meta">最近活动 {{ lastActivityAt }}</span>
    </div>
    <div class="settings-card-description">查看当前数据规模与 Schema 版本，备份前先确认数量是否符合预期。</div>
    <div class="data-stats">
      <div v-for="tile in stats" :key="tile.label" class="data-stat-tile">
        <div class="data-stat-value">{{ tile.value }}</div>
        <div class="data-stat-label">{{ tile.label }}</div>
        <div v-if="tile.hint" class="data-stat-hint">{{ tile.hint }}</div>
      </div>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">
      <span>导出备份</span>
      <span class="data-meta" v-if="exportSize">预览 {{ exportSize }}</span>
    </div>
    <div class="settings-card-description">导出 JSON 用于本地归档或迁移。WebDAV 凭据明文不会写入，仅保留引用占位。</div>
    <div class="data-actions">
      <button class="settings-action-button" type="button" @click="downloadExport"><Download />下载 JSON</button>
      <button class="settings-action-button" type="button" @click="generateExport"><Archive />生成预览</button>
      <button class="settings-action-button" type="button" :disabled="!store.state.selectedExport" @click="copyExport">
        <component :is="exportCopied ? Check : ClipboardCopy" />{{ exportCopied ? "已复制" : "复制 JSON" }}
      </button>
      <button class="settings-action-button" type="button" :disabled="!store.state.selectedExport" @click="clearExportPreview">
        <Eraser />关闭预览
      </button>
    </div>
    <p v-if="exportFeedback" class="data-feedback" :class="exportFeedback.kind">{{ exportFeedback.text }}</p>
    <textarea
      v-if="store.state.selectedExport"
      class="export-preview"
      :value="store.state.selectedExport"
      readonly
      spellcheck="false"
    ></textarea>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">导入数据</div>
    <div class="settings-card-description">
      仅接受相同 Schema（v{{ schemaVersion }}）的导出文件。导入将覆盖当前工作区与全部资源，请先备份。
    </div>
    <div class="data-actions">
      <label class="settings-action-button file-trigger">
        <Upload />选择 JSON 文件
        <input type="file" accept="application/json,.json" @change="onImport" />
      </label>
    </div>
    <p v-if="importFeedback" class="data-feedback" :class="importFeedback.kind">{{ importFeedback.text }}</p>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">
      <span>云同步</span>
      <button class="settings-action-button" type="button" @click="jumpToWebdav">
        <RefreshCw />打开 WebDAV 设置
      </button>
    </div>
    <div class="settings-card-description">通过 WebDAV 插件维护远端备份。在插件设置中配置地址、凭据与冲突策略。</div>
    <div class="sync-status-strip">
      <span>{{ webdavInstalled ? "WebDAV 插件已启用" : "WebDAV 插件未启用" }}</span>
      <span>状态：{{ webdav.status || "未配置" }}</span>
      <span>最近同步：{{ webdav.lastSyncAt || "—" }}</span>
      <span>范围：{{ webdav.syncScope || "—" }}</span>
    </div>
    <div class="data-actions" v-if="webdavInstalled">
      <button class="settings-action-button" type="button" @click="store.testWebdav()">测试连接</button>
      <button class="settings-action-button" type="button" @click="store.syncWebdavNow()">立即同步</button>
    </div>
  </section>

  <section class="settings-card danger-card">
    <div class="settings-card-title">
      <span class="danger-title"><ShieldAlert />维护操作</span>
    </div>
    <div class="settings-card-description">这些操作会修改或清空本地数据，执行前请确保已经导出最新备份。</div>
    <div class="data-actions danger-actions">
      <button class="settings-action-button" type="button" @click="confirmClearRecent">
        <Eraser />清空最近
      </button>
      <button class="settings-action-button data-danger" type="button" @click="confirmReset">
        <RotateCcw />重置数据
      </button>
    </div>
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
.export-preview {
  width: 100%;
  min-height: 160px;
  max-height: 360px;
  overflow: auto;
  padding: 8px 10px;
  color: var(--muted);
  font-family: var(--font-mono, "Cascadia Code", Consolas, monospace);
  font-size: 11px;
  white-space: pre;
  resize: vertical;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
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
</style>