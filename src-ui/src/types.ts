export type SceneType = "项目" | "办公" | "工程" | "设计" | "通用" | "自定义";
export type CollectionType = "目录集合" | "网页集合" | "命令集合" | "Office 集合" | "CAD 集合" | "文件集合" | "应用集合" | "插件集合";
export type ItemType = string;
export type ToolType = string;
export type OpenStrategy = "single" | "batch" | "all";
export type QuickViewId = "all" | "favorites" | "recent" | "unbound";
export type MainView = "workspace" | "settings";
export type CollectionMode = "collections" | "web" | "tool";
export type SortMode = "手动" | "按名称" | "按使用次数";

export interface ThemeColorTokens {
  bg: string;
  bg2: string;
  bg3: string;
  bg4: string;
  text: string;
  muted: string;
  faint: string;
  line: string;
  lineStrong: string;
  accent: string;
  accentSoft: string;
  green: string;
  red: string;
  titlebarBg: string;
  titlebarLine: string;
  cardActiveBg: string;
  consoleBg: string;
  shadow: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  kind: "dark" | "light";
  source: "built-in" | "plugin";
  pluginId?: string;
  swatches: string[];
  colors: ThemeColorTokens;
}

export interface Workspace {
  id: string;
  name: string;
  storage: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  workspaceId: string;
  name: string;
  type: SceneType;
  description: string;
  icon: string;
  color: string;
  favorite: boolean;
  unbound?: boolean;
  usageCount?: number;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  workspaceId: string;
  sceneId: string | null;
  name: string;
  type: CollectionType;
  description: string;
  defaultToolId: string;
  tool: string;
  icon: string;
  color: string;
  openStrategy: OpenStrategy;
  favorite: boolean;
  recent: boolean;
  recentAt?: string;
  unbound: boolean;
  pluginId?: string;
  usageCount?: number;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItem {
  id: string;
  workspaceId: string;
  collectionId: string;
  name: string;
  type: ItemType;
  value: string;
  workingDirectory?: string;
  toolId?: string;
  tool: string;
  args?: string;
  icon: string;
  color: string;
  remark?: string;
  pluginData?: Record<string, unknown>;
  usageCount?: number;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface OpenTool {
  id: string;
  name: string;
  type: ToolType;
  path: string;
  args: string;
  default: boolean;
}

export interface PluginToolTypeContribution {
  type: ToolType;
  collectionTypes?: CollectionType[];
  itemTypes?: ItemType[];
}

export type PluginToolTypeEntry = ToolType | PluginToolTypeContribution;

export interface PluginItemFormField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  kind?: "text" | "textarea";
}

export interface PluginItemTypeContribution {
  type: ItemType;
  label: string;
  valueLabel?: string;
  valuePlaceholder?: string;
  fields?: PluginItemFormField[];
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  category: string;
  capability: string;
  permissions: string[];
  installed: boolean;
  enabled: boolean;
  configurable: boolean;
  builtIn?: boolean;
  status?: string;
  theme?: ThemeDefinition;
  toolTypes?: PluginToolTypeEntry[];
  itemTypes?: PluginItemTypeContribution[];
}

export interface SearchSuggestion {
  id: string;
  kind: "scene" | "collection" | "item";
  title: string;
  subtitle: string;
  sceneId?: string;
  collectionId?: string;
  itemId?: string;
  isUrl?: boolean;
  score: number;
}

export interface PluginStoreEntry {
  name: string;
  category: string;
  capability: string;
  permissions: string[];
  configurable?: boolean;
  theme?: ThemeDefinition;
  toolTypes?: PluginToolTypeEntry[];
  itemTypes?: PluginItemTypeContribution[];
}

export interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  permissions: string[];
  author: string;
  repository?: string;
  tags: string[];
  minAppVersion: string;
  verified: boolean;
}

export interface MarketplaceIndex {
  schemaVersion: number;
  updatedAt: string;
  plugins: MarketplacePlugin[];
}

export interface WebDavSyncConfig {
  serverUrl: string;
  username: string;
  credentialRef: string;
  remotePath: string;
  autoSync: boolean;
  syncInterval: string;
  syncScope: "当前工作区" | "全部工作区";
  conflictPolicy: "本地优先" | "远端优先" | "保留两份" | "手动处理";
  lastSyncAt: string;
  status: string;
  lastError?: string;
}

export interface WebDavPendingConflict {
  localData: string;
  remoteData: string;
  detectedAt: string;
  localSummary: string;
  remoteSummary: string;
}

export type TaskStatus = "pending" | "running" | "success" | "error" | "warning";

export interface TaskEntry {
  id: string;
  type: "webdav-sync" | "system";
  title: string;
  message: string;
  status: TaskStatus;
  progress: number;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
}

export interface GeneralSettings {
  defaultView: string;
  recentLimit: number;
  confirmBeforeOpen: boolean;
  logOpenFailures: boolean;
  openWebInNewWindow: boolean;
  closeWindowAfterOpen: boolean;
  language: string;
  autoSnapshotIntervalMinutes: number;
  autoSnapshotKeepCount: number;
  autoStart: boolean;
  startMinimized: boolean;
  sceneSort: SortMode;
  collectionSort: SortMode;
  itemSort: SortMode;
}

export type SearchEnterBehavior = "open" | "navigate";

export interface SearchSettings {
  sceneEnterBehavior: SearchEnterBehavior;
  collectionEnterBehavior: SearchEnterBehavior;
  itemEnterBehavior: SearchEnterBehavior;
}

export interface AppearanceSettings {
  theme: string;
  density: string;
  sidebarWidth: number;
  interfaceFontFamily: string;
  monospaceFontFamily: string;
  baseFontSize: number;
  showConsole: boolean;
}

export interface ShortcutSetting {
  action: string;
  key: string;
}

export interface AppSettings {
  general: GeneralSettings;
  search: SearchSettings;
  templates: string[];
  shortcuts: ShortcutSetting[];
  appearance: AppearanceSettings;
  webdavSync: WebDavSyncConfig;
}

export interface ActivityEntry {
  id: string;
  text: string;
  createdAt: string;
}

export interface Tombstone {
  /** Collection name within AppData (e.g., "items", "collections", "scenes", "workspaces") */
  collection: string;
  /** ID of the deleted entity */
  id: string;
  /** ISO timestamp when the entity was deleted */
  deletedAt: string;
}

export interface AppData {
  schemaVersion: number;
  activeWorkspaceId: string;
  activeSceneId: string;
  activeCollectionId: string;
  workspaces: Workspace[];
  scenes: Scene[];
  collections: Collection[];
  items: CollectionItem[];
  tools: OpenTool[];
  plugins: PluginManifest[];
  pluginStore: PluginStoreEntry[];
  settings: AppSettings;
  activity: ActivityEntry[];
  tombstones: Tombstone[];
}

export type SnapshotKind = "manual" | "auto" | "pre-import";

export interface SnapshotRecord {
  id: string;
  kind: SnapshotKind;
  label: string;
  note: string;
  createdAt: string;
  /** Byte length of the stored payload. */
  size: number;
}


export interface Tab {
  id: string;
  kind: "workspace" | "settings" | "collection" | "scene" | "quickview";
  title: string;
  sceneId?: string;
  collectionId?: string;
  quickViewId?: QuickViewId;
  pinned?: boolean;
}

export interface ModalState {
  kind: "scene" | "collection" | "item" | "workspace" | "manageWorkspaces" | "confirmDelete" | null;
  editingId?: string;
}
