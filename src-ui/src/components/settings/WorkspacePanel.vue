<script setup lang="ts">
import { computed } from "vue";
import { Database, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { useOpenDockStore } from "../../store";
import { useI18n } from "../../i18n";
import { confirmDelete } from "../../dialog";

const store = useOpenDockStore();
const { t } = useI18n();
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
    window.alert(t("sidebar.atLeastOneWorkspace"));
    return;
  }
  const target = store.state.data.workspaces.find((entry) => entry.id === id);
  if (!target) return;
  if (await confirmDelete(t("sidebar.confirmDeleteWorkspace", { name: target.name }))) {
    store.deleteWorkspace(id);
  }
}
</script>

<template>
  <section class="settings-card workspace-settings-card">
    <div class="settings-card-title">
      <span>{{ $t("settings.currentWorkspace") }}</span>
      <div class="workspace-title-actions">
        <button class="settings-action-button" type="button" @click="openNewWorkspace"><Plus />{{ $t("settings.newWorkspace") }}</button>
        <button class="settings-action-button" type="button" @click="openManage"><Database />{{ $t("settings.sidebarSwitch") }}</button>
      </div>
    </div>

    <div class="workspace-overview">
      <div class="workspace-stat"><span>{{ $t("settings.scenes") }}</span><strong>{{ workspaceStats.scenes }}</strong></div>
      <div class="workspace-stat"><span>{{ $t("settings.collections") }}</span><strong>{{ workspaceStats.collections }}</strong></div>
      <div class="workspace-stat"><span>{{ $t("settings.resources") }}</span><strong>{{ workspaceStats.items }}</strong></div>
      <div class="workspace-stat"><span>{{ $t("settings.favoriteCollections") }}</span><strong>{{ workspaceStats.favorites }}</strong></div>
    </div>

    <div class="settings-grid">
      <label class="setting-field"><span>{{ $t("settings.workspaceName") }}</span><input v-model="workspace.name" /></label>
      <label class="setting-field"><span>{{ $t("settings.storageDesc") }}</span><input v-model="workspace.storage" /></label>
      <label class="setting-field full"><span>{{ $t("settings.remark") }}</span><textarea v-model="workspace.remark"></textarea></label>
    </div>
  </section>

  <section class="settings-card workspace-settings-card">
    <div class="settings-card-title">{{ $t("settings.workspaceList") }}</div>
    <div class="settings-card-description">{{ $t("settings.workspaceListDesc") }}</div>

    <div class="settings-table workspace-table">
      <div class="settings-row workspace-row workspace-row-head">
        <strong>{{ $t("settings.name") }}</strong>
        <strong>{{ $t("settings.storage") }}</strong>
        <strong>{{ $t("settings.content") }}</strong>
        <strong></strong>
      </div>
      <div v-for="entry in store.state.data.workspaces" :key="entry.id" class="settings-row workspace-row" :class="{ active: entry.id === store.state.data.activeWorkspaceId }">
        <div class="workspace-name-cell">
          <Database />
          <span><strong>{{ entry.name }}</strong><small>{{ entry.remark || ("settings.noRemark") }}</small></span>
        </div>
        <span>{{ entry.storage || ("settings.localData") }}</span>
        <span>{{ store.state.data.scenes.filter((scene) => scene.workspaceId === entry.id).length }} {{ $t("settings.scenes") }} / {{ store.state.data.collections.filter((collection) => collection.workspaceId === entry.id).length }} {{ $t("settings.collections") }}</span>
        <div class="workspace-row-actions">
          <button class="settings-action-button" type="button" :disabled="entry.id === store.state.data.activeWorkspaceId" @click="store.switchWorkspace(entry.id)">{{ $t("settings.switchTo") }}</button>
          <button class="icon-button" type="button" :title="$t('sidebar.editWorkspace')" @click="editWorkspace(entry.id)"><Pencil /></button>
          <button class="icon-button danger" type="button" :title="$t('sidebar.deleteWorkspace')" :disabled="store.state.data.workspaces.length <= 1" @click="deleteWorkspace(entry.id)"><Trash2 /></button>
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
