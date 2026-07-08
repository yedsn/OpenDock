<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import {
  ArrowUpDown,
  Check,
  ChevronsUpDown,
  Circle,
  Clock3,
  Code2,
  Copy,
  Database,
  GripVertical,
  Inbox,
  Pencil,
  Plus,
  Search,
  Settings,
  Star,
  Tags,
  Trash2
} from "lucide-vue-next";
import { useOpenDockStore } from "../store";
import { useI18n } from "../i18n";
import SearchOverlay from "./SearchOverlay.vue";
import { confirmDelete } from "../dialog";
import { copyText, showToast } from "../helpers";
import { useListReorder } from "../composables/useListReorder";

const store = useOpenDockStore();
const { t } = useI18n();

const quickViews = computed(() => [
  { id: "all" as const, label: t("sidebar.allResources"), hint: t("sidebar.allScenes"), icon: Inbox },
  { id: "favorites" as const, label: t("sidebar.favoriteCollections"), hint: t("sidebar.commonEntries"), icon: Star },
  { id: "recent" as const, label: t("sidebar.recentlyOpened"), hint: t("sidebar.recentlyUsed"), icon: Clock3 },
  { id: "tags" as const, label: t("sidebar.tagFilter"), hint: t("sidebar.allScenes"), icon: Tags },
  { id: "unbound" as const, label: t("sidebar.unboundCollections"), hint: t("sidebar.independentCollection"), icon: Circle }
]);

const quickViewCounts = computed(() => {
  const collections = store.state.data.collections.filter((item) => item.workspaceId === store.state.data.activeWorkspaceId);
  return {
    all: collections.length,
    favorites: collections.filter((item) => item.favorite).length,
    recent: collections.filter((item) => item.recent).length,
    tags: store.collectionTags.value.length,
    unbound: collections.filter((item) => item.unbound || !item.sceneId).length
  };
});

type QuickView = typeof quickViews.value[number];

function openQuickViewTab(view: QuickView) {
  store.openTab({ id: `quickview-${view.id}`, kind: "quickview", title: view.id, quickViewId: view.id });
}

function editScene(id: string) {
  store.state.modal.editingId = id;
  store.state.modal.kind = "scene";
}

async function deleteSceneConfirm(id: string) {
  const scene = store.state.data.scenes.find((s) => s.id === id);
  if (!scene) return;
  if (await confirmDelete(t("sidebar.confirmDeleteScene", { name: scene.name }))) {
    store.deleteScene(id);
  }
}

function editWorkspace(id: string) {
  store.state.modal.editingId = id;
  store.state.modal.kind = "workspace";
}

async function deleteWorkspaceConfirm(id: string) {
  if (store.state.data.workspaces.length <= 1) {
    window.alert(t("sidebar.atLeastOneWorkspace"));
    return;
  }
  const ws = store.state.data.workspaces.find((w) => w.id === id);
  if (!ws) return;
  if (await confirmDelete(t("sidebar.confirmDeleteWorkspace", { name: ws.name }))) {
    store.deleteWorkspace(id);
  }
}

function openModal(kind: "scene" | "collection" | "item" | "workspace") {
  store.state.modal.editingId = undefined;
  store.state.modal.kind = kind;
}

const searchInputRef = ref<HTMLInputElement | null>(null);
const overlayRef = ref<InstanceType<typeof SearchOverlay> | null>(null);
const searchFocused = ref(false);

function handleSearchFocus() {
  searchFocused.value = true;
}

function handleSearchBlur() {
  setTimeout(() => {
    searchFocused.value = false;
  }, 120);
}

async function handleSearchKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    await overlayRef.value?.move(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    await overlayRef.value?.move(-1);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    await overlayRef.value?.run(undefined, event.ctrlKey || event.metaKey);
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    store.state.search = "";
    searchInputRef.value?.blur();
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().hide().catch(() => {});
    return;
  }
}

function closeOverlay() {
  store.state.search = "";
  searchInputRef.value?.blur();
}

function focusSearchInput(selectText = true) {
  nextTick(() => {
    searchInputRef.value?.focus();
    if (selectText) searchInputRef.value?.select();
  });
}

function handleGlobalShortcut(event: KeyboardEvent) {
  const isCommandPalette = (event.ctrlKey || event.metaKey) && (event.key === "k" || event.key === "K");
  if (!isCommandPalette) return;
  event.preventDefault();
  focusSearchInput();
}

function handleWindowFocus() {
  focusSearchInput(false);
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") focusSearchInput(false);
}

onMounted(() => {
  focusSearchInput(false);
  window.addEventListener("keydown", handleGlobalShortcut);
  window.addEventListener("focus", handleWindowFocus);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});
onUnmounted(() => {
  window.removeEventListener("keydown", handleGlobalShortcut);
  window.removeEventListener("focus", handleWindowFocus);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});

const sceneSortMode = computed(() => store.effectiveSceneSortMode());

const sortModeOptions = computed(() => [
  { value: "手动", label: t("workbench.sortManual") },
  { value: "按名称", label: t("workbench.sortByName") },
  { value: "按使用次数", label: t("workbench.sortByUsage") }
]);

function setSceneSort(mode: string) {
  store.setSceneSortMode(mode === store.state.data.settings.general.sceneSort ? null : mode as any);
}

const isManualSceneSort = computed(() => store.effectiveSceneSortMode() === "手动");
const sceneListRef = ref<HTMLElement | null>(null);

useListReorder({
  el: sceneListRef,
  enabled: isManualSceneSort,
  onReorder: (fromIndex, toIndex) => store.reorderScenes(fromIndex, toIndex)
});

const copiedSceneId = ref<string | null>(null);
let copySceneTimer = 0;
async function copySceneName(scene: { id: string; name: string }) {
  if (await copyText(scene.name)) {
    copiedSceneId.value = scene.id;
    showToast(t("common.copySuccess"));
    if (copySceneTimer) window.clearTimeout(copySceneTimer);
    copySceneTimer = window.setTimeout(() => { copiedSceneId.value = null; }, 1200);
  }
}
</script>

<template>
  <aside class="vault-pane" aria-label="Resource Vault">
    <div class="command-box" :class="{ 'has-overlay': searchFocused && store.state.search }">
      <Search />
      <input
        ref="searchInputRef"
        v-model="store.state.search"
        type="search"
        :placeholder="$t('sidebar.searchPlaceholder')"
        @focus="handleSearchFocus"
        @blur="handleSearchBlur"
        @keydown="handleSearchKeydown"
      />
      <kbd>Ctrl K</kbd>
      <SearchOverlay ref="overlayRef" :open="searchFocused" @close="closeOverlay" />
    </div>

    <div class="tree-section">
      <div class="tree-title">{{ $t("sidebar.quickViews") }}</div>
      <div class="tree-list">
        <button v-for="view in quickViews" :key="view.id" class="tree-row" :class="{ active: store.state.activeTabId === `quickview-${view.id}` }" @click="openQuickViewTab(view)">
          <component :is="view.icon" />
          <span><span>{{ view.label }}</span><small>{{ view.hint }}</small></span>
          <span class="tree-count">{{ quickViewCounts[view.id] }}</span>
        </button>
      </div>
    </div>

    <div class="tree-section grow">
      <div class="tree-title">
        <span>{{ $t("sidebar.sceneList") }}</span>
        <button class="mini-title-button" :title="$t('sidebar.newScene')" @click="openModal('scene')"><Plus /></button>
      </div>
      <div class="tree-list" ref="sceneListRef">
        <div v-for="(scene, sIdx) in store.activeScenes.value" :key="scene.id"
          class="scene-button"
          role="button"
          tabindex="0"
          :class="{ active: store.state.activeTabId === 'scene-' + scene.id, 'manual-sort': isManualSceneSort }"
          @click="store.openTab({ id: 'scene-' + scene.id, kind: 'scene', title: scene.name, sceneId: scene.id })"
          @keydown.enter.prevent="store.openTab({ id: 'scene-' + scene.id, kind: 'scene', title: scene.name, sceneId: scene.id })">
          <GripVertical v-if="isManualSceneSort" class="drag-handle" />
          <Code2 />
          <span><span class="scene-name">{{ scene.name }}</span><small class="scene-detail">{{ scene.description }}</small></span>
          <span class="scene-actions">
            <component :is="copiedSceneId === scene.id ? Check : Copy" class="row-edit-icon" :title="$t('sidebar.copyName')" @click.stop="copySceneName(scene)" />
            <Pencil class="row-edit-icon" @click.stop="editScene(scene.id)" />
            <Trash2 class="row-edit-icon danger" @click.stop="deleteSceneConfirm(scene.id)" />
          </span>
        </div>
      </div>
    </div>

    <div class="vault-footer">
      <div class="footer-actions">
        <button class="footer-workspace-button" @click="store.state.workspaceMenuOpen = !store.state.workspaceMenuOpen">
          <Database /><span class="vault-title">{{ store.activeWorkspace().name }}</span><ChevronsUpDown />
        </button>
        <button class="footer-settings-button" :class="{ active: store.state.mainView === 'settings' }" @click="store.openTab({ id: 'settings', kind: 'settings', title: t('settings.title') })"><Settings /></button>
      </div>
    </div>

    <div v-if="store.state.workspaceMenuOpen" class="workspace-dropdown">
      <div class="workspace-menu-title">{{ $t("sidebar.workspaces") }}</div>
      <button v-for="workspace in store.state.data.workspaces" :key="workspace.id"
        class="workspace-menu-item"
        :class="{ active: workspace.id === store.state.data.activeWorkspaceId }"
        @click="store.switchWorkspace(workspace.id); store.state.workspaceMenuOpen = false">
        <Database /><span><strong>{{ workspace.name }}</strong><small>{{ workspace.storage }}</small></span>
        <span class="workspace-item-actions" @click.stop>
          <Pencil class="row-edit-icon" @click="editWorkspace(workspace.id)" />
          <Trash2 class="row-edit-icon danger" @click="deleteWorkspaceConfirm(workspace.id)" />
        </span>
      </button>
      <button class="workspace-menu-item" @click="openModal('workspace')"><Plus /><span><strong>{{ $t("sidebar.newWorkspace") }}</strong><small>{{ $t("sidebar.createResourceWorkspace") }}</small></span></button>
    </div>
  </aside>
</template>

<style scoped>
.scene-button.manual-sort { grid-template-columns: 16px 18px minmax(0,1fr) auto; user-select: none; }
.drag-handle { width: 14px; height: 14px; opacity: 0.35; cursor: grab; flex-shrink: 0; }
.drag-handle:hover { opacity: 0.85; }
.scene-button.sortable-ghost { opacity: 0.35; }
.scene-button.sortable-chosen { cursor: grabbing; }
.scene-button.sortable-drag { opacity: 0.9; }
.scene-button.manual-sort .drag-handle { cursor: grab; }
.scene-button.manual-sort.sortable-chosen .drag-handle { cursor: grabbing; }
.sort-control { display: inline-flex; align-items: center; gap: 2px; }
.sort-select { background: var(--bg3); color: var(--text); border: 1px solid var(--line); border-radius: 4px; font-size: 11px; padding: 1px 3px; cursor: pointer; outline: none; }
.sort-select:hover { border-color: var(--accent); }
.scene-actions { display: none; gap: 4px; }
.scene-button:hover .scene-actions { display: inline-flex; align-items: center; }
.row-edit-icon { width: 14px; height: 14px; opacity: 0.6; cursor: pointer; }
.row-edit-icon:hover { opacity: 1; color: var(--text); }
.row-edit-icon.danger:hover { color: var(--red); }
.workspace-item-actions { display: none; gap: 4px; }
.workspace-menu-item:hover .workspace-item-actions { display: inline-flex; align-items: center; }
</style>


