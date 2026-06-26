<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { open as openFilePicker } from "@tauri-apps/plugin-dialog";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FolderSearch,
  Monitor,
  Plus,
  Radar,
  X
} from "lucide-vue-next";
import { useOpenDockStore } from "../store";
import { useI18n } from "../i18n";
import type { OpenTool, ToolType } from "../types";

const store = useOpenDockStore();
const { t } = useI18n();
const scanning = ref(false);
const scanDone = ref(false);
const scanError = ref("");
const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
const step = ref<"scan" | "review" | "add">("scan");

const newTool = reactive({
  type: "" as string,
  name: "",
  path: "",
  args: ""
});

const toolTypeConfig: { type: string; label: string; desc: string; icon: typeof Monitor; optional?: boolean }[] = [
  { type: "编辑器", label: "编辑器", desc: "打开代码目录", icon: Monitor },
  { type: "浏览器", label: "浏览器", desc: "打开网页资源", icon: Monitor },
  { type: "终端", label: "终端", desc: "执行命令", icon: Monitor },
  { type: "Office", label: "Office", desc: "打开 Excel 等文件", icon: Monitor, optional: true },
  { type: "系统", label: "系统默认", desc: "打开文件和应用", icon: Monitor, optional: true }
];

const toolStatus = computed(() =>
  toolTypeConfig.map((rt) => {
    const tools = store.state.data.tools.filter((t) => t.type === rt.type);
    return { ...rt, tools, count: tools.length };
  })
);

const missingTypes = computed(() => toolStatus.value.filter((s) => s.count === 0));
const requiredMissing = computed(() => missingTypes.value.filter((s) => !s.optional));
const canFinish = computed(() => toolStatus.value.filter((s) => !s.optional).every((s) => s.count > 0));

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
  step.value = "add";
}

function cancelAdd() {
  newTool.type = "";
  step.value = "review";
}

function confirmAdd() {
  const name = newTool.name.trim();
  const path = newTool.path.trim();
  if (!name || !path) return;
  store.createTool(name, newTool.type as ToolType, path, newTool.args.trim() || argsPlaceholder(newTool.type));
  newTool.type = "";
  step.value = "review";
}

async function pickAppPath() {
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
          // Derive name from filename
          const parts = filePath.replace(/\\/g, "/").split("/");
          const basename = parts[parts.length - 1];
          newTool.name = basename.replace(/\.(app|exe)$/i, "");
        }
      }
    }
  } catch {
    // User cancelled or dialog unavailable
  }
}

async function scanTools() {
  if (scanning.value) return;
  scanning.value = true;
  scanError.value = "";
  try {
    const result = await store.scanOpenTools();
    if (result.error) scanError.value = result.error;
    scanDone.value = true;
    step.value = "review";
  } finally {
    scanning.value = false;
  }
}

function finishSetup() {
  store.completeToolSetup();
}

onMounted(() => {
  if (store.state.data.tools.length <= 1) {
    scanTools();
  } else {
    step.value = "review";
  }
});
</script>

<template>
  <div class="onboarding">
    <div class="onboarding-scene">
      <!-- Decorative background shapes -->
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>

      <div class="onboarding-card" :class="{ 'card-enter': true }">
        <!-- ── Step 1: Scan ── -->
        <template v-if="step === 'scan'">
          <div class="card-hero">
            <div class="hero-icon-wrap">
              <Radar :size="32" />
            </div>
            <h1>配置打开工具</h1>
            <p class="hero-desc">
              OpenDock 需要打开工具来启动你的资源。<br />
              第一步：扫描本机已安装的工具。
            </p>
          </div>

          <button class="btn-scan" :disabled="scanning" @click="scanTools">
            <Radar :size="18" :class="{ spinning: scanning }" />
            <span>{{ scanning ? "正在扫描..." : "扫描本机工具" }}</span>
          </button>

          <p class="hint">也可以跳过扫描，手动添加工具</p>
          <button class="btn-ghost" @click="step = 'review'">手动配置</button>
        </template>

        <!-- ── Step 2: Review ── -->
        <template v-if="step === 'review'">
          <div class="card-hero">
            <div class="hero-icon-wrap small">
              <CheckCircle2 v-if="canFinish" :size="22" />
              <AlertTriangle v-else :size="22" />
            </div>
            <h1>工具配置</h1>
            <p class="hero-desc" v-if="scanDone">扫描完成，以下是本机工具情况：</p>
            <p class="hero-desc" v-else>以下是当前工具配置情况：</p>
          </div>

          <div v-if="scanError" class="alert error"><AlertTriangle :size="14" /><span>{{ scanError }}</span></div>

          <div class="tool-grid">
            <div
              v-for="status in toolStatus"
              :key="status.type"
              class="tool-tile"
              :class="{ found: status.count > 0, missing: status.count === 0 }"
            >
              <div class="tile-indicator">
                <CheckCircle2 v-if="status.count > 0" :size="18" />
                <AlertTriangle v-else :size="18" />
              </div>
              <div class="tile-body">
                <div class="tile-label">
                  {{ status.label }}
                  <span v-if="status.optional" class="badge-optional">可选</span>
                </div>
                <div class="tile-detail">
                  <template v-if="status.count > 0">{{ status.tools.map((t: OpenTool) => t.name).join("、") }}</template>
                  <template v-else>{{ status.desc }}</template>
                </div>
              </div>
              <button v-if="status.count === 0" class="btn-add-sm" @click="startAddForType(status.type)">
                <Plus :size="14" />添加
              </button>
            </div>
          </div>

          <div class="review-actions">
            <button class="btn-ghost" @click="scanTools" :disabled="scanning">
              <Radar :size="14" /><span>{{ scanning ? "扫描中..." : "重新扫描" }}</span>
            </button>

            <div class="review-spacer"></div>

            <button class="btn-finish" :disabled="!canFinish" @click="finishSetup">
              <span>开始使用</span><ArrowRight :size="16" />
            </button>
          </div>

          <p v-if="requiredMissing.length > 0" class="hint warning">
            <AlertTriangle :size="13" />
            还需配置 {{ requiredMissing.length }} 个必要工具才能开始使用
          </p>
        </template>

        <!-- ── Step 3: Add tool manually ── -->
        <template v-if="step === 'add'">
          <div class="card-hero">
            <div class="hero-icon-wrap small"><Plus :size="22" /></div>
            <h1>添加{{ newTool.type }}工具</h1>
          </div>

          <div class="add-form">
            <label class="field">
              <span class="field-label">名称</span>
              <input v-model="newTool.name" placeholder="例如 Chrome" class="field-input" />
            </label>

            <label class="field">
              <span class="field-label">程序路径</span>
              <div class="field-path">
                <input v-model="newTool.path" :placeholder="isMac ? '/Applications/App.app' : 'C:\\Program Files\\App\\app.exe'" class="field-input" />
                <button type="button" class="btn-browse" @click="pickAppPath" title="选择应用程序">
                  <FolderSearch :size="15" />
                </button>
              </div>
            </label>

            <label class="field">
              <span class="field-label">参数模板</span>
              <input v-model="newTool.args" :placeholder="argsPlaceholder(newTool.type)" class="field-input mono" />
            </label>
          </div>

          <div class="add-actions">
            <button class="btn-ghost" @click="cancelAdd">取消</button>
            <button class="btn-primary" :disabled="!newTool.name.trim() || !newTool.path.trim()" @click="confirmAdd">
              确认添加
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.onboarding {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  overflow: hidden;
}

.onboarding-scene {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 40px 24px;
}

/* ── Ambient orbs ── */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  opacity: 0.45;
}
.orb-1 {
  width: 420px;
  height: 420px;
  top: -10%;
  left: -8%;
  background: var(--accent);
  opacity: 0.12;
}
.orb-2 {
  width: 320px;
  height: 320px;
  bottom: -6%;
  right: -4%;
  background: var(--accent-2, var(--green));
  opacity: 0.09;
}

/* ── Card ── */
.onboarding-card {
  position: relative;
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 36px 32px 32px;
  background: color-mix(in srgb, var(--bg2) 92%, transparent);
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 24px 64px var(--shadow, rgba(0,0,0,.32)), 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent) inset;
  animation: cardIn .4s cubic-bezier(.22,1,.36,1) both;
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(16px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Hero ── */
.card-hero {
  text-align: center;
}
.hero-icon-wrap {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
  border-radius: 16px;
}
.hero-icon-wrap.small {
  width: 42px;
  height: 42px;
  border-radius: 12px;
}
.card-hero h1 {
  margin: 0 0 6px;
  color: var(--text);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.hero-desc {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
}

/* ── Buttons ── */
.btn-scan {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .12s, opacity .12s;
}
.btn-scan:hover:not(:disabled) { transform: translateY(-1px); }
.btn-scan:active:not(:disabled) { transform: translateY(0); }
.btn-scan:disabled { opacity: .55; cursor: wait; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: color .12s, border-color .12s;
}
.btn-ghost:hover:not(:disabled) { color: var(--text); border-color: var(--line-strong); }
.btn-ghost:disabled { opacity: .5; cursor: wait; }

.btn-finish {
  height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 24px;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .12s, opacity .12s;
}
.btn-finish:hover:not(:disabled) { transform: translateY(-1px); }
.btn-finish:disabled { opacity: .4; cursor: not-allowed; }

.btn-primary {
  height: 34px;
  padding: 0 18px;
  color: var(--text);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 36%, transparent);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .12s;
}
.btn-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 24%, var(--bg2)); }
.btn-primary:disabled { opacity: .4; cursor: not-allowed; }

/* ── Hint text ── */
.hint {
  margin: 0;
  text-align: center;
  color: var(--faint);
  font-size: 12px;
}
.hint.warning {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: #d7cf89;
  text-align: center;
}

/* ── Tool status grid ── */
.tool-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tool-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 10px;
  transition: background .12s;
}
.tool-tile.found {
  background: color-mix(in srgb, var(--green) 6%, var(--bg));
  border: 1px solid color-mix(in srgb, var(--green) 16%, var(--line));
}
.tool-tile.missing {
  background: color-mix(in srgb, #d7cf89 5%, var(--bg));
  border: 1px solid color-mix(in srgb, #d7cf89 16%, var(--line));
}
.tile-indicator { flex-shrink: 0; }
.tool-tile.found .tile-indicator { color: var(--green); }
.tool-tile.missing .tile-indicator { color: #d7cf89; }
.tile-body { flex: 1; min-width: 0; }
.tile-label {
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}
.tile-detail {
  color: var(--muted);
  font-size: 11px;
  margin-top: 1px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.badge-optional {
  display: inline-block;
  margin-left: 5px;
  padding: 0 5px;
  color: var(--faint);
  font-size: 9px;
  font-weight: 600;
  line-height: 16px;
  background: var(--bg3);
  border: 1px solid var(--line);
  border-radius: 4px;
  vertical-align: middle;
}
.btn-add-sm {
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 10px;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background .12s;
}
.btn-add-sm:hover { background: color-mix(in srgb, var(--accent) 22%, var(--bg2)); }

/* ── Review actions bar ── */
.review-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.review-spacer { flex: 1; }

/* ── Add tool form ── */
.add-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-label {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.field-input {
  height: 34px;
  padding: 0 10px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  outline: none;
  font-size: 13px;
  transition: border-color .12s;
}
.field-input:focus { border-color: var(--accent); }
.field-input.mono { font-family: var(--mono); font-size: 12px; }
.field-path {
  display: flex;
  gap: 6px;
}
.field-path .field-input { flex: 1; min-width: 0; }
.btn-browse {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: var(--muted);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
  transition: color .12s, border-color .12s;
}
.btn-browse:hover { color: var(--accent); border-color: var(--accent); }

/* ── Add actions ── */
.add-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

/* ── Alert ── */
.alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 9px;
  font-size: 12px;
}
.alert.error {
  color: var(--red);
  background: rgba(210, 109, 109, 0.1);
  border: 1px solid rgba(210, 109, 109, 0.2);
}

/* ── Responsive ── */
@media (max-width: 560px) {
  .onboarding-card { padding: 24px 18px 22px; gap: 16px; }
  .card-hero h1 { font-size: 18px; }
}
</style>
