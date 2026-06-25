<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { AlertTriangle, ArrowRight, CheckCircle2, Plus, Radar, Wrench } from "lucide-vue-next";
import { useOpenDockStore } from "../store";
import { useI18n } from "../i18n";
import type { OpenTool, ToolType } from "../types";

const store = useOpenDockStore();
const { t } = useI18n();
const scanning = ref(false);
const scanDone = ref(false);
const scanError = ref("");
const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

const newTool = reactive({
  type: "" as string,
  name: "",
  path: "",
  args: ""
});

const requiredToolTypes: { type: string; label: string; desc: string; optional?: boolean }[] = [
  { type: "编辑器", label: "编辑器", desc: "打开代码目录" },
  { type: "浏览器", label: "浏览器", desc: "打开网页资源" },
  { type: "终端", label: "终端", desc: "执行命令" },
  { type: "Office", label: "Office", desc: "打开 Excel 等文件", optional: true },
  { type: "系统", label: "系统默认", desc: "打开文件和应用", optional: true }
];

const toolStatus = computed(() => {
  return requiredToolTypes.map((rt) => {
    const tools = store.state.data.tools.filter((t) => t.type === rt.type);
    const hasDefault = tools.some((t) => t.default);
    const hasValid = tools.some((t) => t.path.trim());
    return { ...rt, tools, hasDefault, hasValid, count: tools.length };
  });
});

const missingTypes = computed(() => toolStatus.value.filter((s) => s.count === 0));
const canFinish = computed(() => toolStatus.value.filter((s) => s.type !== "系统" && s.type !== "Office").every((s) => s.count > 0));
const activeNewToolType = computed(() => newTool.type);

function argsPlaceholder(type: string) {
  if (type === "浏览器") return "{url}";
  if (type === "终端") return isMac ? "{command}" : "-NoExit -Command {command}";
  return "{path}";
}

function startAddForType(type: string) {
  newTool.type = type;
  newTool.name = "";
  newTool.path = "";
  newTool.args = argsPlaceholder(type);
}

function cancelAdd() {
  newTool.type = "";
  newTool.name = "";
  newTool.path = "";
}

function confirmAdd() {
  const name = newTool.name.trim();
  const path = newTool.path.trim();
  if (!name || !path) return;
  store.createTool(name, newTool.type as ToolType, path, newTool.args.trim() || argsPlaceholder(newTool.type));
  newTool.type = "";
  newTool.name = "";
  newTool.path = "";
}

async function scanTools() {
  if (scanning.value) return;
  scanning.value = true;
  scanError.value = "";
  try {
    const result = await store.scanOpenTools();
    if (result.error) scanError.value = result.error;
    scanDone.value = true;
  } finally {
    scanning.value = false;
  }
}

function finishSetup() {
  store.completeToolSetup();
}

onMounted(() => {
  if (!scanDone.value && store.state.data.tools.length <= 1) {
    scanTools();
  }
});
</script>

<template>
  <div class="setup-guide">
    <div class="setup-card">
      <div class="setup-header">
        <Wrench :size="28" />
        <h1>配置打开工具</h1>
        <p>OpenDock 需要配置打开工具来打开你的资源。先扫描本机已安装的工具，缺失的工具类型可以手动添加。</p>
      </div>

      <button class="scan-button" :disabled="scanning" @click="scanTools">
        <Radar :size="18" />
        <span>{{ scanning ? "扫描中..." : "扫描本机工具" }}</span>
      </button>

      <div v-if="scanError" class="scan-error"><AlertTriangle :size="14" />{{ scanError }}</div>

      <div v-if="scanDone || store.state.data.tools.length > 1" class="tool-status-list">
        <div v-for="status in toolStatus" :key="status.type" class="tool-status-row" :class="{ missing: status.count === 0, ok: status.count > 0 }">
          <div class="status-icon">
            <CheckCircle2 v-if="status.count > 0" :size="16" />
            <AlertTriangle v-else :size="16" />
          </div>
          <div class="status-info">
            <strong>{{ status.label }}<small v-if="status.optional" class="optional-tag">可选</small></strong>
            <small>{{ status.count > 0 ? status.tools.map((t: OpenTool) => t.name).join("、") : status.desc + " — 未配置" }}</small>
          </div>
          <button v-if="status.count === 0" class="add-type-button" @click="startAddForType(status.type)"><Plus :size="14" />添加</button>
        </div>
      </div>

      <div v-if="activeNewToolType" class="add-tool-form">
        <h3>添加{{ activeNewToolType }}工具</h3>
        <label class="form-field"><span>名称</span><input v-model="newTool.name" placeholder="例如 Chrome" /></label>
        <label class="form-field"><span>路径</span><input v-model="newTool.path" :placeholder="isMac ? '/Applications/App.app' : 'C:\\Program Files\\App\\app.exe'" /></label>
        <label class="form-field"><span>参数模板</span><input v-model="newTool.args" :placeholder="argsPlaceholder(activeNewToolType)" /></label>
        <div class="form-actions">
          <button class="btn-secondary" @click="cancelAdd">取消</button>
          <button class="btn-primary" :disabled="!newTool.name.trim() || !newTool.path.trim()" @click="confirmAdd">确认添加</button>
        </div>
      </div>

      <div class="setup-footer">
        <p v-if="missingTypes.filter(s => !s.optional).length > 0 && !activeNewToolType" class="missing-hint">
          <AlertTriangle :size="14" />
          还有 {{ missingTypes.filter(s => !s.optional).length }} 个必要工具未配置，点击"添加"手动指定
        </p>
        <button class="finish-button" :disabled="!canFinish" @click="finishSetup">
          <span>开始使用</span><ArrowRight :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setup-guide {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--bg);
}
.setup-card {
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 32px;
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: 14px;
}
.setup-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  color: var(--accent);
}
.setup-header h1 {
  margin: 0;
  color: var(--text);
  font-size: 20px;
  font-weight: 700;
}
.setup-header p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.scan-button {
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background .12s;
}
.scan-button:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 20%, var(--bg2)); }
.scan-button:disabled { opacity: .58; cursor: wait; }
.scan-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  color: var(--red);
  background: rgba(210, 109, 109, 0.1);
  border: 1px solid rgba(210, 109, 109, 0.24);
  border-radius: 8px;
  font-size: 12px;
}
.tool-status-list { display: flex; flex-direction: column; gap: 8px; }
.tool-status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.tool-status-row.ok { border-left: 3px solid var(--green); }
.tool-status-row.missing { border-left: 3px solid #d7cf89; }
.status-icon { flex-shrink: 0; }
.tool-status-row.ok .status-icon { color: var(--green); }
.tool-status-row.missing .status-icon { color: #d7cf89; }
.status-info { flex: 1; min-width: 0; }
.status-info strong { display: block; color: var(--text); font-size: 13px; font-weight: 600; }
.status-info small { display: block; color: var(--muted); font-size: 11px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.add-type-button {
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.add-type-button:hover { background: color-mix(in srgb, var(--accent) 20%, var(--bg2)); }
.add-tool-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.add-tool-form h3 { margin: 0; color: var(--text); font-size: 13px; font-weight: 600; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-field span { color: var(--muted); font-size: 11px; font-weight: 600; }
.form-field input {
  height: 30px;
  padding: 0 8px;
  color: var(--text);
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: 6px;
  outline: 0;
  font-size: 12px;
}
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.btn-secondary {
  height: 30px;
  padding: 0 14px;
  color: var(--muted);
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.btn-secondary:hover { color: var(--text); }
.btn-primary {
  height: 30px;
  padding: 0 14px;
  color: var(--text);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled { opacity: .48; cursor: not-allowed; }
.setup-footer { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.missing-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #d7cf89;
  font-size: 12px;
}
.finish-button {
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 28px;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .12s;
}
.finish-button:hover:not(:disabled) { opacity: .9; }
.finish-button:disabled { opacity: .48; cursor: not-allowed; }
</style>
