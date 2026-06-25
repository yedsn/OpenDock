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
  invokeMock.mockImplementation(async (...args: unknown[]): Promise<unknown> => {
    if (args[0] === "marketplace_fetch_text") throw new Error("fallback to fetch");
    return { ok: true, message: "stub" };
  });
  hideWindowMock.mockClear();
  vi.unstubAllGlobals();
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
  it("pauses WebDAV sync on remote differences without overwriting local data", async () => {
    const { createSeedData } = await import("../seed");
    const remoteData = createSeedData();
    remoteData.workspaces[0].name = "Remote Workspace";
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      if (command === "webdav_get_credential") return "secret";
      if (command === "sync_webdav_now") return { ok: true, message: `SYNC_CONFLICT:${JSON.stringify(remoteData)}` };
      return { ok: true, message: "stub" };
    });
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const originalName = store.state.data.workspaces[0].name;
    await store.syncWebdavNow();
    expect(store.state.data.workspaces[0].name).toBe(originalName);
    expect(store.state.webdavPendingConflict).toBeTruthy();
    expect(store.state.data.settings.webdavSync.status).toBe("需要手动处理冲突");
  });
  it("keeps WebDAV failure details visible in settings state", async () => {
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      if (command === "webdav_get_credential") return "secret";
      if (command === "test_webdav_connection") return { ok: false, message: "HTTP 401 Unauthorized" };
      if (command === "sync_webdav_now") return { ok: false, message: "远程目录不存在: /OpenDock/workspaces" };
      return { ok: true, message: "stub" };
    });
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    await store.testWebdav();
    expect(invokeMock).toHaveBeenCalledWith("test_webdav_connection", expect.objectContaining({ remotePath: store.state.data.settings.webdavSync.remotePath }));
    expect(store.state.data.settings.webdavSync.status).toBe("连接失败");
    expect(store.state.data.settings.webdavSync.lastError).toBe("HTTP 401 Unauthorized");
    await store.syncWebdavNow();
    expect(store.state.data.settings.webdavSync.status).toBe("同步失败");
    expect(store.state.data.settings.webdavSync.lastError).toBe("远程目录不存在: /OpenDock/workspaces");
  });
  it("requires explicit WebDAV overwrite actions for either direction", async () => {
    const { createSeedData } = await import("../seed");
    const remoteData = createSeedData();
    remoteData.workspaces[0].name = "Remote Workspace";
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      const payload = args[1] as { conflictPolicy?: string } | undefined;
      if (command === "webdav_get_credential") return "secret";
      if (command === "sync_webdav_now" && payload?.conflictPolicy === "覆盖远程") return { ok: true, message: "同步成功（已覆盖远程数据）" };
      if (command === "sync_webdav_now") return { ok: true, message: `SYNC_CONFLICT:${JSON.stringify(remoteData)}` };
      if (command === "snapshot_list") return [];
      return { ok: true, message: "stub" };
    });
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    await store.syncWebdavNow();
    await store.webdavOverwriteRemote();
    expect(invokeMock).toHaveBeenCalledWith("sync_webdav_now", expect.objectContaining({ conflictPolicy: "覆盖远程" }));
    expect(store.state.webdavPendingConflict).toBeNull();
    await store.syncWebdavNow();
    await store.webdavOverwriteLocal();
    expect(store.state.data.workspaces[0].name).toBe("Remote Workspace");
    expect(invokeMock).toHaveBeenCalledWith("snapshot_create", expect.objectContaining({ kind: "pre-import" }));
    invokeMock.mockImplementation(async (..._args: unknown[]): Promise<unknown> => ({ ok: true, message: "stub" }));
  });
  it("applies WebDAV merged data without entering conflict handling", async () => {
    const { createSeedData } = await import("../seed");
    const mergedData = createSeedData();
    mergedData.items.push({
      id: "remote-added-item",
      workspaceId: "default",
      collectionId: "code",
      name: "Remote Added",
      type: "URL",
      value: "https://remote.example.test",
      tool: "Chrome",
      icon: "Globe",
      color: "#74a4d4",
      sort: 99,
      createdAt: "2026-06-14T00:00:00.000Z",
      updatedAt: "2026-06-14T00:00:00.000Z"
    });
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      if (command === "webdav_get_credential") return "secret";
      if (command === "sync_webdav_now") return { ok: true, message: `SYNC_MERGED_DATA:${JSON.stringify(mergedData)}` };
      if (command === "snapshot_list") return [];
      return { ok: true, message: "stub" };
    });
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    await store.syncWebdavNow();
    expect(store.state.webdavPendingConflict).toBeNull();
    expect(store.state.data.items.some((item) => item.id === "remote-added-item")).toBe(true);
    expect(store.state.data.settings.webdavSync.status).toContain("同步成功（已增量合并：资源新增 1");
    expect(store.latestTask.value?.message).toContain("资源新增 1");
  });
  it("applies WebDAV merged collection title changes", async () => {
    const { createSeedData } = await import("../seed");
    const mergedData = createSeedData();
    const target = mergedData.collections.find((collection) => collection.id === "code");
    expect(target).toBeTruthy();
    if (target) {
      target.name = "远端集合标题";
      target.updatedAt = "2026-06-14T01:00:00.000Z";
    }
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      if (command === "webdav_get_credential") return "secret";
      if (command === "sync_webdav_now") return { ok: true, message: `SYNC_MERGED_DATA:${JSON.stringify(mergedData)}` };
      if (command === "snapshot_list") return [];
      return { ok: true, message: "stub" };
    });
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    await store.syncWebdavNow();
    expect(store.state.data.collections.find((collection) => collection.id === "code")?.name).toBe("远端集合标题");
    expect(store.state.data.settings.webdavSync.status).toContain("集合更新 1");
  });
  it("tracks WebDAV sync as a background task", async () => {
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      if (command === "webdav_get_credential") return "secret";
      if (command === "sync_webdav_now") return { ok: true, message: "同步成功（本地与远程一致）" };
      return { ok: true, message: "stub" };
    });
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    await store.syncWebdavNow();
    expect(store.latestTask.value?.id).toBe("webdav-sync");
    expect(store.latestTask.value?.status).toBe("success");
    expect(store.latestTask.value?.progress).toBe(100);
    expect(store.runningTaskCount.value).toBe(0);
  });
  it("does not start duplicate WebDAV sync tasks while one is running", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.state.tasks.unshift({
      id: "webdav-sync",
      type: "webdav-sync",
      title: "WebDAV 同步",
      message: "正在同步...",
      status: "running",
      progress: 40,
      startedAt: "2026-06-14T00:00:00.000Z",
      updatedAt: "2026-06-14T00:00:00.000Z"
    });
    await store.syncWebdavNow();
    expect(store.state.taskPanelOpen).toBe(true);
    expect(invokeMock).not.toHaveBeenCalledWith("sync_webdav_now", expect.anything());
  });
  it("starts a quick WebDAV sync after synced data changes", async () => {
    vi.useFakeTimers();
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      if (command === "webdav_get_credential") return "secret";
      if (command === "sync_webdav_now") return { ok: true, message: "同步成功（增量上传）" };
      return { ok: true, message: "stub" };
    });
    try {
      const { useOpenDockStore } = await import("../store");
      const store = useOpenDockStore();
      const config = store.state.data.settings.webdavSync;
      config.autoSync = true;
      config.syncInterval = "关闭";
      config.serverUrl = "https://dav.example.test";
      config.username = "user";
      config.remotePath = "/OpenDock/workspaces";
      invokeMock.mockClear();

      store.updateCollection("code", { name: "本机快速同步集合" });

      expect(store.latestTask.value?.status).toBe("pending");
      expect(store.runningTaskCount.value).toBe(0);
      expect(invokeMock).not.toHaveBeenCalledWith("sync_webdav_now", expect.anything());

      await vi.advanceTimersByTimeAsync(900);

      expect(invokeMock).toHaveBeenCalledWith("sync_webdav_now", expect.objectContaining({
        remotePath: "/OpenDock/workspaces",
        localData: expect.stringContaining("本机快速同步集合")
      }));
      expect(store.latestTask.value?.status).toBe("success");
    } finally {
      vi.useRealTimers();
    }
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
    expect(store.state.data.pluginStore.some((entry) => entry.theme?.id === "plugin-ink-blue")).toBe(true);
  });
  it("loads built-in theme plugins from the dynamic system registry", async () => {
    const { builtInPluginManifests, builtInPluginStoreEntries } = await import("../../../plugins/registry");
    expect(builtInPluginManifests.some((plugin) => plugin.id === "theme-forest-mist" && plugin.theme?.id === "plugin-forest-mist")).toBe(true);
    expect(builtInPluginStoreEntries.some((entry) => entry.name === "Ink Blue Theme" && entry.theme?.pluginId === "theme-ink-blue")).toBe(true);
  });
  it("fetches marketplace plugins and filters installed entries", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-06-13T10:00:00Z",
        plugins: [
          {
            id: "external-demo",
            name: "External Demo",
            version: "0.1.0",
            category: "demo",
            description: "Demo external plugin outside plugins/.system.",
            permissions: ["workspace:read", "plugin-data:read"],
            author: "opendock",
            tags: ["demo"],
            minAppVersion: "0.1.0",
            verified: true
          }
        ]
      })
    })));
    await store.fetchMarketplaceIndex();
    expect(store.state.marketplacePlugins.some((plugin) => plugin.id === "external-demo")).toBe(true);
  });
  it("installs marketplace plugin declarative contributions", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const pluginJson = JSON.stringify({
      toolTypes: [{ type: "Diagram Tool", collectionTypes: ["文件集合", "插件集合"], itemTypes: ["文件", "插件资源", "Diagram Spec"] }],
      itemTypes: [{
        type: "Diagram Spec",
        label: "图表规格",
        fields: [
          { key: "renderer", label: "渲染器", required: true },
          { key: "layout", label: "布局参数", required: false }
        ]
      }]
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => pluginJson })));
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      if (command === "marketplace_fetch_text") throw new Error("fallback to fetch");
      if (command === "marketplace_install_plugin_files") return "C:/OpenDock/plugins/tool-type-demo/0.1.0";
      return { ok: true, message: "stub" };
    });
    await store.installFromMarketplace({
      id: "tool-type-demo",
      name: "Tool Type Demo",
      version: "0.1.0",
      category: "demo",
      description: "Demo plugin that contributes a custom open tool type.",
      permissions: ["workspace:read", "opener:diagram"],
      author: "opendock",
      tags: ["demo", "tool-type"],
      minAppVersion: "0.1.0",
      verified: true
    });
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
    store.createTool("Chrome", "浏览器", "C:/Browser/browser.exe", "--new-window {url}");
    const collection = store.state.data.collections.find((c) => c.type === WEB_COLLECTION)!;
    const tool = store.state.data.tools.find((entry) => entry.type === "浏览器")!;
    tool.default = true;
    store.createItem(collection.id, "Tool URL", "URL", "https://example.com");
    const item = store.state.data.items.find((entry) => entry.name === "Tool URL")!;

    await store.openItem(item);
    expect(invokeMock).toHaveBeenCalledWith("open_url_in_browser", {
      browserPath: "C:/Browser/browser.exe",
      url: "https://example.com",
      newWindow: true
    });
  });
  it("can open URL items in the current browser window when configured", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.state.data.settings.general.openWebInNewWindow = false;
    store.createTool("Chrome", "浏览器", "C:/Browser/browser.exe", "{url}");
    const collection = store.state.data.collections.find((c) => c.type === WEB_COLLECTION)!;
    const tool = store.state.data.tools.find((entry) => entry.type === "浏览器")!;
    tool.default = true;
    store.createItem(collection.id, "Same Window URL", "URL", "https://example.com");
    const item = store.state.data.items.find((entry) => entry.name === "Same Window URL")!;
    await store.openItem(item);
    expect(invokeMock).toHaveBeenCalledWith("open_url_in_browser", {
      browserPath: "C:/Browser/browser.exe",
      url: "https://example.com",
      newWindow: false
    });
  });
  it("opens multiple URL items from one collection in a single browser window", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.state.data.settings.general.confirmBeforeOpen = false;
    store.createTool("Chrome", "浏览器", "C:/Browser/browser.exe", "{url}");
    const chromeTool = store.state.data.tools.find((entry) => entry.name === "Chrome")!;
    chromeTool.default = true;
    store.createCollection("Batch Web Collection", WEB_COLLECTION, null, "");
    const collection = store.state.data.collections.find((c) => c.name === "Batch Web Collection")!;
    collection.defaultToolId = chromeTool.id;
    store.createItem(collection.id, "Batch URL A", "URL", "https://a.example.com");
    store.createItem(collection.id, "Batch URL B", "URL", "https://b.example.com");
    await store.openCollection(collection);
    // Batch-open all URLs via open_urls_in_browser
    const batchCalls = invokeMock.mock.calls.filter(([cmd]) => cmd === "open_urls_in_browser");
    expect(batchCalls).toHaveLength(1);
    expect(batchCalls[0]).toEqual(["open_urls_in_browser", {
      browserPath: "C:/Browser/browser.exe",
      urls: ["https://a.example.com", "https://b.example.com"],
      newWindow: true
    }]);
  });
  it("deletes a tool and clears item references while preserving a default for that type", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.createTool("Chrome", "浏览器", "C:/chrome.exe", "{url}");
    store.state.data.tools.find((entry) => entry.name === "Chrome")!.default = true;
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
    store.createTool("AutoCAD", "CAD", "C:/AutoCAD/acad.exe", "{path}");
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
  it("opens marketplace-defined item types through the built-in handler", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    const pluginJson = JSON.stringify({
      toolTypes: [{ type: "Diagram Tool", collectionTypes: ["文件集合", "插件集合"], itemTypes: ["文件", "插件资源", "Diagram Spec"] }],
      itemTypes: [{ type: "Diagram Spec", label: "图表规格", fields: [] }]
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => pluginJson })));
    invokeMock.mockImplementation(async (...args: unknown[]) => {
      const command = args[0] as string;
      if (command === "marketplace_install_plugin_files") return "C:/OpenDock/plugins/tool-type-demo/0.1.0";
      return { ok: true, message: "stub" };
    });
    await store.installFromMarketplace({
      id: "tool-type-demo",
      name: "Tool Type Demo",
      version: "0.1.0",
      category: "demo",
      description: "Demo plugin that contributes a custom open tool type.",
      permissions: ["workspace:read", "opener:diagram"],
      author: "opendock",
      tags: ["demo", "tool-type"],
      minAppVersion: "0.1.0",
      verified: true
    });
    const collection = store.state.data.collections.find((entry) => entry.type === "文件集合") || store.state.data.collections[0];
    store.createItem(collection.id, "Order Flow", "Diagram Spec", "diagram://order-flow", "", undefined, {
      renderer: "mermaid",
      layout: "left-to-right"
    });
    const item = store.state.data.items.find((entry) => entry.name === "Order Flow")!;
    invokeMock.mockClear();
    invokeMock.mockResolvedValue({ ok: true, message: "stub" });
    await store.openItem(item);
    expect(invokeMock).toHaveBeenCalledWith("run_command", {
      command: expect.stringContaining("mermaid"),
      workingDirectory: null
    });
    expect(invokeMock).toHaveBeenCalledWith("run_command", expect.objectContaining({
      command: expect.stringContaining("left-to-right")
    }));
  });
  it("uses --folder-uri for remote directory URIs opened with editor tools", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.state.data.settings.general.confirmBeforeOpen = false;
    store.createTool("VS Code", "编辑器", "C:/Editor/code.exe", "{path}");
    const collection = store.state.data.collections.find((c) => c.type === "目录集合")!;
    const editor = store.state.data.tools.find((entry) => entry.type === "编辑器")!;
    editor.default = true;
    // Remote URI should produce --folder-uri
    store.createItem(collection.id, "Remote Dir", "目录", "vscode-remote://ssh-remote+root@server/path/to/project");
    const remoteItem = store.state.data.items.find((entry) => entry.name === "Remote Dir")!;
    invokeMock.mockClear();
    await store.openItem(remoteItem);
    expect(invokeMock).toHaveBeenCalledWith("open_application", {
      path: "C:/Editor/code.exe",
      args: ["--folder-uri", "vscode-remote://ssh-remote+root@server/path/to/project"]
    });
    // Local path should still use positional argument
    store.createItem(collection.id, "Local Dir", "目录", "E:\\code\\project");
    const localItem = store.state.data.items.find((entry) => entry.name === "Local Dir")!;
    invokeMock.mockClear();
    await store.openItem(localItem);
    expect(invokeMock).toHaveBeenCalledWith("open_application", {
      path: "C:/Editor/code.exe",
      args: ["E:\\code\\project"]
    });
    // cursor-remote:// URI should also use --folder-uri
    store.createItem(collection.id, "Cursor Remote", "目录", "cursor-remote://ssh-remote+user@host/workspace");
    const cursorItem = store.state.data.items.find((entry) => entry.name === "Cursor Remote")!;
    invokeMock.mockClear();
    await store.openItem(cursorItem);
    expect(invokeMock).toHaveBeenCalledWith("open_application", {
      path: "C:/Editor/code.exe",
      args: ["--folder-uri", "cursor-remote://ssh-remote+user@host/workspace"]
    });
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
    store.state.data.settings.general.closeWindowAfterOpen = false;
    store.createTool("Chrome", "浏览器", "C:/Browser/browser.exe", "{url}");
    store.state.data.tools.find((entry) => entry.name === "Chrome")!.default = true;
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
    // Collection open: batch-open all URLs
    expect(invokeMock).toHaveBeenCalledWith("open_urls_in_browser", {
      browserPath: "C:/Browser/browser.exe",
      urls: ["https://example.test/a", "https://example.test/b"],
      newWindow: true
    });
    store.state.search = "cslj";
    const urlSuggestion = store.searchSuggestions.value.find((entry) => entry.kind === "item" && entry.title === "测试链接")!;
    await store.executeSuggestionAndMaybeHide(urlSuggestion);
    expect(hideWindowMock).not.toHaveBeenCalled();
    store.state.data.settings.general.closeWindowAfterOpen = true;
    await store.executeSuggestionAndMaybeHide(urlSuggestion);
    expect(hideWindowMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("open_url_in_browser", expect.objectContaining({
      url: "https://example.test/a"
    }));
  });
  it("hides the window after opening a non-URL item when closeWindowAfterOpen is enabled", async () => {
    const { useOpenDockStore } = await import("../store");
    const store = useOpenDockStore();
    store.state.data.settings.general.closeWindowAfterOpen = true;
    store.createTool("Terminal", "终端", "C:/terminal.exe", "{command}");
    store.state.data.tools.find((entry) => entry.name === "Terminal")!.default = true;
    store.createCollection("Commands", COMMAND_COLLECTION, null, "");
    const collection = store.state.data.collections.find((entry) => entry.name === "Commands")!;
    store.createItem(collection.id, "Run Build", "\u547d\u4ee4", "echo build");
    invokeMock.mockClear();
    hideWindowMock.mockClear();
    store.state.search = "Run Build";
    const itemSuggestion = store.searchSuggestions.value.find((entry) => entry.kind === "item" && entry.title === "Run Build")!;
    await store.executeSuggestionAndMaybeHide(itemSuggestion);
    expect(invokeMock).toHaveBeenCalledWith("open_application", expect.objectContaining({
      args: expect.arrayContaining([expect.stringContaining("echo build")])
    }));
    expect(hideWindowMock).toHaveBeenCalledTimes(1);
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
