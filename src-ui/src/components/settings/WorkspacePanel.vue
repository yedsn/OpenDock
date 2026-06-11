<script setup lang="ts">
import { computed } from "vue";
import { Database, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { useOpenDockStore } from "../../store";
import { confirmDelete } from "../../dialog";

const store = useOpenDockStore();
const workspace = computed(() => store.activeWorkspace());

const workspaceStats = computed(() => {
  const id = workspace.value.id;
  const scenes = store.state.data.scenes.filter((scene) => scene.workspaceId === id);
  const collections = store.state.data.collections.filter((collection) => collection.workspaceId === id);
  const items = store.state.data.items.filter((item) => item.workspaceId === id);
  return {
    scenes: scenes.length,
    collections: collections.length,
    items: items.length,
    favorites: collections.filter((collection) => collection.favorite).length
  };
});

function openManage() {
  store.state.workspaceMenuOpen = true;
}

function openNewWorkspace() {
  store.state.modal.editingId = undefined;
  store.state.modal.kind = "workspace";
}

function editWorkspace(id: string) {
  store.state.modal.editingId = id;
  store.state.modal.kind = "workspace";
}

async function deleteWorkspace(id: string) {
  if (store.state.data.workspaces.length <= 1) {
    window.alert("至少保留一个工作区");
    return;
  }
  const target = store.state.data.workspaces.find((entry) => entry.id === id);
  if (!target) return;
  if (await confirmDelete(`确认删除工作区「${target.name}」？所有关联的场景、集合和资源将被删除。`)) {
    store.deleteWorkspace(id);
  }
}
</script>

<template>
  <section class="settings-card workspace-settings-card">
    <div class="settings-card-title">
      <span>当前工作区</span>
      <div class="workspace-title-actions">
        <button class="settings-action-button" type="button" @click="openNewWorkspace"><Plus />新建工作区</button>
        <button class="settings-action-button" type="button" @click="openManage"><Database />侧栏切换</button>
      </div>
    </div>

    <div class="workspace-overview">
      <div class="workspace-stat"><span>场景</span><strong>{{ workspaceStats.scenes }}</strong></div>
      <div class="workspace-stat"><span>集合</span><strong>{{ workspaceStats.collections }}</strong></div>
      <div class="workspace-stat"><span>资源</span><strong>{{ workspaceStats.items }}</strong></div>
      <div class="workspace-stat"><span>收藏集合</span><strong>{{ workspaceStats.favorites }}</strong></div>
    </div>

    <div class="settings-grid">
      <label class="setting-field"><span>工作区名称</span><input v-model="workspace.name" /></label>
      <label class="setting-field"><span>存储说明</span><input v-model="workspace.storage" /></label>
      <label class="setting-field full"><span>备注</span><textarea v-model="workspace.remark"></textarea></label>
    </div>
  </section>

  <section class="settings-card workspace-settings-card">
    <div class="settings-card-title">工作区列表</div>
    <div class="settings-card-description">切换、编辑或删除工作区。删除工作区会同时删除其下的场景、集合和资源。</div>

    <div class="settings-table workspace-table">
      <div class="settings-row workspace-row workspace-row-head">
        <strong>名称</strong>
        <strong>存储</strong>
        <strong>内容</strong>
        <strong></strong>
      </div>
      <div v-for="entry in store.state.data.workspaces" :key="entry.id" class="settings-row workspace-row" :class="{ active: entry.id === store.state.data.activeWorkspaceId }">
        <div class="workspace-name-cell">
          <Database />
          <span><strong>{{ entry.name }}</strong><small>{{ entry.remark || '无备注' }}</small></span>
        </div>
        <span>{{ entry.storage || '本地数据' }}</span>
        <span>{{ store.state.data.scenes.filter((scene) => scene.workspaceId === entry.id).length }} 场景 / {{ store.state.data.collections.filter((collection) => collection.workspaceId === entry.id).length }} 集合</span>
        <div class="workspace-row-actions">
          <button class="settings-action-button" type="button" :disabled="entry.id === store.state.data.activeWorkspaceId" @click="store.switchWorkspace(entry.id)">切换</button>
          <button class="icon-button" type="button" title="编辑工作区" @click="editWorkspace(entry.id)"><Pencil /></button>
          <button class="icon-button danger" type="button" title="删除工作区" :disabled="store.state.data.workspaces.length <= 1" @click="deleteWorkspace(entry.id)"><Trash2 /></button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.workspace-settings-card { gap: 14px; }
.workspace-title-actions { display: inline-flex; align-items: center; gap: 8px; }
.workspace-overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.workspace-stat { display: grid; gap: 5px; padding: 11px 12px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; }
.workspace-stat span { color: var(--faint); font-size: 11px; }
.workspace-stat strong { color: var(--text); font-size: 20px; font-weight: 600; }
.workspace-row { grid-template-columns: minmax(170px, 1.4fr) minmax(120px, .8fr) minmax(140px, 1fr) auto; }
.workspace-row.active { background: color-mix(in srgb, var(--accent) 9%, transparent); }
.workspace-row-head { color: var(--faint); font-size: 11px; }
.workspace-name-cell { min-width: 0; display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: center; gap: 8px; }
.workspace-name-cell svg { color: var(--accent); }
.workspace-name-cell strong, .workspace-name-cell small { display: block; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.workspace-name-cell strong { font-size: 12px; font-weight: 600; }
.workspace-name-cell small { margin-top: 3px; color: var(--faint); font-size: 11px; }
.workspace-row-actions { display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px; }
.workspace-row-actions .settings-action-button { height: 28px; padding: 0 9px; }
.icon-button.danger { color: var(--red); }
@media (max-width: 1180px) {
  .workspace-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .workspace-row { grid-template-columns: 1fr; align-items: start; }
  .workspace-row-actions { justify-content: flex-start; }
}
</style>
