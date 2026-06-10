<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Camera, Download, Eraser, RefreshCw, RotateCcw, ShieldAlert, Trash2, Upload } from "lucide-vue-next";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useOpenDockStore } from "../../store";
import { importAppData } from "../../storage";
import { schemaVersion } from "../../seed";
import { confirmDelete } from "../../dialog";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const store = useOpenDockStore();
const general = store.state.data.settings.general;
watch(() => general.autoSnapshotIntervalMinutes, () => store.startAutoSnapshotTimer());

type FeedbackKind = "info" | "success" | "error";
interface Feedback {
  kind: FeedbackKind;
  text: string;
}

const importFeedback = ref<Feedback | null>(null);
const exportFeedback = ref<Feedback | null>(null);

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
  store.exportData();
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


async function onImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  importFeedback.value = { kind: "info", text: `正在读取 ${file.name} ...` };
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      if (!(await confirmDelete(`导入将覆盖当前所有数据，系统会先自动拍摄一个快照以便回滚。确定要导入 ${file.name} 吗？`))) {
        importFeedback.value = { kind: "info", text: "已取消导入。" };
        return;
      }
      const text = String(reader.result || "");
      const parsed = await importAppData(text);
      await store.replaceData(parsed);
      store.log(`已从 ${file.name} 导入数据`);
      importFeedback.value = {
        kind: "success",
        text: `已导入 ${file.name}：${parsed.collections.length} 个集合、${parsed.items.length} 个资源。系统已自动拍摄导入前快照。`
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

async function confirmClearRecent() {
  const count = data.value.collections.filter((c) => c.recent).length;
  if (count === 0) {
    importFeedback.value = null;
    store.log("没有最近打开记录可清空");
    return;
  }
  if (!(await confirmDelete(`将清空 ${count} 条最近打开记录，并移除相关活动日志，确认继续？`))) return;
  store.clearRecent();
}

async function confirmReset() {
  if (!(await confirmDelete("重置后将恢复到内置示例数据，当前的工作区、集合、资源都会被清除。建议先导出备份。是否继续？"))) return;
  if (!(await confirmDelete("再次确认：此操作不可撤销。"))) return;
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

const snapshotBusy = ref(false);
const snapshotFeedback = ref<Feedback | null>(null);

async function takeManualSnapshot() {
  snapshotBusy.value = true;
  snapshotFeedback.value = { kind: "info", text: "正在拍摄快照..." };
  try {
    await store.takeSnapshot("", "manual");
    snapshotFeedback.value = { kind: "success", text: "快照拍摄成功。" };
  } catch (e) {
    snapshotFeedback.value = { kind: "error", text: `快照失败：${describeError(e)}` };
  } finally {
    snapshotBusy.value = false;
  }
}

async function refreshSnapshotList() {
  snapshotBusy.value = true;
  try {
    await store.refreshSnapshots();
    snapshotFeedback.value = { kind: "success", text: `已刷新，共 ${store.state.snapshots.length} 个快照。` };
  } catch (e) {
    snapshotFeedback.value = { kind: "error", text: `刷新失败：${describeError(e)}` };
  } finally {
    snapshotBusy.value = false;
  }
}

async function onRestoreSnapshot(id: string, label: string) {
  if (!(await confirmDelete(`确定要恢复到快照「${label}」吗？当前数据将被替换。`))) return;
  snapshotBusy.value = true;
  snapshotFeedback.value = { kind: "info", text: "正在恢复..." };
  try {
    await store.restoreSnapshot(id);
    snapshotFeedback.value = { kind: "success", text: "快照已恢复。" };
  } catch (e) {
    snapshotFeedback.value = { kind: "error", text: `恢复失败：${describeError(e)}` };
  } finally {
    snapshotBusy.value = false;
  }
}

async function onDeleteSnapshot(id: string, label: string) {
  if (!(await confirmDelete(`确定要删除快照「${label}」吗？此操作不可恢复。`))) return;
  snapshotBusy.value = true;
  try {
    await store.removeSnapshot(id);
    snapshotFeedback.value = { kind: "success", text: "快照已删除。" };
  } catch (e) {
    snapshotFeedback.value = { kind: "error", text: `删除失败：${describeError(e)}` };
  } finally {
    snapshotBusy.value = false;
  }
}

function snapshotKindLabel(kind: string): string {
  if (kind === "auto") return "自动";
  if (kind === "pre-import") return "导入前";
  return "手动";
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
    <div class="settings-card-title">导出备份</div>
    <div class="settings-card-description">导出 JSON 用于本地归档或迁移。WebDAV 凭据明文不会写入，仅保留引用占位。</div>
    <div class="data-actions">
      <button class="settings-action-button" type="button" @click="downloadExport"><Download />下载 JSON</button>
    </div>
    <p v-if="exportFeedback" class="data-feedback" :class="exportFeedback.kind">{{ exportFeedback.text }}</p>
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

  <section class="settings-card">
    <div class="settings-card-title">
      <span>数据快照</span>
      <div class="snapshot-title-actions">
        <button class="settings-action-button" type="button" :disabled="snapshotBusy" @click="takeManualSnapshot"><Camera />立即拍摄快照</button>
        <button class="settings-action-button" type="button" :disabled="snapshotBusy" @click="refreshSnapshotList"><RefreshCw />刷新</button>
      </div>
    </div>
    <div class="settings-card-description">
      快照存在本地数据库，可在导入或重置出错时一键还原。自动快照配置见下方。
    </div>
    <div class="snapshot-config">
      <label class="setting-field">
        <span>自动快照间隔（分钟）</span>
        <div class="snapshot-interval-input">
          <input v-model.number="general.autoSnapshotIntervalMinutes" type="number" min="0" max="1440" />
          <small>设为 0 关闭自动快照</small>
        </div>
      </label>
      <label class="setting-field">
        <span>最多保留自动快照（个）</span>
        <div class="snapshot-interval-input">
          <input v-model.number="general.autoSnapshotKeepCount" type="number" min="1" max="100" />
          <small>超出部分下次快照时自动清理</small>
        </div>
      </label>
    </div>
    <p v-if="snapshotFeedback" class="data-feedback" :class="snapshotFeedback.kind">{{ snapshotFeedback.text }}</p>
    <div v-if="!store.state.snapshots.length" class="snapshot-empty">尚无快照。点击「立即拍摄快照」开始备份。</div>
    <ul v-else class="snapshot-list">
      <li v-for="snap in store.state.snapshots" :key="snap.id" class="snapshot-row">
        <span class="snapshot-kind" :class="snap.kind">{{ snapshotKindLabel(snap.kind) }}</span>
        <span class="snapshot-main">
          <strong>{{ snap.label }}</strong>
          <small>{{ formatSnapshotTime(snap.createdAt) }} · {{ formatBytes(snap.size) }}</small>
        </span>
        <span class="snapshot-actions">
          <button class="settings-action-button" type="button" :disabled="snapshotBusy" @click="onRestoreSnapshot(snap.id, snap.label)"><RotateCcw />恢复</button>
          <button class="settings-action-button" type="button" :disabled="snapshotBusy" @click="onDeleteSnapshot(snap.id, snap.label)"><Trash2 /></button>
        </span>
      </li>
    </ul>
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
.snapshot-main small { color: var(--muted); font-size: 11px; }
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
  gap: 4px;
}
.snapshot-config { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; }
.snapshot-config .setting-field { max-width: 360px; }
.snapshot-interval-input { display: flex; align-items: center; gap: 10px; }
.snapshot-interval-input input { flex: 0 0 96px; height: 28px; padding: 0 8px; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); font-size: 12px; }
.snapshot-interval-input small { color: var(--muted); font-size: 11px; }
</style>
