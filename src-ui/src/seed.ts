import type { AppData, Collection, CollectionItem, CollectionType, ItemType, OpenTool, PluginManifest, Scene, SceneType, ThemeDefinition, Workspace } from "./types";

export const schemaVersion = 1;

const now = "2026-06-07T00:00:00.000Z";

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
  "命令集合": { icon: "SquareTerminal", color: "#dcddde", tool: "PowerShell" },
  "Office 集合": { icon: "FileSpreadsheet", color: "#6fb29d", tool: "Excel" },
  "CAD 集合": { icon: "DraftingCompass", color: "#a58ad7", tool: "AutoCAD" },
  "文件集合": { icon: "Files", color: "#d19a66", tool: "系统默认应用" },
  "应用集合": { icon: "AppWindow", color: "#d19a66", tool: "系统启动" },
  "插件集合": { icon: "Blocks", color: "#8a7ff0", tool: "Plugin Runtime" }
};

export const itemMeta: Record<ItemType, { icon: string; color: string; tool: string }> = {
  目录: { icon: "FolderCode", color: "#6fb29d", tool: "Cursor" },
  URL: { icon: "Globe", color: "#74a4d4", tool: "Chrome" },
  命令: { icon: "Terminal", color: "#dcddde", tool: "PowerShell" },
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
  { id: "official", workspaceId: "default", name: "官网项目", type: "项目", description: "官网项目的代码、网页、命令和插件入口。", icon: "Code2", color: "#8a7ff0", favorite: true, createdAt: now, updatedAt: now },
  { id: "office", workspaceId: "default", name: "月度报表", type: "办公", description: "财务和运营报表相关文件。", icon: "FileSpreadsheet", color: "#6fb29d", favorite: false, createdAt: now, updatedAt: now },
  { id: "cad", workspaceId: "default", name: "CAD 出图", type: "工程", description: "图纸、审图网页和常用 CAD 工具。", icon: "DraftingCompass", color: "#a58ad7", favorite: false, createdAt: now, updatedAt: now },
  { id: "unbound", workspaceId: "default", name: "无场景", type: "通用", description: "未关联场景的独立集合。", icon: "FolderQuestion", color: "#d19a66", favorite: false, unbound: true, createdAt: now, updatedAt: now }
];

const tools: OpenTool[] = [
  { id: "cursor", name: "Cursor", type: "编辑器", path: "%LOCALAPPDATA%\\Programs\\Cursor\\Cursor.exe", args: "{path}", default: true },
  { id: "vscode", name: "VS Code", type: "编辑器", path: "%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe", args: "{path}", default: false },
  { id: "chrome", name: "Chrome", type: "浏览器", path: "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe", args: "{url}", default: true },
  { id: "edge", name: "Edge", type: "浏览器", path: "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe", args: "{url}", default: false },
  { id: "powershell", name: "PowerShell", type: "终端", path: "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", args: "-NoExit -Command {command}", default: true },
  { id: "excel", name: "Excel", type: "Office", path: "%ProgramFiles%\\Microsoft Office\\root\\Office*\\EXCEL.EXE", args: "{path}", default: true },
  { id: "autocad", name: "AutoCAD", type: "CAD", path: "%ProgramFiles%\\Autodesk\\AutoCAD*\\acad.exe", args: "{path}", default: false },
  { id: "system", name: "系统默认应用", type: "系统", path: "shell:open", args: "{path}", default: true }
];

function collection(data: Partial<Collection> & Pick<Collection, "id" | "sceneId" | "name" | "type" | "description">, sort: number): Collection {
  const meta = collectionMeta[data.type];
  const tool = tools.find((item) => item.name === meta.tool) || tools[0];
  return {
    workspaceId: "default",
    defaultToolId: tool.id,
    tool: tool.name,
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
  collection({ id: "code", sceneId: "official", name: "官网-代码目录", type: "目录集合", description: "前端、后端和部署脚本目录。", favorite: true, recent: true }, 1),
  collection({ id: "local-web", sceneId: "official", name: "官网-本地网页", type: "网页集合", description: "本地开发入口。" }, 2),
  collection({ id: "dev-web", sceneId: "official", name: "官网-开发环境网页", type: "网页集合", description: "开发环境前台、后台、接口文档和发布系统入口。", favorite: true, recent: true }, 3),
  collection({ id: "prod-web", sceneId: "official", name: "官网-线上环境网页", type: "网页集合", description: "线上前台、后台、监控和日志入口。" }, 4),
  collection({ id: "commands", sceneId: "official", name: "官网-常用命令", type: "命令集合", description: "启动、构建、测试和部署命令。" }, 5),
  collection({ id: "database-plugin", sceneId: "official", name: "数据库连接入口", type: "插件集合", description: "由 Database 插件定义的数据库连接入口。", pluginId: "database" }, 6),
  collection({ id: "office-files", sceneId: "office", name: "月度报表文件", type: "Office 集合", description: "月报 Excel、PPT 和说明文档。" }, 7),
  collection({ id: "cad-files", sceneId: "cad", name: "施工图集合", type: "CAD 集合", description: "施工图和审图相关资源。" }, 8),
  collection({ id: "loose-tools", sceneId: null, name: "常用独立工具", type: "应用集合", description: "不属于某个场景的工具入口。" }, 9)
];

function item(data: Partial<CollectionItem> & Pick<CollectionItem, "id" | "collectionId" | "name" | "type" | "value">, sort: number): CollectionItem {
  const meta = itemMeta[data.type];
  const tool = tools.find((entry) => entry.name === meta.tool) || tools[0];
  return {
    workspaceId: "default",
    toolId: tool.id,
    tool: tool.name,
    icon: meta.icon,
    color: meta.color,
    sort,
    createdAt: now,
    updatedAt: now,
    ...data
  };
}

const items: CollectionItem[] = [
  item({ id: "frontend-dir", collectionId: "code", name: "前端目录", type: "目录", value: "E:\\code\\official-site\\frontend" }, 1),
  item({ id: "backend-dir", collectionId: "code", name: "后端目录", type: "目录", value: "E:\\code\\official-site\\backend" }, 2),
  item({ id: "local-front", collectionId: "local-web", name: "本地前台", type: "URL", value: "http://localhost:3000" }, 1),
  item({ id: "local-admin", collectionId: "local-web", name: "本地后台", type: "URL", value: "http://localhost:3001/admin" }, 2),
  item({ id: "dev-front", collectionId: "dev-web", name: "开发前台", type: "URL", value: "https://dev.example.com" }, 1),
  item({ id: "dev-admin", collectionId: "dev-web", name: "开发后台", type: "URL", value: "https://dev.example.com/admin" }, 2),
  item({ id: "dev-api", collectionId: "dev-web", name: "接口文档", type: "URL", value: "https://dev.example.com/docs" }, 3),
  item({ id: "prod-front", collectionId: "prod-web", name: "线上前台", type: "URL", value: "https://example.com" }, 1),
  item({ id: "prod-admin", collectionId: "prod-web", name: "线上后台", type: "URL", value: "https://example.com/admin" }, 2),
  item({ id: "cmd-dev", collectionId: "commands", name: "启动开发", type: "命令", value: "npm run dev", workingDirectory: "E:\\code\\official-site\\frontend" }, 1),
  item({ id: "cmd-test", collectionId: "commands", name: "运行测试", type: "命令", value: "npm test", workingDirectory: "E:\\code\\official-site" }, 2),
  item({ id: "db-dev", collectionId: "database-plugin", name: "开发库", type: "插件资源", value: "mysql://dev-db.internal:3306/official", tool: "Database Plugin" }, 1),
  item({ id: "report-xlsx", collectionId: "office-files", name: "月度报表", type: "Excel", value: "D:\\docs\\monthly-report.xlsx" }, 1),
  item({ id: "cad-main", collectionId: "cad-files", name: "施工图 A", type: "CAD", value: "D:\\cad\\drawing-a.dwg" }, 1),
  item({ id: "snipaste", collectionId: "loose-tools", name: "Snipaste", type: "应用", value: "C:\\Program Files\\Snipaste\\Snipaste.exe" }, 1)
];

const themePluginTheme: ThemeDefinition = {
  id: "plugin-forest-mist",
  name: "Forest Mist",
  kind: "light",
  source: "plugin",
  pluginId: "theme-forest-mist",
  swatches: ["#f3f6f1", "#ffffff", "#4d8064"],
  colors: {
    bg: "#f3f6f1",
    bg2: "#ffffff",
    bg3: "#e6ece5",
    bg4: "#d9e2d8",
    text: "#172119",
    muted: "#2f3b34",
    faint: "#4d5b52",
    line: "#d4ddd3",
    lineStrong: "#bdcabd",
    accent: "#4d8064",
    accentSoft: "rgba(77, 128, 100, 0.15)",
    green: "#4d8064",
    red: "#b65a54",
    titlebarBg: "linear-gradient(180deg, #ffffff 0%, #edf3ec 100%)",
    titlebarLine: "#d4ddd3",
    cardActiveBg: "#e7f0e8",
    consoleBg: "#edf2ec",
    shadow: "rgba(48, 64, 55, 0.18)"
  }
};

const pluginStoreTheme: ThemeDefinition = {
  id: "plugin-ink-blue",
  name: "Ink Blue",
  kind: "dark",
  source: "plugin",
  pluginId: "theme-ink-blue",
  swatches: ["#17202c", "#223044", "#6da8d8"],
  colors: {
    bg: "#17202c",
    bg2: "#1d2938",
    bg3: "#273649",
    bg4: "#31445b",
    text: "#edf4fb",
    muted: "#b8c7d7",
    faint: "#8193a6",
    line: "#314154",
    lineStrong: "#4c6278",
    accent: "#6da8d8",
    accentSoft: "rgba(109, 168, 216, 0.18)",
    green: "#72b9aa",
    red: "#d27676",
    titlebarBg: "linear-gradient(180deg, #1c2a3a 0%, #17202c 100%)",
    titlebarLine: "#2d3c50",
    cardActiveBg: "#243348",
    consoleBg: "#121a25",
    shadow: "rgba(0, 0, 0, 0.42)"
  }
};

const plugins: PluginManifest[] = [
  { id: "browser", name: "Browser", version: "1.0.0", category: "资源打开", capability: "多浏览器网页集合打开", permissions: ["workspace:read", "opener:browser"], installed: true, enabled: true, configurable: false },
  { id: "terminal", name: "Terminal", version: "1.0.0", category: "资源打开", capability: "命令集合执行策略", permissions: ["workspace:read", "opener:terminal"], installed: true, enabled: true, configurable: false },
  { id: "webdav-sync", name: "WebDAV Sync", version: "0.2.0", category: "同步", capability: "通过 WebDAV 同步工作区数据", permissions: ["workspace:read", "workspace:write", "network:webdav"], installed: true, enabled: true, configurable: true, status: "待同步" },
  { id: "office", name: "Office", version: "0.1.0", category: "专业文件", capability: "Word / Excel / PPT 文件集合", permissions: ["workspace:read", "opener:office"], installed: true, enabled: true, configurable: false },
  { id: "cad", name: "CAD", version: "0.1.0", category: "专业文件", capability: "DWG / DXF 图纸集合", permissions: ["workspace:read", "opener:cad"], installed: true, enabled: false, configurable: false },
  { id: "database", name: "Database", version: "0.1.0", category: "开发工具", capability: "数据库连接入口", permissions: ["workspace:read", "secret:connection"], installed: true, enabled: true, configurable: false },
  { id: "theme-forest-mist", name: "Forest Mist Theme", version: "1.0.0", category: "主题", capability: "提供清爽的浅色绿色工作台主题", permissions: ["appearance:theme"], installed: true, enabled: true, configurable: false, theme: themePluginTheme }
];

export function createSeedData(): AppData {
  return {
    schemaVersion,
    activeWorkspaceId: "default",
    activeSceneId: "official",
    activeCollectionId: "dev-web",
    workspaces: structuredClone(workspaces),
    scenes: structuredClone(scenes),
    collections: structuredClone(collections),
    items: structuredClone(items),
    tools: structuredClone(tools),
    plugins: structuredClone(plugins),
    pluginStore: [
      { name: "Remote", category: "开发工具", capability: "SSH、远程桌面、服务器入口", permissions: ["workspace:read", "network:remote"] },
      { name: "API Docs", category: "开发工具", capability: "接口文档、Postman、Apifox 入口", permissions: ["workspace:read", "opener:app"] },
      { name: "AList Import", category: "导入", capability: "从 AList 目录导入文件资源", permissions: ["workspace:write", "network:http"], configurable: true },
      { name: "Ink Blue Theme", category: "主题", capability: "安装后提供深蓝墨色主题", permissions: ["appearance:theme"], configurable: false, theme: pluginStoreTheme }
    ],
    settings: {
      general: { defaultView: "全部资源", recentLimit: 12, confirmBeforeOpen: true, logOpenFailures: true, openWebInNewWindow: true, closeWindowAfterOpen: false, language: "简体中文" },
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
        interfaceFontFamily: "Segoe UI, Microsoft YaHei, system-ui, sans-serif",
        monospaceFontFamily: "Cascadia Code, Consolas, monospace",
        baseFontSize: 12,
        showConsole: true
      },
      webdavSync: {
        serverUrl: "https://dav.example.com/opendock",
        username: "yedsn",
        credentialRef: "secret:webdav-sync/default",
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
    ]
  };
}
