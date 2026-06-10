const workspaceFilters = [
  { id: "all", label: "全部资源", hint: "当前场景视图", icon: "inbox" },
  { id: "favorites", label: "收藏集合", hint: "常用入口", icon: "star" },
  { id: "recent", label: "最近打开", hint: "最近使用", icon: "clock-3" },
  { id: "unbound", label: "无场景集合", hint: "独立收藏", icon: "folder-question" }
];

let scenes = [
  {
    id: "official",
    name: "官网项目",
    type: "项目",
    icon: "code-2",
    color: "#8a7ff0",
    favorite: true,
    collections: [
      {
        id: "code",
        name: "官网-代码目录",
        type: "目录集合",
        tool: "Cursor",
        toolIcon: "square-terminal",
        icon: "folder-code",
        color: "#6fb29d",
        description: "前端、后端、部署脚本和配置目录。",
        favorite: true,
        recent: true,
        items: [
          { name: "官网前端", type: "目录", value: "E:\\code\\official-site\\frontend", tool: "Cursor", icon: "folder-code", color: "#6fb29d" },
          { name: "官网后端", type: "目录", value: "E:\\code\\official-site\\server", tool: "Cursor", icon: "folder-code", color: "#6fb29d" },
          { name: "部署脚本", type: "目录", value: "E:\\code\\official-site\\deploy", tool: "VSCode", icon: "folder-cog", color: "#74a4d4" },
          { name: "Nginx 配置", type: "目录", value: "E:\\ops\\nginx\\official-site", tool: "VSCode", icon: "folder-cog", color: "#d19a66" }
        ]
      },
      {
        id: "local-web",
        name: "官网-本地网页",
        type: "网页集合",
        tool: "Chrome",
        toolIcon: "chrome",
        icon: "monitor-dot",
        color: "#74a4d4",
        description: "本地开发服务、调试页和组件预览入口。",
        favorite: false,
        recent: true,
        items: [
          { name: "本地前台", type: "URL", value: "http://localhost:3000", tool: "Chrome", icon: "globe", color: "#74a4d4" },
          { name: "本地后台", type: "URL", value: "http://localhost:7001/admin", tool: "Chrome", icon: "shield", color: "#74a4d4" },
          { name: "组件预览", type: "URL", value: "http://localhost:6006", tool: "Chrome", icon: "layout-template", color: "#a58ad7" }
        ]
      },
      {
        id: "dev-web",
        name: "官网-开发环境网页",
        type: "网页集合",
        tool: "Chrome",
        toolIcon: "chrome",
        icon: "cloud",
        color: "#d19a66",
        description: "开发环境的前台、后台、接口文档和发布系统入口。",
        favorite: true,
        recent: true,
        items: [
          { name: "开发环境官网", type: "URL", value: "https://dev.example.com", tool: "Chrome", icon: "globe", color: "#d19a66" },
          { name: "开发环境后台", type: "URL", value: "https://dev.example.com/admin", tool: "Chrome", icon: "shield", color: "#d19a66" },
          { name: "接口文档", type: "URL", value: "https://dev.example.com/api-docs", tool: "Edge", icon: "book-open", color: "#74a4d4" },
          { name: "发布系统", type: "URL", value: "https://deploy.example.com/official", tool: "Chrome", icon: "rocket", color: "#d06f6b" }
        ]
      },
      {
        id: "prod-web",
        name: "官网-线上环境网页",
        type: "网页集合",
        tool: "Edge",
        toolIcon: "send",
        icon: "radio-tower",
        color: "#d06f6b",
        description: "线上官网、后台、监控和日志入口。",
        favorite: false,
        recent: false,
        items: [
          { name: "线上官网", type: "URL", value: "https://example.com", tool: "Edge", icon: "globe", color: "#d06f6b" },
          { name: "线上后台", type: "URL", value: "https://example.com/admin", tool: "Edge", icon: "shield", color: "#d06f6b" },
          { name: "监控面板", type: "URL", value: "https://monitor.example.com", tool: "Chrome", icon: "activity", color: "#6fb29d" }
        ]
      },
      {
        id: "commands",
        name: "官网-常用命令",
        type: "命令集合",
        tool: "PowerShell",
        toolIcon: "terminal",
        icon: "square-terminal",
        color: "#dcddde",
        description: "启动、构建、拉取和部署相关命令。",
        favorite: true,
        recent: true,
        items: [
          { name: "启动前端", type: "命令", value: "pnpm dev", tool: "PowerShell", icon: "terminal", color: "#dcddde" },
          { name: "启动后端", type: "命令", value: "npm run dev", tool: "PowerShell", icon: "terminal", color: "#dcddde" },
          { name: "拉取代码", type: "命令", value: "git pull --rebase", tool: "Git Bash", icon: "git-branch", color: "#d06f6b" },
          { name: "构建发布包", type: "命令", value: "pnpm build && npm run package", tool: "PowerShell", icon: "package", color: "#d19a66" }
        ]
      }
    ]
  },
  {
    id: "office",
    name: "月度报表",
    type: "办公",
    icon: "file-spreadsheet",
    color: "#6fb29d",
    favorite: false,
    collections: [
      {
        id: "excel-files",
        name: "月度报表-Excel 文件",
        type: "Office 集合",
        tool: "Excel",
        toolIcon: "sheet",
        icon: "file-spreadsheet",
        color: "#6fb29d",
        description: "月度收入、成本、汇总和老板汇报文件。",
        favorite: true,
        recent: true,
        items: [
          { name: "收入统计", type: "Excel", value: "D:\\docs\\收入统计.xlsx", tool: "Excel", icon: "file-spreadsheet", color: "#6fb29d" },
          { name: "成本明细", type: "Excel", value: "D:\\docs\\成本明细.xlsx", tool: "Excel", icon: "file-spreadsheet", color: "#6fb29d" },
          { name: "汇总报表", type: "Excel", value: "D:\\docs\\汇总报表.xlsx", tool: "WPS", icon: "file-spreadsheet", color: "#d19a66" },
          { name: "老板汇报", type: "PPT", value: "D:\\docs\\老板汇报.pptx", tool: "PowerPoint", icon: "presentation", color: "#d06f6b" }
        ]
      },
      {
        id: "office-pages",
        name: "月度报表-相关网页",
        type: "网页集合",
        tool: "Edge",
        toolIcon: "send",
        icon: "globe",
        color: "#74a4d4",
        description: "财务系统、BI 面板和数据填报入口。",
        favorite: false,
        recent: false,
        items: [
          { name: "财务系统", type: "URL", value: "https://finance.example.com", tool: "Edge", icon: "globe", color: "#74a4d4" },
          { name: "BI 面板", type: "URL", value: "https://bi.example.com/monthly", tool: "Chrome", icon: "bar-chart-3", color: "#a58ad7" }
        ]
      }
    ]
  },
  {
    id: "cad",
    name: "施工图整理",
    type: "工程",
    icon: "drafting-compass",
    color: "#a58ad7",
    favorite: false,
    collections: [
      {
        id: "cad-files",
        name: "施工图整理-CAD 文件",
        type: "CAD 集合",
        tool: "AutoCAD",
        toolIcon: "drafting-compass",
        icon: "drafting-compass",
        color: "#a58ad7",
        description: "平面图、立面图、节点详图和图纸目录。",
        favorite: true,
        recent: true,
        items: [
          { name: "平面图", type: "DWG", value: "D:\\cad\\平面图.dwg", tool: "AutoCAD", icon: "file-box", color: "#a58ad7" },
          { name: "立面图", type: "DWG", value: "D:\\cad\\立面图.dwg", tool: "AutoCAD", icon: "file-box", color: "#a58ad7" },
          { name: "节点详图", type: "DWG", value: "D:\\cad\\节点详图.dwg", tool: "中望 CAD", icon: "file-box", color: "#74a4d4" }
        ]
      },
      {
        id: "cad-docs",
        name: "施工图整理-相关资料",
        type: "文件集合",
        tool: "系统默认应用",
        toolIcon: "file-text",
        icon: "files",
        color: "#d19a66",
        description: "设计说明、验收清单和客户确认文件。",
        favorite: false,
        recent: false,
        items: [
          { name: "设计说明", type: "PDF", value: "D:\\cad\\设计说明.pdf", tool: "系统默认应用", icon: "file-text", color: "#d19a66" },
          { name: "验收清单", type: "Word", value: "D:\\cad\\验收清单.docx", tool: "Word", icon: "file-text", color: "#74a4d4" }
        ]
      }
    ]
  },
  {
    id: "tools",
    name: "常用工具",
    type: "通用",
    icon: "wrench",
    color: "#d19a66",
    favorite: true,
    collections: [
      {
        id: "apps",
        name: "常用软件",
        type: "应用集合",
        tool: "系统启动",
        toolIcon: "app-window",
        icon: "app-window",
        color: "#d19a66",
        description: "每天使用的软件和控制台入口。",
        favorite: true,
        recent: true,
        items: [
          { name: "Cursor", type: "应用", value: "C:\\Users\\user\\AppData\\Local\\Programs\\Cursor\\Cursor.exe", tool: "系统启动", icon: "app-window", color: "#dcddde" },
          { name: "Chrome", type: "应用", value: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", tool: "系统启动", icon: "chrome", color: "#74a4d4" },
          { name: "PowerShell", type: "应用", value: "powershell.exe", tool: "系统启动", icon: "terminal", color: "#dcddde" }
        ]
      },
      {
        id: "database-plugin",
        name: "数据库连接入口",
        type: "插件集合",
        tool: "Database Plugin",
        toolIcon: "database",
        icon: "database-zap",
        color: "#6fb29d",
        description: "由插件定义的数据库连接、查询控制台和文档入口。",
        favorite: false,
        recent: false,
        plugin: true,
        items: [
          { name: "开发库", type: "插件资源", value: "mysql://dev-db.internal:3306/official", tool: "Database Plugin", icon: "database", color: "#6fb29d" },
          { name: "只读报表库", type: "插件资源", value: "postgres://reporting.internal:5432/report", tool: "Database Plugin", icon: "database", color: "#6fb29d" }
        ]
      }
    ]
  },
  {
    id: "unbound",
    name: "无场景集合",
    type: "无场景",
    icon: "folder-question",
    color: "#74a4d4",
    favorite: false,
    unbound: true,
    collections: [
      {
        id: "common-pages",
        name: "常用工具网页",
        type: "网页集合",
        tool: "Chrome",
        toolIcon: "chrome",
        icon: "bookmark",
        color: "#74a4d4",
        description: "不绑定任何场景的常用网站、控制台和文档。",
        favorite: true,
        recent: true,
        unbound: true,
        items: [
          { name: "GitHub", type: "URL", value: "https://github.com", tool: "Chrome", icon: "github", color: "#dcddde" },
          { name: "Cloudflare", type: "URL", value: "https://dash.cloudflare.com", tool: "Chrome", icon: "cloud", color: "#d19a66" },
          { name: "Vercel", type: "URL", value: "https://vercel.com/dashboard", tool: "Chrome", icon: "triangle", color: "#dcddde" },
          { name: "API 文档", type: "URL", value: "https://docs.example.com", tool: "Edge", icon: "book-open", color: "#74a4d4" }
        ]
      },
      {
        id: "temporary-files",
        name: "临时文件集合",
        type: "文件集合",
        tool: "系统默认应用",
        toolIcon: "file",
        icon: "archive",
        color: "#d19a66",
        description: "临时下载、待处理文档和短期使用文件。",
        favorite: false,
        recent: false,
        unbound: true,
        items: [
          { name: "临时需求", type: "Markdown", value: "D:\\temp\\临时需求.md", tool: "系统默认应用", icon: "file-text", color: "#74a4d4" },
          { name: "客户截图", type: "PNG", value: "D:\\temp\\客户截图.png", tool: "系统默认应用", icon: "image", color: "#a58ad7" }
        ]
      }
    ]
  }
];

let activeSceneId = "official";
let activeCollectionId = "dev-web";
let activeFilterId = "all";
let activeViewMode = "collections";
let activeMainView = "workspace";
let activeSettingsCategory = "general";
let searchKeyword = "";
let activityCount = 0;

const sceneList = document.getElementById("sceneList");
const dockStrip = document.getElementById("dockStrip");
const itemList = document.getElementById("itemList");
const activityLog = document.getElementById("activityLog");
const workspaceNav = document.getElementById("workspaceNav");
const tabList = document.getElementById("tabList");
const statusResourceCount = document.getElementById("statusResourceCount");
const statusPluginState = document.getElementById("statusPluginState");

function allCollections() {
  return scenes.flatMap((scene) => scene.collections.map((collection) => ({ ...collection, scene })));
}

function totalResourceCount() {
  return allCollections().reduce((sum, collection) => sum + collection.items.length, 0);
}

function pluginCollectionCount() {
  return allCollections().filter((collection) => collection.plugin || collection.type.includes("插件")).length;
}

function getActiveScene() {
  return scenes.find((scene) => scene.id === activeSceneId) || scenes[0];
}

function getActiveCollection() {
  const scene = getActiveScene();
  return scene.collections.find((collection) => collection.id === activeCollectionId) || scene.collections[0];
}

function getVisibleCollections() {
  const scene = getActiveScene();
  let collections = scene.collections.map((collection) => ({ ...collection, scene }));

  if (activeFilterId === "all") {
    collections = activeSceneId === "all" ? allCollections() : collections;
  }
  if (activeFilterId === "favorites") {
    collections = allCollections().filter((collection) => collection.favorite || collection.scene.favorite);
  }
  if (activeFilterId === "recent") {
    collections = allCollections().filter((collection) => collection.recent);
  }
  if (activeFilterId === "unbound") {
    collections = allCollections().filter((collection) => collection.unbound || collection.scene.unbound);
  }
  if (activeViewMode === "web") {
    collections = collections.filter((collection) => collection.type.includes("网页"));
  }
  if (activeViewMode === "tool") {
    collections = collections.filter((collection) => ["命令集合", "应用集合", "插件集合"].includes(collection.type));
  }

  if (searchKeyword) {
    const keyword = searchKeyword.toLowerCase();
    collections = collections.filter((collection) => {
      const itemMatched = collection.items.some((item) => `${item.name} ${item.type} ${item.value} ${item.tool}`.toLowerCase().includes(keyword));
      return `${collection.name} ${collection.type} ${collection.tool} ${collection.description} ${collection.scene.name}`.toLowerCase().includes(keyword) || itemMatched;
    });
  }

  return collections;
}

function ensureActiveCollectionInVisibleList() {
  const visible = getVisibleCollections();
  if (!visible.length) return;
  if (!visible.some((collection) => collection.scene.id === activeSceneId && collection.id === activeCollectionId)) {
    activeSceneId = visible[0].scene.id;
    activeCollectionId = visible[0].id;
  }
}

function renderWorkspaceNav() {
  const counts = {
    all: totalResourceCount(),
    favorites: allCollections().filter((collection) => collection.favorite || collection.scene.favorite).length,
    recent: allCollections().filter((collection) => collection.recent).length,
    unbound: allCollections().filter((collection) => collection.unbound || collection.scene.unbound).length
  };

  workspaceNav.innerHTML = workspaceFilters.map((filter) => `
    <button class="tree-row ${filter.id === activeFilterId ? "active" : ""}" data-filter="${filter.id}">
      <i data-lucide="${filter.icon}"></i><span><span>${filter.label}</span><small>${filter.hint}</small></span><span class="tree-count">${counts[filter.id]}</span>
    </button>
  `).join("");

  workspaceNav.querySelectorAll(".tree-row").forEach((button) => {
    button.addEventListener("click", () => {
      showMainView("workspace");
      activeFilterId = button.dataset.filter;
      logOpen(`切换快速视图: ${button.querySelector("span span").textContent}`);
      ensureActiveCollectionInVisibleList();
      renderAll();
    });
  });
}

function renderScenes() {
  sceneList.innerHTML = scenes.map((scene) => {
    const count = scene.collections.reduce((sum, collection) => sum + collection.items.length, 0);
    return `
      <button class="scene-button ${scene.id === activeSceneId && activeFilterId === "all" ? "active" : ""}" data-scene="${scene.id}">
        <span class="scene-icon"><i data-lucide="${scene.icon}"></i></span>
        <span>
          <span class="scene-name">${scene.name}</span>
          <span class="scene-detail">${scene.type} · ${scene.collections.length} 个集合</span>
        </span>
        <span class="scene-count">${count}</span>
      </button>
    `;
  }).join("");

  sceneList.querySelectorAll(".scene-button").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilterId = "all";
      activeSceneId = button.dataset.scene;
      activeCollectionId = getActiveScene().collections[0].id;
      logOpen(`打开场景: ${getActiveScene().name}`);
      renderAll();
    });
  });
}

function renderTabs() {
  const activeScene = getActiveScene();
  const pinned = [activeScene, ...scenes.filter((scene) => scene.id !== activeScene.id).slice(0, 2)];
  tabList.innerHTML = pinned.map((scene, index) => `
    <button class="tab ${scene.id === activeSceneId ? "active" : ""}" data-scene="${scene.id}">
      <i ${index === 0 ? 'id="pageIcon"' : ""} data-lucide="${scene.icon}"></i>
      <span ${index === 0 ? 'id="sceneCrumb"' : ""}>${scene.name}</span>
      ${index === 0 ? '<i data-lucide="x"></i>' : '<span></span>'}
    </button>
  `).join("");

  tabList.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilterId = "all";
      activeSceneId = button.dataset.scene;
      activeCollectionId = getActiveScene().collections[0].id;
      renderAll();
    });
  });
}

function renderCollections() {
  ensureActiveCollectionInVisibleList();
  const scene = getActiveScene();
  const visibleCollections = getVisibleCollections();
  const totalItems = visibleCollections.reduce((sum, collection) => sum + collection.items.length, 0);
  const title = activeFilterId === "all" ? scene.name : workspaceFilters.find((filter) => filter.id === activeFilterId).label;
  const typeText = activeFilterId === "all" ? `${scene.type}场景` : "筛选视图";

  document.getElementById("sceneTitle").textContent = title;
  document.getElementById("sceneMeta").textContent = `${typeText} · ${visibleCollections.length} 个集合 · ${totalItems} 个资源`;

  if (!visibleCollections.length) {
    dockStrip.innerHTML = `<div class="empty-state"><i data-lucide="search-x"></i><span>没有匹配的集合</span><small>调整搜索词或切换筛选。</small></div>`;
    renderEmptyDetails();
    return;
  }

  dockStrip.innerHTML = visibleCollections.map((collection) => `
    <button class="collection-card ${collection.scene.id === activeSceneId && collection.id === activeCollectionId ? "active" : ""}" data-scene="${collection.scene.id}" data-collection="${collection.id}">
      <span class="collection-icon"><i data-lucide="${collection.icon}"></i></span>
      <span>
        <span class="collection-name">${collection.name}</span>
        <span class="collection-description">${collection.scene.name} · ${collection.description}</span>
      </span>
      <span class="collection-meta">
        <span class="pill">${collection.type}</span>
        <span class="pill">${collection.items.length} 项</span>
        <span class="pill">${collection.tool}</span>
      </span>
    </button>
  `).join("");

  dockStrip.querySelectorAll(".collection-card").forEach((button) => {
    button.addEventListener("click", () => {
      activeSceneId = button.dataset.scene;
      activeCollectionId = button.dataset.collection;
      renderAll();
    });
  });
}

function renderEmptyDetails() {
  document.getElementById("collectionType").textContent = "空视图";
  document.getElementById("collectionTitle").textContent = "没有可显示的集合";
  document.getElementById("collectionDescription").textContent = "当前筛选条件下没有集合。";
  document.getElementById("defaultTool").textContent = "无";
  document.getElementById("toolIcon").setAttribute("data-lucide", "ban");
  document.getElementById("itemCount").textContent = "0 个资源";
  itemList.innerHTML = `<div class="empty-state inline"><i data-lucide="inbox"></i><span>无资源项</span></div>`;
}

function renderDetails() {
  const visibleCollections = getVisibleCollections();
  if (!visibleCollections.length) {
    renderEmptyDetails();
    return;
  }

  const collection = getActiveCollection();
  document.getElementById("collectionType").textContent = collection.type;
  document.getElementById("collectionTitle").textContent = collection.name;
  document.getElementById("collectionDescription").textContent = collection.description;
  document.getElementById("defaultTool").textContent = collection.tool;
  document.getElementById("toolIcon").setAttribute("data-lucide", collection.toolIcon);
  document.getElementById("itemCount").textContent = `${collection.items.length} 个资源`;

  itemList.innerHTML = collection.items.map((item, index) => `
    <div class="resource-row">
      <span class="resource-icon"><i data-lucide="${item.icon}"></i></span>
      <span class="resource-main">
        <span class="resource-name">${item.name} <em>${item.type}</em></span>
        <span class="resource-value">${item.value}</span>
      </span>
      <span class="tool-tag">${item.tool}</span>
      <button class="row-open" data-index="${index}"><i data-lucide="play"></i><span>打开</span></button>
    </div>
  `).join("");

  itemList.querySelectorAll(".row-open").forEach((button) => {
    button.addEventListener("click", () => {
      const item = collection.items[Number(button.dataset.index)];
      logOpen(`${item.tool} 打开 ${item.name} (${item.type})`);
    });
  });
}

function logOpen(message) {
  const now = new Date();
  const time = now.toLocaleTimeString("zh-CN", { hour12: false });
  const line = document.createElement("div");
  line.className = "log-line";
  line.innerHTML = `<strong>${time}</strong> ${message}`;

  const empty = activityLog.querySelector(".empty-log");
  if (empty) empty.remove();
  activityLog.prepend(line);
  activityCount += 1;
  document.getElementById("statusActivityCount").textContent = `${activityCount} actions`;
}


let workspaces = [
  { id: "default", name: "OpenDock", storage: "本地数据", remark: "默认本地工作空间" },
  { id: "archive", name: "Archive Dock", storage: "归档资源", remark: "长期归档和历史项目入口" }
];
let activeWorkspaceId = "default";

function getActiveWorkspace() {
  return workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0];
}


const settingsCategories = [
  { id: "general", label: "通用设置", icon: "sliders-horizontal", description: "配置启动入口、最近记录和基础行为。" },
  { id: "workspace", label: "工作区设置", icon: "database", description: "查看当前工作区，并进入工作区管理。" },
  { id: "tools", label: "打开工具", icon: "wrench", description: "配置编辑器、浏览器、终端、Office、CAD 和系统默认应用。" },
  { id: "templates", label: "集合模板", icon: "layout-template", description: "配置项目类场景默认创建的集合模板。" },
  { id: "plugins", label: "插件管理", icon: "blocks", description: "管理插件状态和扩展能力。" },
  { id: "shortcuts", label: "快捷键", icon: "keyboard", description: "配置高频操作快捷键。" },
  { id: "data", label: "数据与备份", icon: "archive", description: "导入、导出、清理和重置模拟操作。" },
  { id: "appearance", label: "外观", icon: "paintbrush", description: "调整主题、密度、侧栏宽度和 Console 显示。" }
];

const aboutSettingsCategory = { id: "about", label: "关于", icon: "info", description: "查看产品定位、版本和当前原型说明。" };

function getSettingsCategories() {
  const pluginCategories = settingsState.plugins
    .filter((plugin) => plugin.installed && plugin.configurable)
    .map((plugin) => ({
      id: `plugin:${plugin.id}`,
      label: plugin.name,
      icon: plugin.id === "webdav-sync" ? "refresh-cw" : "blocks",
      description: `${plugin.name} 插件配置。`,
      group: "plugin"
    }));
  return [...settingsCategories, ...pluginCategories, aboutSettingsCategory];
}

const settingsState = {
  general: {
    defaultView: "全部资源",
    recentLimit: 12,
    confirmBeforeOpen: true,
    logOpenFailures: true,
    language: "简体中文"
  },
  tools: [
    { name: "Cursor", type: "编辑器", path: "C:\\Users\\user\\AppData\\Local\\Programs\\Cursor\\Cursor.exe", args: "{path}", default: true },
    { name: "Chrome", type: "浏览器", path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", args: "{url}", default: true },
    { name: "PowerShell", type: "终端", path: "powershell.exe", args: "-NoExit -Command {command}", default: true },
    { name: "Excel", type: "Office", path: "EXCEL.EXE", args: "{path}", default: true },
    { name: "AutoCAD", type: "CAD", path: "acad.exe", args: "{path}", default: false },
    { name: "系统默认应用", type: "系统", path: "shell:open", args: "{path}", default: true }
  ],
  templates: ["代码目录", "本地网页", "开发环境网页", "线上环境网页", "常用命令"],
  plugins: [
    { id: "browser", name: "Browser", version: "1.0.0", category: "资源打开", capability: "多浏览器网页集合打开", permissions: ["workspace:read", "opener:browser"], enabled: true, installed: true, configurable: false },
    { id: "terminal", name: "Terminal", version: "1.0.0", category: "资源打开", capability: "命令集合执行策略", permissions: ["workspace:read", "opener:terminal"], enabled: true, installed: true, configurable: false },
    { id: "webdav-sync", name: "WebDAV Sync", version: "0.2.0", category: "同步", capability: "通过 WebDAV 同步工作区数据", permissions: ["workspace:read", "workspace:write", "network:webdav"], enabled: true, installed: true, configurable: true, status: "待同步" },
    { id: "office", name: "Office", version: "0.1.0", category: "专业文件", capability: "Word / Excel / PPT 文件集合", permissions: ["workspace:read", "opener:office"], enabled: true, installed: true, configurable: false },
    { id: "cad", name: "CAD", version: "0.1.0", category: "专业文件", capability: "DWG / DXF 图纸集合", permissions: ["workspace:read", "opener:cad"], enabled: false, installed: true, configurable: false },
    { id: "database", name: "Database", version: "0.1.0", category: "开发工具", capability: "数据库连接入口", permissions: ["workspace:read", "secret:connection"], enabled: true, installed: true, configurable: false }
  ],
  pluginStore: [
    { name: "Remote", category: "开发工具", capability: "SSH、远程桌面、服务器入口", permissions: ["workspace:read", "network:remote"] },
    { name: "API Docs", category: "开发工具", capability: "接口文档、Postman、Apifox 入口", permissions: ["workspace:read", "opener:app"] },
    { name: "AList Import", category: "导入", capability: "从 AList 目录导入文件资源", permissions: ["workspace:write", "network:http"], configurable: true }
  ],
  webdavSync: {
    serverUrl: "https://dav.example.com/opendock",
    username: "yedsn",
    credential: "••••••••••••",
    remotePath: "/OpenDock/workspaces",
    autoSync: true,
    syncInterval: "每 30 分钟",
    syncScope: "当前工作区",
    conflictPolicy: "保留两份",
    lastSyncAt: "尚未同步",
    status: "待同步"
  },
  shortcuts: [
    { action: "命令面板", key: "Ctrl+K" },
    { action: "打开当前集合", key: "Ctrl+Enter" },
    { action: "打开当前场景", key: "Ctrl+Shift+Enter" },
    { action: "新建集合", key: "Ctrl+N" },
    { action: "添加资源", key: "Ctrl+Shift+N" }
  ],
  appearance: {
    theme: "Obsidian Dark",
    density: "紧凑",
    sidebarWidth: 260,
    showConsole: true
  }
};
let activeModal = null;
let editingWorkspaceId = null;
let idSeed = 1000;

const sceneTypeMeta = {
  项目: { icon: "code-2", color: "#8a7ff0" },
  办公: { icon: "file-spreadsheet", color: "#6fb29d" },
  工程: { icon: "drafting-compass", color: "#a58ad7" },
  设计: { icon: "palette", color: "#d19a66" },
  通用: { icon: "wrench", color: "#d19a66" },
  自定义: { icon: "folder", color: "#74a4d4" }
};

const collectionTypeMeta = {
  "目录集合": { icon: "folder-code", tool: "Cursor", toolIcon: "square-terminal", color: "#6fb29d" },
  "网页集合": { icon: "globe", tool: "Chrome", toolIcon: "chrome", color: "#74a4d4" },
  "命令集合": { icon: "square-terminal", tool: "PowerShell", toolIcon: "terminal", color: "#dcddde" },
  "Office 集合": { icon: "file-spreadsheet", tool: "Excel", toolIcon: "sheet", color: "#6fb29d" },
  "CAD 集合": { icon: "drafting-compass", tool: "AutoCAD", toolIcon: "drafting-compass", color: "#a58ad7" },
  "文件集合": { icon: "files", tool: "系统默认应用", toolIcon: "file", color: "#d19a66" },
  "应用集合": { icon: "app-window", tool: "系统启动", toolIcon: "app-window", color: "#d19a66" },
  "插件集合": { icon: "blocks", tool: "Plugin Runtime", toolIcon: "blocks", color: "#8a7ff0" }
};

const itemTypeMeta = {
  目录: { icon: "folder-code", tool: "Cursor", color: "#6fb29d" },
  URL: { icon: "globe", tool: "Chrome", color: "#74a4d4" },
  命令: { icon: "terminal", tool: "PowerShell", color: "#dcddde" },
  Excel: { icon: "file-spreadsheet", tool: "Excel", color: "#6fb29d" },
  CAD: { icon: "file-box", tool: "AutoCAD", color: "#a58ad7" },
  文件: { icon: "file-text", tool: "系统默认应用", color: "#d19a66" },
  应用: { icon: "app-window", tool: "系统启动", color: "#d19a66" },
  插件资源: { icon: "blocks", tool: "Plugin Runtime", color: "#8a7ff0" }
};

function makeId(prefix) {
  idSeed += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeed}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function optionList(options, selected) {
  return options.map((option) => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
}

function fieldText(name, label, placeholder = "", value = "", required = false) {
  return `<div class="form-field"><label for="${name}">${label}${required ? " *" : ""}</label><input id="${name}" name="${name}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${required ? "required" : ""}></div>`;
}

function fieldSelect(name, label, options, selected) {
  return `<div class="form-field"><label for="${name}">${label}</label><select id="${name}" name="${name}">${optionList(options, selected)}</select></div>`;
}

function fieldTextarea(name, label, placeholder = "", value = "") {
  return `<div class="form-field full"><label for="${name}">${label}</label><textarea id="${name}" name="${name}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea></div>`;
}


function toolTypesForCollection(collectionType) {
  const map = {
    "目录集合": ["编辑器", "系统"],
    "网页集合": ["浏览器"],
    "命令集合": ["终端"],
    "Office 集合": ["Office", "系统"],
    "CAD 集合": ["CAD", "系统"],
    "文件集合": ["系统", "Office", "CAD", "编辑器"],
    "应用集合": ["系统"],
    "插件集合": ["系统", "终端"]
  };
  return map[collectionType] || ["系统"];
}

function toolsForCollectionType(collectionType) {
  const allowedTypes = toolTypesForCollection(collectionType);
  return settingsState.tools.filter((tool) => allowedTypes.includes(tool.type));
}

function defaultToolForCollectionType(collectionType) {
  const tools = toolsForCollectionType(collectionType);
  return tools.find((tool) => tool.default) || tools[0] || settingsState.tools.find((tool) => tool.default) || settingsState.tools[0];
}

function toolOptionsForCollectionType(collectionType) {
  return toolsForCollectionType(collectionType).map((tool) => tool.name);
}
function showModal(kind, options = {}) {
  activeModal = kind;
  editingWorkspaceId = options.workspaceId || null;
  const backdrop = document.getElementById("modalBackdrop");
  const title = document.getElementById("modalTitle");
  const eyebrow = document.getElementById("modalEyebrow");
  const fields = document.getElementById("modalFields");
  const error = document.getElementById("modalError");
  error.hidden = true;
  error.textContent = "";

  if (kind === "workspace") {
    const editingWorkspace = editingWorkspaceId ? workspaces.find((workspace) => workspace.id === editingWorkspaceId) : null;
    eyebrow.textContent = "Workspace";
    title.textContent = editingWorkspace ? "编辑工作区" : "新建工作区";
    fields.innerHTML = `<div class="form-grid">${fieldText("workspaceName", "工作区名称", "例如：我的工作台", editingWorkspace?.name || "", true)}${fieldText("workspaceStorage", "存储说明", "例如：本地配置", editingWorkspace?.storage || "本地数据", true)}</div>${fieldTextarea("workspaceRemark", "备注", "用于说明这个工作区管理哪些资源", editingWorkspace?.remark || "")}`;
  }

  if (kind === "manage-workspaces") {
    eyebrow.textContent = "Workspaces";
    title.textContent = "管理工作区";
    fields.innerHTML = `
      <div class="workspace-manage-toolbar">
        <button type="button" class="form-button primary" data-workspace-action="new"><i data-lucide="plus"></i><span>新增工作区</span></button>
      </div>
      <div class="workspace-manage-list">
        ${workspaces.map((workspace) => `
          <div class="workspace-manage-row" data-workspace-row="${workspace.id}">
            <span><strong>${escapeHtml(workspace.name)}</strong><small>${escapeHtml(workspace.storage)} · ${escapeHtml(workspace.remark || "无备注")}</small></span>
            <span class="workspace-row-actions">
              <button type="button" data-workspace-action="switch" data-workspace-id="${workspace.id}">${workspace.id === activeWorkspaceId ? "当前" : "切换"}</button>
              <button type="button" data-workspace-action="edit" data-workspace-id="${workspace.id}">编辑</button>
              <button type="button" data-workspace-action="delete" data-workspace-id="${workspace.id}" ${workspaces.length <= 1 ? "disabled" : ""}>删除</button>
            </span>
          </div>
        `).join("")}
      </div>`;
  }

  if (kind === "scene") {
    eyebrow.textContent = "Scene";
    title.textContent = "新建场景";
    fields.innerHTML = `<div class="form-grid">${fieldText("sceneName", "场景名称", "例如：客户 A 官网", "", true)}${fieldSelect("sceneType", "场景类型", Object.keys(sceneTypeMeta), "项目")}${fieldSelect("sceneIcon", "图标", ["code-2", "file-spreadsheet", "drafting-compass", "wrench", "folder", "palette"], "code-2")}${fieldSelect("sceneColor", "颜色", ["#8a7ff0", "#6fb29d", "#74a4d4", "#d19a66", "#d06f6b", "#a58ad7"], "#8a7ff0")}</div>${fieldTextarea("sceneDescription", "说明", "例如：管理官网项目的目录、网页和命令")}`;
  }

  if (kind === "collection") {
    const scene = getActiveScene();
    const sceneOptions = ["当前场景", "无场景集合"];
    const defaultCollectionType = "网页集合";
    fields.innerHTML = `<div class="form-grid">${fieldText("collectionName", "集合名称", `例如：${scene.name}-测试环境网页`, "", true)}${fieldSelect("collectionType", "集合类型", Object.keys(collectionTypeMeta), defaultCollectionType)}${fieldSelect("collectionTool", "默认工具", toolOptionsForCollectionType(defaultCollectionType), defaultToolForCollectionType(defaultCollectionType)?.name)}${fieldSelect("collectionTarget", "关联方式", sceneOptions, "当前场景")}</div>${fieldTextarea("collectionDescriptionInput", "集合说明", "这个集合用于收纳哪些资源")}`;
    eyebrow.textContent = "Collection";
    title.textContent = "新建集合";
  }

  if (kind === "item") {
    const collection = getActiveCollection();
    fields.innerHTML = `<div class="form-grid">${fieldText("itemName", "资源名称", "例如：测试后台", "", true)}${fieldSelect("itemType", "资源类型", Object.keys(itemTypeMeta), collection.type.includes("网页") ? "URL" : "文件")}${fieldText("itemValue", "资源内容", "路径、URL、命令或插件数据", "", true)}${fieldText("itemTool", "打开工具", "例如：Chrome / Excel / AutoCAD", collection.tool, true)}${fieldText("itemWorkingDirectory", "工作目录", "命令资源可填写", "")}${fieldText("itemArgs", "启动参数", "可选", "")}</div>${fieldTextarea("itemRemark", "备注", "可选说明")}`;
    eyebrow.textContent = "Resource";
    title.textContent = "添加集合资源";
  }

  backdrop.hidden = false;
  const firstInput = fields.querySelector("input, select, textarea");
  if (kind === "collection") bindCollectionToolSelector();
  if (firstInput) firstInput.focus();
  refreshIcons();
}

function closeModal() {
  activeModal = null;
  document.getElementById("modalBackdrop").hidden = true;
  document.getElementById("modalForm").reset();
  document.getElementById("modalError").hidden = true;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function showFormError(message) {
  const error = document.getElementById("modalError");
  error.textContent = message;
  error.hidden = false;
}


function bindCollectionToolSelector() {
  const typeSelect = document.getElementById("collectionType");
  const toolSelect = document.getElementById("collectionTool");
  if (!typeSelect || !toolSelect) return;
  const refreshToolOptions = () => {
    const collectionType = typeSelect.value;
    const defaultTool = defaultToolForCollectionType(collectionType);
    const toolNames = toolOptionsForCollectionType(collectionType);
    toolSelect.innerHTML = optionList(toolNames, defaultTool?.name || toolNames[0]);
  };
  typeSelect.addEventListener("change", refreshToolOptions);
}

function enforceSingleDefaultToolPerType() {
  const seen = new Set();
  settingsState.tools.forEach((tool) => {
    if (!tool.default) return;
    if (seen.has(tool.type)) {
      tool.default = false;
      return;
    }
    seen.add(tool.type);
  });
  ["编辑器", "浏览器", "终端", "Office", "CAD", "系统"].forEach((type) => {
    const tools = settingsState.tools.filter((tool) => tool.type === type);
    if (tools.length && !tools.some((tool) => tool.default)) tools[0].default = true;
  });
}
function createDefaultProjectCollections(sceneName) {
  return [
    makeCollection(`${sceneName}-代码目录`, "目录集合", defaultToolForCollectionType("目录集合")?.name, "项目代码、配置和脚本目录。"),
    makeCollection(`${sceneName}-本地网页`, "网页集合", defaultToolForCollectionType("网页集合")?.name, "本地开发地址和调试入口。"),
    makeCollection(`${sceneName}-开发环境网页`, "网页集合", defaultToolForCollectionType("网页集合")?.name, "开发环境前台、后台和接口文档。"),
    makeCollection(`${sceneName}-线上环境网页`, "网页集合", defaultToolForCollectionType("网页集合")?.name, "线上地址、后台、监控入口。"),
    makeCollection(`${sceneName}-常用命令`, "命令集合", defaultToolForCollectionType("命令集合")?.name, "启动、构建、部署和维护命令。")
  ];
}

function makeCollection(name, type, tool, description, unbound = false) {
  const meta = collectionTypeMeta[type] || collectionTypeMeta["文件集合"];
  return {
    id: makeId("collection"),
    name,
    type,
    tool: tool || meta.tool,
    toolIcon: meta.toolIcon,
    icon: meta.icon,
    color: meta.color,
    description: description || "新建集合。",
    favorite: false,
    recent: false,
    unbound,
    plugin: type === "插件集合",
    items: []
  };
}

function createWorkspace(data) {
  const name = data.workspaceName.trim();
  const storage = data.workspaceStorage.trim();
  if (!name || !storage) return showFormError("工作区名称和存储说明必填。");

  if (editingWorkspaceId) {
    const workspace = workspaces.find((item) => item.id === editingWorkspaceId);
    if (!workspace) return showFormError("要编辑的工作区不存在。");
    workspace.name = name;
    workspace.storage = storage;
    workspace.remark = data.workspaceRemark.trim() || "无备注";
    logOpen(`编辑工作区: ${name}`);
  } else {
    const workspace = { id: makeId("workspace"), name, storage, remark: data.workspaceRemark.trim() || "新建工作区" };
    workspaces.push(workspace);
    activeWorkspaceId = workspace.id;
    logOpen(`新建并切换工作区: ${name} / ${storage}`);
  }

  closeModal();
  renderAll();
}

function createScene(data) {
  const name = data.sceneName.trim();
  if (!name) return showFormError("场景名称必填。");
  const type = data.sceneType || "自定义";
  const meta = sceneTypeMeta[type] || sceneTypeMeta["自定义"];
  const scene = {
    id: makeId("scene"),
    name,
    type,
    icon: data.sceneIcon || meta.icon,
    color: data.sceneColor || meta.color,
    favorite: false,
    collections: type === "项目" ? createDefaultProjectCollections(name) : []
  };
  scenes.push(scene);
  activeFilterId = "all";
  activeViewMode = "collections";
  activeSceneId = scene.id;
  activeCollectionId = scene.collections[0]?.id || "";
  logOpen(`创建场景: ${name} (${type})${type === "项目" ? "，已生成默认集合" : ""}`);
  closeModal();
  renderAll();
}

function createCollection(data) {
  const name = data.collectionName.trim();
  const tool = data.collectionTool.trim();
  if (!name || !tool) return showFormError("集合名称和默认工具必填。");
  const type = data.collectionType || "文件集合";
  const unbound = data.collectionTarget === "无场景集合";
  const collection = makeCollection(name, type, tool, data.collectionDescriptionInput.trim(), unbound);
  let scene = unbound ? scenes.find((item) => item.id === "unbound") : getActiveScene();
  if (!scene) {
    scene = { id: "unbound", name: "无场景集合", type: "无场景", icon: "folder-question", color: "#74a4d4", favorite: false, unbound: true, collections: [] };
    scenes.push(scene);
  }
  scene.collections.push(collection);
  activeFilterId = unbound ? "unbound" : "all";
  activeViewMode = "collections";
  activeSceneId = scene.id;
  activeCollectionId = collection.id;
  logOpen(`创建集合: ${name} / ${type} / ${tool}`);
  closeModal();
  renderAll();
}

function createItem(data) {
  const name = data.itemName.trim();
  const value = data.itemValue.trim();
  const tool = data.itemTool.trim();
  if (!name || !value || !tool) return showFormError("资源名称、资源内容和打开工具必填。");
  const type = data.itemType || "文件";
  const meta = itemTypeMeta[type] || itemTypeMeta["文件"];
  const collection = getActiveCollection();
  collection.items.push({
    name,
    type,
    value,
    tool,
    workingDirectory: data.itemWorkingDirectory.trim(),
    args: data.itemArgs.trim(),
    remark: data.itemRemark.trim(),
    icon: meta.icon,
    color: meta.color
  });
  collection.recent = true;
  logOpen(`添加资源: ${name} -> ${collection.name}`);
  closeModal();
  renderAll();
}


function handleWorkspaceManageClick(event) {
  const button = event.target.closest("[data-workspace-action]");
  if (!button) return;
  const action = button.dataset.workspaceAction;
  const workspaceId = button.dataset.workspaceId;

  if (action === "new") {
    showModal("workspace");
    return;
  }

  if (action === "switch") {
    activeWorkspaceId = workspaceId;
    logOpen(`切换工作区: ${getActiveWorkspace().name}`);
    closeModal();
    renderAll();
    return;
  }

  if (action === "edit") {
    showModal("workspace", { workspaceId });
    return;
  }

  if (action === "delete") {
    if (workspaces.length <= 1) {
      showFormError("至少需要保留一个工作区。");
      return;
    }
    const workspace = workspaces.find((item) => item.id === workspaceId);
    if (!window.confirm(`确定要删除工作区「${workspace?.name || workspaceId}」吗？此操作不可恢复。`)) {
      return;
    }
    workspaces = workspaces.filter((item) => item.id !== workspaceId);
    if (activeWorkspaceId === workspaceId) {
      activeWorkspaceId = workspaces[0].id;
    }
    logOpen(`删除工作区: ${workspace?.name || workspaceId}`);
    showModal("manage-workspaces");
  }
}
function handleModalSubmit(event) {
  event.preventDefault();
  const data = formData(event.currentTarget);
  if (activeModal === "workspace") return createWorkspace(data);
  if (activeModal === "manage-workspaces") return closeModal();
  if (activeModal === "scene") return createScene(data);
  if (activeModal === "collection") return createCollection(data);
  if (activeModal === "item") return createItem(data);
}

function renderWorkspaceDropdown() {
  const dropdown = document.getElementById("workspaceDropdown");
  dropdown.innerHTML = `
    <div class="workspace-menu-section">
      <div class="workspace-menu-title">切换工作区</div>
      ${workspaces.map((workspace) => `
        <button class="workspace-menu-item ${workspace.id === activeWorkspaceId ? "active" : ""}" data-workspace="${workspace.id}">
          <i data-lucide="database"></i>
          <span><strong>${escapeHtml(workspace.name)}</strong><small>${escapeHtml(workspace.storage)}</small></span>
          ${workspace.id === activeWorkspaceId ? '<i data-lucide="check"></i>' : '<span></span>'}
        </button>
      `).join("")}
    </div>
    <div class="workspace-menu-divider"></div>
    <div class="workspace-menu-section">
      <button class="workspace-menu-item" data-action="new-workspace"><i data-lucide="plus"></i><span><strong>新建工作区</strong><small>创建一个新的资源工作台</small></span><span></span></button>
      <button class="workspace-menu-item" data-action="manage-workspaces"><i data-lucide="settings"></i><span><strong>管理工作区</strong><small>查看当前可用工作区</small></span><span></span></button>
    </div>
  `;

  dropdown.querySelectorAll("[data-workspace]").forEach((button) => {
    button.addEventListener("click", () => {
      activeWorkspaceId = button.dataset.workspace;
      dropdown.hidden = true;
      logOpen(`切换工作区: ${getActiveWorkspace().name}`);
      renderAll();
    });
  });

  dropdown.querySelector('[data-action="new-workspace"]').addEventListener("click", () => {
    dropdown.hidden = true;
    showModal("workspace");
  });
  dropdown.querySelector('[data-action="manage-workspaces"]').addEventListener("click", () => {
    dropdown.hidden = true;
    showModal("manage-workspaces");
  });
}

function toggleWorkspaceDropdown() {
  const dropdown = document.getElementById("workspaceDropdown");
  renderWorkspaceDropdown();
  dropdown.hidden = !dropdown.hidden;
  refreshIcons();
}

function settingField(name, label, value, type = "text") {
  return `<div class="setting-field"><label for="${name}">${label}</label><input id="${name}" data-setting="${name}" type="${type}" value="${escapeHtml(value)}"></div>`;
}

function settingSelect(name, label, options, selected) {
  return `<div class="setting-field"><label for="${name}">${label}</label><select id="${name}" data-setting="${name}">${optionList(options, selected)}</select></div>`;
}

function settingSwitch(name, checked) {
  return `<label class="setting-switch"><input data-setting="${name}" type="checkbox" ${checked ? "checked" : ""}><span></span></label>`;
}

function renderSettingsNav() {
  const nav = document.getElementById("settingsNavList");
  nav.innerHTML = getSettingsCategories().map((category) => `
    <button class="settings-nav-item ${category.group === "plugin" ? "plugin-settings-item" : ""} ${category.id === activeSettingsCategory ? "active" : ""}" data-settings-category="${category.id}">
      <i data-lucide="${category.icon}"></i><span>${category.label}</span>
    </button>
  `).join("");

  nav.querySelectorAll("[data-settings-category]").forEach((button) => {
    button.addEventListener("click", () => {
      activeSettingsCategory = button.dataset.settingsCategory;
      renderSettingsPage();
    });
  });
}

function renderGeneralSettings() {
  const general = settingsState.general;
  return `
    <section class="settings-card">
      <div class="settings-card-title">基础行为</div>
      <div class="settings-card-description">这些设置会影响启动入口、打开前确认和日志记录策略。</div>
      <div class="settings-grid">
        ${settingSelect("defaultView", "启动默认视图", ["全部资源", "最近打开", "收藏集合", "无场景集合"], general.defaultView)}
        ${settingField("recentLimit", "最近打开数量", general.recentLimit, "number")}
        <div class="setting-field"><label>打开前确认</label>${settingSwitch("confirmBeforeOpen", general.confirmBeforeOpen)}</div>
        <div class="setting-field"><label>打开失败记录</label>${settingSwitch("logOpenFailures", general.logOpenFailures)}</div>
        ${settingSelect("language", "语言", ["简体中文", "English"], general.language)}
      </div>
    </section>`;
}

function renderWorkspaceSettings() {
  const workspace = getActiveWorkspace();
  return `
    <section class="settings-card">
      <div class="settings-card-title">当前工作区 <button class="settings-action-button" data-settings-action="manage-workspaces"><i data-lucide="database"></i>管理工作区</button></div>
      <div class="settings-card-description">工作区用于隔离资源集合、工具配置和插件状态。当前原型使用内存模拟。</div>
      <div class="settings-grid">
        ${settingField("workspaceReadonlyName", "工作区名称", workspace.name)}
        ${settingField("workspaceReadonlyStorage", "存储说明", workspace.storage)}
        <div class="setting-field full"><label>备注</label><textarea data-setting="workspaceRemarkDraft">${escapeHtml(workspace.remark || "")}</textarea></div>
      </div>
    </section>`;
}

function renderToolsSettings() {
  return `
    <section class="settings-card">
      <div class="settings-card-title">打开工具</div>
      <div class="settings-card-description">配置不同资源类型使用的编辑器、浏览器、终端和专业软件。这里只做前端模拟。</div>
      <div class="settings-table">
        ${settingsState.tools.map((tool, index) => `
          <div class="settings-row">
            <strong>${escapeHtml(tool.name)}</strong>
            <select data-tool-index="${index}" data-tool-field="type">${optionList(["编辑器", "浏览器", "终端", "Office", "CAD", "系统"], tool.type)}</select>
            <input data-tool-index="${index}" data-tool-field="path" value="${escapeHtml(tool.path)}">
            ${settingSwitch(`tool-default-${index}`, tool.default)}
          </div>
          <div class="settings-row"><code>参数模板</code><input data-tool-index="${index}" data-tool-field="args" value="${escapeHtml(tool.args)}"><span></span><span></span></div>
        `).join("")}
      </div>
    </section>`;
}

function renderTemplateSettings() {
  return `
    <section class="settings-card">
      <div class="settings-card-title">项目类场景默认集合模板</div>
      <div class="settings-card-description">新建项目类场景时会自动生成这些集合。</div>
      <div class="settings-table">
        ${settingsState.templates.map((template, index) => `
          <div class="settings-row">
            <strong>${index + 1}. ${escapeHtml(template)}</strong>
            <input data-template-index="${index}" value="${escapeHtml(template)}">
            <code>{场景名}-${escapeHtml(template)}</code>
            <span></span>
          </div>
        `).join("")}
      </div>
    </section>`;
}

function renderPluginSettings() {
  const installedCount = settingsState.plugins.length;
  const enabledCount = settingsState.plugins.filter((plugin) => plugin.enabled).length;
  const webdavPlugin = settingsState.plugins.find((plugin) => plugin.id === "webdav-sync");
  return `
    <section class="settings-card">
      <div class="settings-card-title">插件管理</div>
      <div class="settings-card-description">类似 Obsidian 的插件机制：插件可以扩展资源类型、打开动作、设置页、后台任务和同步能力。当前为原型模拟。</div>
      <div class="plugin-summary-grid">
        <div class="plugin-summary-item"><span>已安装</span><strong>${installedCount}</strong></div>
        <div class="plugin-summary-item"><span>已启用</span><strong>${enabledCount}</strong></div>
        <div class="plugin-summary-item"><span>同步插件</span><strong>${webdavPlugin?.enabled ? "启用" : "停用"}</strong></div>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-title">已安装插件</div>
      <div class="settings-card-description">启用插件前应确认权限范围。带配置页的插件安装后会出现在左侧设置菜单中。</div>
      <div class="plugin-list">
        ${settingsState.plugins.map((plugin, index) => `
          <div class="plugin-card ${plugin.enabled ? "enabled" : ""}">
            <div class="plugin-card-main">
              <div class="plugin-icon"><i data-lucide="${plugin.id === "webdav-sync" ? "refresh-cw" : "blocks"}"></i></div>
              <div>
                <div class="plugin-title"><strong>${escapeHtml(plugin.name)}</strong><code>v${escapeHtml(plugin.version)}</code><span>${escapeHtml(plugin.category)}</span></div>
                <p>${escapeHtml(plugin.capability)}</p>
                <div class="plugin-permissions">${plugin.permissions.map((permission) => `<span>${escapeHtml(permission)}</span>`).join("")}</div>
              </div>
            </div>
            <div class="plugin-card-actions">
              <code>${plugin.enabled ? "enabled" : "disabled"}</code>
              ${settingSwitch(`plugin-${index}`, plugin.enabled)}
            </div>
          </div>
        `).join("")}
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-title">插件库</div>
      <div class="settings-card-description">第一阶段可以是内置推荐列表，不需要真实在线市场。安装按钮为交互模拟。</div>
      <div class="plugin-store-grid">
        ${settingsState.pluginStore.map((plugin, index) => `
          <div class="plugin-store-card">
            <div class="plugin-title"><strong>${escapeHtml(plugin.name)}</strong><span>${escapeHtml(plugin.category)}</span></div>
            <p>${escapeHtml(plugin.capability)}</p>
            <div class="plugin-permissions">${plugin.permissions.map((permission) => `<span>${escapeHtml(permission)}</span>`).join("")}</div>
            <button class="settings-action-button" data-settings-action="install-plugin" data-plugin-store-index="${index}"><i data-lucide="download"></i>安装</button>
          </div>
        `).join("")}
      </div>
    </section>`;
}

function renderWebdavSyncSettings() {
  const webdav = settingsState.webdavSync;
  const plugin = settingsState.plugins.find((item) => item.id === "webdav-sync");
  return `
    <section class="settings-card">
      <div class="settings-card-title">WebDAV Sync <button class="settings-action-button" data-settings-action="test-webdav"><i data-lucide="plug-zap"></i>测试连接</button><button class="settings-action-button" data-settings-action="sync-now"><i data-lucide="refresh-cw"></i>立即同步</button></div>
      <div class="settings-card-description">该页面来自 WebDAV Sync 插件。同步当前工作区数据到用户自己的 WebDAV 服务，原型只模拟配置和状态。</div>
      <div class="sync-status-strip">
        <span><i data-lucide="power"></i>${plugin?.enabled ? "插件已启用" : "插件已停用"}</span>
        <span><i data-lucide="cloud"></i>${escapeHtml(webdav.status)}</span>
        <span>最近同步：${escapeHtml(webdav.lastSyncAt)}</span>
        <span>范围：${escapeHtml(webdav.syncScope)}</span>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-title">连接配置</div>
      <div class="settings-card-description">正式实现时密码 / Token 应加密存储，并避免出现在普通导出文件中。</div>
      <div class="settings-grid">
        ${settingField("webdavServerUrl", "WebDAV 地址", webdav.serverUrl)}
        ${settingField("webdavUsername", "用户名", webdav.username)}
        ${settingField("webdavCredential", "密码 / Token", webdav.credential, "password")}
        ${settingField("webdavRemotePath", "远端目录", webdav.remotePath)}
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-title">同步策略</div>
      <div class="settings-card-description">自动同步失败不影响本地使用；冲突不应静默覆盖，除非用户明确选择固定策略。</div>
      <div class="settings-grid">
        ${settingSelect("webdavSyncInterval", "自动同步间隔", ["关闭", "每 15 分钟", "每 30 分钟", "每 1 小时", "每天"], webdav.syncInterval)}
        ${settingSelect("webdavSyncScope", "同步范围", ["当前工作区", "全部工作区"], webdav.syncScope)}
        ${settingSelect("webdavConflictPolicy", "冲突策略", ["本地优先", "远端优先", "保留两份", "手动处理"], webdav.conflictPolicy)}
        <div class="setting-field"><label>自动同步</label>${settingSwitch("webdavAutoSync", webdav.autoSync)}</div>
      </div>
    </section>`;
}

function renderGenericPluginSettings(categoryId) {
  const pluginId = categoryId.replace("plugin:", "");
  const plugin = settingsState.plugins.find((item) => item.id === pluginId);
  if (!plugin) return renderAboutSettings();
  return `
    <section class="settings-card">
      <div class="settings-card-title">${escapeHtml(plugin.name)}</div>
      <div class="settings-card-description">该页面来自 ${escapeHtml(plugin.name)} 插件。当前原型展示插件配置入口，具体配置 schema 可由插件 manifest 提供。</div>
      <div class="plugin-card enabled">
        <div class="plugin-card-main">
          <div class="plugin-icon"><i data-lucide="blocks"></i></div>
          <div>
            <div class="plugin-title"><strong>${escapeHtml(plugin.name)}</strong><code>v${escapeHtml(plugin.version)}</code><span>${escapeHtml(plugin.category)}</span></div>
            <p>${escapeHtml(plugin.capability)}</p>
            <div class="plugin-permissions">${plugin.permissions.map((permission) => `<span>${escapeHtml(permission)}</span>`).join("")}</div>
          </div>
        </div>
      </div>
    </section>`;
}

function renderShortcutSettings() {
  return `
    <section class="settings-card">
      <div class="settings-card-title">快捷键</div>
      <div class="settings-card-description">快捷键编辑为前端模拟，不会写入系统设置。</div>
      <div class="settings-table">
        ${settingsState.shortcuts.map((shortcut, index) => `
          <div class="settings-row">
            <strong>${escapeHtml(shortcut.action)}</strong>
            <input data-shortcut-index="${index}" value="${escapeHtml(shortcut.key)}">
            <code>keyboard</code>
            <span></span>
          </div>
        `).join("")}
      </div>
    </section>`;
}

function renderDataSettings() {
  return `
    <section class="settings-card">
      <div class="settings-card-title">数据与备份</div>
      <div class="settings-card-description">这些按钮只模拟导入、导出、清理和重置动作，并写入 Console。</div>
      <div class="settings-actions">
        <button class="settings-action-button" data-settings-action="import"><i data-lucide="upload"></i>导入配置</button>
        <button class="settings-action-button" data-settings-action="export"><i data-lucide="download"></i>导出配置</button>
        <button class="settings-action-button" data-settings-action="clear-recent"><i data-lucide="eraser"></i>清理最近记录</button>
        <button class="settings-action-button" data-settings-action="reset-prototype"><i data-lucide="rotate-ccw"></i>重置原型数据</button>
      </div>
    </section>`;
}

function renderAppearanceSettings() {
  const appearance = settingsState.appearance;
  return `
    <section class="settings-card">
      <div class="settings-card-title">外观</div>
      <div class="settings-card-description">调整原型显示密度和工作台区域偏好。</div>
      <div class="settings-grid">
        ${settingSelect("theme", "主题", ["Obsidian Dark", "Graphite", "Deep Contrast"], appearance.theme)}
        ${settingSelect("density", "字号密度", ["紧凑", "标准", "宽松"], appearance.density)}
        ${settingField("sidebarWidth", "侧边栏宽度", appearance.sidebarWidth, "number")}
        <div class="setting-field"><label>显示 Console</label>${settingSwitch("showConsole", appearance.showConsole)}</div>
      </div>
    </section>`;
}

function renderAboutSettings() {
  return `
    <section class="settings-card">
      <div class="settings-card-title">OpenDock</div>
      <div class="about-panel">
        <p><strong>版本：</strong>0.1.0 static prototype</p>
        <p><strong>定位：</strong>OpenDock 是面向开发者和专业软件用户的资源集合与启动工具，用于统一管理目录、网页、命令、文件、应用入口和插件扩展资源。</p>
        <p><strong>当前原型：</strong>静态 HTML/CSS/JS，所有设置、工作区、集合和资源变更均为内存模拟，刷新后会恢复初始数据。</p>
      </div>
    </section>`;
}

function settingsBodyFor(categoryId) {
  if (categoryId === "general") return renderGeneralSettings();
  if (categoryId === "workspace") return renderWorkspaceSettings();
  if (categoryId === "tools") return renderToolsSettings();
  if (categoryId === "templates") return renderTemplateSettings();
  if (categoryId === "plugins") return renderPluginSettings();
  if (categoryId === "plugin:webdav-sync") return renderWebdavSyncSettings();
  if (categoryId.startsWith("plugin:")) return renderGenericPluginSettings(categoryId);
  if (categoryId === "shortcuts") return renderShortcutSettings();
  if (categoryId === "data") return renderDataSettings();
  if (categoryId === "appearance") return renderAppearanceSettings();
  return renderAboutSettings();
}

function renderSettingsPage() {
  const categories = getSettingsCategories();
  const category = categories.find((item) => item.id === activeSettingsCategory) || categories[0];
  activeSettingsCategory = category.id;
  document.getElementById("settingsEyebrow").textContent = category.id;
  document.getElementById("settingsTitle").textContent = category.label;
  document.getElementById("settingsDescription").textContent = category.description;
  document.getElementById("settingsBody").innerHTML = settingsBodyFor(category.id);
  renderSettingsNav();
  bindSettingsBodyActions();
  refreshIcons();
}

function showMainView(view) {
  activeMainView = view;
  const workspaceView = document.querySelector(".workspace");
  const settingsView = document.getElementById("settingsPage");
  const settingsButton = document.getElementById("sidebarSettingsButton");
  const isSettings = view === "settings";

  workspaceView.hidden = isSettings;
  workspaceView.style.display = isSettings ? "none" : "grid";
  settingsView.hidden = !isSettings;
  settingsView.style.display = isSettings ? "grid" : "none";
  settingsButton.classList.toggle("active", isSettings);

  if (isSettings) renderSettingsPage();
}

function bindSettingsBodyActions() {
  const body = document.getElementById("settingsBody");
  body.querySelectorAll("[data-settings-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.settingsAction;
      if (action === "manage-workspaces") showModal("manage-workspaces");
      if (action === "import") logOpen("设置页模拟导入配置");
      if (action === "export") logOpen("设置页模拟导出配置");
      if (action === "clear-recent") logOpen("设置页模拟清理最近记录");
      if (action === "reset-prototype") logOpen("设置页模拟重置原型数据");
      if (action === "test-webdav") {
        settingsState.webdavSync.status = "连接正常";
        logOpen("WebDAV Sync 模拟测试连接成功");
        renderSettingsPage();
      }
      if (action === "sync-now") {
        const now = new Date().toLocaleString("zh-CN", { hour12: false });
        settingsState.webdavSync.status = "同步成功";
        settingsState.webdavSync.lastSyncAt = now;
        const plugin = settingsState.plugins.find((item) => item.id === "webdav-sync");
        if (plugin) plugin.status = "同步成功";
        logOpen(`WebDAV Sync 模拟同步完成: ${now}`);
        renderSettingsPage();
      }
      if (action === "install-plugin") {
        const index = Number(button.dataset.pluginStoreIndex);
        const plugin = settingsState.pluginStore[index];
        if (!plugin) return;
        settingsState.plugins.push({
          id: plugin.name.toLowerCase().replace(/\s+/g, "-"),
          name: plugin.name,
          version: "0.1.0",
          category: plugin.category,
          capability: plugin.capability,
          permissions: plugin.permissions,
          enabled: false,
          installed: true,
          configurable: plugin.configurable || false
        });
        settingsState.pluginStore.splice(index, 1);
        logOpen(`安装插件: ${plugin.name}`);
        if (plugin.configurable) activeSettingsCategory = `plugin:${plugin.name.toLowerCase().replace(/\s+/g, "-")}`;
        renderSettingsPage();
      }
    });
  });
}

function saveSettings() {
  const body = document.getElementById("settingsBody");
  if (activeSettingsCategory === "general") {
    settingsState.general.defaultView = body.querySelector('[data-setting="defaultView"]').value;
    settingsState.general.recentLimit = Number(body.querySelector('[data-setting="recentLimit"]').value || 0);
    settingsState.general.confirmBeforeOpen = body.querySelector('[data-setting="confirmBeforeOpen"]').checked;
    settingsState.general.logOpenFailures = body.querySelector('[data-setting="logOpenFailures"]').checked;
    settingsState.general.language = body.querySelector('[data-setting="language"]').value;
  }
  if (activeSettingsCategory === "workspace") {
    getActiveWorkspace().remark = body.querySelector('[data-setting="workspaceRemarkDraft"]').value;
  }
  if (activeSettingsCategory === "tools") {
    settingsState.tools.forEach((tool, index) => {
      tool.type = body.querySelector(`[data-tool-index="${index}"][data-tool-field="type"]`).value;
      tool.path = body.querySelector(`[data-tool-index="${index}"][data-tool-field="path"]`).value;
      tool.args = body.querySelector(`[data-tool-index="${index}"][data-tool-field="args"]`).value;
      tool.default = body.querySelector(`[data-setting="tool-default-${index}"]`).checked;
    });
    enforceSingleDefaultToolPerType();
  }
  if (activeSettingsCategory === "templates") {
    settingsState.templates = settingsState.templates.map((_, index) => body.querySelector(`[data-template-index="${index}"]`).value.trim()).filter(Boolean);
  }
  if (activeSettingsCategory === "plugins") {
    settingsState.plugins.forEach((plugin, index) => {
      plugin.enabled = body.querySelector(`[data-setting="plugin-${index}"]`).checked;
    });
  }
  if (activeSettingsCategory === "plugin:webdav-sync") {
    settingsState.webdavSync.serverUrl = body.querySelector('[data-setting="webdavServerUrl"]').value.trim();
    settingsState.webdavSync.username = body.querySelector('[data-setting="webdavUsername"]').value.trim();
    settingsState.webdavSync.credential = body.querySelector('[data-setting="webdavCredential"]').value;
    settingsState.webdavSync.remotePath = body.querySelector('[data-setting="webdavRemotePath"]').value.trim();
    settingsState.webdavSync.syncInterval = body.querySelector('[data-setting="webdavSyncInterval"]').value;
    settingsState.webdavSync.syncScope = body.querySelector('[data-setting="webdavSyncScope"]').value;
    settingsState.webdavSync.conflictPolicy = body.querySelector('[data-setting="webdavConflictPolicy"]').value;
    settingsState.webdavSync.autoSync = body.querySelector('[data-setting="webdavAutoSync"]').checked;
  }
  if (activeSettingsCategory === "shortcuts") {
    settingsState.shortcuts.forEach((shortcut, index) => {
      shortcut.key = body.querySelector(`[data-shortcut-index="${index}"]`).value.trim();
    });
  }
  if (activeSettingsCategory === "appearance") {
    settingsState.appearance.theme = body.querySelector('[data-setting="theme"]').value;
    settingsState.appearance.density = body.querySelector('[data-setting="density"]').value;
    settingsState.appearance.sidebarWidth = Number(body.querySelector('[data-setting="sidebarWidth"]').value || 260);
    settingsState.appearance.showConsole = body.querySelector('[data-setting="showConsole"]').checked;
    document.querySelector(".console-pane").hidden = !settingsState.appearance.showConsole;
  }
  logOpen(`保存设置: ${getSettingsCategories().find((item) => item.id === activeSettingsCategory).label}`);
  refreshStatus();
  renderSettingsPage();
}
function bindActions() {
  document.getElementById("workspaceMenuButton").addEventListener("click", toggleWorkspaceDropdown);
  document.getElementById("quickSceneButton").addEventListener("click", () => showModal("scene"));
  document.getElementById("sidebarSettingsButton").addEventListener("click", () => {
    showMainView("settings");
    logOpen("打开设置页");
  });
  document.getElementById("newCollectionButton").addEventListener("click", () => showModal("collection"));
  document.getElementById("newItemButton").addEventListener("click", () => showModal("item"));
  document.getElementById("saveSettingsButton").addEventListener("click", saveSettings);
  document.getElementById("modalForm").addEventListener("submit", handleModalSubmit);
  document.getElementById("modalFields").addEventListener("click", handleWorkspaceManageClick);
  document.getElementById("modalCloseButton").addEventListener("click", closeModal);
  document.getElementById("modalCancelButton").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", (event) => {
    if (event.target.id === "modalBackdrop") closeModal();
  });
  document.addEventListener("click", (event) => {
    const dropdown = document.getElementById("workspaceDropdown");
    const menuButton = document.getElementById("workspaceMenuButton");
    if (!dropdown.hidden && !dropdown.contains(event.target) && !menuButton.contains(event.target)) {
      dropdown.hidden = true;
    }
  });
  document.getElementById("openCollectionButton").addEventListener("click", () => {
    const visibleCollections = getVisibleCollections();
    if (!visibleCollections.length) return;
    const collection = getActiveCollection();
    logOpen(`${collection.tool} 批量打开 ${collection.name} (${collection.items.length} 项)`);
  });

  document.getElementById("openSceneButton").addEventListener("click", () => {
    const visibleCollections = getVisibleCollections();
    const totalItems = visibleCollections.reduce((sum, collection) => sum + collection.items.length, 0);
    logOpen(`打开 ${document.getElementById("sceneTitle").textContent}: ${visibleCollections.length} 个集合 / ${totalItems} 个资源`);
  });

  document.querySelectorAll(".tool-chip").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tool-chip").forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      activeViewMode = button.dataset.mode;
      ensureActiveCollectionInVisibleList();
      logOpen(`切换集合视图: ${button.textContent.trim()}`);
      renderAll();
    });
  });


  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => {
    searchKeyword = searchInput.value.trim();
    ensureActiveCollectionInVisibleList();
    renderAll();
    if (searchKeyword) logOpen(`命令面板搜索: ${searchKeyword}`);
  });

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
      logOpen("打开命令面板入口");
    }
  });
}

function refreshStatus() {
  document.getElementById("workspaceTitle").textContent = getActiveWorkspace().name;
  document.getElementById("workspaceStatusText").textContent = getActiveWorkspace().name;
  statusResourceCount.textContent = `${totalResourceCount()} resources`;
  statusPluginState.textContent = `${pluginCollectionCount()} plugin collections`;
}

function syncToolChips() {
  document.querySelectorAll(".tool-chip[data-mode]").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.mode === activeViewMode);
  });
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderAll() {
  renderWorkspaceNav();
  renderScenes();
  renderTabs();
  renderCollections();
  renderDetails();
  refreshStatus();
  syncToolChips();
  renderWorkspaceDropdown();
  if (activeMainView === "settings") renderSettingsPage();
  refreshIcons();
}

bindActions();
showMainView("workspace");
renderAll();























