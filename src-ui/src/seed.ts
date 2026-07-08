import { builtInPluginManifests, builtInPluginStoreEntries } from "../../plugins/registry";
import { invoke } from "@tauri-apps/api/core";
import type { AppData, Collection, CollectionItem, CollectionType, ItemType, OpenTool, PluginManifest, Scene, SceneType, SortMode, Workspace } from "./types";

export const schemaVersion = 1;

const now = "2026-06-25T10:30:00.000Z";
const DEMO_DIR_PLACEHOLDER = "__DEMO_DIR__";

export const sceneMeta: Record<SceneType, { icon: string; color: string }> = {
  项目: { icon: "Code2", color: "#8a7ff0" },
  办公: { icon: "FileSpreadsheet", color: "#6fb29d" },
  工程: { icon: "DraftingCompass", color: "#a58ad7" },
  设计: { icon: "Palette", color: "#d19a66" },
  通用: { icon: "Wrench", color: "#d19a66" },
  自定义: { icon: "Folder", color: "#74a4d4" }
};

export const collectionMeta: Record<CollectionType, { icon: string; color: string; tool: string }> = {
  "目录集合": { icon: "FolderCode", color: "#6fb29d", tool: "Cursor" },
  "网页集合": { icon: "Globe", color: "#74a4d4", tool: "Chrome" },
  "命令集合": { icon: "SquareTerminal", color: "#dcddde", tool: "Terminal" },
  "Office 集合": { icon: "FileSpreadsheet", color: "#6fb29d", tool: "Excel" },
  "CAD 集合": { icon: "DraftingCompass", color: "#a58ad7", tool: "AutoCAD" },
  "文件集合": { icon: "Files", color: "#d19a66", tool: "系统默认应用" },
  "应用集合": { icon: "AppWindow", color: "#d19a66", tool: "系统启动" },
  "插件集合": { icon: "Blocks", color: "#8a7ff0", tool: "Plugin Runtime" }
};

export const itemMeta: Record<string, { icon: string; color: string; tool: string }> = {
  编辑器: { icon: "FolderCode", color: "#6fb29d", tool: "Cursor" },
  浏览器: { icon: "Globe", color: "#74a4d4", tool: "Chrome" },
  终端: { icon: "Terminal", color: "#dcddde", tool: "Terminal" },
  Office: { icon: "FileSpreadsheet", color: "#6fb29d", tool: "Excel" },
  CAD: { icon: "FileBox", color: "#a58ad7", tool: "AutoCAD" },
  系统: { icon: "FileText", color: "#d19a66", tool: "系统默认应用" },
  应用: { icon: "AppWindow", color: "#d19a66", tool: "系统启动" },
  插件: { icon: "Blocks", color: "#8a7ff0", tool: "Plugin Runtime" }
};

const workspaces: Workspace[] = [
  { id: "default", name: "OpenDock", storage: "本地数据", remark: "默认本地工作空间", createdAt: now, updatedAt: now },
  { id: "archive", name: "Archive Dock", storage: "归档资源", remark: "长期归档和历史项目入口", createdAt: now, updatedAt: now }
];

const scenes: Scene[] = [
  { id: "frontend", workspaceId: "default", name: "前端项目", type: "项目", description: "前端项目代码、开发环境与常用命令。", icon: "Code2", color: "#8a7ff0", favorite: true, sort: 1, createdAt: now, updatedAt: now },
  { id: "backend", workspaceId: "default", name: "后端服务", type: "项目", description: "后端 API 服务、数据库和运维相关入口。", icon: "Server", color: "#74a4d4", favorite: true, sort: 2, createdAt: now, updatedAt: now },
  { id: "devtools", workspaceId: "default", name: "开发工具", type: "工程", description: "技术文档、在线工具和开发者资源。", icon: "Wrench", color: "#d19a66", favorite: true, sort: 3, createdAt: now, updatedAt: now },
  { id: "office", workspaceId: "default", name: "日常办公", type: "办公", description: "文档、表格和办公工具入口。", icon: "FileSpreadsheet", color: "#6fb29d", favorite: false, sort: 4, createdAt: now, updatedAt: now },
  { id: "unbound", workspaceId: "default", name: "无场景", type: "通用", description: "未关联场景的独立集合。", icon: "FolderQuestion", color: "#d19a66", favorite: false, unbound: true, sort: 5, createdAt: now, updatedAt: now }
];

const tools: OpenTool[] = [
  { id: "system", name: "系统默认应用", type: "系统", path: "shell:open", args: "{path}", default: true }
];

function collection(data: Partial<Collection> & Pick<Collection, "id" | "sceneId" | "name" | "type" | "description">, sort: number): Collection {
  const meta = collectionMeta[data.type];
  return {
    workspaceId: "default",
    defaultToolId: "",
    tool: "",
    icon: meta.icon,
    color: meta.color,
    openStrategy: "all",
    tags: [],
    favorite: false,
    recent: false,
    unbound: data.sceneId === null,
    sort,
    createdAt: now,
    updatedAt: now,
    ...data
  };
}

const collections: Collection[] = [
  collection({ id: "fe-code", sceneId: "frontend", name: "项目代码", type: "目录集合", description: "前端项目各模块代码目录。", favorite: true, recent: true }, 1),
  collection({ id: "fe-dev", sceneId: "frontend", name: "开发环境", type: "网页集合", description: "开发环境前台、后台和接口文档。", favorite: true, recent: true }, 2),
  collection({ id: "fe-cmd", sceneId: "frontend", name: "常用命令", type: "命令集合", description: "启动、构建、测试和部署命令。", recent: true }, 4),
  collection({ id: "be-code", sceneId: "backend", name: "后端代码", type: "目录集合", description: "后端服务和脚本目录。", favorite: true }, 5),
  collection({ id: "be-web", sceneId: "backend", name: "运维入口", type: "网页集合", description: "服务器监控、日志和管理后台。", favorite: true, recent: true }, 6),
  collection({ id: "dev-docs", sceneId: "devtools", name: "技术文档", type: "网页集合", description: "前端和全栈技术文档。", favorite: true, recent: true }, 8),
  collection({ id: "dev-tools-web", sceneId: "devtools", name: "在线工具", type: "网页集合", description: "开发者常用在线工具。", recent: true }, 9),
  collection({ id: "office-docs", sceneId: "office", name: "文档与报表", type: "Office 集合", description: "项目文档、周报和财务报表。" }, 10),
];

function item(data: Partial<CollectionItem> & Pick<CollectionItem, "id" | "collectionId" | "name" | "type" | "value">, sort: number): CollectionItem {
  const meta = itemMeta[data.type];
  return {
    workspaceId: "default",
    toolId: undefined,
    tool: "",
    icon: meta.icon,
    color: meta.color,
    sort,
    createdAt: now,
    updatedAt: now,
    ...data
  };
}

const items: CollectionItem[] = [
  // 前端 - 项目代码
  item({ id: "fe-main", collectionId: "fe-code", name: "主项目", type: "编辑器", value: `${DEMO_DIR_PLACEHOLDER}/projects/opendock-app` }, 1),
  item({ id: "fe-shared", collectionId: "fe-code", name: "共享组件库", type: "编辑器", value: `${DEMO_DIR_PLACEHOLDER}/projects/shared-components` }, 2),
  item({ id: "fe-docs", collectionId: "fe-code", name: "文档站", type: "编辑器", value: `${DEMO_DIR_PLACEHOLDER}/projects/opendock-docs` }, 3),
  // 前端 - 开发环境
  item({ id: "dev-web", collectionId: "fe-dev", name: "Vue 3 官方文档", type: "浏览器", value: "https://cn.vuejs.org/" }, 1),
  item({ id: "dev-admin", collectionId: "fe-dev", name: "Vite 文档", type: "浏览器", value: "https://cn.vitejs.dev/" }, 2),
  item({ id: "dev-api-docs", collectionId: "fe-dev", name: "TypeScript 手册", type: "浏览器", value: "https://www.typescriptlang.org/docs/" }, 3),
  item({ id: "dev-deploy", collectionId: "fe-dev", name: "TailwindCSS 文档", type: "浏览器", value: "https://tailwindcss.com/" }, 4),
  // 前端 - 常用命令
  item({ id: "cmd-dev", collectionId: "fe-cmd", name: "启动开发", type: "终端", value: "npm run dev", workingDirectory: `${DEMO_DIR_PLACEHOLDER}/projects/opendock-app` }, 1),
  item({ id: "cmd-build", collectionId: "fe-cmd", name: "构建生产", type: "终端", value: "npm run build", workingDirectory: `${DEMO_DIR_PLACEHOLDER}/projects/opendock-app` }, 2),
  item({ id: "cmd-test", collectionId: "fe-cmd", name: "运行测试", type: "终端", value: "npm run test", workingDirectory: `${DEMO_DIR_PLACEHOLDER}/projects/opendock-app` }, 3),
  item({ id: "cmd-lint", collectionId: "fe-cmd", name: "代码检查", type: "终端", value: "npm run lint", workingDirectory: `${DEMO_DIR_PLACEHOLDER}/projects/opendock-app` }, 4),
  // 后端 - 代码
  item({ id: "be-main", collectionId: "be-code", name: "API 服务", type: "编辑器", value: `${DEMO_DIR_PLACEHOLDER}/projects/opendock-server` }, 1),
  item({ id: "be-scripts", collectionId: "be-code", name: "共享组件库", type: "编辑器", value: `${DEMO_DIR_PLACEHOLDER}/projects/shared-components` }, 2),
  // 后端 - 运维入口
  item({ id: "be-grafana", collectionId: "be-web", name: "Grafana 监控", type: "浏览器", value: "https://grafana.com/" }, 1),
  item({ id: "be-logs", collectionId: "be-web", name: "Sentry 错误追踪", type: "浏览器", value: "https://sentry.io/" }, 2),
  item({ id: "be-admin", collectionId: "be-web", name: "Portainer", type: "浏览器", value: "https://www.portainer.io/" }, 3),
  // 开发工具 - 技术文档
  item({ id: "doc-vue", collectionId: "dev-docs", name: "Vue 3 官方文档", type: "浏览器", value: "https://cn.vuejs.org/" }, 1),
  item({ id: "doc-mdn", collectionId: "dev-docs", name: "MDN Web Docs", type: "浏览器", value: "https://developer.mozilla.org/zh-CN/" }, 2),
  item({ id: "doc-node", collectionId: "dev-docs", name: "Node.js 文档", type: "浏览器", value: "https://nodejs.org/docs/latest/api/" }, 3),
  item({ id: "doc-rust", collectionId: "dev-docs", name: "Rust 程序设计语言", type: "浏览器", value: "https://kaisery.github.io/trpl-zh-cn/" }, 4),
  // 开发工具 - 在线工具
  item({ id: "tool-github", collectionId: "dev-tools-web", name: "GitHub", type: "浏览器", value: "https://github.com/" }, 1),
  item({ id: "tool-so", collectionId: "dev-tools-web", name: "Stack Overflow", type: "浏览器", value: "https://stackoverflow.com/" }, 2),
  item({ id: "tool-caniuse", collectionId: "dev-tools-web", name: "Can I Use", type: "浏览器", value: "https://caniuse.com/" }, 3),
  item({ id: "tool-regex", collectionId: "dev-tools-web", name: "Regex101", type: "浏览器", value: "https://regex101.com/" }, 4),
  // 办公 - 文档与报表
];

const plugins: PluginManifest[] = [
  { id: "browser", name: "Browser", version: "1.0.0", category: "资源打开", capability: "多浏览器网页集合打开", permissions: ["workspace:read", "opener:browser"], installed: true, enabled: true, configurable: false, builtIn: true },
  { id: "terminal", name: "Terminal", version: "1.0.0", category: "资源打开", capability: "命令集合执行策略", permissions: ["workspace:read", "opener:terminal"], installed: true, enabled: true, configurable: false, builtIn: true },
  { id: "webdav-sync", name: "WebDAV Sync", version: "0.2.0", category: "同步", capability: "通过 WebDAV 同步工作区数据", permissions: ["workspace:read", "workspace:write", "network:webdav"], installed: true, enabled: true, configurable: true, builtIn: true, status: "待同步" },
  { id: "office", name: "Office", version: "0.1.0", category: "专业文件", capability: "Word / Excel / PPT 文件集合", permissions: ["workspace:read", "opener:office"], installed: true, enabled: true, configurable: false, builtIn: true, toolTypes: [{ type: "Office", collectionTypes: ["Office 集合", "文件集合"], itemTypes: ["Excel", "文件"] }] },
  { id: "cad", name: "CAD", version: "0.1.0", category: "专业文件", capability: "DWG / DXF 图纸集合", permissions: ["workspace:read", "opener:cad"], installed: true, enabled: false, configurable: false, builtIn: true, toolTypes: [{ type: "CAD", collectionTypes: ["CAD 集合", "文件集合"], itemTypes: ["CAD", "文件"] }] },
  { id: "database", name: "Database", version: "0.1.0", category: "开发工具", capability: "数据库连接入口", permissions: ["workspace:read", "secret:connection"], installed: true, enabled: true, configurable: false, builtIn: true },
  ...builtInPluginManifests
];

/** Resolve demo directory paths in a loaded AppData by calling the Rust backend. */
export async function resolveSeedDemoPaths(data: AppData): Promise<AppData> {
  let demoDir: string;
  try {
    demoDir = await invoke<string>("get_demo_dir");
  } catch {
    // Fallback: home dir
    demoDir = "~/opendock-demo";
  }
  const replace = (v: string) => v.split(DEMO_DIR_PLACEHOLDER).join(demoDir);
  for (const item of data.items) {
    if (item.value.includes(DEMO_DIR_PLACEHOLDER)) {
      item.value = replace(item.value);
    }
    if (item.workingDirectory?.includes(DEMO_DIR_PLACEHOLDER)) {
      item.workingDirectory = replace(item.workingDirectory);
    }
  }
  return data;
}

export function createSeedData(): AppData {
  return {
    schemaVersion,
    activeWorkspaceId: "default",
    activeSceneId: "devtools",
    activeCollectionId: "dev-docs",
    workspaces: structuredClone(workspaces),
    scenes: structuredClone(scenes),
    collections: structuredClone(collections),
    items: structuredClone(items),
    tools: structuredClone(tools),
    plugins: structuredClone(plugins),
    pluginStore: structuredClone([
      { name: "Remote", category: "开发工具", capability: "SSH、远程桌面、服务器入口", permissions: ["workspace:read", "network:remote"] },
      { name: "API Docs", category: "开发工具", capability: "接口文档、Postman、Apifox 入口", permissions: ["workspace:read", "opener:app"] },
      { name: "AList Import", category: "导入", capability: "从 AList 目录导入文件资源", permissions: ["workspace:write", "network:http"], configurable: true },
      ...builtInPluginStoreEntries
    ]),
    settings: {
      general: { defaultView: "全部资源", recentLimit: 12, confirmBeforeOpen: false, logOpenFailures: true, openWebInNewWindow: true, closeWindowAfterOpen: true, language: "简体中文", autoSnapshotIntervalMinutes: 60, autoSnapshotKeepCount: 7, autoStart: false, startMinimized: false, sceneSort: "手动" as SortMode, collectionSort: "按使用次数" as SortMode, itemSort: "手动" as SortMode },
      search: { sceneEnterBehavior: "open", collectionEnterBehavior: "open", itemEnterBehavior: "open", sceneTagColor: "#60a5fa", collectionTagColor: "#34d399", itemTagColor: "#fbbf24" },
      templates: ["代码目录", "本地网页", "开发环境网页", "线上环境网页", "常用命令"],
      shortcuts: [
        { action: "显示/隐藏窗口", key: "Alt+O" },
        { action: "命令面板", key: "Ctrl+K" },
        { action: "打开当前集合", key: "Ctrl+Enter" },
        { action: "打开当前场景", key: "Ctrl+Shift+Enter" },
        { action: "新建集合", key: "Ctrl+N" },
        { action: "添加资源", key: "Ctrl+Shift+N" }
      ],
      appearance: {
        theme: "obsidian-dark",
        density: "紧凑",
        sidebarWidth: 306,
        interfaceFontFamily: "SF Pro Text, PingFang SC, system-ui, sans-serif",
        monospaceFontFamily: "JetBrains Mono, Menlo, monospace",
        baseFontSize: 12,
        showConsole: false
      },
      webdavSync: {
        serverUrl: "https://dav.example.com/opendock",
        username: "yedsn",
        credentialRef: "plugin-data:webdav-sync/secret:default",
        remotePath: "/OpenDock/workspaces",
        autoSync: true,
        syncInterval: "每 30 分钟",
        syncScope: "当前工作区",
        conflictPolicy: "保留两份",
        lastSyncAt: "尚未同步",
        status: "待同步"
      }
    },
    activity: [
      { id: "activity-1", text: "OpenDock 已加载本地工作区", createdAt: now }
    ],
    tombstones: []
  };
}
