<script setup lang="ts">
import { computed, reactive } from "vue";
import { ArrowDown, ArrowUp, Blocks, Plus, RotateCcw, Trash2 } from "lucide-vue-next";
import { useOpenDockStore } from "../../store";
import { templateToCollectionType } from "../../helpers";

const store = useOpenDockStore();
const defaultTemplates = ["代码目录", "本地网页", "开发环境网页", "线上环境网页", "常用命令"];
const newTemplate = reactive({ name: "" });

const templatePreview = computed(() => store.state.data.settings.templates.map((name, index) => ({
  name,
  index,
  type: templateToCollectionType(name),
  sample: `项目名称-${name || `模板 ${index + 1}`}`
})));

function addTemplate() {
  const name = newTemplate.name.trim();
  if (!name) return;
  store.state.data.settings.templates.push(name);
  newTemplate.name = "";
}

function removeTemplate(index: number) {
  store.state.data.settings.templates.splice(index, 1);
}

function moveTemplate(index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  const templates = store.state.data.settings.templates;
  if (nextIndex < 0 || nextIndex >= templates.length) return;
  const [template] = templates.splice(index, 1);
  templates.splice(nextIndex, 0, template);
}

function restoreDefaultTemplates() {
  store.state.data.settings.templates.splice(0, store.state.data.settings.templates.length, ...defaultTemplates);
}
</script>

<template>
  <section class="settings-card templates-settings-card">
    <div class="settings-card-title">
      <span>项目默认集合模板</span>
      <button class="settings-action-button" type="button" @click="restoreDefaultTemplates"><RotateCcw />恢复默认</button>
    </div>
    <div class="settings-card-description">新建“项目”场景时，会按下面顺序自动创建集合。模板名称会拼接到项目名称后，系统会根据关键词推断集合类型。</div>

    <div class="template-preview-strip">
      <div v-for="item in templatePreview" :key="`${item.index}-${item.name}`" class="template-preview-item">
        <Blocks />
        <span><strong>{{ item.sample }}</strong><small>{{ item.type }}</small></span>
      </div>
      <div v-if="templatePreview.length === 0" class="template-empty">当前没有模板，新建项目场景时不会自动创建集合。</div>
    </div>
  </section>

  <section class="settings-card templates-settings-card">
    <div class="settings-card-title">模板配置</div>
    <div class="settings-table template-table">
      <div class="settings-row template-row template-row-head">
        <strong>顺序</strong>
        <strong>模板名称</strong>
        <strong>推断类型</strong>
        <strong></strong>
      </div>
      <div v-for="(_, index) in store.state.data.settings.templates" :key="index" class="settings-row template-row">
        <span class="template-order">{{ index + 1 }}</span>
        <input v-model="store.state.data.settings.templates[index]" placeholder="例如 代码目录 / 常用命令 / 本地网页" />
        <code>{{ templateToCollectionType(store.state.data.settings.templates[index]) }}</code>
        <div class="template-actions">
          <button class="icon-button" type="button" title="上移" :disabled="index === 0" @click="moveTemplate(index, -1)"><ArrowUp /></button>
          <button class="icon-button" type="button" title="下移" :disabled="index === store.state.data.settings.templates.length - 1" @click="moveTemplate(index, 1)"><ArrowDown /></button>
          <button class="icon-button danger" type="button" title="删除模板" @click="removeTemplate(index)"><Trash2 /></button>
        </div>
      </div>
      <div class="settings-row template-row new-template-row">
        <span class="template-order">+</span>
        <input v-model="newTemplate.name" placeholder="新增模板名称" @keydown.enter.prevent="addTemplate" />
        <code>{{ newTemplate.name ? templateToCollectionType(newTemplate.name) : '待输入' }}</code>
        <div class="template-actions">
          <button class="icon-button" type="button" title="新增模板" @click="addTemplate"><Plus /></button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.templates-settings-card { gap: 14px; }
.template-preview-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.template-preview-item { min-width: 0; display: grid; grid-template-columns: 28px minmax(0, 1fr); align-items: center; gap: 9px; padding: 10px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; }
.template-preview-item svg { color: var(--accent); }
.template-preview-item strong, .template-preview-item small { display: block; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.template-preview-item strong { color: var(--text); font-size: 12px; font-weight: 600; }
.template-preview-item small { margin-top: 3px; color: var(--faint); font-size: 11px; }
.template-empty { grid-column: 1 / -1; min-height: 76px; display: grid; place-items: center; color: var(--faint); border: 1px dashed var(--line); border-radius: 8px; }
.template-row { grid-template-columns: 54px minmax(180px, 1fr) minmax(110px, .6fr) auto; }
.template-row-head { color: var(--faint); font-size: 11px; }
.template-row input { width: 100%; min-width: 0; height: 30px; padding: 0 8px; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); outline: 0; font-size: 12px; }
.template-order { color: var(--faint); font-family: var(--mono); }
.template-actions { display: inline-flex; justify-content: flex-end; gap: 4px; }
.new-template-row { background: rgba(138, 127, 240, 0.06); }
.icon-button.danger { color: var(--red); }
@media (max-width: 1180px) {
  .template-row { grid-template-columns: 44px minmax(0, 1fr) auto; }
  .template-row code { display: none; }
}
</style>
