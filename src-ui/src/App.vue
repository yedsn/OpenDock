<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { Circle, Clock3, Inbox, Layers, Minus, Settings, Square, Star, Tags, X } from "lucide-vue-next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useOpenDockStore } from "./store";
import { useI18n } from "./i18n";
import AppSidebar from "./components/AppSidebar.vue";
import WorkbenchView from "./components/WorkbenchView.vue";
import SettingsView from "./components/SettingsView.vue";
import CreateEntityModal from "./components/CreateEntityModal.vue";
import ToolSetupGuide from "./components/ToolSetupGuide.vue";
import TaskDock from "./components/TaskDock.vue";
import FullscreenLoading from "./components/FullscreenLoading.vue";
import { invoke } from "@tauri-apps/api/core";
import { themeCssVars } from "./themes";

const store = useOpenDockStore();
const { t } = useI18n();
const appWindow = (() => {
  try {
    return getCurrentWindow();
  } catch {
    return {
      startDragging: async () => {},
      isMaximized: async () => false,
      minimize: async () => {},
      toggleMaximize: async () => {},
      close: async () => {},
      hide: async () => {},
      onResized: async () => null
    };
  }
})();

const activeAppIconSource = computed(() => {
  const appearance = store.state.data.settings.appearance as typeof store.state.data.settings.appearance & {
    appIconStyle?: "dark" | "light" | "custom";
    customAppIconDataUrl?: string;
  };
  if (appearance.appIconStyle === "custom" && appearance.customAppIconDataUrl) {
    return appearance.customAppIconDataUrl;
  }
  return appearance.appIconStyle === "light" ? "/icons/opendock-o-dock-light.svg" : "/icons/opendock-o-dock-dark.svg";
});

const isMaximized = ref(false);
let unlistenResize: UnlistenFn | null = null;

const rootStyle = computed(() => ({
  ...themeCssVars(store.activeTheme()),
  "--sidebar-width": `${store.state.data.settings.appearance.sidebarWidth}px`,
  "--interface-font": store.state.data.settings.appearance.interfaceFontFamily,
  "--mono": store.state.data.settings.appearance.monospaceFontFamily,
  "--base-font-size": `${store.state.data.settings.appearance.baseFontSize}px`,
  "--sidebar-font-size": `${store.state.data.settings.appearance.baseFontSize + 0.5}px`,
  "--sidebar-detail-size": `${Math.max(10, store.state.data.settings.appearance.baseFontSize - 1)}px`,
  "--panel-pad": store.state.data.settings.appearance.density === "舒适" ? "18px" : "14px",
  "--list-pad": store.state.data.settings.appearance.density === "舒适" ? "16px" : "14px",
  "--row-min": store.state.data.settings.appearance.density === "舒适" ? "38px" : "34px",
  "--row-gap": store.state.data.settings.appearance.density === "舒适" ? "10px" : "8px",
  "--card-pad": store.state.data.settings.appearance.density === "舒适" ? "12px" : "10px"
}));

const rootClass = computed(() => ({
  "theme-light": store.activeTheme().kind === "light",
  "density-comfortable": store.state.data.settings.appearance.density === "舒适"
}));

const quickViewIconMap = {
  all: Inbox,
  favorites: Star,
  recent: Clock3,
  tags: Tags,
  unbound: Circle
};

const tabMenu = reactive({
  open: false,
  tabId: "",
  x: 0,
  y: 0
});

const menuTab = computed(() => store.state.tabs.find((tab) => tab.id === tabMenu.tabId));
const maximizeTitle = computed(() => isMaximized.value ? t("app.restore") : t("app.maximize"));

function quickViewTitle(id: string): string {
  const labels: Record<string, string> = {
    all: t("sidebar.allResources"),
    favorites: t("sidebar.favoriteCollections"),
    recent: t("sidebar.recentlyOpened"),
    tags: t("sidebar.tagFilter"),
    unbound: t("sidebar.unboundCollections")
  };
  return labels[id] || id;
}

function tabTitle(tab: { kind: string; title: string; quickViewId?: string }) {
  const title = tab.kind === "quickview" && tab.quickViewId
    ? quickViewTitle(tab.quickViewId)
    : tab.kind === "settings"
      ? t("settings.title")
      : tab.title;
  const max = 18;
  return title.length > max ? title.slice(0, max) + "..." : title;
}

function closeTab(id: string, event: MouseEvent) {
  event.stopPropagation();
  closeTabMenu();
  store.closeTab(id);
}

function openTabMenu(id: string, event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  tabMenu.tabId = id;
  tabMenu.x = Math.min(event.clientX, window.innerWidth - 148);
  tabMenu.y = Math.min(event.clientY, window.innerHeight - 108);
  tabMenu.open = true;
}

function closeTabMenu() {
  tabMenu.open = false;
}

function closeCurrentTab() {
  if (tabMenu.tabId) store.closeTab(tabMenu.tabId);
  closeTabMenu();
}

function closeOtherTabs() {
  if (tabMenu.tabId) store.closeOtherTabs(tabMenu.tabId);
  closeTabMenu();
}

function closeAllTabs() {
  store.closeAllTabs();
  closeTabMenu();
}

function startWindowDrag(event: MouseEvent) {
  if (event.detail > 1) return;
  appWindow.startDragging().catch(() => {});
}

async function refreshWindowState() {
  isMaximized.value = await appWindow.isMaximized().catch(() => false);
}

function minimizeWindow() {
  appWindow.minimize().catch(() => {});
}

async function toggleMaximizeWindow() {
  await appWindow.toggleMaximize().catch(() => {});
  await refreshWindowState();
}

function closeWindow() {
  appWindow.close().catch(() => {});
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

function handleEscapeToHide(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  if (event.defaultPrevented) return;
  if (store.state.modal.kind || tabMenu.open || isEditableTarget(event.target)) return;
  event.preventDefault();
  appWindow.hide().catch(() => {});
}

onMounted(async () => {
  await refreshWindowState();
  unlistenResize = await appWindow.onResized(refreshWindowState).catch(() => null);
  window.addEventListener("keydown", handleEscapeToHide);
});

onUnmounted(() => {
  unlistenResize?.();
  window.removeEventListener("keydown", handleEscapeToHide);
});
</script>

<template>
  <div class="desktop-shell" :class="rootClass" :style="rootStyle">
    <header class="custom-titlebar">
      <div class="window-drag-region" @mousedown="startWindowDrag" @dblclick="toggleMaximizeWindow">
        <img class="titlebar-mark" :src="activeAppIconSource" alt="" />
        <span class="titlebar-title">OpenDock</span>
        <span class="titlebar-divider"></span>
        <span class="titlebar-context">{{ store.activeWorkspace().name }}</span>
      </div>
      <div class="window-controls">
        <button class="window-control minimize" type="button" :title="$t('app.minimize')" @click="minimizeWindow"><Minus /></button>
        <button class="window-control maximize" type="button" :title="maximizeTitle" @click="toggleMaximizeWindow"><Square :class="{ restored: isMaximized }" /></button>
        <button class="window-control close" type="button" :title="$t('app.close')" @click="closeWindow"><X /></button>
      </div>
    </header>
    <AppSidebar />

    <main class="workbench">
      <header class="tab-bar">
        <div class="tabs">
          <div
            v-for="tab in store.state.tabs"
            :key="tab.id"
            class="tab"
            :class="{ active: store.state.activeTabId === tab.id }"
            role="button"
            tabindex="0"
            @click="store.switchTab(tab.id)"
            @contextmenu="openTabMenu(tab.id, $event)"
            @keydown.enter.prevent="store.switchTab(tab.id)"
            @keydown.space.prevent="store.switchTab(tab.id)"
          >
            <component v-if="tab.kind === 'quickview' && tab.quickViewId" :is="quickViewIconMap[tab.quickViewId]" />
            <Layers v-else-if="tab.kind === 'collection' || tab.kind === 'scene'" />
            <Settings v-else-if="tab.kind === 'settings'" />
            <span class="tab-label">{{ tabTitle(tab) }}</span>
            <button v-if="!tab.pinned && store.state.tabs.length > 1" class="tab-close" type="button" @click="closeTab(tab.id, $event)"><X :size="12" /></button>
          </div>
        </div>
      </header>

      <div v-if="tabMenu.open" class="tab-menu-backdrop" @click="closeTabMenu" @contextmenu.prevent="closeTabMenu"></div>
      <div v-if="tabMenu.open" class="tab-context-menu" :style="{ left: tabMenu.x + 'px', top: tabMenu.y + 'px' }" role="menu">
        <button role="menuitem" :disabled="menuTab?.pinned" @click="closeCurrentTab">{{ $t("app.closeCurrent") }}</button>
        <button role="menuitem" @click="closeOtherTabs">{{ $t("app.closeOthers") }}</button>
        <button role="menuitem" @click="closeAllTabs">{{ $t("app.closeAll") }}</button>
      </div>

      <ToolSetupGuide v-if="!store.state.dataLoading && !store.state.toolSetupDone" />
      <template v-else>
        <WorkbenchView v-if="store.state.dataLoading || store.state.mainView === 'workspace'" />
        <SettingsView v-else />
      </template>

      <footer class="status-bar">
        <span>{{ store.activeWorkspace().name }}</span>
        <span>{{ store.state.data.collections.length }} {{ $t("app.collections") }}</span>
        <span>{{ store.state.data.plugins.length }} {{ $t("app.plugins") }}</span>
        <TaskDock />
      </footer>
    </main>

    <CreateEntityModal />
    <FullscreenLoading />
  </div>
</template>

<style scoped>
.tab-bar { min-width: 0; display: flex; align-items: center; justify-content: space-between; background: var(--bg-2); border-bottom: 1px solid var(--line); }
.tabs { min-width: 0; display: flex; align-items: center; gap: 2px; padding: 0 8px; overflow-x: auto; overflow-y: hidden; flex: 1; scrollbar-width: none; -ms-overflow-style: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab { height: 30px; display: inline-flex; align-items: center; gap: 6px; padding: 0 8px 0 10px; color: var(--muted); background: transparent; border-radius: 7px 7px 0 0; border-bottom: 2px solid transparent; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: color .12s, background .12s, border-color .12s; }
.tab:hover { color: var(--text); background: var(--bg-3); }
.tab.active { color: var(--text); background: var(--bg-3); border-bottom-color: var(--accent); }
.tab-close { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; color: var(--faint); background: transparent; border: none; border-radius: 4px; cursor: pointer; padding: 0; margin-left: 2px; }
.tab-close:hover { color: var(--red); background: color-mix(in srgb, var(--red) 16%, transparent); }
.tab-label { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tab-menu-backdrop { position: fixed; inset: 0; z-index: 90; background: transparent; }
.tab-context-menu { position: fixed; z-index: 91; min-width: 132px; padding: 5px; display: grid; gap: 2px; background: var(--bg-2); border: 1px solid var(--line-strong); border-radius: 7px; box-shadow: 0 14px 34px var(--shadow, rgba(0, 0, 0, 0.42)); }
.tab-context-menu button { height: 30px; display: flex; align-items: center; padding: 0 10px; color: var(--muted); background: transparent; border-radius: 5px; text-align: left; font-size: 12px; font-weight: 720; }
.tab-context-menu button:hover:not(:disabled) { color: var(--text); background: var(--bg-3); }
.tab-context-menu button:disabled { color: var(--faint); cursor: not-allowed; opacity: 0.48; }
</style>
