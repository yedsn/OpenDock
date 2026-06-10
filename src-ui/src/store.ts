import { computed, reactive, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { collectionMeta, itemMeta, sceneMeta } from "./seed";
import { exportAppData, loadAppData, resetAppData, saveAppData } from "./storage";
import { createSnapshot, listSnapshots, loadSnapshot, deleteSnapshot, pruneSnapshots } from "./storage";
import { createSeedData } from "./seed";
import { nowIso, makeId, expandToolArgs, templateToCollectionType, toolTypesByCollection } from "./helpers";
import { builtInThemes } from "./themes";
import type { AppData, Collection, CollectionItem, CollectionMode, CollectionType, ItemType, MainView, ModalState, OpenTool, PluginManifest, QuickViewId, Scene, SnapshotKind, SnapshotRecord, SceneType, Tab, ThemeDefinition, Workspace } from "./types";
import type { SearchSuggestion } from "./types";
import { matchesSearchText, scoreSearchText, createSearchText } from "./pinyin";

// ---- Tauri command bridge ----

interface OpenActionResult { ok: boolean; message: string }

const TOGGLE_WINDOW_SHORTCUT_ACTION = "显示/隐藏窗口";
const DEFAULT_TOGGLE_WINDOW_HOTKEY = "Alt+O";

type DetectedOpenTool = OpenTool;

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
  activeTabId: "" as string
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;
watch(() => state.data, () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveAppData(state.data).catch((e) => console.error("DB save failed:", e));
  }, 300);
}, { deep: true });

/** Load data from SQLite, replacing seed data. Call once at app startup. */
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

  if (state.data.settings.general.openWebInNewWindow === undefined) {
    state.data.settings.general.openWebInNewWindow = true;
  }
  if (state.data.settings.general.closeWindowAfterOpen === undefined) {
    state.data.settings.general.closeWindowAfterOpen = false;
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
  const seedThemePlugins = seed.plugins.filter((plugin) => plugin.theme);
  for (const plugin of seedThemePlugins) {
    if (!state.data.plugins.some((entry) => entry.id === plugin.id)) {
      state.data.plugins.push(plugin);
    }
  }
  for (const entry of seed.pluginStore.filter((item) => item.theme)) {
    if (!state.data.pluginStore.some((item) => item.name === entry.name)) {
      state.data.pluginStore.push(entry);
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

  // Backfill defaults that older data may not have, then boot the snapshot pipeline.
  if (state.data.settings.general.autoSnapshotIntervalMinutes === undefined) {
    state.data.settings.general.autoSnapshotIntervalMinutes = 60;
  }
  if (state.data.settings.general.autoSnapshotKeepCount === undefined) {
    state.data.settings.general.autoSnapshotKeepCount = 7;
  }
  try {
    await refreshSnapshots();
  } catch (e) {
    console.error("Snapshot init failed:", e);
  }
  startAutoSnapshotTimer();
}
// ---- Computed ----

const currentCollections = computed(() =>
  state.data.collections.filter((c) => c.workspaceId === state.data.activeWorkspaceId)
);

const activeScenes = computed(() =>
  state.data.scenes.filter((s) => s.workspaceId === state.data.activeWorkspaceId)
);

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
  return visibleCollections.value.find((c) => c.id === state.data.activeCollectionId);
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

function collectionItems(collectionId: string): CollectionItem[] {
  return state.data.items.filter((i) => i.collectionId === collectionId).sort((a, b) => a.sort - b.sort);
}

// ---- Id helpers ----

function defaultToolForCollection(type: CollectionType): string {
  const allowed = toolTypesByCollection[type] || ["系统"];
  const tool = state.data.tools.find((t) => allowed.includes(t.type) && t.default)
    || state.data.tools.find((t) => allowed.includes(t.type))
    || state.data.tools.find((t) => t.type === "系统")
    || state.data.tools[0];
  return tool?.id || "";
}

function defaultToolForItem(type: ItemType): string {
  const toolTypeByItem: Record<ItemType, string[]> = {
    "目录": ["编辑器", "系统"],
    "URL": ["浏览器", "系统"],
    "命令": ["终端"],
    "Excel": ["Office", "系统"],
    "CAD": ["CAD", "系统"],
    "文件": ["系统", "Office", "CAD", "编辑器"],
    "应用": ["应用", "系统"],
    "插件资源": ["插件", "系统"]
  };
  const allowed = toolTypeByItem[type] || ["系统"];
  const tool = state.data.tools.find((t) => allowed.includes(t.type) && t.default)
    || state.data.tools.find((t) => allowed.includes(t.type))
    || state.data.tools.find((t) => t.type === "系统")
    || state.data.tools[0];
  return tool?.id || "";
}

// ---- CRUD ----

function log(text: string): void {
  state.data.activity.unshift({ id: makeId("activity"), text, createdAt: nowIso() });
  state.data.activity = state.data.activity.slice(0, 80);
}

function setActiveCollection(collection: Collection): void {
  state.data.activeCollectionId = collection.id;
  if (collection.sceneId) state.data.activeSceneId = collection.sceneId;
  state.mainView = "workspace";
}

function setActiveScene(sceneId: string): void {
  state.data.activeSceneId = sceneId;
  state.quickView = "all";
  const first = state.data.collections.find((c) => c.sceneId === sceneId);
  state.data.activeCollectionId = first?.id || "";
  state.mainView = "workspace";
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
}

function createItem(collectionId: string, name: string, type: ItemType, value: string, workingDirectory = "", toolId?: string): void {
  const meta = itemMeta[type];
  const resolvedToolId = toolId || defaultToolForItem(type);
  const tool = state.data.tools.find((entry) => entry.id === resolvedToolId);
  const item: CollectionItem = {
    id: makeId("item"), workspaceId: state.data.activeWorkspaceId, collectionId, name, type, value, workingDirectory,
    toolId: resolvedToolId || undefined, tool: tool?.name || meta.tool, icon: meta.icon, color: meta.color,
    sort: collectionItems(collectionId).length + 1, createdAt: nowIso(), updatedAt: nowIso()
  };
  state.data.items.push(item);
  log(`添加资源: ${name}`);
}

function toggleFavorite(collection: Collection): void {
  collection.favorite = !collection.favorite;
  log(`${collection.favorite ? "收藏" : "取消收藏"}集合: ${collection.name}`);
}

function markCollectionRecent(collection: Collection): void {
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

async function scanOpenTools(): Promise<void> {
  try {
    const detected = await invoke<DetectedOpenTool[]>("scan_open_tools");
    let added = 0;
    let updated = 0;

    for (const tool of detected) {
      const existing = state.data.tools.find((entry) => entry.id === tool.id)
        || state.data.tools.find((entry) => entry.name.toLowerCase() === tool.name.toLowerCase());
      if (existing) {
        existing.name = tool.name;
        existing.type = tool.type;
        existing.path = tool.path;
        existing.args = tool.args;
        if (!state.data.tools.some((entry) => entry.type === tool.type && entry.default && entry.id !== existing.id)) {
          existing.default = existing.default || tool.default;
        }
        updated += 1;
        continue;
      }

      state.data.tools.push({
        ...tool,
        default: !state.data.tools.some((entry) => entry.type === tool.type && entry.default) && tool.default
      });
      added += 1;
    }

    log(`自动扫描打开工具: 新增 ${added} 个，更新 ${updated} 个`);
  } catch (error) {
    log(`自动扫描打开工具失败: ${error instanceof Error ? error.message : String(error)}`);
  }
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
  const argsTemplate = tool.args?.trim() || (item.type === "命令" ? "{command}" : item.type === "URL" ? "{url}" : "{path}");
  const args = expandToolArgs(argsTemplate, values);

  if (item.type === "URL" && state.data.settings.general.openWebInNewWindow && !args.some((arg) => arg === "--new-window" || arg === "-new-window")) {
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
  const collection = state.data.collections.find((c) => c.id === item.collectionId);
  return state.data.tools.find((tool) => tool.id === item.toolId)
    || state.data.tools.find((tool) => tool.id === collection?.defaultToolId)
    || state.data.tools.find((tool) => tool.id === defaultToolForItem(item.type));
}

async function openItemWithTool(item: CollectionItem, tool: OpenTool | undefined): Promise<OpenActionResult> {
  if (!tool || tool.type === "系统" || tool.path === "shell:open" || !tool.path.trim()) {
    if (item.type === "URL") return callOpenCommand("open_url", { url: item.value, newWindow: state.data.settings.general.openWebInNewWindow });
    if (item.type === "命令") return callOpenCommand("run_command", { command: item.value, workingDirectory: item.workingDirectory || null });
    return callOpenCommand("open_path", { path: item.value });
  }

  const args = argsForTool(item, tool);
  return callOpenCommand("open_application", { path: tool.path, args });
}

async function openItem(item: CollectionItem): Promise<void> {
  if (item.type === "命令" && state.data.settings.general.confirmBeforeOpen && !window.confirm(`确认执行命令？\n${item.value}`)) return;
  const tool = resolveToolForItem(item);
  const result = await openItemWithTool(item, tool);
  const collection = state.data.collections.find((c) => c.id === item.collectionId);
  if (collection) markCollectionRecent(collection);
  log(`${result.ok ? "打开" : "打开失败"}: ${item.name}${tool ? ` via ${tool.name}` : ""} - ${result.message}`);
}

async function openCollection(collection: Collection): Promise<void> {
  const items = collectionItems(collection.id);
  if (!items.length) return log(`集合为空: ${collection.name}`);
  if (state.data.settings.general.confirmBeforeOpen && items.length > 1 && !window.confirm(`确认打开集合「${collection.name}」中的 ${items.length} 个资源？`)) return;
  markCollectionRecent(collection);

  const openedInBatch = new Set<string>();
  const urlGroups = new Map<string, { tool: OpenTool; items: CollectionItem[] }>();
  for (const item of items) {
    if (item.type !== "URL") continue;
    const tool = resolveToolForItem(item);
    if (!tool || tool.type !== "浏览器" || tool.path === "shell:open" || !tool.path.trim()) continue;
    const key = JSON.stringify([tool.path, tool.args || ""]);
    const group = urlGroups.get(key) || { tool, items: [] };
    group.items.push(item);
    urlGroups.set(key, group);
  }

  for (const { tool, items: urlItems } of urlGroups.values()) {
    if (urlItems.length <= 1) continue;
    const args = argsForUrlBatch(tool, urlItems.map((item) => item.value));
    const result = await callOpenCommand("open_application", { path: tool.path, args });
    urlItems.forEach((item) => openedInBatch.add(item.id));
    log(`${result.ok ? "打开" : "打开失败"}: ${urlItems.length} 个网页资源 via ${tool.name} - ${result.message}`);
  }

  for (const item of items) {
    if (openedInBatch.has(item.id)) continue;
    await openItem(item);
  }
}

async function openScene(scene: Scene): Promise<void> {
  const collections = state.data.collections.filter((c) => c.sceneId === scene.id);
  const count = collections.reduce((sum, c) => sum + collectionItems(c.id).length, 0);
  if (state.data.settings.general.confirmBeforeOpen && !window.confirm(`确认打开场景「${scene.name}」中的 ${count} 个资源？`)) return;
  for (const collection of collections) await openCollection(collection);
}

// ---- Workspace ----

function createWorkspace(name: string, storage: string, remark: string): void {
  const workspace: Workspace = { id: makeId("workspace"), name, storage, remark, createdAt: nowIso(), updatedAt: nowIso() };
  state.data.workspaces.push(workspace);
  state.data.activeWorkspaceId = workspace.id;
  log(`创建工作区: ${name}`);
}

function switchWorkspace(id: string): void {
  state.data.activeWorkspaceId = id;
  const firstScene = state.data.scenes.find((s) => s.workspaceId === id);
  if (firstScene) state.data.activeSceneId = firstScene.id;
  log(`切换工作区: ${activeWorkspace().name}`);
}

// ---- Plugin ----

function installPlugin(index: number): void {
  const entry = state.data.pluginStore[index];
  if (!entry) return;
  const id = entry.name.toLowerCase().replace(/\s+/g, "-");
  const plugin: PluginManifest = {
    id, name: entry.name, version: "0.1.0", category: entry.category, capability: entry.capability,
    permissions: entry.permissions, installed: true, enabled: false, configurable: entry.configurable || false,
    theme: entry.theme
  };
  state.data.plugins.push(plugin);
  state.data.pluginStore.splice(index, 1);
  if (plugin.configurable) state.settingsCategory = `plugin:${plugin.id}`;
  log(`安装插件: ${plugin.name}`);
}

function togglePlugin(plugin: PluginManifest): void {
  plugin.enabled = !plugin.enabled;
  if (plugin.theme && !plugin.enabled && state.data.settings.appearance.theme === plugin.theme.id) {
    state.data.settings.appearance.theme = builtInThemes[0].id;
  }
  log(`${plugin.enabled ? "启用" : "停用"}插件: ${plugin.name}`);
}

// ---- WebDAV ----

async function testWebdav(): Promise<void> {
  const config = state.data.settings.webdavSync;
  const result = await callOpenCommand("test_webdav_connection", { serverUrl: config.serverUrl, username: config.username });
  config.status = result.ok ? "连接正常" : "连接失败";
  log(`WebDAV Sync 测试连接: ${result.message}`);
}

async function syncWebdavNow(): Promise<void> {
  const result = await callOpenCommand("sync_webdav_now", {});
  const config = state.data.settings.webdavSync;
  config.status = result.ok ? "同步成功" : "同步失败";
  config.lastSyncAt = new Date().toLocaleString("zh-CN", { hour12: false });
  log(`WebDAV Sync 立即同步: ${result.message}`);
}

// ---- Snapshots ----

let autoSnapshotTimer: ReturnType<typeof setInterval> | null = null;

async function takeSnapshot(label: string = "", kind: SnapshotKind = "manual"): Promise<SnapshotRecord> {
  const record = await createSnapshot(state.data, kind, label || formatSnapshotLabel(kind));
  state.snapshots = await listSnapshots();
  return record;
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
}

function deleteScene(id: string): void {
  const scene = state.data.scenes.find((s) => s.id === id);
  if (!scene) return;
  // Detach all collections of this scene to "无场景".
  state.data.collections.forEach((c) => {
    if (c.sceneId === id) { c.sceneId = null; c.unbound = true; }
  });
  state.data.scenes = state.data.scenes.filter((s) => s.id !== id);
  if (state.data.activeSceneId === id) {
    const fallback = state.data.scenes.find((s) => s.workspaceId === state.data.activeWorkspaceId);
    state.data.activeSceneId = fallback?.id || "";
  }
  log(`删除场景: ${scene.name}`);
}

function updateCollection(id: string, patch: Partial<Collection>): void {
  const collection = state.data.collections.find((c) => c.id === id);
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
}

function deleteCollection(id: string): void {
  const collection = state.data.collections.find((c) => c.id === id);
  if (!collection) return;
  // Cascade-delete its items.
  state.data.items = state.data.items.filter((i) => i.collectionId !== id);
  state.data.collections = state.data.collections.filter((c) => c.id !== id);
  if (state.data.activeCollectionId === id) state.data.activeCollectionId = "";
  log(`删除集合: ${collection.name}`);
}

function updateItem(id: string, patch: Partial<CollectionItem>): void {
  const item = state.data.items.find((i) => i.id === id);
  if (!item) return;
  Object.assign(item, patch, { updatedAt: nowIso() });
  if (patch.type !== undefined || patch.toolId !== undefined) {
    const toolId = item.toolId || defaultToolForItem(item.type);
    const tool = state.data.tools.find((entry) => entry.id === toolId);
    item.toolId = toolId || undefined;
    item.tool = tool?.name || itemMeta[item.type].tool;
  }
  log(`编辑资源: ${item.name}`);
}

function deleteItem(id: string): void {
  const item = state.data.items.find((i) => i.id === id);
  if (!item) return;
  state.data.items = state.data.items.filter((i) => i.id !== id);
  log(`删除资源: ${item.name}`);
}

function updateWorkspace(id: string, patch: Partial<Workspace>): void {
  const workspace = state.data.workspaces.find((w) => w.id === id);
  if (!workspace) return;
  Object.assign(workspace, patch, { updatedAt: nowIso() });
  log(`编辑工作区: ${workspace.name}`);
}

function deleteWorkspace(id: string): void {
  if (state.data.workspaces.length <= 1) {
    log("至少保留一个工作区");
    return;
  }
  const workspace = state.data.workspaces.find((w) => w.id === id);
  if (!workspace) return;
  // Cascade: drop scenes / collections / items that belong to this workspace.
  state.data.items = state.data.items.filter((i) => i.workspaceId !== id);
  state.data.collections = state.data.collections.filter((c) => c.workspaceId !== id);
  state.data.scenes = state.data.scenes.filter((s) => s.workspaceId !== id);
  state.data.workspaces = state.data.workspaces.filter((w) => w.id !== id);
  if (state.data.activeWorkspaceId === id) {
    const next = state.data.workspaces[0];
    state.data.activeWorkspaceId = next.id;
    const firstScene = state.data.scenes.find((s) => s.workspaceId === next.id);
    state.data.activeSceneId = firstScene?.id || "";
  }
  log(`删除工作区: ${workspace.name}`);
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
      const collection = state.data.collections.find((c) => c.id === item.collectionId);
      results.push({
        id: `item-${item.id}`,
        kind: "item",
        title: item.name,
        subtitle: `${item.type} · ${item.value}`,
        collectionId: item.collectionId,
        itemId: item.id,
        isUrl: item.type === "URL",
        score
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
});

async function executeSuggestion(suggestion: SearchSuggestion): Promise<void> {
  if (suggestion.kind === "scene" && suggestion.sceneId) {
    const scene = state.data.scenes.find((entry) => entry.id === suggestion.sceneId);
    if (!scene) return;
    if (state.data.settings.search.sceneEnterBehavior === "open") {
      await openScene(scene);
      return;
    }
    openTab({ id: 'scene-' + suggestion.sceneId, kind: "scene", title: suggestion.title, sceneId: suggestion.sceneId });
  } else if (suggestion.kind === "collection" && suggestion.collectionId) {
    const collection = state.data.collections.find((entry) => entry.id === suggestion.collectionId);
    if (!collection) return;
    if (state.data.settings.search.collectionEnterBehavior === "open") {
      await openCollection(collection);
      return;
    }
    openTab({ id: 'collection-' + suggestion.collectionId, kind: "collection", title: suggestion.title, collectionId: suggestion.collectionId, sceneId: suggestion.sceneId });
  } else if (suggestion.kind === "item" && suggestion.itemId) {
    const item = state.data.items.find((i) => i.id === suggestion.itemId);
    if (!item) return;
    if (state.data.settings.search.itemEnterBehavior === "open") {
      await openItem(item);
      return;
    }
    const collection = state.data.collections.find((entry) => entry.id === item.collectionId);
    if (collection) {
      openTab({ id: 'collection-' + collection.id, kind: "collection", title: collection.name, collectionId: collection.id, sceneId: collection.sceneId || undefined });
    }
  }
}

async function executeSuggestionAndMaybeHide(suggestion: SearchSuggestion): Promise<void> {
  await executeSuggestion(suggestion);
  if (suggestion.isUrl && state.data.settings.general.closeWindowAfterOpen) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().hide();
  }
}

// ---- Tab management ----

function applyTabContext(tab: Tab): void {
  if (tab.kind === "settings") {
    state.mainView = "settings";
    return;
  }

  state.mainView = "workspace";

  if (tab.kind === "quickview" && tab.quickViewId) {
    state.quickView = tab.quickViewId;
    state.data.activeCollectionId = "";
    return;
  }

  if (tab.collectionId) {
    const collection = state.data.collections.find((c) => c.id === tab.collectionId);
    if (collection) {
      state.data.activeCollectionId = collection.id;
      if (collection.sceneId) state.data.activeSceneId = collection.sceneId;
      state.quickView = collection.sceneId ? "all" : "unbound";
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
    Object.assign(existing, tab);
    state.activeTabId = existing.id;
    applyTabContext(existing);
    return;
  }

  state.tabs.push(tab);
  state.activeTabId = tab.id;
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
  state.activeTabId = tabId;
  applyTabContext(tab);
}

function pinTab(tabId: string): void {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (tab) tab.pinned = !tab.pinned;
}

export function useOpenDockStore() {
  return {
    state,
    activeWorkspace,
    activeScene,
    activeCollection,
    activeTheme,
    availableThemes,
    activeScenes,
    visibleCollections,
    collectionItems,
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
    updateToggleWindowHotkey,
    openItem,
    openCollection,
    openScene,
    createWorkspace,
    switchWorkspace,
    installPlugin,
    togglePlugin,
    testWebdav,
    syncWebdavNow,
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
    restoreSnapshot,
    removeSnapshot,
    refreshSnapshots,
    startAutoSnapshotTimer,
    stopAutoSnapshotTimer
  };
}
