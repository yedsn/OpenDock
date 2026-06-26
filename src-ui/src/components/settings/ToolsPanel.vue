<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { open as openFilePicker } from "@tauri-apps/plugin-dialog";
import { AlertTriangle, CheckCircle2, FolderSearch, Info, Plus, Radar, Star, Trash2, Wrench, X } from "lucide-vue-next";
import { useOpenDockStore } from "../../store";
import { useI18n } from "../../i18n";
import type { OpenTool, ToolType } from "../../types";
import { confirmDelete } from "../../dialog";

const store = useOpenDockStore();
const { t } = useI18n();
const scanning = ref(false);
const scanResult = ref<{
  detected: OpenTool[];
  added: OpenTool[];
  updated: OpenTool[];
  error?: string;
  scannedAt: string;
} | null>(null);

const toolTypes = computed(() => store.availableToolTypes() as ToolType[]);
const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
const terminalArgsPlaceholder = computed(() => isMac ? "{command}" : "-NoExit -Command {command}");
const executablePathPlaceholder = computed(() => isMac ? "/Applications/App.app" : "C:\\Program Files\\App\\app.exe");

const showAddModal = ref(false);
const newTool = reactive({
  name: "",
  type: "应用" as ToolType,
  path: "",
  args: "{path}"
});

const toolTypeSummary = computed(() => toolTypes.value.map((type) => {
  const tools = store.visibleTools().filter((tool) => tool.type === type);
  return {
    type,
    count: tools.length,
    defaultTool: tools.find((tool) => tool.default)?.name || t("settings.notSet")
  };
}));

const toolsMissingPath = computed(() => store.state.data.tools.filter((tool) => tool.path.trim() !== "shell:open" && !tool.path.trim()).length);

function argsPlaceholder(type: ToolType) {
  if (type === "浏览器") return "{url}";
  if (type === "终端") return terminalArgsPlaceholder.value;
  return "{path}";
}

function openAddModal() {
  newTool.name = "";
  newTool.type = "应用" as ToolType;
  newTool.path = "";
  newTool.args = argsPlaceholder(newTool.type);
  showAddModal.value = true;
}

function updateNewToolType(type: ToolType) {
  newTool.type = type;
  if (!newTool.args.trim() || ["{path}", "{url}", "-NoExit -Command {command}", "{command}"].includes(newTool.args.trim())) {
    newTool.args = argsPlaceholder(type);
  }
}

function addTool() {
  const name = newTool.name.trim();
  if (!name) return;
  store.createTool(name, newTool.type, newTool.path.trim(), newTool.args.trim() || argsPlaceholder(newTool.type));
  showAddModal.value = false;
}

async function pickNewToolPath() {
  try {
    const selected = await openFilePicker({
      title: "选择应用程序",
      directory: false,
      multiple: false,
      defaultPath: isMac ? "/Applications" : "C:\\Program Files",
      filters: isMac
        ? [{ name: "应用程序", extensions: ["app"] }]
        : [{ name: "可执行文件", extensions: ["exe", "cmd", "bat"] }]
    });
    if (selected) {
      const filePath = typeof selected === "string" ? selected : (selected as string[])[0];
      if (filePath) {
        newTool.path = filePath;
        if (!newTool.name.trim()) {
          const parts = filePath.replace(/\\/g, "/").split("/");
          newTool.name = parts[parts.length - 1].replace(/\.(app|exe)$/i, "");
        }
      }
    }
  } catch { /* cancelled */ }
}

async function pickToolPath(tool: OpenTool) {
  try {
    const selected = await openFilePicker({
      title: "选择应用程序",
      directory: false,
      multiple: false,
      defaultPath: isMac ? "/Applications" : "C:\\Program Files",
      filters: isMac
        ? [{ name: "应用程序", extensions: ["app"] }]
        : [{ name: "可执行文件", extensions: ["exe", "cmd", "bat"] }]
    });
    if (selected) {
      const filePath = typeof selected === "string" ? selected : (selected as string[])[0];
      if (filePath) tool.path = filePath;
    }
  } catch { /* cancelled */ }
}

async function scanTools() {
  if (scanning.value) return;
  scanning.value = true;
  try {
    const result = await store.scanOpenTools();
    scanResult.value = { ...result, scannedAt: new Date().toLocaleTimeString("zh-CN", { hour12: false }) };
  } finally {
    scanning.value = false;
  }
}

function toolNames(tools: OpenTool[]) {
  return tools.map((tool) => `${tool.name}（${tool.type}）`).join("、");
}

async function deleteTool(id: string) {
  const tool = store.state.data.tools.find((entry) => entry.id === id);
  if (!tool) return;
  if (await confirmDelete(`确认删除打开工具「${tool.name}」？关联资源将改回默认工具。`)) {
    store.deleteTool(id);
  }
}
</script>

<template>
  <section class="settings-card tools-settings-card">
    <div class="settings-card-title">
      <span>{{ $t("settings.openTools") }}</span>
      <div class="tools-title-actions">
        <button class="settings-action-button" type="button" :disabled="scanning" @click="scanTools"><Radar />{{ scanning ? $t("settings.scanning") : $t("settings.autoScan") }}</button>
        <button class="settings-action-button" type="button" @click="openAddModal"><Plus />{{ $t("settings.addTool") }}</button>
      </div>
    </div>
    <div class="settings-card-description">{{ $t("settings.toolPathHelp") }}</div>

    <div class="tool-summary-grid">
      <div v-for="item in toolTypeSummary" :key="item.type" class="tool-summary-item" :class="{ empty: item.count === 0 }">
        <Wrench />
        <span><strong>{{ item.type }}</strong><small>{{ $t("settings.toolsCount", { count: item.count }) }} / {{ $t("settings.default") }}: {{ item.defaultTool }}</small></span>
      </div>
    </div>

    <div v-if="scanResult" class="scan-result" :class="{ error: scanResult.error }">
      <AlertTriangle v-if="scanResult.error" />
      <Info v-else />
      <div>
        <strong v-if="scanResult.error">{{ $t("settings.scanFailed") }}</strong>
        <strong v-else>{{ $t("settings.scanComplete", { detected: scanResult.detected.length, added: scanResult.added.length, updated: scanResult.updated.length }) }}</strong>
        <p v-if="scanResult.error">{{ scanResult.error }}</p>
        <p v-else-if="scanResult.detected.length === 0">{{ $t("settings.noToolDetected") }}</p>
        <p v-else-if="scanResult.added.length || scanResult.updated.length">
          <span v-if="scanResult.added.length">{{ $t("settings.added", { names: toolNames(scanResult.added) }) }}</span>
          <span v-if="scanResult.added.length && scanResult.updated.length">；</span>
          <span v-if="scanResult.updated.length">{{ $t("settings.updated", { names: toolNames(scanResult.updated) }) }}</span>
        </p>
        <p v-else>{{ $t("settings.allToolsPresent") }}</p>
        <small>{{ scanResult.scannedAt }}</small>
      </div>
    </div>

    <div v-if="toolsMissingPath > 0" class="tool-warning"><AlertTriangle />{{ $t("settings.toolWarning", { count: toolsMissingPath }) }}</div>
  </section>

  <section class="settings-card tools-settings-card">
    <div class="settings-card-title">{{ $t("settings.toolConfig") }}</div>
    <div class="settings-table tools-table">
      <div class="settings-row tools-row tools-row-head">
        <strong>{{ $t("settings.toolName") }}</strong>
        <strong>{{ $t("settings.type") }}</strong>
        <strong>{{ $t("settings.executablePath") }}</strong>
        <strong>{{ $t("settings.argsTemplate") }}</strong>
        <strong>{{ $t("settings.default") }}</strong>
        <strong></strong>
      </div>
      <div v-for="tool in store.visibleTools()" :key="tool.id" class="settings-row tools-row" :class="{ 'missing-path': tool.path.trim() !== 'shell:open' && !tool.path.trim() }">
        <input v-model="tool.name" :placeholder="$t('settings.toolName')" />
        <select v-model="tool.type">
          <option v-for="type in toolTypes" :key="type" :value="type">{{ type }}</option>
        </select>
        <div class="path-cell">
          <input v-model="tool.path" :placeholder="$t('settings.executablePath') + ': ' + executablePathPlaceholder" />
          <button class="btn-browse" type="button" title="选择程序" @click="pickToolPath(tool)"><FolderSearch :size="13" /></button>
        </div>
        <input v-model="tool.args" :placeholder="argsPlaceholder(tool.type)" />
        <button class="default-tool-button" type="button" :class="{ active: tool.default }" :title="tool.default ? ('settings.currentTypeDefault') : ('settings.setAsTypeDefault')" @click="store.setDefaultTool(tool.id)">
          <CheckCircle2 v-if="tool.default" />
          <Star v-else />
        </button>
        <button class="icon-button danger" type="button" :title="$t('settings.deleteTool')" @click="deleteTool(tool.id)"><Trash2 /></button>
      </div>
    </div>
  </section>

  <!-- Add tool modal -->
  <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
    <form class="modal add-tool-modal" @submit.prevent="addTool">
      <div class="modal-header">
        <div class="modal-title">{{ $t("settings.addTool") }}</div>
        <button class="icon-button" type="button" @click="showAddModal = false"><X /></button>
      </div>
      <div class="modal-body">
        <label class="setting-field"><span>{{ $t("settings.toolName") }}</span><input v-model="newTool.name" required :placeholder="$t('settings.newToolName')" /></label>
        <label class="setting-field"><span>{{ $t("settings.type") }}</span>
          <select :value="newTool.type" @change="updateNewToolType(($event.target as HTMLSelectElement).value as ToolType)">
            <option v-for="type in toolTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>
        <label class="setting-field"><span>{{ $t("settings.executablePath") }}</span>
          <div class="path-input-row">
            <input v-model="newTool.path" required :placeholder="$t('settings.pathOrShellOpen')" />
            <button class="btn-browse" type="button" title="选择程序" @click="pickNewToolPath"><FolderSearch :size="14" /></button>
          </div>
        </label>
        <label class="setting-field"><span>{{ $t("settings.argsTemplate") }}</span><input v-model="newTool.args" :placeholder="argsPlaceholder(newTool.type)" /></label>
      </div>
      <div class="modal-actions">
        <button class="settings-action-button" type="button" @click="showAddModal = false">{{ $t("modal.cancel") }}</button>
        <button class="run-button" type="submit" :disabled="!newTool.name.trim()">{{ $t("modal.confirm") }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.tools-settings-card { gap: 14px; }
.tools-title-actions { display: inline-flex; align-items: center; gap: 8px; }
.settings-action-button:disabled { opacity: .58; cursor: wait; }
.tool-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.tool-summary-item { min-width: 0; display: grid; grid-template-columns: 26px minmax(0, 1fr); align-items: center; gap: 8px; padding: 10px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; }
.tool-summary-item.empty { opacity: .58; }
.tool-summary-item svg { color: var(--accent); }
.tool-summary-item strong, .tool-summary-item small { display: block; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tool-summary-item strong { color: var(--text); font-size: 12px; font-weight: 600; }
.tool-summary-item small { margin-top: 3px; color: var(--faint); font-size: 11px; }
.scan-result { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 9px; padding: 10px 11px; color: var(--text); background: color-mix(in srgb, var(--accent) 10%, var(--bg)); border: 1px solid color-mix(in srgb, var(--accent) 32%, var(--line)); border-radius: 8px; }
.scan-result > svg { margin-top: 1px; color: var(--accent); }
.scan-result.error { color: var(--text); background: rgba(210, 109, 109, 0.1); border-color: rgba(210, 109, 109, 0.34); }
.scan-result.error > svg { color: var(--red); }
.scan-result strong { display: block; font-size: 12px; font-weight: 600; }
.scan-result p { margin-top: 4px; color: var(--muted); font-size: 11px; line-height: 1.5; }
.scan-result small { display: block; margin-top: 5px; color: var(--faint); font-family: var(--mono); font-size: 10px; }
.tool-warning { min-height: 32px; display: inline-flex; align-items: center; gap: 8px; padding: 0 10px; color: #d7cf89; background: rgba(215, 207, 137, 0.1); border: 1px solid rgba(215, 207, 137, 0.24); border-radius: 8px; font-size: 11px; }
.tools-table { overflow: auto; }
.tools-row { grid-template-columns: minmax(110px, 1fr) minmax(92px, .8fr) minmax(180px, 1.6fr) minmax(170px, 1.4fr) 52px 34px; }
.tools-row-head { color: var(--faint); font-size: 11px; }
.tools-row input, .tools-row select { width: 100%; min-width: 0; height: 30px; padding: 0 8px; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); outline: 0; font-size: 12px; }
.tools-row.missing-path input:nth-of-type(2) { border-color: rgba(215, 207, 137, 0.58); }
.default-tool-button { width: 32px; height: 30px; display: inline-grid; place-items: center; color: var(--faint); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); }
.default-tool-button.active { color: var(--accent); background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 42%, transparent); }
.icon-button.danger { color: var(--red); }

/* Path cell with browse button */
.path-cell { display: flex; gap: 4px; min-width: 0; }
.path-cell input { flex: 1; min-width: 0; }
.btn-browse {
  width: 30px; height: 30px; flex-shrink: 0;
  display: grid; place-items: center;
  color: var(--faint); background: var(--bg);
  border: 1px solid var(--line); border-radius: var(--radius);
  cursor: pointer; transition: color .12s, border-color .12s;
}
.btn-browse:hover { color: var(--accent); border-color: var(--accent); }

/* Add tool modal */
.add-tool-modal { width: 440px; }
.modal-body { display: flex; flex-direction: column; gap: 12px; }
.path-input-row { display: flex; gap: 6px; }
.path-input-row input { flex: 1; min-width: 0; }
.path-input-row .btn-browse { height: 32px; width: 32px; }

@media (max-width: 1180px) {
  .tool-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
