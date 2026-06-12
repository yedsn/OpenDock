import { describe, it, expect, beforeEach, vi } from "vitest";

const invokeMock = vi.fn(async (..._args: unknown[]): Promise<unknown> => ({ ok: true, message: "stub" }));
const hideWindowMock = vi.fn(async (): Promise<void> => {});

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ hide: hideWindowMock })
}));

const storage: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => { storage[k] = v; },
    removeItem: (k: string) => { delete storage[k]; }
  },
  confirm: () => true
};

const PROJECT = "\u9879\u76ee";
const OFFICE = "\u529e\u516c";
const LOCAL = "\u672c\u5730";
const DIRECTORY_COLLECTION = "\u76ee\u5f55\u96c6\u5408";
const WEB_COLLECTION = "\u7f51\u9875\u96c6\u5408";
const COMMAND_COLLECTION = "\u547d\u4ee4\u96c6\u5408";
const DIRECTORY_ITEM = "\u76ee\u5f55";
const CODE = "\u4ee3\u7801";
const CODE_DIRECTORY = "\u4ee3\u7801\u76ee\u5f55";
const COMMON_COMMANDS = "\u5e38\u7528\u547d\u4ee4";
const LOCAL_WEB = "\u672c\u5730\u7f51\u9875";

beforeEach(() => {
  for (const k of Object.keys(storage)) delete storage[k];
  invokeMock.mockClear();
  hideWindowMock.mockClear();
  vi.resetModules();
});

describe("OpenDock store - CRUD operations", () => {
  it("creates and persists a scene", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const before = store.activeScenes.value.length;
    store.createScene("Test Scene", PROJECT, "\u6d4b\u8bd5\u573a\u666f");
    expect(store.activeScenes.value.length).toBe(before + 1);
    const created = store.activeScenes.value.find((s) => s.name === "Test Scene");
    expect(created).toBeDefined();
    expect(created!.type).toBe(PROJECT);
  });

  it("creates default collections when creating a project scene", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const templateCount = store.state.data.settings.templates.length;
    store.createScene("My Project", PROJECT);
    const created = store.activeScenes.value.find((s) => s.name === "My Project")!;
    const collsForScene = store.state.data.collections.filter((c) => c.sceneId === created.id);
    expect(collsForScene.length).toBe(templateCount);
  });

  it("does NOT create default collections for non-project scenes", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.createScene("My Office", OFFICE);
    const created = store.activeScenes.value.find((s) => s.name === "My Office")!;
    const collsForScene = store.state.data.collections.filter((c) => c.sceneId === created.id);
    expect(collsForScene.length).toBe(0);
  });

  it("updates a scene", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const scene = store.activeScenes.value[0];
    store.updateScene(scene.id, { name: "Renamed Scene", description: "updated desc" });
    const updated = store.state.data.scenes.find((s) => s.id === scene.id)!;
    expect(updated.name).toBe("Renamed Scene");
    expect(updated.description).toBe("updated desc");
  });

  it("deletes a scene and detaches its collections", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const scene = store.activeScenes.value[0];
    const beforeColls = store.state.data.collections.length;
    const sceneCollIds = store.state.data.collections.filter((c) => c.sceneId === scene.id).map((c) => c.id);
    store.deleteScene(scene.id);
    expect(store.state.data.scenes.find((s) => s.id === scene.id)).toBeUndefined();
    expect(store.state.data.collections.length).toBe(beforeColls);
    sceneCollIds.forEach((cid) => {
      const c = store.state.data.collections.find((x) => x.id === cid)!;
      expect(c.sceneId).toBeNull();
      expect(c.unbound).toBe(true);
    });
  });

  it("creates, updates, and deletes a collection with cascading items", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.createCollection("Test Coll", WEB_COLLECTION, null, "");
    const coll = store.state.data.collections.find((c) => c.name === "Test Coll")!;
    store.createItem(coll.id, "Item A", "URL", "https://a");
    store.createItem(coll.id, "Item B", "URL", "https://b");
    expect(store.collectionItems(coll.id).length).toBe(2);

    store.updateCollection(coll.id, { name: "Renamed", description: "new desc" });
    const updated = store.state.data.collections.find((c) => c.id === coll.id)!;
    expect(updated.name).toBe("Renamed");
    expect(updated.description).toBe("new desc");

    store.deleteCollection(coll.id);
    expect(store.state.data.collections.find((c) => c.id === coll.id)).toBeUndefined();
    expect(store.collectionItems(coll.id).length).toBe(0);
  });

  it("creates and deletes individual collection items", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.createCollection("Coll1", DIRECTORY_COLLECTION, null);
    const coll = store.state.data.collections.find((c) => c.name === "Coll1")!;
    store.createItem(coll.id, "Item1", DIRECTORY_ITEM, "C:/test");
    const item = store.state.data.items.find((i) => i.name === "Item1")!;
    store.updateItem(item.id, { name: "Item1-Renamed", value: "C:/new-path" });
    const updated = store.state.data.items.find((i) => i.id === item.id)!;
    expect(updated.name).toBe("Item1-Renamed");
    expect(updated.value).toBe("C:/new-path");
    store.deleteItem(item.id);
    expect(store.state.data.items.find((i) => i.id === item.id)).toBeUndefined();
  });

  it("creates, updates, deletes a workspace", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const before = store.state.data.workspaces.length;
    store.createWorkspace("New WS", LOCAL, "remark");
    expect(store.state.data.workspaces.length).toBe(before + 1);
    const ws = store.state.data.workspaces.find((w) => w.name === "New WS")!;
    store.updateWorkspace(ws.id, { name: "Renamed WS", remark: "new" });
    expect(store.state.data.workspaces.find((w) => w.id === ws.id)!.name).toBe("Renamed WS");
    store.deleteWorkspace(ws.id);
    expect(store.state.data.workspaces.find((w) => w.id === ws.id)).toBeUndefined();
  });

  it("refuses to delete the last remaining workspace", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const all = [...store.state.data.workspaces];
    for (let i = 1; i < all.length; i++) store.deleteWorkspace(all[i].id);
    expect(store.state.data.workspaces.length).toBe(1);
    const last = store.state.data.workspaces[0];
    store.deleteWorkspace(last.id);
    expect(store.state.data.workspaces.length).toBe(1);
  });

  it("toggles favorite on a collection", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const coll = store.state.data.collections[0];
    const initial = coll.favorite;
    store.toggleFavorite(coll);
    expect(coll.favorite).toBe(!initial);
    store.toggleFavorite(coll);
    expect(coll.favorite).toBe(initial);
  });

  it("filters collections by scene and quick view", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.state.quickView = "favorites";
    const visible = store.visibleCollections.value;
    visible.forEach((c) => {
      const sceneFav = store.state.data.scenes.find((s) => s.id === c.sceneId)?.favorite;
      expect(c.favorite || sceneFav).toBeTruthy();
    });
  });

  it("filters collections by keyword search", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.state.quickView = "all";
    store.state.search = CODE;
    const visible = store.visibleCollections.value;
    visible.forEach((c) => {
      const scene = store.state.data.scenes.find((s) => s.id === c.sceneId);
      const itemMatch = store.collectionItems(c.id).some((i) => `${i.name}${i.value}`.includes(CODE));
      expect(`${c.name}${c.description}${scene?.name || ""}`.includes(CODE) || itemMatch).toBeTruthy();
    });
  });

  it("switches workspace and updates active scene", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const original = store.state.data.activeWorkspaceId;
    const other = store.state.data.workspaces.find((w) => w.id !== original);
    if (other) {
      store.switchWorkspace(other.id);
      expect(store.state.data.activeWorkspaceId).toBe(other.id);
    }
  });

  it("exports without WebDAV credentials", async () => {
    const { useOpenDockStore } = await import("../store");
    const { exportAppData } = await import("../storage");
    const store = useOpenDockStore();
    store.state.data.settings.webdavSync.credentialRef = "plugin-data:webdav-sync/secret:default";
    const parsed = JSON.parse(exportAppData(store.state.data));
    expect(parsed.settings.webdavSync.credentialRef).toBe("");
  });

  it("normalizes invalid appearance settings during init", async () => {
    const { createSeedData } = await import("../seed");
    const data = createSeedData();
    data.settings.appearance.theme = "Unknown";
    data.settings.appearance.density = "Loose";
    data.settings.appearance.sidebarWidth = 999;
    data.settings.appearance.baseFontSize = 99;
    delete (data.settings.appearance as Partial<typeof data.settings.appearance>).interfaceFontFamily;
    delete (data.settings.appearance as Partial<typeof data.settings.appearance>).monospaceFontFamily;
    const tableRows: Record<string, unknown[]> = {
      workspaces: data.workspaces,
      scenes: data.scenes,
      collections: data.collections,
      items: data.items,
      tools: data.tools,
      plugins: data.plugins,
      plugin_store: data.pluginStore,
      activity: data.activity
    };
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      const payload = args[1] as { key?: string; table?: string } | undefined;
      if (command === "db_get_value") {
        if (payload?.key === "schemaVersion") return String(data.schemaVersion);
        if (payload?.key === "activeWorkspaceId") return data.activeWorkspaceId;
        if (payload?.key === "activeSceneId") return data.activeSceneId;
        if (payload?.key === "activeCollectionId") return data.activeCollectionId;
        if (payload?.key === "settings") return JSON.stringify(data.settings);
        return null;
      }
      if (command === "db_list_table") return (tableRows[payload?.table || ""] || []).map((row) => JSON.stringify(row));
      return { ok: true, message: "stub" };
    });
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    await store.init();

    expect(store.state.data.settings.appearance.theme).toBe("obsidian-dark");
    expect(store.state.data.settings.appearance.density).toBe("紧凑");
    expect(store.state.data.settings.appearance.sidebarWidth).toBe(420);
    expect(store.state.data.settings.appearance.interfaceFontFamily).toBe("Segoe UI, Microsoft YaHei, system-ui, sans-serif");
    expect(store.state.data.settings.appearance.monospaceFontFamily).toBe("Cascadia Code, Consolas, monospace");
    expect(store.state.data.settings.appearance.baseFontSize).toBe(16);
  });

  it("exposes built-in light themes and enabled plugin themes", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    expect(store.availableThemes().some((theme) => theme.id === "paper-light" && theme.kind === "light")).toBe(true);
    expect(store.availableThemes().some((theme) => theme.id === "plugin-forest-mist" && theme.source === "plugin")).toBe(true);

    store.state.data.settings.appearance.theme = "plugin-forest-mist";
    const plugin = store.state.data.plugins.find((item) => item.id === "theme-forest-mist")!;
    store.togglePlugin(plugin);

    expect(plugin.enabled).toBe(false);
    expect(store.state.data.settings.appearance.theme).toBe("obsidian-dark");

    const storeThemeIndex = store.state.data.pluginStore.findIndex((entry) => entry.theme?.id === "plugin-ink-blue");
    expect(storeThemeIndex).toBeGreaterThanOrEqual(0);
    store.installPlugin(storeThemeIndex);
    const installedThemePlugin = store.state.data.plugins.find((entry) => entry.theme?.id === "plugin-ink-blue")!;
    expect(installedThemePlugin.enabled).toBe(true);
    expect(store.availableThemes().some((theme) => theme.id === "plugin-ink-blue" && theme.pluginId === installedThemePlugin.id)).toBe(true);
    store.state.data.settings.appearance.theme = "plugin-ink-blue";
    expect(store.activeTheme().id).toBe("plugin-ink-blue");
  });

  it("falls back from plugin settings when a configurable plugin is disabled or deleted", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const plugin = store.state.data.plugins.find((entry) => entry.id === "webdav-sync")!;

    store.state.settingsCategory = "plugin:webdav-sync";
    store.togglePlugin(plugin);
    expect(plugin.enabled).toBe(false);
    expect(store.state.settingsCategory).toBe("plugins");

    store.state.settingsCategory = "plugin:webdav-sync";
    store.deletePlugin(plugin);
    expect(store.state.data.plugins.some((entry) => entry.id === "webdav-sync")).toBe(false);
    expect(store.state.data.pluginStore.some((entry) => entry.name === "WebDAV Sync" && entry.configurable)).toBe(true);
    expect(store.state.settingsCategory).toBe("plugins");
  });

  it("loads built-in theme plugins from the dynamic system registry", async () => {
    const { builtInPluginManifests, builtInPluginStoreEntries } = await import("../../../plugins/registry");

    expect(builtInPluginManifests.some((plugin) => plugin.id === "theme-forest-mist" && plugin.theme?.id === "plugin-forest-mist")).toBe(true);
    expect(builtInPluginStoreEntries.some((entry) => entry.name === "Ink Blue Theme" && entry.theme?.pluginId === "theme-ink-blue")).toBe(true);
  });

  it("backfills newly discovered plugin store entries during init", async () => {
    const { createSeedData } = await import("../seed");
    const data = createSeedData();
    data.pluginStore = data.pluginStore.filter((entry) => entry.name !== "External Demo");
    const tableRows: Record<string, unknown[]> = {
      workspaces: data.workspaces,
      scenes: data.scenes,
      collections: data.collections,
      items: data.items,
      tools: data.tools,
      plugins: data.plugins,
      plugin_store: data.pluginStore,
      activity: data.activity
    };
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      const payload = args[1] as { key?: string; table?: string } | undefined;
      if (command === "db_get_value") {
        if (payload?.key === "schemaVersion") return String(data.schemaVersion);
        if (payload?.key === "activeWorkspaceId") return data.activeWorkspaceId;
        if (payload?.key === "activeSceneId") return data.activeSceneId;
        if (payload?.key === "activeCollectionId") return data.activeCollectionId;
        if (payload?.key === "settings") return JSON.stringify(data.settings);
        return null;
      }
      if (command === "db_list_table") return (tableRows[payload?.table || ""] || []).map((row) => JSON.stringify(row));
      return { ok: true, message: "stub" };
    });
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    await store.init();

    expect(store.state.data.pluginStore.some((entry) => entry.name === "External Demo")).toBe(true);
  });

  it("refreshes existing plugin store entry capabilities during init", async () => {
    const { createSeedData } = await import("../seed");
    const data = createSeedData();
    const toolTypeDemo = data.pluginStore.find((entry) => entry.name === "Tool Type Demo")!;
    toolTypeDemo.itemTypes = undefined;
    toolTypeDemo.toolTypes = undefined;
    const tableRows: Record<string, unknown[]> = {
      workspaces: data.workspaces,
      scenes: data.scenes,
      collections: data.collections,
      items: data.items,
      tools: data.tools,
      plugins: data.plugins,
      plugin_store: data.pluginStore,
      activity: data.activity
    };
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      const payload = args[1] as { key?: string; table?: string } | undefined;
      if (command === "db_get_value") {
        if (payload?.key === "schemaVersion") return String(data.schemaVersion);
        if (payload?.key === "activeWorkspaceId") return data.activeWorkspaceId;
        if (payload?.key === "activeSceneId") return data.activeSceneId;
        if (payload?.key === "activeCollectionId") return data.activeCollectionId;
        if (payload?.key === "settings") return JSON.stringify(data.settings);
        return null;
      }
      if (command === "db_list_table") return (tableRows[payload?.table || ""] || []).map((row) => JSON.stringify(row));
      return { ok: true, message: "stub" };
    });
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    await store.init();

    const refreshed = store.state.data.pluginStore.find((entry) => entry.name === "Tool Type Demo")!;
    expect(refreshed.toolTypes?.length).toBeGreaterThan(0);
    expect(refreshed.itemTypes?.some((entry) => entry.type === "Diagram Spec")).toBe(true);
  });

  it("discovers and installs the external demo plugin", async () => {
    const { externalPluginStoreEntries, getPluginUi } = await import("../../../plugins/registry");
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    expect(externalPluginStoreEntries.some((entry) => entry.name === "External Demo" && entry.configurable)).toBe(true);
    expect(getPluginUi("external-demo")?.settingsPanel).toBeDefined();

    const index = store.state.data.pluginStore.findIndex((entry) => entry.name === "External Demo");
    expect(index).toBeGreaterThanOrEqual(0);
    store.installPlugin(index);

    const plugin = store.state.data.plugins.find((entry) => entry.id === "external-demo")!;
    expect(plugin.enabled).toBe(true);
    expect(plugin.configurable).toBe(true);
    expect(store.state.settingsCategory).toBe("plugin:external-demo");
  });

  it("discovers a dedicated tool type demo plugin", async () => {
    const { externalPluginStoreEntries, getPluginUi } = await import("../../../plugins/registry");
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    expect(externalPluginStoreEntries.some((entry) => entry.name === "Tool Type Demo" && entry.toolTypes?.some((toolType) => typeof toolType !== "string" && toolType.type === "Diagram Tool"))).toBe(true);
    expect(getPluginUi("tool-type-demo")?.settingsPanel).toBeDefined();

    const index = store.state.data.pluginStore.findIndex((entry) => entry.name === "Tool Type Demo");
    expect(index).toBeGreaterThanOrEqual(0);
    store.installPlugin(index);
    const plugin = store.state.data.plugins.find((entry) => entry.id === "tool-type-demo")!;

    expect(plugin.enabled).toBe(true);
    expect(store.availableToolTypes()).toContain("Diagram Tool");
    expect(store.allowedToolTypesForCollection("文件集合")).toContain("Diagram Tool");
    expect(store.allowedToolTypesForItem("文件")).toContain("Diagram Tool");
    expect(store.availableItemTypes()).toContain("Diagram Spec");
    expect(store.pluginItemFields("Diagram Spec").map((field) => field.key)).toEqual(["renderer", "layout"]);

    store.togglePlugin(plugin);
    expect(store.availableToolTypes()).not.toContain("Diagram Tool");
    expect(store.availableItemTypes()).not.toContain("Diagram Spec");
  });
});

describe("OpenDock helpers", () => {
  it("expandToolArgs interpolates and tokenizes", async () => {
    const { expandToolArgs } = await import("../helpers");
    const result = expandToolArgs('--path "{path}" --extra "hello world"', { path: "C:/foo bar" });
    expect(result).toEqual(["--path", "C:/foo bar", "--extra", "hello world"]);
  });

  it("templateToCollectionType maps templates by keyword", async () => {
    const { templateToCollectionType } = await import("../helpers");
    expect(templateToCollectionType(CODE_DIRECTORY)).toBe(DIRECTORY_COLLECTION);
    expect(templateToCollectionType(COMMON_COMMANDS)).toBe(COMMAND_COLLECTION);
    expect(templateToCollectionType(LOCAL_WEB)).toBe(WEB_COLLECTION);
  });
});

describe("OpenDock store - open tool configuration", () => {
  it("scans and merges detected open tools", async () => {
    invokeMock.mockImplementationOnce(async (...args: unknown[]) => {
      const command = args[0] as string;
      if (command === "scan_open_tools") {
        return [{ id: "chrome", name: "Chrome", type: "浏览器", path: "C:/Detected/chrome.exe", args: "--new-window {url}", default: true }];
      }
      return { ok: true, message: "stub" };
    });
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    await store.scanOpenTools();

    const chrome = store.state.data.tools.find((entry) => entry.id === "chrome")!;
    expect(chrome.path).toBe("C:/Detected/chrome.exe");
    expect(chrome.args).toBe("--new-window {url}");
    expect(store.state.data.tools.filter((entry) => entry.id === "chrome")).toHaveLength(1);
  });

  it("opens URL items through the configured default browser tool", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const collection = store.state.data.collections.find((c) => c.type === WEB_COLLECTION)!;
    const tool = store.state.data.tools.find((entry) => entry.type === "浏览器")!;
    tool.path = "C:/Browser/browser.exe";
    tool.args = "--new-window {url}";
    tool.default = true;
    store.createItem(collection.id, "Tool URL", "URL", "https://example.com");
    const item = store.state.data.items.find((entry) => entry.name === "Tool URL")!;

    await store.openItem(item);

    expect(invokeMock).toHaveBeenCalledWith("open_application", {
      path: "C:/Browser/browser.exe",
      args: ["--new-window", "https://example.com"]
    });
  });

  it("can open URL items in the current browser window when configured", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.state.data.settings.general.openWebInNewWindow = false;
    const collection = store.state.data.collections.find((c) => c.type === WEB_COLLECTION)!;
    const tool = store.state.data.tools.find((entry) => entry.type === "浏览器")!;
    tool.path = "C:/Browser/browser.exe";
    tool.args = "{url}";
    tool.default = true;
    store.createItem(collection.id, "Same Window URL", "URL", "https://example.com");
    const item = store.state.data.items.find((entry) => entry.name === "Same Window URL")!;

    await store.openItem(item);

    expect(invokeMock).toHaveBeenCalledWith("open_application", {
      path: "C:/Browser/browser.exe",
      args: ["https://example.com"]
    });
  });

  it("opens multiple URL items from one collection in a single browser window", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.state.data.settings.general.confirmBeforeOpen = false;
    store.createCollection("Batch Web Collection", WEB_COLLECTION, null, "");
    const collection = store.state.data.collections.find((c) => c.name === "Batch Web Collection")!;
    collection.defaultToolId = "chrome";
    const tool = store.state.data.tools.find((entry) => entry.id === "chrome")!;
    tool.path = "C:/Browser/browser.exe";
    tool.args = "{url}";
    tool.default = true;
    store.createItem(collection.id, "Batch URL A", "URL", "https://a.example.com");
    store.createItem(collection.id, "Batch URL B", "URL", "https://b.example.com");

    await store.openCollection(collection);

    const browserCalls = invokeMock.mock.calls.filter(([command]) => command === "open_application");
    expect(browserCalls).toHaveLength(1);
    expect(browserCalls[0]).toEqual(["open_application", {
      path: "C:/Browser/browser.exe",
      args: ["--new-window", "https://a.example.com", "https://b.example.com"]
    }]);
  });

  it("deletes a tool and clears item references while preserving a default for that type", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.createTool("Alt Browser", "浏览器", "C:/alt.exe", "{url}");
    const tool = store.state.data.tools.find((entry) => entry.name === "Alt Browser")!;
    const collection = store.state.data.collections.find((c) => c.type === WEB_COLLECTION)!;
    store.createItem(collection.id, "With Tool", "URL", "https://example.com", "", tool.id);
    const item = store.state.data.items.find((entry) => entry.name === "With Tool")!;

    store.deleteTool(tool.id);

    expect(store.state.data.tools.find((entry) => entry.id === tool.id)).toBeUndefined();
    expect(item.toolId).toBeUndefined();
    expect(store.state.data.tools.some((entry) => entry.type === "浏览器" && entry.default)).toBe(true);
  });

  it("only exposes plugin-contributed tool types when the plugin is enabled", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const cadPlugin = store.state.data.plugins.find((entry) => entry.id === "cad")!;

    expect(cadPlugin.enabled).toBe(false);
    expect(store.availableToolTypes()).not.toContain("CAD");
    expect(store.visibleTools().some((tool) => tool.type === "CAD")).toBe(false);
    expect(store.allowedToolTypesForCollection("CAD 集合")).not.toContain("CAD");
    expect(store.allowedToolTypesForItem("CAD")).not.toContain("CAD");

    store.togglePlugin(cadPlugin);

    expect(store.availableToolTypes()).toContain("CAD");
    expect(store.allowedToolTypesForCollection("CAD 集合")).toContain("CAD");
    expect(store.allowedToolTypesForItem("CAD")).toContain("CAD");
    expect(store.visibleTools().some((tool) => tool.type === "CAD" && tool.name === "AutoCAD")).toBe(true);
  });

  it("lets plugins contribute future custom open tool types", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.state.data.plugins.push({
      id: "design-plugin",
      name: "Design Plugin",
      version: "0.1.0",
      category: "专业文件",
      capability: "提供设计类打开工具类型",
      permissions: ["workspace:read", "opener:design"],
      installed: true,
      enabled: false,
      configurable: false,
      toolTypes: [{ type: "Design", collectionTypes: ["网页集合"], itemTypes: ["URL"] }]
    });
    store.createTool("Figma Desktop", "Design", "C:/Figma/Figma.exe", "{path}");

    expect(store.availableToolTypes()).not.toContain("Design");
    expect(store.allowedToolTypesForCollection("网页集合")).not.toContain("Design");
    expect(store.allowedToolTypesForItem("URL")).not.toContain("Design");
    expect(store.visibleTools().some((tool) => tool.type === "Design")).toBe(false);

    const plugin = store.state.data.plugins.find((entry) => entry.id === "design-plugin")!;
    store.togglePlugin(plugin);

    expect(store.availableToolTypes()).toContain("Design");
    expect(store.allowedToolTypesForCollection("网页集合")).toContain("Design");
    expect(store.allowedToolTypesForItem("URL")).toContain("Design");
    expect(store.visibleTools().some((tool) => tool.type === "Design" && tool.name === "Figma Desktop")).toBe(true);
  });

  it("opens plugin-defined item types through the plugin handler", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const index = store.state.data.pluginStore.findIndex((entry) => entry.name === "Tool Type Demo");
    store.installPlugin(index);
    const collection = store.state.data.collections.find((entry) => entry.type === "文件集合") || store.state.data.collections[0];
    store.createItem(collection.id, "Order Flow", "Diagram Spec", "diagram://order-flow", "", undefined, {
      renderer: "mermaid",
      layout: "left-to-right"
    });
    const item = store.state.data.items.find((entry) => entry.name === "Order Flow")!;
    invokeMock.mockClear();

    await store.openItem(item);

    expect(invokeMock).toHaveBeenCalledWith("run_command", {
      command: expect.stringContaining("mermaid"),
      workingDirectory: null
    });
    expect(invokeMock).toHaveBeenCalledWith("run_command", expect.objectContaining({
      command: expect.stringContaining("left-to-right")
    }));
  });
});

describe("OpenDock store - search suggestions", () => {
  it("matches scenes, collections, and URL items by pinyin initials", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    store.createScene("客户门户", PROJECT, "演示场景");
    const scene = store.state.data.scenes.find((entry) => entry.name === "客户门户")!;
    store.createCollection("客户门户网页", WEB_COLLECTION, scene.id, "站点入口");
    const collection = store.state.data.collections.find((entry) => entry.name === "客户门户网页")!;
    store.createItem(collection.id, "测试链接", "URL", "https://example.test");

    store.state.search = "khmh";
    expect(store.searchSuggestions.value.some((entry) => entry.kind === "scene" && entry.title === "客户门户")).toBe(true);
    expect(store.searchSuggestions.value.some((entry) => entry.kind === "collection" && entry.title === "客户门户网页")).toBe(true);

    store.state.search = "cslj";
    expect(store.searchSuggestions.value.some((entry) => entry.kind === "item" && entry.title === "测试链接" && entry.isUrl)).toBe(true);

    store.state.search = "kehumenhu";
    expect(store.searchSuggestions.value.some((entry) => entry.title === "客户门户")).toBe(true);
  });

  it("opens collection suggestions by default and can hide after opening URL suggestions", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    store.state.data.settings.general.confirmBeforeOpen = false;
    const browser = store.state.data.tools.find((entry) => entry.type === "浏览器")!;
    browser.path = "C:/Browser/browser.exe";
    browser.args = "{url}";
    browser.default = true;

    store.createScene("客户门户", OFFICE);
    const scene = store.state.data.scenes.find((entry) => entry.name === "客户门户")!;
    store.createCollection("客户门户网页", WEB_COLLECTION, scene.id, "站点入口");
    const collection = store.state.data.collections.find((entry) => entry.name === "客户门户网页")!;
    store.createItem(collection.id, "测试链接", "URL", "https://example.test/a");
    store.createItem(collection.id, "后台链接", "URL", "https://example.test/b");
    invokeMock.mockClear();

    store.state.search = "khmh";
    const collectionSuggestion = store.searchSuggestions.value.find((entry) => entry.kind === "collection" && entry.title === "客户门户网页")!;
    await store.executeSuggestionAndMaybeHide(collectionSuggestion);
    expect(invokeMock).toHaveBeenCalledWith("open_application", {
      path: "C:/Browser/browser.exe",
      args: ["--new-window", "https://example.test/a", "https://example.test/b"]
    });

    store.state.search = "cslj";
    const urlSuggestion = store.searchSuggestions.value.find((entry) => entry.kind === "item" && entry.title === "测试链接")!;
    await store.executeSuggestionAndMaybeHide(urlSuggestion);
    expect(hideWindowMock).not.toHaveBeenCalled();

    store.state.data.settings.general.closeWindowAfterOpen = true;
    await store.executeSuggestionAndMaybeHide(urlSuggestion);
    expect(hideWindowMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("open_application", expect.objectContaining({
      args: expect.arrayContaining(["https://example.test/a"])
    }));
  });

  it("can use search Enter to navigate to scene and collection tabs when configured", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    store.state.data.settings.search.sceneEnterBehavior = "navigate";
    store.state.data.settings.search.collectionEnterBehavior = "navigate";
    store.createScene("客户门户", OFFICE);
    const scene = store.state.data.scenes.find((entry) => entry.name === "客户门户")!;
    store.createCollection("客户门户网页", WEB_COLLECTION, scene.id, "站点入口");
    const collection = store.state.data.collections.find((entry) => entry.name === "客户门户网页")!;
    invokeMock.mockClear();

    store.state.search = "khmh";
    const sceneSuggestion = store.searchSuggestions.value.find((entry) => entry.kind === "scene" && entry.title === "客户门户")!;
    await store.executeSuggestionAndMaybeHide(sceneSuggestion);
    expect(store.state.activeTabId).toBe(`scene-${scene.id}`);

    const collectionSuggestion = store.searchSuggestions.value.find((entry) => entry.kind === "collection" && entry.title === "客户门户网页")!;
    await store.executeSuggestionAndMaybeHide(collectionSuggestion);
    expect(store.state.activeTabId).toBe(`collection-${collection.id}`);
    expect(invokeMock).not.toHaveBeenCalledWith("open_application", expect.anything());
  });

  it("can use search Enter to navigate from an item result to its collection", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    store.state.data.settings.search.itemEnterBehavior = "navigate";
    store.createScene("客户门户", OFFICE);
    const scene = store.state.data.scenes.find((entry) => entry.name === "客户门户")!;
    store.createCollection("客户门户网页", WEB_COLLECTION, scene.id, "站点入口");
    const collection = store.state.data.collections.find((entry) => entry.name === "客户门户网页")!;
    store.createItem(collection.id, "测试链接", "URL", "https://example.test/a");
    invokeMock.mockClear();

    store.state.search = "cslj";
    const itemSuggestion = store.searchSuggestions.value.find((entry) => entry.kind === "item" && entry.title === "测试链接")!;
    await store.executeSuggestionAndMaybeHide(itemSuggestion);

    expect(store.state.activeTabId).toBe(`collection-${collection.id}`);
    expect(invokeMock).not.toHaveBeenCalledWith("open_application", expect.anything());
    expect(hideWindowMock).not.toHaveBeenCalled();
  });
});

describe("OpenDock store - tab navigation", () => {
  it("setActiveScene returns from settings view to workspace", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const scene = store.state.data.scenes.find((s) => s.id !== store.state.data.activeSceneId) || store.state.data.scenes[0];

    store.state.mainView = "settings";
    store.setActiveScene(scene.id);

    expect(store.state.mainView).toBe("workspace");
    expect(store.state.data.activeSceneId).toBe(scene.id);
    expect(store.state.quickView).toBe("all");
  });

  it("clears the active collection when switching to a scene with no collections", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();

    store.createScene("Empty Office", OFFICE);
    const scene = store.activeScenes.value.find((s) => s.name === "Empty Office")!;
    store.setActiveScene(scene.id);

    expect(store.visibleCollections.value).toHaveLength(0);
    expect(store.state.data.activeCollectionId).toBe("");
    expect(store.activeCollection()).toBeUndefined();
  });

  it("clears the active collection when opening a quick view tab", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const collection = store.state.data.collections.find((c) => c.sceneId === store.state.data.activeSceneId)!;

    store.setActiveCollection(collection);
    expect(store.activeCollection()?.id).toBe(collection.id);

    store.openTab({ id: "quickview-all", kind: "quickview", title: "All Resources", quickViewId: "all" });

    expect(store.state.data.activeCollectionId).toBe("");
    expect(store.visibleCollections.value.length).toBeGreaterThan(0);
    expect(store.activeCollection()).toBeUndefined();
  });
  it("opens settings, scene, and collection tabs with the right active context", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const scene = store.state.data.scenes[0];
    const collection = store.state.data.collections.find((c) => c.sceneId === scene.id)!;

    store.openTab({ id: "settings", kind: "settings", title: "Settings" });
    expect(store.state.mainView).toBe("settings");
    expect(store.state.activeTabId).toBe("settings");

    store.openTab({ id: `scene-${scene.id}`, kind: "scene", title: scene.name, sceneId: scene.id });
    expect(store.state.mainView).toBe("workspace");
    expect(store.state.activeTabId).toBe(`scene-${scene.id}`);
    expect(store.state.data.activeSceneId).toBe(scene.id);
    expect(store.state.quickView).toBe("all");

    store.openTab({ id: `collection-${collection.id}`, kind: "collection", title: collection.name, collectionId: collection.id, sceneId: collection.sceneId || undefined });
    expect(store.state.mainView).toBe("workspace");
    expect(store.state.activeTabId).toBe(`collection-${collection.id}`);
    expect(store.state.data.activeCollectionId).toBe(collection.id);
    expect(store.state.data.activeSceneId).toBe(scene.id);
  });

  it("switches and closes tabs while applying the fallback tab context", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const scene = store.state.data.scenes[0];

    store.openTab({ id: `scene-${scene.id}`, kind: "scene", title: scene.name, sceneId: scene.id });
    store.openTab({ id: "settings", kind: "settings", title: "Settings" });
    expect(store.state.mainView).toBe("settings");

    store.switchTab(`scene-${scene.id}`);
    expect(store.state.mainView).toBe("workspace");
    expect(store.state.data.activeSceneId).toBe(scene.id);

    store.switchTab("settings");
    store.closeTab("settings");
    expect(store.state.activeTabId).toBe(`scene-${scene.id}`);
    expect(store.state.mainView).toBe("workspace");
  });
});
