<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { AlertTriangle, CheckCircle2, Plus, Radar, Star, Trash2, Wrench } from "lucide-vue-next";
import { useOpenDockStore } from "../../store";
import type { ToolType } from "../../types";
import { confirmDelete } from "../../dialog";

const store = useOpenDockStore();
const scanning = ref(false);

const toolTypes: ToolType[] = ["编辑器", "浏览器", "终端", "Office", "CAD", "系统", "应用", "插件"];

const newTool = reactive({
  name: "",
  type: "应用" as ToolType,
  path: "",
  args: "{path}"
});

const toolTypeSummary = computed(() => toolTypes.map((type) => {
  const tools = store.state.data.tools.filter((tool) => tool.type === type);
  return {
    type,
    count: tools.length,
    defaultTool: tools.find((tool) => tool.default)?.name || "未设置"
  };
}));

const toolsMissingPath = computed(() => store.state.data.tools.filter((tool) => tool.path.trim() !== "shell:open" && !tool.path.trim()).length);

function argsPlaceholder(type: ToolType) {
  if (type === "浏览器") return "{url}";
  if (type === "终端") return "-NoExit -Command {command}";
  return "{path}";
}

function addTool() {
  const name = newTool.name.trim();
  if (!name) return;
  store.createTool(name, newTool.type, newTool.path.trim(), newTool.args.trim() || argsPlaceholder(newTool.type));
  newTool.name = "";
  newTool.path = "";
  newTool.args = argsPlaceholder(newTool.type);
}

function updateNewToolType(type: ToolType) {
  newTool.type = type;
  if (!newTool.args.trim() || ["{path}", "{url}", "-NoExit -Command {command}"].includes(newTool.args.trim())) {
    newTool.args = argsPlaceholder(type);
  }
}

async function scanTools() {
  if (scanning.value) return;
  scanning.value = true;
  try {
    await store.scanOpenTools();
  } finally {
    scanning.value = false;
  }
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
      <span>打开工具</span>
      <div class="tools-title-actions">
        <button class="settings-action-button" type="button" :disabled="scanning" @click="scanTools"><Radar />{{ scanning ? "扫描中" : "自动扫描" }}</button>
        <button class="settings-action-button" type="button" @click="addTool"><Plus />新增工具</button>
      </div>
    </div>
    <div class="settings-card-description">工具路径支持 %LOCALAPPDATA%、%ProgramFiles% 和 * 通配符；参数支持 {path}、{url}、{command}、{name}、{cwd}。</div>

    <div class="tool-summary-grid">
      <div v-for="item in toolTypeSummary" :key="item.type" class="tool-summary-item" :class="{ empty: item.count === 0 }">
        <Wrench />
        <span><strong>{{ item.type }}</strong><small>{{ item.count }} 个工具 / 默认：{{ item.defaultTool }}</small></span>
      </div>
    </div>

    <div v-if="toolsMissingPath > 0" class="tool-warning"><AlertTriangle />有 {{ toolsMissingPath }} 个工具缺少可执行路径，除非由插件或系统命令接管，否则打开时可能失败。</div>
  </section>

  <section class="settings-card tools-settings-card">
    <div class="settings-card-title">工具配置</div>
    <div class="settings-table tools-table">
      <div class="settings-row tools-row tools-row-head">
        <strong>名称</strong>
        <strong>类型</strong>
        <strong>可执行路径</strong>
        <strong>参数模板</strong>
        <strong>默认</strong>
        <strong></strong>
      </div>
      <div v-for="tool in store.state.data.tools" :key="tool.id" class="settings-row tools-row" :class="{ 'missing-path': tool.path.trim() !== 'shell:open' && !tool.path.trim() }">
        <input v-model="tool.name" placeholder="工具名称" />
        <select v-model="tool.type">
          <option v-for="type in toolTypes" :key="type" :value="type">{{ type }}</option>
        </select>
        <input v-model="tool.path" placeholder="例如 C:\\Program Files\\App\\app.exe" />
        <input v-model="tool.args" :placeholder="argsPlaceholder(tool.type)" />
        <button class="default-tool-button" type="button" :class="{ active: tool.default }" :title="tool.default ? '当前类型默认工具' : '设为该类型默认工具'" @click="store.setDefaultTool(tool.id)">
          <CheckCircle2 v-if="tool.default" />
          <Star v-else />
        </button>
        <button class="icon-button danger" type="button" title="删除工具" @click="deleteTool(tool.id)"><Trash2 /></button>
      </div>
      <div class="settings-row tools-row new-tool-row">
        <input v-model="newTool.name" placeholder="新工具名称" @keydown.enter.prevent="addTool" />
        <select :value="newTool.type" @change="updateNewToolType(($event.target as HTMLSelectElement).value as ToolType)">
          <option v-for="type in toolTypes" :key="type" :value="type">{{ type }}</option>
        </select>
        <input v-model="newTool.path" placeholder="可执行路径或 shell:open" @keydown.enter.prevent="addTool" />
        <input v-model="newTool.args" placeholder="参数模板" @keydown.enter.prevent="addTool" />
        <span></span>
        <button class="icon-button" type="button" title="新增工具" @click="addTool"><Plus /></button>
      </div>
    </div>
  </section>
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
.tool-warning { min-height: 32px; display: inline-flex; align-items: center; gap: 8px; padding: 0 10px; color: #d7cf89; background: rgba(215, 207, 137, 0.1); border: 1px solid rgba(215, 207, 137, 0.24); border-radius: 8px; font-size: 11px; }
.tools-table { overflow: auto; }
.tools-row { grid-template-columns: minmax(110px, 1fr) minmax(92px, .8fr) minmax(180px, 1.6fr) minmax(170px, 1.4fr) 52px 34px; }
.tools-row-head { color: var(--faint); font-size: 11px; }
.tools-row input, .tools-row select { width: 100%; min-width: 0; height: 30px; padding: 0 8px; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); outline: 0; font-size: 12px; }
.tools-row.missing-path input:nth-of-type(2) { border-color: rgba(215, 207, 137, 0.58); }
.default-tool-button { width: 32px; height: 30px; display: inline-grid; place-items: center; color: var(--faint); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); }
.default-tool-button.active { color: var(--accent); background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 42%, transparent); }
.new-tool-row { background: rgba(138, 127, 240, 0.06); }
.icon-button.danger { color: var(--red); }
@media (max-width: 1180px) {
  .tool-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
