<script setup lang="ts">
import { Plus, Radar, Trash2 } from "lucide-vue-next";
import { reactive, ref } from "vue";
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

function addTool() {
  const name = newTool.name.trim();
  if (!name) return;
  store.createTool(name, newTool.type, newTool.path.trim(), newTool.args.trim() || "{path}");
  newTool.name = "";
  newTool.path = "";
  newTool.args = "{path}";
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
  <section class="settings-card">
    <div class="settings-card-title">
      <span>打开工具</span>
      <div class="tools-title-actions">
        <button class="settings-action-button" type="button" :disabled="scanning" @click="scanTools"><Radar />{{ scanning ? "扫描中" : "自动扫描" }}</button>
        <button class="settings-action-button" type="button" @click="addTool"><Plus />新增工具</button>
      </div>
    </div>
    <div class="settings-card-description">工具路径支持 %LOCALAPPDATA%、%ProgramFiles% 和 * 通配符；参数支持 {path}、{url}、{command}、{name}、{cwd}。</div>

    <div class="settings-table tools-table">
      <div class="settings-row tools-row tools-row-head">
        <strong>名称</strong>
        <strong>类型</strong>
        <strong>可执行路径</strong>
        <strong>参数模板</strong>
        <strong>默认</strong>
        <strong></strong>
      </div>
      <div v-for="tool in store.state.data.tools" :key="tool.id" class="settings-row tools-row">
        <input v-model="tool.name" placeholder="工具名称" />
        <select v-model="tool.type">
          <option v-for="type in toolTypes" :key="type" :value="type">{{ type }}</option>
        </select>
        <input v-model="tool.path" placeholder="例如 C:\\Program Files\\App\\app.exe" />
        <input v-model="tool.args" placeholder="例如 {path} 或 --open {url}" />
        <span class="setting-switch" title="设为该类型的默认工具">
          <input :checked="tool.default" type="checkbox" @change="store.setDefaultTool(tool.id)" /><span></span>
        </span>
        <button class="icon-button danger" type="button" title="删除工具" @click="deleteTool(tool.id)"><Trash2 /></button>
      </div>
      <div class="settings-row tools-row new-tool-row">
        <input v-model="newTool.name" placeholder="新工具名称" @keydown.enter.prevent="addTool" />
        <select v-model="newTool.type">
          <option v-for="type in toolTypes" :key="type" :value="type">{{ type }}</option>
        </select>
        <input v-model="newTool.path" placeholder="可执行路径" @keydown.enter.prevent="addTool" />
        <input v-model="newTool.args" placeholder="参数模板" @keydown.enter.prevent="addTool" />
        <span></span>
        <button class="icon-button" type="button" title="新增工具" @click="addTool"><Plus /></button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tools-title-actions { display: inline-flex; align-items: center; gap: 8px; }
.settings-action-button:disabled { opacity: .58; cursor: wait; }
.tools-table { overflow: auto; }
.tools-row { grid-template-columns: minmax(110px, 1fr) minmax(92px, .8fr) minmax(180px, 1.6fr) minmax(170px, 1.4fr) 52px 34px; }
.tools-row-head { color: var(--faint); font-size: 11px; }
.tools-row input, .tools-row select { width: 100%; min-width: 0; height: 30px; padding: 0 8px; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); outline: 0; font-size: 12px; }
.new-tool-row { background: rgba(138, 127, 240, 0.06); }
.icon-button.danger { color: var(--red); }
</style>
