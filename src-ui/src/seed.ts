import { builtInPluginManifests, builtInPluginStoreEntries } from "../../plugins/registry";
import type { AppData, Collection, CollectionItem, CollectionType, ItemType, OpenTool, PluginManifest, Scene, SceneType, Workspace } from "./types";

export const schemaVersion = 1;

const now = "2026-06-25T10:30:00.000Z";

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
  目录: { icon: "FolderCode", color: "#6fb29d", tool: "Cursor" },
  URL: { icon: "Globe", color: "#74a4d4", tool: "Chrome" },
  命令: { icon: "Terminal", color: "#dcddde", tool: "Terminal" },
  Excel: { icon: "FileSpreadsheet", color: "#6fb29d", tool: "Excel" },
  CAD: { icon: "FileBox", color: "#a58ad7", tool: "AutoCAD" },
  文件: { icon: "FileText", color: "#d19a66", tool: "系统默认应用" },
  应用: { icon: "AppWindow", color: "#d19a66", tool: "系统启动" },
  插件资源: { icon: "Blocks", color: "#8a7ff0", tool: "Plugin Runtime" }
};

const workspaces: Workspace[] = [
  { id: "default", name: "OpenDock", storage: "本地数据", remark: "默认本地工作空间", createdAt: now, updatedAt: now },
  { id: "archive", name: "Archive Dock", storage: "归档资源", remark: "长期归档和历史项目入口", createdAt: now, updatedAt: now }
];

const scenes: Scene[] = [
  { id: "frontend", workspaceId: "default", name: "前端项目", type: "项目", description: "前端项目代码、开发环境与常用命令。", icon: "Code2", color: "#8a7ff0", favorite: true, createdAt: now, updatedAt: now },
  { id: "backend", workspaceId: "default", name: "后端服务", type: "项目", description: "后端 API 服务、数据库和运维相关入口。", icon: "Server", color: "#74a4d4", favorite: true, createdAt: now, updatedAt: now },
  { id: "design", workspaceId: "default", name: "设计资源", type: "设计", description: "设计稿、图标素材和设计工具入口。", icon: "Palette", color: "#d19a66", favorite: false, createdAt: now, updatedAt: now },
  { id: "office", workspaceId: "default", name: "日常办公", type: "办公", description: "文档、表格和办公工具入口。", icon: "FileSpreadsheet", color: "#6fb29d", favorite: false, createdAt: now, updatedAt: now },
  { id: "unbound", workspaceId: "default", name: "无场景", type: "通用", description: "未关联场景的独立集合。", icon: "FolderQuestion", color: "#d19a66", favorite: false, unbound: true, createdAt: now, updatedAt: now }
];

const tools: OpenTool[] = [
  { id: "cursor", name: "Cursor", type: "编辑器", path: "/Applications/Cursor.app", args: "{path}", default: true },
  { id: "vscode", name: "VS Code", type: "编辑器", path: "/Applications/Visual Studio Code.app", args: "{path}", default: false },
  { id: "chrome", name: "Chrome", type: "浏览器", path: "/Applications/Google Chrome.app", args: "{url}", default: true },
  { id: "safari", name: "Safari", type: "浏览器", path: "/Applications/Safari.app", args: "{url}", default: false },
  { id: "terminal", name: "Terminal", type: "终端", path: "/System/Applications/Utilities/Terminal.app", args: "{command}", default: true },
  { id: "iterm", name: "iTerm", type: "终端", path: "/Applications/iTerm.app", args: "{command}", default: false },
  { id: "excel", name: "Excel", type: "Office", path: "/Applications/Microsoft Excel.app", args: "{path}", default: true },
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
  collection({ id: "fe-local", sceneId: "frontend", name: "本地开发环境", type: "网页集合", description: "本地开发服务器入口。", recent: true }, 2),
  collection({ id: "fe-dev", sceneId: "frontend", name: "开发环境", type: "网页集合", description: "开发环境前台、后台和接口文档。", favorite: true, recent: true }, 3),
  collection({ id: "fe-cmd", sceneId: "frontend", name: "常用命令", type: "命令集合", description: "启动、构建、测试和部署命令。", recent: true }, 4),
  collection({ id: "be-code", sceneId: "backend", name: "后端代码", type: "目录集合", description: "后端服务和脚本目录。", favorite: true }, 5),
  collection({ id: "be-web", sceneId: "backend", name: "运维入口", type: "网页集合", description: "服务器监控、日志和管理后台。", favorite: true, recent: true }, 6),
  collection({ id: "be-db", sceneId: "backend", name: "数据库连接", type: "插件集合", description: "由 Database 插件定义的数据库连接入口。", pluginId: "database" }, 7),
  collection({ id: "design-files", sceneId: "design", name: "设计稿", type: "文件集合", description: "Figma 链接、设计规范和素材文件。" }, 8),
  collection({ id: "design-tools", sceneId: "design", name: "设计工具", type: "应用集合", description: "Figma、Sketch 和图片处理工具。" }, 9),
  collection({ id: "office-docs", sceneId: "office", name: "文档与报表", type: "Office 集合", description: "项目文档、周报和财务报表。" }, 10),
  collection({ id: "loose-tools", sceneId: null, name: "常用工具", type: "应用集合", description: "独立使用的常用工具入口。", recent: true }, 11)
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
  item({ id: "fe-main", collectionId: "fe-code", name: "主项目", type: "目录", value: "~/Projects/opendock-app" }, 1),
  item({ id: "fe-shared", collectionId: "fe-code", name: "共享组件库", type: "目录", value: "~/Projects/shared-components" }, 2),
  item({ id: "fe-docs", collectionId: "fe-code", name: "文档站", type: "目录", value: "~/Projects/opendock-docs" }, 3),
  // 前端 - 本地开发环境
  item({ id: "local-web", collectionId: "fe-local", name: "本地前台", type: "URL", value: "http://localhost:5173" }, 1),
  item({ id: "local-api", collectionId: "fe-local", name: "本地 API", type: "URL", value: "http://localhost:8080/api" }, 2),
  item({ id: "local-storybook", collectionId: "fe-local", name: "Storybook", type: "URL", value: "http://localhost:6006" }, 3),
  // 前端 - 开发环境
  item({ id: "dev-web", collectionId: "fe-dev", name: "开发前台", type: "URL", value: "https://dev.opendock.app" }, 1),
  item({ id: "dev-admin", collectionId: "fe-dev", name: "开发后台", type: "URL", value: "https://dev.opendock.app/admin" }, 2),
  item({ id: "dev-api-docs", collectionId: "fe-dev", name: "API 文档", type: "URL", value: "https://dev.opendock.app/docs" }, 3),
  item({ id: "dev-deploy", collectionId: "fe-dev", name: "发布系统", type: "URL", value: "https://ci.opendock.app" }, 4),
  // 前端 - 常用命令
  item({ id: "cmd-dev", collectionId: "fe-cmd", name: "启动开发", type: "命令", value: "npm run dev", workingDirectory: "~/Projects/opendock-app" }, 1),
  item({ id: "cmd-build", collectionId: "fe-cmd", name: "构建生产", type: "命令", value: "npm run build", workingDirectory: "~/Projects/opendock-app" }, 2),
  item({ id: "cmd-test", collectionId: "fe-cmd", name: "运行测试", type: "命令", value: "npm run test", workingDirectory: "~/Projects/opendock-app" }, 3),
  item({ id: "cmd-lint", collectionId: "fe-cmd", name: "代码检查", type: "命令", value: "npm run lint", workingDirectory: "~/Projects/opendock-app" }, 4),
  // 后端 - 代码
  item({ id: "be-main", collectionId: "be-code", name: "API 服务", type: "目录", value: "~/Projects/opendock-server" }, 1),
  item({ id: "be-scripts", collectionId: "be-code", name: "部署脚本", type: "目录", value: "~/Projects/opendock-deploy" }, 2),
  // 后端 - 运维入口
  item({ id: "be-grafana", collectionId: "be-web", name: "Grafana 监控", type: "URL", value: "https://grafana.opendock.app" }, 1),
  item({ id: "be-logs", collectionId: "be-web", name: "日志平台", type: "URL", value: "https://logs.opendock.app" }, 2),
  item({ id: "be-admin", collectionId: "be-web", name: "管理后台", type: "URL", value: "https://admin.opendock.app" }, 3),
  // 后端 - 数据库
  item({ id: "db-dev", collectionId: "be-db", name: "开发库", type: "插件资源", value: "postgresql://dev-db:5432/opendock", tool: "Database Plugin" }, 1),
  item({ id: "db-test", collectionId: "be-db", name: "测试库", type: "插件资源", value: "postgresql://test-db:5432/opendock_test", tool: "Database Plugin" }, 2),
  // 设计 - 设计稿
  item({ id: "figma-main", collectionId: "design-files", name: "Figma 主设计稿", type: "URL", value: "https://figma.com/file/opendock-main" }, 1),
  item({ id: "figma-icons", collectionId: "design-files", name: "图标库", type: "URL", value: "https://figma.com/file/opendock-icons" }, 2),
  item({ id: "design-spec", collectionId: "design-files", name: "设计规范", type: "文件", value: "~/Design/opendock-design-spec.pdf" }, 3),
  // 设计 - 工具
  item({ id: "tool-figma", collectionId: "design-tools", name: "Figma", type: "应用", value: "/Applications/Figma.app" }, 1),
  item({ id: "tool-sketch", collectionId: "design-tools", name: "Sketch", type: "应用", value: "/Applications/Sketch.app" }, 2),
  item({ id: "tool-sip", collectionId: "design-tools", name: "Sip 取色", type: "应用", value: "/Applications/Sip.app" }, 3),
  // 办公 - 文档与报表
  item({ id: "doc-plan", collectionId: "office-docs", name: "项目计划", type: "Excel", value: "~/Documents/项目计划.xlsx" }, 1),
  item({ id: "doc-weekly", collectionId: "office-docs", name: "周报模板", type: "Excel", value: "~/Documents/周报模板.xlsx" }, 2),
  item({ id: "doc-report", collectionId: "office-docs", name: "月度报表", type: "Excel", value: "~/Documents/月度报表.xlsx" }, 3),
  // 常用工具
  item({ id: "tool-snipaste", collectionId: "loose-tools", name: "Snipaste", type: "应用", value: "/Applications/Snipaste.app" }, 1),
  item({ id: "tool-clash", collectionId: "loose-tools", name: "ClashX", type: "应用", value: "/Applications/ClashX.app" }, 2),
  item({ id: "tool-postman", collectionId: "loose-tools", name: "Postman", type: "应用", value: "/Applications/Postman.app" }, 3)
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

export function createSeedData(): AppData {
  return {
    schemaVersion,
    activeWorkspaceId: "default",
    activeSceneId: "frontend",
    activeCollectionId: "fe-dev",
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
      general: { defaultView: "全部资源", recentLimit: 12, confirmBeforeOpen: false, logOpenFailures: true, openWebInNewWindow: false, closeWindowAfterOpen: true, language: "简体中文", autoSnapshotIntervalMinutes: 60, autoSnapshotKeepCount: 7, autoStart: false, startMinimized: false },
      search: { sceneEnterBehavior: "open", collectionEnterBehavior: "open", itemEnterBehavior: "open" },
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
