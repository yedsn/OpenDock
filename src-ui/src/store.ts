import { computed, reactive, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { collectionMeta, itemMeta, sceneMeta } from "./seed";
import { exportAppData, loadAppData, normalizeAppData, resetAppData, saveActiveState, saveAppData } from "./storage";
import { createSnapshot, listSnapshots, loadSnapshot, deleteSnapshot, pruneSnapshots, updateSnapshotMeta } from "./storage";
import { webdavSetCredential, webdavGetCredential } from "./db";
import { createSeedData } from "./seed";
import { nowIso, makeId, expandToolArgs, templateToCollectionType } from "./helpers";
import { builtInThemes } from "./themes";
import { getPluginOpenHandler } from "../../plugins/registry";
import type { AppData, Collection, CollectionItem, CollectionMode, CollectionType, ItemType, MainView, MarketplaceIndex, MarketplacePlugin, ModalState, OpenTool, PluginItemFormField, PluginItemTypeContribution, PluginManifest, PluginToolTypeContribution, PluginToolTypeEntry, QuickViewId, Scene, SnapshotKind, SnapshotRecord, SceneType, Tab, TaskEntry, TaskStatus, ThemeDefinition, WebDavPendingConflict, Workspace } from "./types";
import type { SearchSuggestion } from "./types";
import { matchesSearchText, scoreSearchText, createSearchText } from "./pinyin";
import { useI18n } from "./i18n";
import { confirmAction } from "./dialog";

// ---- Tauri command bridge ----

interface OpenActionResult { ok: boolean; message: string }

const TOGGLE_WINDOW_SHORTCUT_ACTION = "显示/隐藏窗口";
const DEFAULT_TOGGLE_WINDOW_HOTKEY = "Alt+O";

type DetectedOpenTool = OpenTool;

function desktopPlatform(): "windows" | "macos" | "linux" {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  if (platform.includes("win") || userAgent.includes("windows")) return "windows";
  if (platform.includes("mac") || userAgent.includes("mac os")) return "macos";
  return "linux";
}

function isToolPathFromAnotherPlatform(path: string): boolean {
  const value = path.trim();
  if (!value || value === "shell:open") return false;
  const platform = desktopPlatform();
  const isWindowsPath = /^%[^%]+%[\\/]/.test(value) || /^[A-Za-z]:[\\/]/.test(value) || value.includes("\\");
  const isMacAppPath = value.startsWith("/Applications/") || value.startsWith("~/Applications/") || value.startsWith("/System/Applications/");

  if (platform === "windows") return isMacAppPath || value.startsWith("/usr/") || value.startsWith("/opt/");
  if (platform === "macos") return isWindowsPath;
  return isWindowsPath || isMacAppPath;
}

function mergeDetectedOpenTools(detectedTools: DetectedOpenTool[]): void {
  const detectedById = new Map(detectedTools.map((tool) => [tool.id, tool]));

  for (const detected of detectedTools) {
    const existing = state.data.tools.find((tool) => tool.id === detected.id);
    if (!existing) {
      state.data.tools.push(detected);
      continue;
    }

    if (!existing.path.trim() || isToolPathFromAnotherPlatform(existing.path)) {
      existing.name = detected.name;
      existing.type = detected.type;
      existing.path = detected.path;
      existing.args = detected.args;
      existing.default = existing.default || detected.default;
    }
  }

  for (const tool of state.data.tools) {
    if (!isToolPathFromAnotherPlatform(tool.path) || detectedById.has(tool.id)) continue;
    if (["浏览器", "编辑器", "Office", "CAD", "系统"].includes(tool.type)) {
      tool.path = "shell:open";
      tool.args = tool.type === "浏览器" ? "{url}" : "{path}";
    }
  }
}

async function callOpenCommand(command: string, payload: Record<string, unknown>): Promise<OpenActionResult> {
  try {
    return await invoke<OpenActionResult>(command, payload);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

function ensureToggleWindowShortcut(): string {
  let shortcut = state.data.settings.shortcuts.find((entry) => entry.action === TOGGLE_WINDOW_SHORTCUT_ACTION);
  if (!shortcut) {
    shortcut = { action: TOGGLE_WINDOW_SHORTCUT_ACTION, key: DEFAULT_TOGGLE_WINDOW_HOTKEY };
    state.data.settings.shortcuts.unshift(shortcut);
  }
  if (!shortcut.key?.trim()) {
    shortcut.key = DEFAULT_TOGGLE_WINDOW_HOTKEY;
  }
  return shortcut.key;
}

async function applyToggleWindowHotkey(key?: string): Promise<OpenActionResult> {
  const value = key?.trim() || ensureToggleWindowShortcut();
  return await callOpenCommand("set_global_hotkey", { key: value });
}

async function updateToggleWindowHotkey(key: string): Promise<OpenActionResult> {
  const normalized = key.trim();
  const shortcut = state.data.settings.shortcuts.find((entry) => entry.action === TOGGLE_WINDOW_SHORTCUT_ACTION);
  if (shortcut) {
    shortcut.key = normalized;
  } else {
    state.data.settings.shortcuts.unshift({ action: TOGGLE_WINDOW_SHORTCUT_ACTION, key: normalized });
  }
  return await applyToggleWindowHotkey(normalized);
}


async function syncAutoStartSetting(enable: boolean): Promise<void> {
  try {
    await callOpenCommand("set_auto_start", { enable });
  } catch (e) {
    console.error("Failed to sync auto-start setting:", e);
  }
}

async function readAutoStartFromOS(): Promise<boolean> {
  try {
    const result = await invoke<boolean>("get_auto_start");
    return result;
  } catch (e) {
    console.error("Failed to read auto-start state:", e);
    return false;
  }
}
// ---- Reactive state ----

const state = reactive({
  data: createSeedData(),  // async DB load happens in init()
  mainView: "workspace" as MainView,
  quickView: "all" as QuickViewId,
  collectionMode: "collections" as CollectionMode,
  settingsCategory: "general",
  search: "",
  modal: { kind: null } as ModalState,
  workspaceMenuOpen: false,
  selectedExport: "",
  snapshots: [] as SnapshotRecord[],
  tabs: [] as Tab[],
  activeTabId: "" as string,
  marketplacePlugins: [] as MarketplacePlugin[],
  marketplaceLoading: false,
  marketplaceError: "",
  marketplaceInstalling: null as string | null,
  webdavPendingConflict: null as WebDavPendingConflict | null,
  taskPanelOpen: false,
  tasks: [] as TaskEntry[],
  toolSetupDone: false
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;
watch(() => ({
  schemaVersion: state.data.schemaVersion,
  workspaces: state.data.workspaces,
  scenes: state.data.scenes,
  collections: state.data.collections,
  items: state.data.items,
  tools: state.data.tools,
  plugins: state.data.plugins,
  pluginStore: state.data.pluginStore,
  settings: state.data.settings,
  activity: state.data.activity
}), () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveAppData(state.data).catch((e) => console.error("DB save failed:", e));
  }, 300);
}, { deep: true });


// Sync autoStart setting changes to the OS immediately.
watch(() => state.data.settings.general.autoStart, (newVal) => {
  syncAutoStartSetting(newVal);
});
let activeStateSaveTimer: ReturnType<typeof setTimeout> | null = null;
let activeStateIdleHandle: number | null = null;
watch(() => [state.data.activeWorkspaceId, state.data.activeSceneId, state.data.activeCollectionId] as const, () => {
  if (activeStateSaveTimer) clearTimeout(activeStateSaveTimer);
  if (activeStateIdleHandle !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(activeStateIdleHandle);
    activeStateIdleHandle = null;
  }
  activeStateSaveTimer = setTimeout(() => {
    const save = () => saveActiveState(state.data).catch((e) => console.error("DB active-state save failed:", e));
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      activeStateIdleHandle = window.requestIdleCallback(() => {
        activeStateIdleHandle = null;
        save();
      }, { timeout: 1500 });
    } else {
      save();
    }
  }, 800);
});

/** Load data from SQLite, replacing seed data. Call once at app startup. */

let webdavAutoSyncTimer: ReturnType<typeof setInterval> | null = null;

async function init() {
  try {
    const data = await loadAppData();
    Object.assign(state.data, data);
    state.data.activeWorkspaceId = data.activeWorkspaceId;
    state.data.activeSceneId = data.activeSceneId;
    state.data.activeCollectionId = data.activeCollectionId;
  } catch (e) {
    console.error("DB load failed, using seed data:", e);
  }

  try {
    const detectedTools = await invoke<DetectedOpenTool[]>("scan_open_tools");
    mergeDetectedOpenTools(detectedTools);
    if (detectedTools.length) {
      log(`已更新本机打开工具: ${detectedTools.map((tool) => tool.name).join(", ")}`);
    }
  } catch (e) {
    console.warn("Open tool scan failed:", e);
  }

  // Check if tool setup is needed (only system default tool exists = fresh install)
  const nonSystemTools = state.data.tools.filter((t) => t.type !== "系统");
  state.toolSetupDone = nonSystemTools.length > 0;

  if (state.data.settings.general.openWebInNewWindow === undefined) {
    state.data.settings.general.openWebInNewWindow = false;
  }
  if (state.data.settings.general.closeWindowAfterOpen === undefined) {
    state.data.settings.general.closeWindowAfterOpen = true;
  }
  const legacySearchEnterBehavior = (state.data.settings.general as Partial<{ searchEnterBehavior: "open" | "navigate" }>).searchEnterBehavior;
  if (!state.data.settings.search) {
    state.data.settings.search = {
      sceneEnterBehavior: legacySearchEnterBehavior || "open",
      collectionEnterBehavior: legacySearchEnterBehavior || "open",
      itemEnterBehavior: legacySearchEnterBehavior || "open"
    };
  }
  if (!state.data.settings.search.sceneEnterBehavior) {
    state.data.settings.search.sceneEnterBehavior = legacySearchEnterBehavior || "open";
  }
  if (!state.data.settings.search.collectionEnterBehavior) {
    state.data.settings.search.collectionEnterBehavior = legacySearchEnterBehavior || "open";
  }
  if (!state.data.settings.search.itemEnterBehavior) {
    state.data.settings.search.itemEnterBehavior = legacySearchEnterBehavior || "open";
  }
  ensureToggleWindowShortcut();
  const seed = createSeedData();
  // Backfill all built-in plugins so they always appear in the installed list
  const seedBuiltInPlugins = seed.plugins.filter((plugin) => plugin.builtIn);
  for (const seedPlugin of seedBuiltInPlugins) {
    const existing = state.data.plugins.find((entry) => entry.id === seedPlugin.id);
    if (!existing) {
      state.data.plugins.push(seedPlugin);
    } else {
      if (seedPlugin.builtIn) { existing.builtIn = true; }
      if (seedPlugin.toolTypes) { existing.toolTypes = [...seedPlugin.toolTypes]; }
      if (seedPlugin.itemTypes) { existing.itemTypes = [...seedPlugin.itemTypes]; }
    }
  }
  // Also backfill non-built-in seed plugins that may have been removed from user data
  for (const seedPlugin of seed.plugins) {
    if (seedPlugin.builtIn) continue;
    const existing = state.data.plugins.find((entry) => entry.id === seedPlugin.id);
    if (!existing) {
      state.data.plugins.push(seedPlugin);
    } else {
      if (seedPlugin.toolTypes) { existing.toolTypes = [...seedPlugin.toolTypes]; }
      if (seedPlugin.itemTypes) { existing.itemTypes = [...seedPlugin.itemTypes]; }


    }
  }
  const matchedTheme = availableThemes().find((theme) => theme.id === state.data.settings.appearance.theme || theme.name === state.data.settings.appearance.theme);
  state.data.settings.appearance.theme = matchedTheme?.id || builtInThemes[0].id;
  if (!["紧凑", "舒适"].includes(state.data.settings.appearance.density)) {
    state.data.settings.appearance.density = "紧凑";
  }
  if (!state.data.settings.appearance.interfaceFontFamily) {
    state.data.settings.appearance.interfaceFontFamily = "Segoe UI, Microsoft YaHei, system-ui, sans-serif";
  }
  if (!state.data.settings.appearance.monospaceFontFamily) {
    state.data.settings.appearance.monospaceFontFamily = "Cascadia Code, Consolas, monospace";
  }
  const baseFontSize = Number(state.data.settings.appearance.baseFontSize);
  state.data.settings.appearance.baseFontSize = Math.min(16, Math.max(11, Number.isFinite(baseFontSize) ? baseFontSize : 12));
  const sidebarWidth = Number(state.data.settings.appearance.sidebarWidth);
  state.data.settings.appearance.sidebarWidth = Math.min(420, Math.max(240, Number.isFinite(sidebarWidth) ? sidebarWidth : 306));

  // Open a default tab for the current context
  const scene = state.data.scenes.find((s) => s.id === state.data.activeSceneId);
  if (scene) {
    state.tabs = [{
      id: 'scene-' + scene.id,
      kind: 'scene' as const,
      title: scene.name,
      sceneId: scene.id
    }];
    state.activeTabId = state.tabs[0].id;
  }
  state.mainView = 'workspace';
  await applyToggleWindowHotkey();
  // Sync auto-start state from OS to UI on startup
  try {
    const osAutoStart = await readAutoStartFromOS();
    if (state.data.settings.general.autoStart !== osAutoStart) {
      state.data.settings.general.autoStart = osAutoStart;
    }
  } catch (e) {
    console.error("Auto-start OS sync failed:", e);
  }


  // Backfill defaults that older data may not have, then boot the snapshot pipeline.
  if (state.data.settings.general.autoSnapshotIntervalMinutes === undefined) {
    state.data.settings.general.autoSnapshotIntervalMinutes = 60;
  }
  if (state.data.settings.general.autoSnapshotKeepCount === undefined) {
    state.data.settings.general.autoSnapshotKeepCount = 7;
  }

  if (state.data.settings.general.autoStart === undefined) {
    state.data.settings.general.autoStart = false;
  }
  if (state.data.settings.general.startMinimized === undefined) {
    state.data.settings.general.startMinimized = false;
  }
  // Defer snapshot refresh and background sync to avoid blocking startup
  refreshSnapshots().catch((e) => console.error("Snapshot init failed:", e));
  startWebdavAutoSync();
  startAutoSnapshotTimer();
}
// ---- Computed ----

const currentCollections = computed(() =>
  state.data.collections.filter((c) => c.workspaceId === state.data.activeWorkspaceId)
);

const activeScenes = computed(() =>
  state.data.scenes.filter((s) => s.workspaceId === state.data.activeWorkspaceId)
);

const collectionById = computed(() => {
  const map = new Map<string, Collection>();
  for (const collection of state.data.collections) map.set(collection.id, collection);
  return map;
});

const itemsByCollectionId = computed(() => {
  const map = new Map<string, CollectionItem[]>();
  for (const item of state.data.items) {
    const items = map.get(item.collectionId);
    if (items) items.push(item);
    else map.set(item.collectionId, [item]);
  }
  for (const items of map.values()) items.sort((a, b) => a.sort - b.sort);
  return map;
});

const firstCollectionIdByScene = computed(() => {
  const candidates = new Map<string, { id: string; sort: number }>();
  for (const collection of state.data.collections) {
    if (collection.workspaceId !== state.data.activeWorkspaceId || !collection.sceneId) continue;
    const existing = candidates.get(collection.sceneId);
    if (!existing || collection.sort < existing.sort) {
      candidates.set(collection.sceneId, { id: collection.id, sort: collection.sort });
      continue;
    }
  }
  return new Map(Array.from(candidates, ([sceneId, collection]) => [sceneId, collection.id]));
});

function sceneForCollection(collection: Collection): Scene | undefined {
  return state.data.scenes.find((s) => s.id === collection.sceneId);
}

const visibleCollections = computed(() => {
  let collections = currentCollections.value;
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
  const isQuickViewTab = activeTab?.kind === "quickview";
  if (state.quickView === "all" && !isQuickViewTab) {
    const sceneId = state.data.activeSceneId;
    collections = collections.filter((c) => c.sceneId === sceneId || (sceneId === "unbound" && c.unbound));
  }
  if (state.quickView === "favorites") collections = collections.filter((c) => c.favorite);
  if (state.quickView === "recent") collections = collections.filter((c) => c.recent);
  if (state.quickView === "unbound") collections = collections.filter((c) => c.unbound || c.sceneId === null);
  if (state.collectionMode === "web") collections = collections.filter((c) => c.type === "网页集合");
  if (state.collectionMode === "tool") collections = collections.filter((c) => ["命令集合", "应用集合", "插件集合"].includes(c.type));
  if (state.search.trim()) {
    const keyword = state.search.trim();
    collections = collections.filter((c) => {
      const scene = sceneForCollection(c);
      const itemMatch = collectionItems(c.id).some((item) => matchesSearchText(
        createSearchText([item.name, item.type, item.value, item.tool]),
        keyword
      ));
      return matchesSearchText(
        createSearchText([c.name, c.type, c.description, c.tool, scene?.name]),
        keyword
      ) || itemMatch;
    });
  }
  if (state.quickView === "recent") {
    return collections.sort((a, b) => {
      const aTime = a.recentAt ? Date.parse(a.recentAt) : 0;
      const bTime = b.recentAt ? Date.parse(b.recentAt) : 0;
      return bTime - aTime || a.sort - b.sort;
    });
  }
  return collections.sort((a, b) => a.sort - b.sort);
});

// ---- Active-entity helpers ----

function activeWorkspace(): Workspace {
  return state.data.workspaces.find((w) => w.id === state.data.activeWorkspaceId) || state.data.workspaces[0];
}

function activeScene(): Scene {
  return state.data.scenes.find((s) => s.id === state.data.activeSceneId) || state.data.scenes[0];
}

function activeCollection(): Collection | undefined {
  const collection = collectionById.value.get(state.data.activeCollectionId);
  return collection?.workspaceId === state.data.activeWorkspaceId ? collection : undefined;
}

function findCollectionById(id: string): Collection | undefined {
  return collectionById.value.get(id);
}

function availableThemes(): ThemeDefinition[] {
  return [
    ...builtInThemes,
    ...state.data.plugins
      .filter((plugin) => plugin.installed && plugin.enabled && plugin.theme)
      .map((plugin) => ({ ...plugin.theme!, source: "plugin" as const, pluginId: plugin.id }))
  ];
}

function activeTheme(): ThemeDefinition {
  return availableThemes().find((theme) => theme.id === state.data.settings.appearance.theme)
    || availableThemes().find((theme) => theme.name === state.data.settings.appearance.theme)
    || builtInThemes[0];
}

const baseToolTypes = ["编辑器", "浏览器", "终端", "系统", "应用", "插件"];
const baseToolTypesByCollection: Partial<Record<CollectionType, string[]>> = {
  "目录集合": ["编辑器", "系统"],
  "网页集合": ["浏览器"],
  "命令集合": ["终端"],
  "文件集合": ["系统", "编辑器"],
  "应用集合": ["系统", "应用"],
  "插件集合": ["系统", "插件"]
};

function normalizeToolTypeContribution(entry: PluginToolTypeEntry): PluginToolTypeContribution {
  return typeof entry === "string" ? { type: entry } : entry;
}

function enabledToolTypeContributions(): PluginToolTypeContribution[] {
  return state.data.plugins
    .filter((plugin) => plugin.installed && plugin.enabled)
    .flatMap((plugin) => plugin.toolTypes || [])
    .map(normalizeToolTypeContribution);
}

function enabledItemTypeContributions(): PluginItemTypeContribution[] {
  return state.data.plugins
    .filter((plugin) => plugin.installed && plugin.enabled)
    .flatMap((plugin) => plugin.itemTypes || []);
}

function availableItemTypes(): string[] {
  // Tool types as the primary item types, plus any plugin-contributed item types
  const toolBased = availableToolTypes();
  const contributed = enabledItemTypeContributions().map((entry) => entry.type);
  return Array.from(new Set([...toolBased, ...contributed]));
}

function pluginItemTypeConfig(type: string): PluginItemTypeContribution | undefined {
  return enabledItemTypeContributions().find((entry) => entry.type === type);
}

function pluginItemFields(type: string): PluginItemFormField[] {
  return pluginItemTypeConfig(type)?.fields || [];
}

function availableToolTypes(): string[] {
  const contributed = enabledToolTypeContributions().map((entry) => entry.type);
  return Array.from(new Set([...baseToolTypes, ...contributed]));
}

function visibleTools(): OpenTool[] {
  const available = new Set(availableToolTypes());
  return state.data.tools.filter((tool) => available.has(tool.type));
}

function allowedToolTypesForCollection(type: CollectionType): string[] {
  const base = baseToolTypesByCollection[type] || ["系统"];
  const contributed = enabledToolTypeContributions()
    .filter((entry) => entry.collectionTypes?.includes(type))
    .map((entry) => entry.type);
  return Array.from(new Set([...contributed, ...base]));
}

function allowedToolTypesForItem(type: ItemType): string[] {
  // item.type is now a tool type. Only allow types that are actually available.
  const available = new Set(availableToolTypes());
  const candidates = [type, "系统"];
  const contributed = enabledToolTypeContributions()
    .filter((entry) => entry.itemTypes?.includes(type))
    .map((entry) => entry.type);
  return Array.from(new Set([...candidates, ...contributed])).filter((t) => available.has(t));
}

function collectionItems(collectionId: string): CollectionItem[] {
  return itemsByCollectionId.value.get(collectionId) || [];
}

// ---- Id helpers ----

function defaultToolForCollection(type: CollectionType): string {
  const allowed = allowedToolTypesForCollection(type);
  const tools = visibleTools();
  const tool = tools.find((t) => allowed.includes(t.type) && t.default && t.type !== "系统")
    || tools.find((t) => allowed.includes(t.type) && t.default)
    || tools.find((t) => allowed.includes(t.type) && t.type !== "系统")
    || tools.find((t) => allowed.includes(t.type))
    || state.data.tools.find((t) => t.type === "系统")
    || state.data.tools[0];
  return tool?.id || "";
}

function defaultToolForItem(type: ItemType): string {
  const allowed = allowedToolTypesForItem(type);
  const tools = visibleTools();
  // Prefer specific (non-system) tool types over generic "系统" fallback
  const tool = tools.find((t) => allowed.includes(t.type) && t.default && t.type !== "系统")
    || tools.find((t) => allowed.includes(t.type) && t.default)
    || tools.find((t) => allowed.includes(t.type) && t.type !== "系统")
    || tools.find((t) => allowed.includes(t.type))
    || state.data.tools.find((t) => t.type === "系统")
    || state.data.tools[0];
  return tool?.id || "";
}

// ---- CRUD ----

function log(text: string): void {
  state.data.activity.unshift({ id: makeId("activity"), text, createdAt: nowIso() });
  state.data.activity = state.data.activity.slice(0, 80);
}

function addTombstone(collection: string, id: string): void {
  // Replace any existing tombstone for the same entity to keep the latest deletedAt
  state.data.tombstones = state.data.tombstones.filter((t) => !(t.collection === collection && t.id === id));
  state.data.tombstones.push({ collection, id, deletedAt: nowIso() });
}

function upsertTask(task: Omit<TaskEntry, "startedAt" | "updatedAt"> & Partial<Pick<TaskEntry, "startedAt" | "updatedAt">>): TaskEntry {
  const existing = state.tasks.find((entry) => entry.id === task.id);
  const now = nowIso();
  if (existing) {
    Object.assign(existing, task, { updatedAt: now });
    state.tasks = [existing, ...state.tasks.filter((entry) => entry.id !== existing.id)].slice(0, 30);
    return existing;
  }
  const next: TaskEntry = {
    ...task,
    startedAt: task.startedAt || now,
    updatedAt: task.updatedAt || now
  };
  state.tasks.unshift(next);
  state.tasks = state.tasks.slice(0, 30);
  return next;
}

function updateTask(id: string, patch: Partial<Pick<TaskEntry, "message" | "status" | "progress" | "finishedAt">>): void {
  const task = state.tasks.find((entry) => entry.id === id);
  if (!task) return;
  Object.assign(task, patch, { updatedAt: nowIso() });
}

function finishTask(id: string, status: Exclude<TaskStatus, "pending" | "running">, message: string): void {
  updateTask(id, { status, message, progress: 100, finishedAt: nowIso() });
}

function toggleTaskPanel(open?: boolean): void {
  state.taskPanelOpen = open === undefined ? !state.taskPanelOpen : open;
}

function clearFinishedTasks(): void {
  state.tasks = state.tasks.filter((task) => task.status === "running");
}

function setActiveCollection(collection: Collection): void {
  if (state.data.activeCollectionId !== collection.id) state.data.activeCollectionId = collection.id;
  if (collection.sceneId && state.data.activeSceneId !== collection.sceneId) state.data.activeSceneId = collection.sceneId;
  if (state.mainView !== "workspace") state.mainView = "workspace";
}

function setActiveScene(sceneId: string): void {
  const nextCollectionId = firstCollectionIdByScene.value.get(sceneId) || "";
  if (state.data.activeSceneId !== sceneId) state.data.activeSceneId = sceneId;
  if (state.quickView !== "all") state.quickView = "all";
  if (state.data.activeCollectionId !== nextCollectionId) state.data.activeCollectionId = nextCollectionId;
  if (state.mainView !== "workspace") state.mainView = "workspace";
}

function createDefaultCollections(scene: Scene): void {
  if (scene.type !== "项目") return;
  state.data.settings.templates.forEach((template, index) => {
    const type = templateToCollectionType(template);
    const meta = collectionMeta[type];
    const toolId = defaultToolForCollection(type);
    const tool = state.data.tools.find((t) => t.id === toolId) || state.data.tools[0];
    state.data.collections.push({
      id: makeId("collection"),
      workspaceId: scene.workspaceId,
      sceneId: scene.id,
      name: `${scene.name}-${template}`,
      type,
      description: `${scene.name} 的 ${template} 集合。`,
      defaultToolId: tool.id,
      tool: tool.name,
      icon: meta.icon,
      color: meta.color,
      openStrategy: "all",
      favorite: false,
      recent: false,
      unbound: false,
      sort: index + 1,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  });
}

function createScene(name: string, type: SceneType, description = ""): void {
  const meta = sceneMeta[type];
  const scene: Scene = {
    id: makeId("scene"), workspaceId: state.data.activeWorkspaceId, name, type, description,
    icon: meta.icon, color: meta.color, favorite: false, createdAt: nowIso(), updatedAt: nowIso()
  };
  state.data.scenes.push(scene);
  state.data.activeSceneId = scene.id;
  createDefaultCollections(scene);
  const first = state.data.collections.find((c) => c.sceneId === scene.id);
  state.data.activeCollectionId = first?.id || "";
  log(`创建场景: ${name}`);
  scheduleWebdavQuickSync("场景变更");
}

function createCollection(name: string, type: CollectionType, sceneId: string | null, description = ""): void {
  const meta = collectionMeta[type];
  const toolId = defaultToolForCollection(type);
  const tool = state.data.tools.find((t) => t.id === toolId) || state.data.tools[0];
  const collection: Collection = {
    id: makeId("collection"), workspaceId: state.data.activeWorkspaceId, sceneId, name, type, description,
    defaultToolId: tool.id, tool: tool.name, icon: meta.icon, color: meta.color,
    openStrategy: "all", favorite: false, recent: false, unbound: !sceneId,
    sort: currentCollections.value.length + 1, createdAt: nowIso(), updatedAt: nowIso()
  };
  state.data.collections.push(collection);
  setActiveCollection(collection);
  log(`创建集合: ${name}`);
  scheduleWebdavQuickSync("集合变更");
}

function createItem(collectionId: string, name: string, type: ItemType, value: string, workingDirectory = "", toolId?: string, pluginData?: Record<string, unknown>): void {
  const meta = itemMeta[type] || { icon: "Blocks", color: "#8a7ff0", tool: "Plugin Runtime" };
  // Keep toolId undefined when user chose "use default", so resolveToolForItem falls through to defaultToolForItem at open time
  const effectiveToolId = toolId || undefined;
  const tool = effectiveToolId ? state.data.tools.find((entry) => entry.id === effectiveToolId) : null;
  const item: CollectionItem = {
    id: makeId("item"), workspaceId: state.data.activeWorkspaceId, collectionId, name, type, value, workingDirectory,
    toolId: effectiveToolId, tool: tool?.name || "使用默认工具", icon: meta.icon, color: meta.color, pluginData,
    sort: collectionItems(collectionId).length + 1, createdAt: nowIso(), updatedAt: nowIso()
  };
  state.data.items.push(item);
  log(`添加资源: ${name}`);
  scheduleWebdavQuickSync("资源变更");
}

function toggleFavorite(collection: Collection): void {
  collection.favorite = !collection.favorite;
  log(`${collection.favorite ? "收藏" : "取消收藏"}集合: ${collection.name}`);
}

function markCollectionRecent(collection: Collection): void {
  const lastRecentAt = collection.recentAt ? Date.parse(collection.recentAt) : 0;
  if (collection.recent && Date.now() - lastRecentAt < 5000) return;
  collection.recent = true;
  collection.recentAt = nowIso();
}

function createTool(name: string, type: OpenTool["type"], path = "", args = "{path}"): void {
  const tool: OpenTool = {
    id: makeId("tool"),
    name,
    type,
    path,
    args,
    default: !state.data.tools.some((entry) => entry.type === type && entry.default)
  };
  state.data.tools.push(tool);
  log(`添加打开工具: ${name}`);
}

function deleteTool(id: string): void {
  const tool = state.data.tools.find((entry) => entry.id === id);
  if (!tool) return;
  state.data.tools = state.data.tools.filter((entry) => entry.id !== id);
  state.data.collections.forEach((collection) => {
    if (collection.defaultToolId === id) {
      const nextToolId = defaultToolForCollection(collection.type);
      const nextTool = state.data.tools.find((entry) => entry.id === nextToolId);
      collection.defaultToolId = nextToolId;
      collection.tool = nextTool?.name || "";
    }
  });
  state.data.items.forEach((item) => {
    if (item.toolId === id) item.toolId = undefined;
  });
  if (!state.data.tools.some((entry) => entry.type === tool.type && entry.default)) {
    const fallback = state.data.tools.find((entry) => entry.type === tool.type);
    if (fallback) fallback.default = true;
  }
  log(`删除打开工具: ${tool.name}`);
}

function setDefaultTool(id: string): void {
  const tool = state.data.tools.find((entry) => entry.id === id);
  if (!tool) return;
  state.data.tools.forEach((entry) => {
    if (entry.type === tool.type) entry.default = false;
  });
  tool.default = true;
  log(`设置默认打开工具: ${tool.name}`);
}

async function scanOpenTools(): Promise<{ detected: DetectedOpenTool[]; added: DetectedOpenTool[]; updated: DetectedOpenTool[]; error?: string }> {
  const result: { detected: DetectedOpenTool[]; added: DetectedOpenTool[]; updated: DetectedOpenTool[]; error?: string } = {
    detected: [],
    added: [],
    updated: []
  };

  try {
    const detected = await invoke<DetectedOpenTool[]>("scan_open_tools");
    result.detected = detected;

    for (const tool of detected) {
      const existing = state.data.tools.find((entry) => entry.id === tool.id)
        || state.data.tools.find((entry) => entry.name.toLowerCase() === tool.name.toLowerCase());
      if (existing) {
        existing.name = tool.name;
        existing.type = tool.type;
        existing.path = tool.path;
        existing.args = tool.args;
        if (tool.default) {
          state.data.tools.forEach((entry) => {
            if (entry.type === tool.type) entry.default = entry.id === existing.id;
          });
        } else if (!state.data.tools.some((entry) => entry.type === tool.type && entry.default && entry.id !== existing.id)) {
          existing.default = existing.default || tool.default;
        }
        result.updated.push({ ...tool });
        continue;
      }

      if (tool.default) {
        state.data.tools.forEach((entry) => {
          if (entry.type === tool.type) entry.default = false;
        });
      }

      state.data.tools.push({
        ...tool,
        default: tool.default || !state.data.tools.some((entry) => entry.type === tool.type && entry.default)
      });
      result.added.push({ ...tool });
    }

    log(`自动扫描打开工具: 新增 ${result.added.length} 个，更新 ${result.updated.length} 个`);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    log(`自动扫描打开工具失败: ${result.error}`);
  }

  return result;
}

function completeToolSetup(): void {
  state.toolSetupDone = true;
  log("打开工具配置完成");
}

// ---- Open actions (call Tauri) ----

function valuesForItem(item: CollectionItem): Record<string, string> {
  return {
    path: item.value,
    url: item.value,
    command: item.value,
    name: item.name,
    cwd: item.workingDirectory || ""
  };
}

function argsForTool(item: CollectionItem, tool: OpenTool): string[] {
  const values = valuesForItem(item);
  const argsTemplate = tool.args?.trim() || (item.type === "终端" ? "{command}" : item.type === "浏览器" ? "{url}" : "{path}");

  // When the value is a remote URI (vscode-remote://, cursor-remote://, etc.) and the tool
  // is an editor, use --folder-uri instead of a positional argument so VS Code / Cursor
  // opens the remote directory correctly.
  const remoteUriPrefixes = ["vscode-remote://", "vscode://", "cursor-remote://", "cursor://"];
  const isRemoteUri = remoteUriPrefixes.some((prefix) => item.value.startsWith(prefix));
  const effectiveTemplate = (isRemoteUri && tool.type === "编辑器" && argsTemplate === "{path}")
    ? "--folder-uri {path}"
    : argsTemplate;

  const args = expandToolArgs(effectiveTemplate, values);

  if (item.type === "浏览器" && state.data.settings.general.openWebInNewWindow && !args.some((arg) => arg === "--new-window" || arg === "-new-window")) {
    return ["--new-window", ...args];
  }
  return args;
}

function argsForUrlBatch(tool: OpenTool, urls: string[]): string[] {
  const template = tool.args?.trim() || "{url}";
  const tokens = template.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const args: string[] = [];
  let insertedUrls = false;

  for (const token of tokens) {
    const unquoted = token.replace(/^"|"$/g, "");
    if (unquoted === "{url}") {
      args.push(...urls);
      insertedUrls = true;
      continue;
    }
    if (unquoted.includes("{url}")) {
      args.push(unquoted.split("{url}").join(urls[0] || ""));
      insertedUrls = true;
      continue;
    }
    args.push(unquoted);
  }

  if (!insertedUrls) args.push(...urls);
  if (state.data.settings.general.openWebInNewWindow && !args.some((arg) => arg === "--new-window" || arg === "-new-window")) {
    return ["--new-window", ...args];
  }
  return args;
}
function resolveToolForItem(item: CollectionItem): OpenTool | undefined {
  return state.data.tools.find((tool) => tool.id === item.toolId)
    || state.data.tools.find((tool) => tool.id === defaultToolForItem(item.type));
}

async function openItemWithTool(item: CollectionItem, tool: OpenTool | undefined): Promise<OpenActionResult> {
  const pluginOpenHandler = getPluginOpenHandler(item.type);
  if (pluginOpenHandler) {
    return await pluginOpenHandler({ item, tool, callOpenCommand });
  }
  if (!tool || tool.type === "系统" || tool.path === "shell:open" || !tool.path.trim()) {
    if (item.type === "浏览器") return callOpenCommand("open_url", { url: item.value, newWindow: state.data.settings.general.openWebInNewWindow });
    if (item.type === "终端") return callOpenCommand("run_command", { command: item.value, workingDirectory: item.workingDirectory || null });
    return callOpenCommand("open_path", { path: item.value });
  }

  // Single URL opens should launch directly; collection batches handle browser warm-up separately.
  if (tool.type === "浏览器" && (item.type === "浏览器" || item.value.startsWith("http://") || item.value.startsWith("https://"))) {
    return callOpenCommand("open_url_in_browser", {
      browserPath: tool.path,
      url: item.value,
      newWindow: state.data.settings.general.openWebInNewWindow
    });
  }

  const args = argsForTool(item, tool);
  return callOpenCommand("open_application", { path: tool.path, args });
}

async function openItem(item: CollectionItem): Promise<void> {
  if (item.type === "终端" && state.data.settings.general.confirmBeforeOpen && !(await confirmAction(`确认执行命令？\n${item.value}`))) return;
  const tool = resolveToolForItem(item);
  const result = await openItemWithTool(item, tool);
  const collection = findCollectionById(item.collectionId);
  if (collection) markCollectionRecent(collection);
  log(`${result.ok ? "打开" : "打开失败"}: ${item.name}${tool ? ` via ${tool.name}` : ""} - ${result.message}`);
}

async function openCollection(collection: Collection): Promise<void> {
  const items = collectionItems(collection.id);
  if (!items.length) return log(`集合为空: ${collection.name}`);
  if (state.data.settings.general.confirmBeforeOpen && items.length > 1 && !(await confirmAction(`确认打开集合「${collection.name}」中的 ${items.length} 个资源？`))) return;
  markCollectionRecent(collection);

  const openedInBatch = new Set<string>();
  const urlGroups = new Map<string, { tool: OpenTool; items: CollectionItem[] }>();
  for (const item of items) {
    if (item.type !== "浏览器") continue;
    const tool = resolveToolForItem(item);
    if (!tool || tool.type !== "浏览器" || tool.path === "shell:open" || !tool.path.trim()) continue;
    const key = JSON.stringify([tool.path, tool.args || ""]);
    const group = urlGroups.get(key) || { tool, items: [] };
    group.items.push(item);
    urlGroups.set(key, group);
  }

  for (const { tool, items: urlItems } of urlGroups.values()) {
    if (urlItems.length <= 1) continue;
    const urls = urlItems.map((item) => item.value);
    // Open all URLs in one call so they land as tabs in a single window.
    const result = await callOpenCommand("open_urls_in_browser", {
      browserPath: tool.path,
      urls,
      newWindow: state.data.settings.general.openWebInNewWindow
    });
    urlItems.forEach((item) => openedInBatch.add(item.id));
    log(`${result.ok ? "打开" : "打开失败"}: ${urlItems.length} 个网页资源 via ${tool.name} - ${result.message}`);
  }
  for (const item of items) {
    if (openedInBatch.has(item.id)) continue;
    await openItem(item);
    // Delay between non-browser opens: macOS merges rapid `open` calls into
    // one activation event, so only the first path would open in the app.
    const remaining = items.filter((i) => !openedInBatch.has(i.id));
    if (remaining.length > 0 && item.type !== "浏览器") {
      await new Promise((r) => setTimeout(r, 350));
    }
  }
}

async function openScene(scene: Scene): Promise<void> {
  const collections = state.data.collections.filter((c) => c.sceneId === scene.id);
  const count = collections.reduce((sum, c) => sum + collectionItems(c.id).length, 0);
  if (state.data.settings.general.confirmBeforeOpen && !(await confirmAction(`确认打开场景「${scene.name}」中的 ${count} 个资源？`))) return;
  for (const collection of collections) await openCollection(collection);
}

// ---- Workspace ----

function createWorkspace(name: string, storage: string, remark: string): void {
  const workspace: Workspace = { id: makeId("workspace"), name, storage, remark, createdAt: nowIso(), updatedAt: nowIso() };
  state.data.workspaces.push(workspace);
  state.data.activeWorkspaceId = workspace.id;
  log(`创建工作区: ${name}`);
  scheduleWebdavQuickSync("工作区变更");
}

function switchWorkspace(id: string): void {
  state.data.activeWorkspaceId = id;
  const firstScene = state.data.scenes.find((s) => s.workspaceId === id);
  if (firstScene) state.data.activeSceneId = firstScene.id;
  log(`切换工作区: ${activeWorkspace().name}`);
}

// ---- Plugin ----
function togglePlugin(plugin: PluginManifest): void {
  plugin.enabled = !plugin.enabled;
  if (!plugin.enabled && state.settingsCategory === `plugin:${plugin.id}`) {
    state.settingsCategory = "plugins";
  }
  if (plugin.theme && !plugin.enabled && state.data.settings.appearance.theme === plugin.theme.id) {
    state.data.settings.appearance.theme = builtInThemes[0].id;
  }
  log(`${plugin.enabled ? "启用" : "停用"}插件: ${plugin.name}`);
}

// ---- Marketplace ----

const REGISTRY_PRIMARY = "https://gitee.com/hongxiaojian/open-dock-plugins/raw/master/index.json";
const REGISTRY_MIRROR = "https://raw.githubusercontent.com/yedsn/OpenDockPlugins/master/index.json";
const REGISTRY_FILES_BASE_PRIMARY = "https://gitee.com/hongxiaojian/open-dock-plugins/raw/master/plugins";
const REGISTRY_FILES_BASE_MIRROR = "https://raw.githubusercontent.com/yedsn/OpenDockPlugins/master/plugins";

async function fetchTextWithFallback(urls: string[]): Promise<string | null> {
  // Use Tauri backend for fetching (supports proxy auto-detection)
  for (const url of urls) {
    try {
      const body = await invoke<string>("marketplace_fetch_text", { url });
      if (body) return body;
    } catch {
      continue;
    }
  }
  // Fallback to browser fetch if Tauri backend fails
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return await response.text();
    } catch {
      continue;
    }
  }
  return null;

}

async function fetchMarketplaceIndex(): Promise<void> {
  state.marketplaceLoading = true;
  state.marketplaceError = "";
  try {
    const body = await fetchTextWithFallback([REGISTRY_PRIMARY, REGISTRY_MIRROR]);
    if (!body) {
      state.marketplaceError = "无法连接插件市场";
      return;
    }
    const index: MarketplaceIndex = JSON.parse(body);
    state.marketplacePlugins = index.plugins.filter((p) => {
      const installed = state.data.plugins.some((ip) => ip.id === p.id);
      return !installed;
    });
  } catch (e) {
    state.marketplaceError = String(e);
  } finally {
    state.marketplaceLoading = false;
  }
}
async function installFromMarketplace(plugin: MarketplacePlugin): Promise<void> {
  state.marketplaceInstalling = plugin.id;
  try {
    const files: { path: string; content: string }[] = [];

    // Download plugin.json from the registry
    const pluginJsonContent = await fetchTextWithFallback([
      `${REGISTRY_FILES_BASE_PRIMARY}/${plugin.id}/${plugin.version}/plugin.json`,
      `${REGISTRY_FILES_BASE_MIRROR}/${plugin.id}/${plugin.version}/plugin.json`
    ]);
    if (pluginJsonContent) {
      files.push({ path: "plugin.json", content: pluginJsonContent });
    }

    if (files.length === 0) {
      log(`安装插件失败: ${plugin.name} - 无法下载插件配置`);
      return;
    }

    // Write plugin files to user data directory
    await invoke<string>("marketplace_install_plugin_files", {
      pluginId: plugin.id,
      version: plugin.version,
      files
    });

    // Parse plugin.json for any declarative contributions (toolTypes, itemTypes, theme)
    let pluginJson: Record<string, unknown> = {};
    try {
      pluginJson = JSON.parse(files[0].content);
    } catch { /* ignore parse error, use marketplace metadata */ }

    const manifest: PluginManifest = {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      category: plugin.category,
      capability: plugin.description,
      permissions: plugin.permissions,
      installed: true,
      enabled: true,
      configurable: false,
      toolTypes: Array.isArray(pluginJson.toolTypes) ? pluginJson.toolTypes as PluginToolTypeEntry[] : undefined,
      itemTypes: Array.isArray(pluginJson.itemTypes) ? pluginJson.itemTypes as PluginItemTypeContribution[] : undefined
    };

    state.data.plugins.push(manifest);
    state.marketplacePlugins = state.marketplacePlugins.filter((p) => p.id !== plugin.id);
    log(`从市场安装插件: ${plugin.name} v${plugin.version}`);
  } catch (e) {
    log(`安装插件失败: ${plugin.name} - ${e}`);
  } finally {
    state.marketplaceInstalling = null;
  }
}

async function uninstallFromMarketplace(plugin: PluginManifest): Promise<void> {
  try {
    await invoke<string>("marketplace_delete_plugin_dir", { pluginId: plugin.id });
  } catch {
    // Directory may not exist for built-in plugins
  }
  state.data.plugins = state.data.plugins.filter((entry) => entry.id !== plugin.id);
  if (state.settingsCategory === `plugin:${plugin.id}`) state.settingsCategory = "plugins";
  if (plugin.theme && state.data.settings.appearance.theme === plugin.theme.id) state.data.settings.appearance.theme = builtInThemes[0].id;
  log(`删除插件: ${plugin.name}`);
}

// ---- WebDAV ----

async function testWebdav(): Promise<void> {
  const config = state.data.settings.webdavSync;
  const password = await webdavGetCredential();
  const result = await callOpenCommand("test_webdav_connection", { serverUrl: config.serverUrl, username: config.username, password, remotePath: config.remotePath });
  config.status = result.ok ? "连接正常" : "连接失败";
  config.lastError = result.ok ? "" : formatWebdavError(result.message);
  log(`WebDAV Sync 测试连接: ${result.message}`);
}

async function syncWebdavNow(): Promise<void> {
  const config = state.data.settings.webdavSync;
  const taskId = "webdav-sync";
  const existingTask = state.tasks.find((task) => task.id === taskId && task.status === "running");
  if (existingTask) {
    state.taskPanelOpen = true;
    return;
  }
  upsertTask({
    id: taskId,
    type: "webdav-sync",
    title: "WebDAV 同步",
    message: "准备同步数据...",
    status: "running",
    progress: 8
  });
  const password = await webdavGetCredential();
  updateTask(taskId, { message: "正在读取本地数据并连接 WebDAV...", progress: 22 });
  const localData = exportAppData(state.data);
  const result = await callOpenCommand("sync_webdav_now", {
    serverUrl: config.serverUrl,
    username: config.username,
    password,
    remotePath: config.remotePath,
    conflictPolicy: config.conflictPolicy,
    localData,
  });
  updateTask(taskId, { message: "正在处理同步结果...", progress: 82 });

  if (result.ok) {
    if (result.message.startsWith("SYNC_CONFLICT:")) {
      const remoteJson = result.message.slice("SYNC_CONFLICT:".length);
      try {
        parseWebdavRemoteData(remoteJson);
        state.webdavPendingConflict = createWebdavPendingConflict(localData, remoteJson);
        config.status = "需要手动处理冲突";
        config.lastError = "";
        finishTask(taskId, "warning", "WebDAV 同步需要手动处理冲突");
      } catch {
        state.webdavPendingConflict = null;
        config.status = "同步失败（远程数据解析错误）";
        config.lastError = "远程返回的数据不是可导入的 OpenDock JSON。";
        finishTask(taskId, "error", config.lastError);
      }
    } else if (result.message.startsWith("SYNC_REMOTE_DATA:") || result.message.startsWith("SYNC_MERGED_DATA:")) {
      const isMergedData = result.message.startsWith("SYNC_MERGED_DATA:");
      const remoteJson = result.message.slice(isMergedData ? "SYNC_MERGED_DATA:".length : "SYNC_REMOTE_DATA:".length);
      try {
        const remoteData = parseWebdavRemoteData(remoteJson);
        const changeSummary = summarizeSyncChanges(state.data, remoteData);
        await replaceLocalDataFromWebdav(remoteData, isMergedData ? "WebDAV 增量合并前快照" : "WebDAV 远程覆盖前快照", { preserveLocalSettings: isMergedData });
        state.data.settings.webdavSync.status = isMergedData ? `同步成功（已增量合并：${changeSummary}）` : `同步成功（远程优先：${changeSummary}）`;
        state.data.settings.webdavSync.lastError = "";
        finishTask(taskId, "success", state.data.settings.webdavSync.status);
      } catch {
        config.status = "同步失败（远程数据解析错误）";
        config.lastError = "远程返回的数据不是可导入的 OpenDock JSON。";
        finishTask(taskId, "error", config.lastError);
      }
    } else if (result.message.startsWith("SYNC_MANUAL:")) {
      config.status = "需要手动处理冲突";
      config.lastError = "";
      finishTask(taskId, "warning", "WebDAV 同步需要手动处理冲突");
    } else {
      state.webdavPendingConflict = null;
      config.status = "同步成功";
      config.lastError = "";
      finishTask(taskId, "success", result.message || config.status);
    }
  } else {
    config.status = "同步失败";
    config.lastError = formatWebdavError(result.message);
    finishTask(taskId, "error", config.lastError);
  }
  state.data.settings.webdavSync.lastSyncAt = new Date().toLocaleString("zh-CN", { hour12: false });
  log(`WebDAV Sync 立即同步: ${result.message}`);
}

let webdavQuickSyncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleWebdavQuickSync(reason: string): void {
  const config = state.data.settings.webdavSync;
  if (!config.autoSync) return;
  if (!webdavPluginInstalled.value) return;
  if (!config.serverUrl.trim() || !config.username.trim() || !config.remotePath.trim()) return;
  if (webdavQuickSyncTimer) clearTimeout(webdavQuickSyncTimer);
  upsertTask({
    id: "webdav-sync",
    type: "webdav-sync",
    title: "WebDAV 同步",
    message: `等待同步${reason}...`,
    status: "pending",
    progress: 5
  });
  webdavQuickSyncTimer = setTimeout(() => {
    webdavQuickSyncTimer = null;
    syncWebdavNow().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      state.data.settings.webdavSync.status = "同步失败";
      state.data.settings.webdavSync.lastError = message;
      finishTask("webdav-sync", "error", message);
    });
  }, 900);
  (webdavQuickSyncTimer as unknown as { unref?: () => void }).unref?.();
}

function formatWebdavError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "未返回具体错误，请检查 WebDAV 地址、用户名、密码/Token 和远程目录。";
  return trimmed;
}

function parseWebdavRemoteData(remoteJson: string): AppData {
  const remoteData = JSON.parse(remoteJson) as unknown;
  return normalizeWebdavData(remoteData);
}

function normalizeWebdavData(input: unknown): AppData {
  return normalizeAppData(input);
}

function countData(data: AppData): { workspaces: number; scenes: number; collections: number; items: number } {
  return {
    workspaces: data.workspaces.length,
    scenes: data.scenes.length,
    collections: data.collections.length,
    items: data.items.length
  };
}

type SyncDiffCollection = "workspaces" | "scenes" | "collections" | "items" | "tombstones";

const syncDiffLabels: Record<SyncDiffCollection, string> = {
  workspaces: "工作区",
  scenes: "场景",
  collections: "集合",
  items: "资源",
  tombstones: "删除记录",
};

function syncEntityKey(collection: SyncDiffCollection, value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  if (collection === "tombstones") {
    const scope = typeof object.collection === "string" ? object.collection : "";
    const id = typeof object.id === "string" ? object.id : "";
    return scope && id ? `${scope}:${id}` : null;
  }
  return typeof object.id === "string" ? object.id : null;
}

function comparableSyncEntity(value: unknown): string {
  if (!value || typeof value !== "object") return JSON.stringify(value);
  const copy = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  delete copy.sort;
  delete copy.recent;
  delete copy.recentAt;
  delete copy.favorite;
  return JSON.stringify(copy);
}

function summarizeSyncChanges(before: AppData, after: AppData): string {
  const collections: SyncDiffCollection[] = ["workspaces", "scenes", "collections", "items", "tombstones"];
  const parts: string[] = [];
  for (const collection of collections) {
    const beforeItems = (before[collection] as unknown[]) || [];
    const afterItems = (after[collection] as unknown[]) || [];
    const beforeMap = new Map<string, unknown>();
    const afterMap = new Map<string, unknown>();
    beforeItems.forEach((item) => {
      const key = syncEntityKey(collection, item);
      if (key) beforeMap.set(key, item);
    });
    afterItems.forEach((item) => {
      const key = syncEntityKey(collection, item);
      if (key) afterMap.set(key, item);
    });
    let added = 0;
    let removed = 0;
    let updated = 0;
    afterMap.forEach((item, key) => {
      const beforeItem = beforeMap.get(key);
      if (!beforeItem) added += 1;
      else if (comparableSyncEntity(beforeItem) !== comparableSyncEntity(item)) updated += 1;
    });
    beforeMap.forEach((_item, key) => {
      if (!afterMap.has(key)) removed += 1;
    });
    const label = syncDiffLabels[collection];
    const details: string[] = [];
    if (added) details.push(`新增 ${added}`);
    if (updated) details.push(`更新 ${updated}`);
    if (removed) details.push(`删除 ${removed}`);
    if (details.length) parts.push(`${label}${details.join("、")}`);
  }
  if (!parts.length) return "无数据变化";
  const visible = parts.slice(0, 3);
  const extraCount = parts.length - visible.length;
  return extraCount > 0 ? `${visible.join("；")}；另 ${extraCount} 项变化` : visible.join("；");
}

function summarizeWebdavData(raw: string): string {
  try {
    const data = normalizeWebdavData(JSON.parse(raw));
    const counts = countData(data);
    return `工作区 ${counts.workspaces} 个 · 场景 ${counts.scenes} 个 · 集合 ${counts.collections} 个 · 资源 ${counts.items} 个`;
  } catch {
    return "无法解析数据摘要";
  }
}

function createWebdavPendingConflict(localData: string, remoteData: string): WebDavPendingConflict {
  return {
    localData,
    remoteData,
    detectedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    localSummary: summarizeWebdavData(localData),
    remoteSummary: summarizeWebdavData(remoteData)
  };
}

async function replaceLocalDataFromWebdav(remoteData: AppData, snapshotLabel: string, options: { preserveLocalSettings?: boolean } = {}): Promise<void> {
  try {
    await createSnapshot(state.data, "pre-import", `${snapshotLabel} ${new Date().toLocaleString()}`);
  } catch (e) {
    console.error("WebDAV pre-overwrite snapshot failed:", e);
  }
  const localSettings = state.data.settings;
  const localWebdavConfig = { ...localSettings.webdavSync };
  const localMachineData = {
    settings: localSettings,
    tools: state.data.tools,
    plugins: state.data.plugins,
    pluginStore: state.data.pluginStore,
    activity: state.data.activity,
  };
  const credentialRef = localWebdavConfig.credentialRef;
  // Preserve local active state (machine-local navigation context)
  const localActive = {
    activeWorkspaceId: state.data.activeWorkspaceId,
    activeSceneId: state.data.activeSceneId,
    activeCollectionId: state.data.activeCollectionId,
  };
  state.data = remoteData;
  // Restore local active state
  state.data.activeWorkspaceId = localActive.activeWorkspaceId;
  state.data.activeSceneId = localActive.activeSceneId;
  state.data.activeCollectionId = localActive.activeCollectionId;
  state.data.tools = localMachineData.tools;
  state.data.plugins = localMachineData.plugins;
  state.data.pluginStore = localMachineData.pluginStore;
  state.data.activity = localMachineData.activity;
  state.data.settings = localMachineData.settings;
  if (options.preserveLocalSettings) {
    // Incremental merge: settings are not synced, keep local settings untouched.
    state.data.settings = localMachineData.settings;
  } else {
    // Remote-priority data replacement still keeps local settings and plugin/runtime data.
    state.data.settings.webdavSync = { ...localWebdavConfig, credentialRef };
  }
  await refreshSnapshots();
  startAutoSnapshotTimer();
}

async function webdavOverwriteLocal(): Promise<void> {
  const pending = state.webdavPendingConflict;
  if (!pending) return;
  try {
    const remoteData = parseWebdavRemoteData(pending.remoteData);
    await replaceLocalDataFromWebdav(remoteData, "WebDAV 手动覆盖本地前快照");
    state.data.settings.webdavSync.status = "同步成功（远程优先）";
    state.data.settings.webdavSync.lastError = "";
    state.data.settings.webdavSync.lastSyncAt = new Date().toLocaleString("zh-CN", { hour12: false });
    state.webdavPendingConflict = null;
    log("WebDAV Sync 手动覆盖本地完成");
  } catch {
    state.data.settings.webdavSync.status = "同步失败（远程数据解析错误）";
    state.data.settings.webdavSync.lastError = "远程返回的数据不是可导入的 OpenDock JSON。";
  }
}

async function webdavOverwriteRemote(): Promise<void> {
  const pending = state.webdavPendingConflict;
  if (!pending) return;
  const config = state.data.settings.webdavSync;
  const password = await webdavGetCredential();
  const result = await callOpenCommand("sync_webdav_now", {
    serverUrl: config.serverUrl,
    username: config.username,
    password,
    remotePath: config.remotePath,
    conflictPolicy: "覆盖远程",
    localData: pending.localData,
  });
  if (result.ok) {
    config.status = "同步成功";
    config.lastError = "";
    state.webdavPendingConflict = null;
  } else {
    config.status = "同步失败";
    config.lastError = formatWebdavError(result.message);
  }
  config.lastSyncAt = new Date().toLocaleString("zh-CN", { hour12: false });
  log(`WebDAV Sync 手动覆盖远程: ${result.message}`);
}

function clearWebdavPendingConflict(): void {
  state.webdavPendingConflict = null;
  if (state.data.settings.webdavSync.status === "需要手动处理冲突") {
    state.data.settings.webdavSync.status = "已取消冲突处理";
  }
  state.data.settings.webdavSync.lastError = "";
}

// ---- Snapshots ----

let autoSnapshotTimer: ReturnType<typeof setInterval> | null = null;

async function takeSnapshot(label: string = "", kind: SnapshotKind = "manual", note: string = ""): Promise<SnapshotRecord> {
  const record = await createSnapshot(state.data, kind, label || formatSnapshotLabel(kind), note);
  state.snapshots = await listSnapshots();
  return record;
}

async function updateSnapshot(id: string, label: string, note: string): Promise<void> {
  const safeLabel = label.trim() || formatSnapshotLabel("manual");
  await updateSnapshotMeta(id, safeLabel, note.trim());
  state.snapshots = await listSnapshots();
}

async function restoreSnapshot(id: string): Promise<AppData> {
  const data = await loadSnapshot(id);
  state.data = data;
  // Take a pre-import snapshot before replacing, then async save
  state.snapshots = await listSnapshots();
  return data;
}

async function removeSnapshot(id: string): Promise<void> {
  await deleteSnapshot(id);
  state.snapshots = state.snapshots.filter((s) => s.id !== id);
}

async function refreshSnapshots(): Promise<void> {
  state.snapshots = await listSnapshots();
}

async function pruneAutoSnapshots(keep: number = 10): Promise<number> {
  const deleted = await pruneSnapshots("auto", keep);
  state.snapshots = await listSnapshots();
  return deleted;
}

function formatSnapshotLabel(kind: SnapshotKind): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return kind === "auto" ? `自动快照 ${ts}` : kind === "pre-import" ? `导入前快照 ${ts}` : `手动快照 ${ts}`;
}

function createSnapshotLabel(kind: SnapshotKind = "manual"): string {
  return formatSnapshotLabel(kind);
}

function startAutoSnapshotTimer(): void {
  stopAutoSnapshotTimer();
  const minutes = state.data.settings.general.autoSnapshotIntervalMinutes;
  if (!minutes || minutes <= 0) return;
  const ms = minutes * 60 * 1000;
  autoSnapshotTimer = setInterval(async () => {
    try {
      await takeSnapshot("", "auto");
      await pruneAutoSnapshots(state.data.settings.general.autoSnapshotKeepCount || 7);
    } catch (e) {
      console.error("Auto snapshot failed:", e);
    }
  }, ms);
}

function stopAutoSnapshotTimer(): void {
  if (autoSnapshotTimer) {
    clearInterval(autoSnapshotTimer);
    autoSnapshotTimer = null;
  }
}

// ---- Data lifecycle ----

async function resetData(): Promise<void> {
  // Save current data as a "pre-import" snapshot so the user can undo a reset.
  try {
    await createSnapshot(state.data, "pre-import", `重置前快照 ${new Date().toLocaleString()}`);
  } catch (e) {
    console.error("Pre-reset snapshot failed:", e);
  }
  state.data = await resetAppData();
  state.toolSetupDone = false;
  await refreshSnapshots();
  startAutoSnapshotTimer();
  log("重置应用数据");
}

function clearRecent(): void {
  state.data.collections.forEach((c) => { c.recent = false; c.recentAt = undefined; });
  state.data.activity = state.data.activity.filter((a) => !a.text.includes("打开") && !a.text.includes("最近"));
  log("已清空最近打开记录");
}

async function replaceData(data: AppData): Promise<void> {
  // Save current data as a "pre-import" snapshot so the user can undo a bad import.
  try {
    await createSnapshot(state.data, "pre-import", `导入前快照 ${new Date().toLocaleString()}`);
  } catch (e) {
    console.error("Pre-import snapshot failed:", e);
  }
  state.data = data;
  await refreshSnapshots();
  // Restart the auto-snapshot timer in case the new data has a different interval.
  startAutoSnapshotTimer();
  log("已替换数据");
}

function exportData(): void {
  state.selectedExport = exportAppData(state.data);
  log("生成导出数据");
}

// ---- Update / Delete ----

function updateScene(id: string, patch: Partial<Scene>): void {
  const scene = state.data.scenes.find((s) => s.id === id);
  if (!scene) return;
  Object.assign(scene, patch, { updatedAt: nowIso() });
  log(`编辑场景: ${scene.name}`);
  scheduleWebdavQuickSync("场景变更");
}

function deleteScene(id: string): void {
  const scene = state.data.scenes.find((s) => s.id === id);
  if (!scene) return;
  // Detach all collections of this scene to "无场景".
  state.data.collections.forEach((c) => {
    if (c.sceneId === id) { c.sceneId = null; c.unbound = true; }
  });
  state.data.scenes = state.data.scenes.filter((s) => s.id !== id);
  addTombstone("scenes", id);
  if (state.data.activeSceneId === id) {
    const fallback = state.data.scenes.find((s) => s.workspaceId === state.data.activeWorkspaceId);
    state.data.activeSceneId = fallback?.id || "";
  }
  log(`删除场景: ${scene.name}`);
  scheduleWebdavQuickSync("场景变更");
}

function updateCollection(id: string, patch: Partial<Collection>): void {
  const collection = findCollectionById(id);
  if (!collection) return;
  Object.assign(collection, patch, { updatedAt: nowIso() });
  if (patch.sceneId !== undefined) collection.unbound = !patch.sceneId;
  if (patch.type !== undefined) {
    const toolId = defaultToolForCollection(collection.type);
    const tool = state.data.tools.find((entry) => entry.id === toolId);
    collection.defaultToolId = toolId;
    collection.tool = tool?.name || "";
  }
  log(`编辑集合: ${collection.name}`);
  scheduleWebdavQuickSync("集合变更");
}

function deleteCollection(id: string): void {
  const collection = findCollectionById(id);
  if (!collection) return;
  // Cascade-delete its items.
  const cascadingItems = state.data.items.filter((i) => i.collectionId === id);
  cascadingItems.forEach((item) => addTombstone("items", item.id));
  state.data.items = state.data.items.filter((i) => i.collectionId !== id);
  state.data.collections = state.data.collections.filter((c) => c.id !== id);
  addTombstone("collections", id);
  if (state.data.activeCollectionId === id) state.data.activeCollectionId = "";
  log(`删除集合: ${collection.name}`);
  scheduleWebdavQuickSync("集合变更");
}

function updateItem(id: string, patch: Partial<CollectionItem>): void {
  const item = state.data.items.find((i) => i.id === id);
  if (!item) return;
  Object.assign(item, patch, { updatedAt: nowIso() });
  if (patch.type !== undefined || patch.toolId !== undefined) {
    // When toolId is empty/undefined, keep it that way so resolveToolForItem uses defaultToolForItem at open time
    const effectiveToolId = item.toolId || undefined;
    if (effectiveToolId) {
      const tool = state.data.tools.find((entry) => entry.id === effectiveToolId);
      item.toolId = effectiveToolId;
      item.tool = tool?.name || itemMeta[item.type]?.tool || "使用默认工具";
    } else {
      item.toolId = undefined;
      item.tool = "使用默认工具";
    }
  }
  log(`编辑资源: ${item.name}`);
  scheduleWebdavQuickSync("资源变更");
}

function deleteItem(id: string): void {
  const item = state.data.items.find((i) => i.id === id);
  if (!item) return;
  state.data.items = state.data.items.filter((i) => i.id !== id);
  addTombstone("items", id);
  log(`删除资源: ${item.name}`);
  scheduleWebdavQuickSync("资源变更");
}

function updateWorkspace(id: string, patch: Partial<Workspace>): void {
  const workspace = state.data.workspaces.find((w) => w.id === id);
  if (!workspace) return;
  Object.assign(workspace, patch, { updatedAt: nowIso() });
  log(`编辑工作区: ${workspace.name}`);
  scheduleWebdavQuickSync("工作区变更");
}

function deleteWorkspace(id: string): void {
  if (state.data.workspaces.length <= 1) {
    log("至少保留一个工作区");
    return;
  }
  const workspace = state.data.workspaces.find((w) => w.id === id);
  if (!workspace) return;
  // Cascade: drop scenes / collections / items that belong to this workspace.
  const wsItems = state.data.items.filter((i) => i.workspaceId === id);
  wsItems.forEach((e) => addTombstone("items", e.id));
  state.data.items = state.data.items.filter((i) => i.workspaceId !== id);
  const wsCollections = state.data.collections.filter((c) => c.workspaceId === id);
  wsCollections.forEach((e) => addTombstone("collections", e.id));
  state.data.collections = state.data.collections.filter((c) => c.workspaceId !== id);
  const wsScenes = state.data.scenes.filter((s) => s.workspaceId === id);
  wsScenes.forEach((e) => addTombstone("scenes", e.id));
  state.data.scenes = state.data.scenes.filter((s) => s.workspaceId !== id);
  state.data.workspaces = state.data.workspaces.filter((w) => w.id !== id);
  addTombstone("workspaces", id);
  if (state.data.activeWorkspaceId === id) {
    const next = state.data.workspaces[0];
    state.data.activeWorkspaceId = next.id;
    const firstScene = state.data.scenes.find((s) => s.workspaceId === next.id);
    state.data.activeSceneId = firstScene?.id || "";
  }
  log(`删除工作区: ${workspace.name}`);
  scheduleWebdavQuickSync("工作区变更");
}

// ---- Public composable ----

// ---- Search suggestions ----

const searchSuggestions = computed<SearchSuggestion[]>(() => {
  const keyword = state.search.trim();
  if (!keyword) return [];

  const workspaceId = state.data.activeWorkspaceId;
  const results: SearchSuggestion[] = [];

  for (const scene of state.data.scenes.filter((s) => s.workspaceId === workspaceId)) {
    const body = createSearchText([scene.type, scene.description]);
    const score = scoreSearchText(scene.name, body, keyword);
    if (score > 0) {
      results.push({
        id: `scene-${scene.id}`,
        kind: "scene",
        title: scene.name,
        subtitle: `${scene.type} 场景`,
        sceneId: scene.id,
        score
      });
    }
  }

  for (const collection of currentCollections.value) {
    const scene = sceneForCollection(collection);
    const body = createSearchText([collection.type, collection.description, scene?.name]);
    const score = scoreSearchText(collection.name, body, keyword);
    if (score > 0) {
      results.push({
        id: `collection-${collection.id}`,
        kind: "collection",
        title: collection.name,
        subtitle: `${collection.type} · ${scene?.name || "无场景"}`,
        collectionId: collection.id,
        sceneId: collection.sceneId || undefined,
        score
      });
    }
  }

  for (const item of state.data.items.filter((i) => i.workspaceId === workspaceId)) {
    const body = createSearchText([item.type, item.value, item.tool]);
    const score = scoreSearchText(item.name, body, keyword);
    if (score > 0) {
      const collection = findCollectionById(item.collectionId);
      results.push({
        id: `item-${item.id}`,
        kind: "item",
        title: item.name,
        subtitle: `${item.type} · ${item.value}`,
        collectionId: item.collectionId,
        itemId: item.id,
        isUrl: item.type === "浏览器",
        score
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
});

const runningTaskCount = computed(() => state.tasks.filter((task) => task.status === "running").length);
const latestTask = computed(() => state.tasks[0]);
const webdavPluginInstalled = computed(() => Boolean(state.data.plugins.find((plugin) => plugin.id === "webdav-sync" && plugin.installed && plugin.enabled)));

async function executeSuggestion(suggestion: SearchSuggestion): Promise<boolean> {
  if (suggestion.kind === "scene" && suggestion.sceneId) {
    const scene = state.data.scenes.find((entry) => entry.id === suggestion.sceneId);
    if (!scene) return false;
    if (state.data.settings.search.sceneEnterBehavior === "open") {
      await openScene(scene);
      return true;
    }
    openTab({ id: 'scene-' + suggestion.sceneId, kind: "scene", title: suggestion.title, sceneId: suggestion.sceneId });
  } else if (suggestion.kind === "collection" && suggestion.collectionId) {
    const collection = findCollectionById(suggestion.collectionId);
    if (!collection) return false;
    if (state.data.settings.search.collectionEnterBehavior === "open") {
      await openCollection(collection);
      return true;
    }
    openTab({ id: 'collection-' + suggestion.collectionId, kind: "collection", title: suggestion.title, collectionId: suggestion.collectionId, sceneId: suggestion.sceneId });
  } else if (suggestion.kind === "item" && suggestion.itemId) {
    const item = state.data.items.find((i) => i.id === suggestion.itemId);
    if (!item) return false;
    if (state.data.settings.search.itemEnterBehavior === "open") {
      await openItem(item);
      return true;
    }
      const collection = findCollectionById(item.collectionId);
    if (collection) {
      openTab({ id: 'collection-' + collection.id, kind: "collection", title: collection.name, collectionId: collection.id, sceneId: collection.sceneId || undefined });
    }
  }
  return false;
}

async function executeSuggestionAndMaybeHide(suggestion: SearchSuggestion): Promise<void> {
  const opened = await executeSuggestion(suggestion);
  if (opened && state.data.settings.general.closeWindowAfterOpen) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().hide();
  }
}

// ---- Tab management ----

function applyTabContext(tab: Tab): void {
  if (tab.kind === "settings") {
    if (state.mainView !== "settings") state.mainView = "settings";
    return;
  }

  if (state.mainView !== "workspace") state.mainView = "workspace";

  if (tab.kind === "quickview" && tab.quickViewId) {
    if (state.quickView !== tab.quickViewId) state.quickView = tab.quickViewId;
    if (state.data.activeCollectionId !== "") state.data.activeCollectionId = "";
    return;
  }

  if (tab.collectionId) {
    const collection = findCollectionById(tab.collectionId);
    if (collection) {
      const nextQuickView = collection.sceneId ? "all" : "unbound";
      if (state.data.activeCollectionId !== collection.id) state.data.activeCollectionId = collection.id;
      if (collection.sceneId && state.data.activeSceneId !== collection.sceneId) state.data.activeSceneId = collection.sceneId;
      if (state.quickView !== nextQuickView) state.quickView = nextQuickView;
      return;
    }
  }

  if (tab.sceneId) {
    setActiveScene(tab.sceneId);
  }
}

function openTab(tab: Tab): void {
  const existing = state.tabs.find((t) => t.id === tab.id);
  if (existing) {
    if (existing.kind !== tab.kind || existing.title !== tab.title || existing.sceneId !== tab.sceneId || existing.collectionId !== tab.collectionId || existing.quickViewId !== tab.quickViewId) {
      Object.assign(existing, tab);
    }
    if (state.activeTabId !== existing.id) state.activeTabId = existing.id;
    applyTabContext(existing);
    return;
  }

  state.tabs.push(tab);
  if (state.activeTabId !== tab.id) state.activeTabId = tab.id;
  applyTabContext(tab);
}

function closeTab(tabId: string): void {
  const idx = state.tabs.findIndex((t) => t.id === tabId);
  if (idx === -1 || state.tabs[idx].pinned) return;

  state.tabs.splice(idx, 1);
  if (state.activeTabId !== tabId) return;

  const nextTab = state.tabs.length > 0 ? state.tabs[Math.min(idx, state.tabs.length - 1)] : null;
  if (nextTab) {
    switchTab(nextTab.id);
    return;
  }

  state.activeTabId = "";
  state.mainView = "workspace";
}

function closeOtherTabs(tabId: string): void {
  const target = state.tabs.find((tab) => tab.id === tabId);
  if (!target) return;
  state.tabs = state.tabs.filter((tab) => tab.id === tabId || tab.pinned);
  switchTab(tabId);
}

function closeAllTabs(): void {
  const pinnedTabs = state.tabs.filter((tab) => tab.pinned);
  state.tabs = pinnedTabs;
  if (pinnedTabs.length > 0) {
    switchTab(pinnedTabs[0].id);
    return;
  }
  state.activeTabId = "";
  state.mainView = "workspace";
}

function switchTab(tabId: string): void {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab) return;
  if (state.activeTabId !== tabId) state.activeTabId = tabId;
  applyTabContext(tab);
}

function pinTab(tabId: string): void {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (tab) tab.pinned = !tab.pinned;
}

// ---- WebDAV auto-sync ----

function startWebdavAutoSync(): void {
  stopWebdavAutoSync();
  const config = state.data.settings.webdavSync;
  if (!config.autoSync || config.syncInterval === "关闭") return;
  const intervalMs = syncIntervalToMs(config.syncInterval);
  if (intervalMs <= 0) return;
  webdavAutoSyncTimer = setInterval(async () => {
    try {
      await syncWebdavNow();
    } catch (e) {
      console.error("WebDAV auto-sync failed:", e);
    }
  }, intervalMs);
}

function stopWebdavAutoSync(): void {
  if (webdavAutoSyncTimer) {
    clearInterval(webdavAutoSyncTimer);
    webdavAutoSyncTimer = null;
  }
}

function syncIntervalToMs(interval: string): number {
  switch (interval) {
    case "每 15 分钟": return 15 * 60 * 1000;
    case "每 30 分钟": return 30 * 60 * 1000;
    case "每 1 小时": return 60 * 60 * 1000;
    case "每天": return 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

async function saveWebdavPassword(password: string): Promise<void> {
  await webdavSetCredential(password);
  state.data.settings.webdavSync.credentialRef = password ? "plugin-data:webdav-sync/secret:default" : "";
}

export function useOpenDockStore() {
  return {
    state,
    activeWorkspace,
    activeScene,
    activeCollection,
    activeTheme,
    availableThemes,
    availableToolTypes,
    visibleTools,
    allowedToolTypesForCollection,
    allowedToolTypesForItem,
    availableItemTypes,
    pluginItemTypeConfig,
    pluginItemFields,
    activeScenes,
    visibleCollections,
    collectionItems,
    findCollectionById,
    setActiveScene,
    setActiveCollection,
    createScene,
    createCollection,
    createItem,
    toggleFavorite,
    markCollectionRecent,
    createTool,
    deleteTool,
    setDefaultTool,
    scanOpenTools,
    completeToolSetup,
    updateToggleWindowHotkey,
    openItem,
    openCollection,
    openScene,
    createWorkspace,
    switchWorkspace,
    togglePlugin,
    fetchMarketplaceIndex,
    installFromMarketplace,
    uninstallFromMarketplace,
    runningTaskCount,
    latestTask,
    webdavPluginInstalled,
    toggleTaskPanel,
    clearFinishedTasks,
    testWebdav,
    syncWebdavNow,
    webdavOverwriteLocal,
    webdavOverwriteRemote,
    clearWebdavPendingConflict,
    saveWebdavPassword,
    startWebdavAutoSync,
    stopWebdavAutoSync,
    resetData,
    clearRecent,
    replaceData,
    exportData,
    init,
    log,
    updateScene,
    deleteScene,
    updateCollection,
    deleteCollection,
    updateItem,
    deleteItem,
    updateWorkspace,
    deleteWorkspace,
    openTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    switchTab,
    pinTab,
    searchSuggestions,
    executeSuggestion,
    executeSuggestionAndMaybeHide,
    takeSnapshot,
    updateSnapshot,
    createSnapshotLabel,
    restoreSnapshot,
    removeSnapshot,
    refreshSnapshots,
    startAutoSnapshotTimer,
    stopAutoSnapshotTimer
  };
}
