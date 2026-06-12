// migrate-from-jam-launcher.cjs
// 将 JamLauncher (1.json) 的配置迁移为 OpenDock 可导入的 AppData JSON
// 用法: node _util/migrate-from-jam-launcher.cjs

const fs = require("fs");
const path = require("path");

// ── 路径 ──────────────────────────────────────────────
const INPUT  = "E:\\Desktop\\1.json";
const DIST   = path.join(__dirname, "dist");
const OUTPUT = path.join(DIST, "opendock-import.json");

// ── 常量 ──────────────────────────────────────────────
const schemaVersion = 1;
const now = new Date().toISOString();

// ── 场景类型映射: JamLauncher category → OpenDock SceneType ──
const CATEGORY_TO_SCENE = {
  "业务开发":   "项目",
  "业务调试":   "项目",
  "江湖JS开发": "项目",
  "江湖JS调试": "项目",
  "开发辅助":   "通用",
  "开发文档":   "办公",
  "日常文档":   "办公",
  "学习":       "通用",
  "生活":       "自定义",
  "娱乐":       "自定义",
  "其他":       "自定义",
};

// ── 辅助函数 ──────────────────────────────────────────
let idCounter = 0;
function genId(prefix) {
  idCounter++;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

// 判断 launch_item 的 app 类型
function detectAppType(appId, command) {
  const lower = (command || appId || "").toLowerCase();
  if (lower.includes("cursor"))  return "cursor";
  if (lower.includes("vscode") || lower.includes("code")) return "vscode";
  if (lower.includes("chrome"))  return "chrome";
  if (lower.includes("edge") || lower.includes("msedge")) return "edge";
  if (lower.includes("obsidian")) return "system";
  if (lower.endsWith(".exe")) return "system";
  return "edge";
}

// 预处理 param: 去掉 --folder-uri 前缀和引号
function cleanParam(raw) {
  let p = raw.trim();
  // --folder-uri "vscode-remote://..." 或 --folder-uri vscode-remote://...
  const m = p.match(/^--folder-uri\s+"?(.+?)"?$/);
  if (m) return m[1];
  return p;
}

// 判断参数类型 (在 clean 之后调用)
function detectParamType(param) {
  if (/^https?:\/\//i.test(param)) return "url";
  if (/^vscode-remote:\/\//i.test(param)) return "remote-dir";
  if (/^[A-Za-z]:\\/.test(param)) return "local-dir";
  return "url";
}

// ── 主逻辑 ──────────────────────────────────────────
function migrate() {
  console.log("读取源配置:", INPUT);
  const raw = fs.readFileSync(INPUT, "utf8");
  const src = JSON.parse(raw);

  if (!src.programs || !Array.isArray(src.programs)) {
    throw new Error("源配置缺少 programs 数组");
  }

  // 1. Workspaces
  const workspaces = [
    {
      id: "default",
      name: "OpenDock",
      storage: "本地数据",
      remark: "从 JamLauncher 迁移",
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 2. 收集 categories → scenes (排除"全部")
  const categories = (src.categories || []).filter((c) => c !== "全部");
  const sceneMap = {};
  const scenes = [];

  categories.forEach((cat, idx) => {
    const sceneType = CATEGORY_TO_SCENE[cat] || "自定义";
    const id = genId("scene");
    sceneMap[cat] = id;
    scenes.push({
      id,
      workspaceId: "default",
      name: cat,
      type: sceneType,
      description: `从 JamLauncher 分类"${cat}"迁移`,
      icon: sceneTypeToIcon(sceneType),
      color: sceneTypeToColor(sceneType),
      favorite: false,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 添加"无场景"
  const unboundSceneId = genId("scene");
  scenes.push({
    id: unboundSceneId,
    workspaceId: "default",
    name: "无场景",
    type: "通用",
    description: "未关联场景的独立集合",
    icon: "FolderQuestion",
    color: "#d19a66",
    favorite: false,
    unbound: true,
    createdAt: now,
    updatedAt: now,
  });

  // 3. Tools
  const tools = [
    { id: "cursor",    name: "Cursor",     type: "编辑器", path: "%LOCALAPPDATA%\\Programs\\Cursor\\Cursor.exe",                                     args: "{path}",  default: true },
    { id: "vscode",    name: "VS Code",     type: "编辑器", path: "%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe",                             args: "{path}",  default: false },
    { id: "chrome",    name: "Chrome",      type: "浏览器", path: "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe",                          args: "{url}",   default: true },
    { id: "edge",      name: "Edge",        type: "浏览器", path: "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe",                    args: "{url}",   default: false },
    { id: "powershell",name: "PowerShell",  type: "终端",   path: "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",                   args: "-NoExit -Command {command}", default: true },
    { id: "system",    name: "系统默认应用", type: "系统",   path: "shell:open",                                                                      args: "{path}",  default: true },
  ];

  const toolNameMap = {};
  tools.forEach(t => { toolNameMap[t.id] = t.name; });

  // 4. 每个 program → 一个 Collection, 其 launch_items → Items
  const collections = [];
  const items = [];
  let sortIdx = 0;

  src.programs.forEach((prog) => {
    sortIdx++;
    const category = prog.category || "其他";
    const sceneId = sceneMap[category] || unboundSceneId;
    const collectionId = genId("col");

    const launchItems = prog.launch_items || [];
    let collectionType = "网页集合";
    let defaultToolId = "edge";
    let colIcon = "Globe";
    let colColor = "#74a4d4";

    if (launchItems.length > 0) {
      const firstApp = detectAppType(launchItems[0].app);
      const firstRawParam = (launchItems[0].params && launchItems[0].params[0]) || "";
      const firstParam = cleanParam(firstRawParam);
      const paramType = detectParamType(firstParam);

      if (firstApp === "cursor" || firstApp === "vscode") {
        collectionType = "目录集合";
        defaultToolId = firstApp;
        colIcon = "FolderCode";
        colColor = "#6fb29d";
      } else if (paramType === "url") {
        collectionType = "网页集合";
        defaultToolId = firstApp;
      } else if (paramType === "local-dir" || paramType === "remote-dir") {
        collectionType = "目录集合";
        defaultToolId = firstApp;
        colIcon = "FolderCode";
        colColor = "#6fb29d";
      } else {
        collectionType = "应用集合";
        defaultToolId = "system";
        colIcon = "AppWindow";
        colColor = "#d19a66";
      }
    }

    collections.push({
      id: collectionId,
      workspaceId: "default",
      sceneId: sceneId,
      name: prog.name,
      type: collectionType,
      description: prog.description || "",
      defaultToolId: defaultToolId,
      tool: toolNameMap[defaultToolId] || defaultToolId,
      icon: colIcon,
      color: colColor,
      openStrategy: "all",
      favorite: false,
      recent: false,
      unbound: sceneId === unboundSceneId,
      sort: sortIdx,
      createdAt: now,
      updatedAt: now,
    });

    launchItems.forEach((li) => {
      const appType = detectAppType(li.app);
      const params = li.params || [];

      params.forEach((rawParam, pIdx) => {
        const itemId = genId("item");
        const param = cleanParam(rawParam);
        const paramType = detectParamType(param);
        let itemType, itemIcon, itemColor, itemToolId, itemValue;

        if (paramType === "url") {
          itemType = "URL";
          itemIcon = "Globe";
          itemColor = "#74a4d4";
          itemToolId = appType === "cursor" || appType === "vscode" ? "edge" : appType;
          itemValue = param;
        } else if (paramType === "local-dir") {
          itemType = "目录";
          itemIcon = "FolderCode";
          itemColor = "#6fb29d";
          itemToolId = appType;
          itemValue = param;
        } else if (paramType === "remote-dir") {
          itemType = "目录";
          itemIcon = "FolderCode";
          itemColor = "#6fb29d";
          itemToolId = appType;
          itemValue = param;
        } else {
          itemType = "URL";
          itemIcon = "Globe";
          itemColor = "#74a4d4";
          itemToolId = "edge";
          itemValue = param;
        }

        items.push({
          id: itemId,
          workspaceId: "default",
          collectionId: collectionId,
          name: pIdx === 0 ? prog.name : `${prog.name} (${pIdx + 1})`,
          type: itemType,
          value: itemValue,
          toolId: itemToolId,
          tool: toolNameMap[itemToolId] || itemToolId,
          icon: itemIcon,
          color: itemColor,
          sort: pIdx + 1,
          createdAt: now,
          updatedAt: now,
        });
      });

      // 桌面应用 (无 params 但有 .exe 路径)
      if (params.length === 0 && li.app) {
        const appLower = (li.app || "").toLowerCase();
        if (appLower.endsWith(".exe")) {
          items.push({
            id: genId("item"),
            workspaceId: "default",
            collectionId: collectionId,
            name: prog.name,
            type: "应用",
            value: li.app,
            toolId: "system",
            tool: "系统默认应用",
            icon: "AppWindow",
            color: "#d19a66",
            sort: 1,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    });
  });

  // 5. 组装 AppData
  const appData = {
    schemaVersion,
    activeWorkspaceId: "default",
    activeSceneId: scenes[0]?.id || "",
    activeCollectionId: collections[0]?.id || "",
    workspaces,
    scenes,
    collections,
    items,
    tools,
    plugins: [],
    pluginStore: [],
    settings: {
      general: {
        defaultView: "全部资源",
        recentLimit: 12,
        confirmBeforeOpen: true,
        logOpenFailures: true,
        openWebInNewWindow: true,
        closeWindowAfterOpen: false,
        language: "简体中文",
        autoSnapshotIntervalMinutes: 60,
        autoSnapshotKeepCount: 7,
      },
      search: {
        sceneEnterBehavior: "open",
        collectionEnterBehavior: "open",
        itemEnterBehavior: "open",
      },
      templates: [],
      shortcuts: [
        { action: "显示/隐藏窗口", key: "Alt+O" },
        { action: "命令面板", key: "Ctrl+K" },
      ],
      appearance: {
        theme: "obsidian-dark",
        density: "紧凑",
        sidebarWidth: 306,
        interfaceFontFamily: "Segoe UI, Microsoft YaHei, system-ui, sans-serif",
        monospaceFontFamily: "Cascadia Code, Consolas, monospace",
        baseFontSize: 12,
        showConsole: true,
      },
      webdavSync: {
        serverUrl: "",
        username: "",
        credentialRef: "",
        remotePath: "/",
        autoSync: false,
        syncInterval: "每 30 分钟",
        syncScope: "当前工作区",
        conflictPolicy: "保留两份",
        lastSyncAt: "",
        status: "待同步",
      },
    },
    activity: [
      { id: genId("act"), text: "已从 JamLauncher 迁移配置", createdAt: now },
    ],
  };

  // 6. 写出
  if (!fs.existsSync(DIST)) {
    fs.mkdirSync(DIST, { recursive: true });
  }
  fs.writeFileSync(OUTPUT, JSON.stringify(appData, null, 2), "utf8");

  console.log(`\n迁移完成!`);
  console.log(`  工作区: ${workspaces.length}`);
  console.log(`  场景:   ${scenes.length}`);
  console.log(`  集合:   ${collections.length}`);
  console.log(`  资源:   ${items.length}`);
  console.log(`  工具:   ${tools.length}`);
  console.log(`\n输出文件: ${OUTPUT}`);
}

function sceneTypeToIcon(type) {
  return { "项目":"Code2", "办公":"FileSpreadsheet", "工程":"DraftingCompass", "设计":"Palette", "通用":"Wrench", "自定义":"Folder" }[type] || "Folder";
}

function sceneTypeToColor(type) {
  return { "项目":"#8a7ff0", "办公":"#6fb29d", "工程":"#a58ad7", "设计":"#d19a66", "通用":"#d19a66", "自定义":"#74a4d4" }[type] || "#74a4d4";
}

migrate();
