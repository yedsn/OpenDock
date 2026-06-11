<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import {
  ChevronsUpDown,
  Circle,
  Clock3,
  Code2,
  Database,
  Inbox,
  Pencil,
  Plus,
  Search,
  Settings,
  Star,
  Trash2
} from "lucide-vue-next";
import { useOpenDockStore } from "../store";
import SearchOverlay from "./SearchOverlay.vue";
import { confirmDelete } from "../dialog";

const store = useOpenDockStore();

const quickViews = [
  { id: "all" as const, label: "全部资源", hint: "全部场景", icon: Inbox },
  { id: "favorites" as const, label: "收藏集合", hint: "常用入口", icon: Star },
  { id: "recent" as const, label: "最近打开", hint: "最近使用", icon: Clock3 },
  { id: "unbound" as const, label: "无场景集合", hint: "独立收藏", icon: Circle }
] as const;

const quickViewCounts = computed(() => {
  const collections = store.state.data.collections.filter((item) => item.workspaceId === store.state.data.activeWorkspaceId);
  return {
    all: collections.length,
    favorites: collections.filter((item) => item.favorite).length,
    recent: collections.filter((item) => item.recent).length,
    unbound: collections.filter((item) => item.unbound || !item.sceneId).length
  };
});

function openQuickViewTab(view: typeof quickViews[number]) {
  store.openTab({ id: `quickview-${view.id}`, kind: "quickview", title: view.label, quickViewId: view.id });
}

function editScene(id: string) {
  store.state.modal.editingId = id;
  store.state.modal.kind = "scene";
}

async function deleteSceneConfirm(id: string) {
  const scene = store.state.data.scenes.find((s) => s.id === id);
  if (!scene) return;
  if (await confirmDelete(`确认删除场景「${scene.name}」？此场景下的集合将变为无场景集合。`)) {
    store.deleteScene(id);
  }
}

function editWorkspace(id: string) {
  store.state.modal.editingId = id;
  store.state.modal.kind = "workspace";
}

async function deleteWorkspaceConfirm(id: string) {
  if (store.state.data.workspaces.length <= 1) {
    window.alert("至少保留一个工作区");
    return;
  }
  const ws = store.state.data.workspaces.find((w) => w.id === id);
  if (!ws) return;
  if (await confirmDelete(`确认删除工作区「${ws.name}」？所有关联的场景、集合和资源将被删除。`)) {
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
    await overlayRef.value?.run();
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
</script>

<template>
  <aside class="vault-pane" aria-label="资源库">
    <div class="command-box" :class="{ 'has-overlay': searchFocused && store.state.search }">
      <Search />
      <input
        ref="searchInputRef"
        v-model="store.state.search"
        type="search"
        placeholder="命令、场景、集合、资源"
        @focus="handleSearchFocus"
        @blur="handleSearchBlur"
        @keydown="handleSearchKeydown"
      />
      <kbd>Ctrl K</kbd>
      <SearchOverlay ref="overlayRef" :open="searchFocused" @close="closeOverlay" />
    </div>

    <div class="tree-section">
      <div class="tree-title">快速视图</div>
      <div class="tree-list">
        <button v-for="view in quickViews" :key="view.id" v-memo="[view.id, quickViewCounts[view.id], store.state.activeTabId === `quickview-${view.id}`]" class="tree-row" :class="{ active: store.state.activeTabId === `quickview-${view.id}` }" @click="openQuickViewTab(view)">
          <component :is="view.icon" />
          <span><span>{{ view.label }}</span><small>{{ view.hint }}</small></span>
          <span class="tree-count">{{ quickViewCounts[view.id] }}</span>
        </button>
      </div>
    </div>

    <div class="tree-section grow">
      <div class="tree-title">
        <span>场景列表</span>
        <button class="mini-title-button" title="新建场景" @click="openModal('scene')"><Plus /></button>
      </div>
      <div class="tree-list">
        <button v-for="scene in store.activeScenes.value" :key="scene.id"
          v-memo="[scene.id, scene.name, scene.description, scene.type, store.state.activeTabId === 'scene-' + scene.id]"
          class="scene-button"
          :class="{ active: store.state.activeTabId === 'scene-' + scene.id }"
          @click="store.openTab({ id: 'scene-' + scene.id, kind: 'scene', title: scene.name, sceneId: scene.id })">
          <Code2 />
          <span><span class="scene-name">{{ scene.name }}</span><small class="scene-detail">{{ scene.type }} · {{ scene.description }}</small></span>
          <span class="scene-actions">
            <Pencil class="row-edit-icon" @click.stop="editScene(scene.id)" />
            <Trash2 class="row-edit-icon danger" @click.stop="deleteSceneConfirm(scene.id)" />
          </span>
        </button>
      </div>
    </div>

    <div class="vault-footer">
      <div class="footer-actions">
        <button class="footer-workspace-button" @click="store.state.workspaceMenuOpen = !store.state.workspaceMenuOpen">
          <Database /><span class="vault-title">{{ store.activeWorkspace().name }}</span><ChevronsUpDown />
        </button>
        <button class="footer-settings-button" :class="{ active: store.state.mainView === 'settings' }" @click="store.openTab({ id: 'settings', kind: 'settings', title: 'Settings' })"><Settings /></button>
      </div>
    </div>

    <div v-if="store.state.workspaceMenuOpen" class="workspace-dropdown">
      <div class="workspace-menu-title">Workspaces</div>
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
      <button class="workspace-menu-item" @click="openModal('workspace')"><Plus /><span><strong>新建工作区</strong><small>创建资源工作台</small></span></button>
    </div>
  </aside>
</template>

<style scoped>
.scene-actions { display: none; gap: 4px; }
.scene-button:hover .scene-actions { display: inline-flex; align-items: center; }
.row-edit-icon { width: 14px; height: 14px; opacity: 0.6; cursor: pointer; }
.row-edit-icon:hover { opacity: 1; color: var(--text); }
.row-edit-icon.danger:hover { color: var(--red); }
.workspace-item-actions { display: none; gap: 4px; }
.workspace-menu-item:hover .workspace-item-actions { display: inline-flex; align-items: center; }
</style>
