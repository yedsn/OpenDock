import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeAppData } from "../storage";
import { createSeedData, schemaVersion } from "../seed";

// Mock the db module so no real SQLite calls happen
vi.mock("../db", () => ({
  ensureDb: vi.fn(),
  dbGetValue: vi.fn(async () => undefined),
  dbSetValue: vi.fn(async () => {}),
  dbClearTable: vi.fn(async () => {}),
  dbListTable: vi.fn(async () => []),
  dbBulkInsert: vi.fn(async () => 0),
  snapshotCreate: vi.fn(async () => {}),
  snapshotUpdateMeta: vi.fn(async () => {}),
  snapshotList: vi.fn(async () => []),
  snapshotGet: vi.fn(async () => undefined),
  snapshotDelete: vi.fn(async () => {}),
  snapshotPrune: vi.fn(async () => 0),
  dbExecute: vi.fn(async () => 0),
  dbExecuteParams: vi.fn(async () => 0),
}));

describe("storage", () => {
  describe("normalizeAppData", () => {
    it("fills missing fields from seed defaults", () => {
      const seed = createSeedData();
      const partial = {
        schemaVersion: 1,
        workspaces: seed.workspaces,
        scenes: seed.scenes,
        collections: [],
        items: [],
      } as any;

      const result = normalizeAppData(partial);
      expect(result.schemaVersion).toBe(schemaVersion);
      expect(result.activeWorkspaceId).toBe(seed.activeWorkspaceId);
      expect(result.activeSceneId).toBe(seed.activeSceneId);
      expect(result.activeCollectionId).toBe(seed.activeCollectionId);
      expect(result.collections).toEqual([]);
      expect(result.items).toEqual([]);
      expect(result.tools).toEqual(seed.tools);
      expect(result.settings.general.language).toBe("简体中文");
    });

    it("rejects non-object input", () => {
      expect(() => normalizeAppData(null)).toThrow("导入文件不是合法的 JSON 对象");
      expect(() => normalizeAppData("hello")).toThrow("导入文件不是合法的 JSON 对象");
    });

    it("preserves existing data and merges settings", () => {
      const seed = createSeedData();
      const data = {
        schemaVersion: 1,
        activeWorkspaceId: "my-ws",
        activeSceneId: "my-scene",
        activeCollectionId: "my-coll",
        workspaces: [{ ...seed.workspaces[0], name: "My WS" }],
        scenes: [],
        collections: seed.collections.slice(0, 1),
        items: seed.items.slice(0, 2),
        tools: seed.tools,
        plugins: seed.plugins,
        pluginStore: seed.pluginStore,
        settings: { ...seed.settings, general: { ...seed.settings.general, language: "English" } },
        activity: seed.activity,
      };

      const result = normalizeAppData(data);
      expect(result.activeWorkspaceId).toBe("my-ws");
      expect(result.workspaces[0].name).toBe("My WS");
      expect(result.settings.general.language).toBe("English");
      expect(result.schemaVersion).toBe(schemaVersion);
    });

    it("works with empty collections and missing settings", () => {
      const result = normalizeAppData({ schemaVersion: 1 });
      expect(result.collections.length).toBeGreaterThan(0);  // Falls back to seed
      expect(result.items.length).toBeGreaterThan(0);  // Falls back to seed
      expect(result.settings).toBeDefined();
      expect(result.settings.general.confirmBeforeOpen).toBe(false);
    });
  });

  describe("export-import round-trip", () => {
    it("re-imports a seed export without losing data", async () => {
      const { exportAppData, importAppData } = await import("../storage");
      const seed = createSeedData();
      const exported = exportAppData(seed);
      const reimported = await importAppData(exported);
      expect(reimported.schemaVersion).toBe(seed.schemaVersion);
      expect(reimported.workspaces.length).toBe(seed.workspaces.length);
      expect(reimported.scenes.length).toBe(seed.scenes.length);
      expect(reimported.collections.length).toBe(seed.collections.length);
      expect(reimported.items.length).toBe(seed.items.length);
      expect(reimported.tools.length).toBe(seed.tools.length);
      expect(reimported.plugins.length).toBe(seed.plugins.length);
      expect(reimported.pluginStore.length).toBe(seed.pluginStore.length);
    });

    it("rejects malformed JSON with a clear message", async () => {
      const { importAppData } = await import("../storage");
      await expect(importAppData("{not json")).rejects.toThrow(/JSON/i);
    });

    it("rejects exports with a higher schema version", async () => {
      const { importAppData } = await import("../storage");
      const payload = JSON.stringify({ ...createSeedData(), schemaVersion: 99 });
      await expect(importAppData(payload)).rejects.toThrow(/高于当前/);
    });
  });
});
