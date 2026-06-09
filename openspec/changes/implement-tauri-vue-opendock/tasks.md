## 1. Project Scaffold

- [x] 1.1 Scaffold a Tauri + Vue + TypeScript application in the repository without deleting the existing static prototype files.
- [x] 1.2 Add package scripts for Vue dev server, Tauri dev mode, build, type check, and lint if lint tooling is included.
- [x] 1.3 Configure Tauri window title, app identifier, icons placeholder, and development URL/build output.
- [x] 1.4 Port global design tokens from `styles.css` into the Vue app stylesheet.

## 2. Data Model and Stores

- [x] 2.1 Define TypeScript interfaces for Workspace, Scene, Collection, CollectionItem, OpenTool, PluginManifest, WebDavSyncConfig, Settings, and AppData.
- [x] 2.2 Create seed data matching the current static prototype's workspaces, scenes, collections, tools, plugins, and settings.
- [x] 2.3 Implement stores or composables for workspace state, resource state, settings/tools state, plugin state, and activity log state.
- [x] 2.4 Implement local app-data persistence with `schemaVersion`, load, save, reset, import, and export helpers.
- [x] 2.5 Ensure ordinary export excludes plain-text WebDAV credential values.

## 3. Desktop Shell UI

- [x] 3.1 Implement the root desktop shell layout with left sidebar, main workbench, tab/status areas, and settings view switching.
- [x] 3.2 Implement left sidebar OpenDock title, search box, quick views, scene list, lower-left workspace switcher, and settings button.
- [x] 3.3 Implement workspace dropdown and workspace management modal for add, edit, delete, and switch.
- [x] 3.4 Implement settings button active state and settings page display behavior.
- [x] 3.5 Verify text does not overflow (component refactor, nested button fixed, responsive CSS preserved) in sidebar, buttons, settings menu, plugin cards, and resource rows.

## 4. Resource Management UI

- [x] 4.1 Implement scene list rendering, scene selection, and project-scene default collection creation.
- [x] 4.2 Implement quick views for all resources, favorites, recent opens, and unbound collections.
- [x] 4.3 Implement collection list, selected collection details, collection type filters, and collection search filtering.
- [x] 4.4 Implement create/edit/delete flows for scenes, collections, and collection items.
- [x] 4.5 Implement favorite and recent-open state updates.
- [x] 4.6 Implement empty states for no scenes, no collections, no resources, and no search results.

## 5. Tauri Open Actions

- [x] 5.1 Add Rust-side Tauri commands for opening paths, URLs, files, applications, and terminal commands.
- [x] 5.2 Implement tool argument template expansion for `{path}`, `{url}`, `{command}`, and working directory values.
- [x] 5.3 Implement frontend open-resource, open-collection, and open-scene actions that call Tauri commands.
- [x] 5.4 Add confirmation before command execution and before batch opening a full collection or scene.
- [x] 5.5 Log open attempts, successes, failures, and recent-open updates.

## 6. Settings Implementation

- [x] 6.1 Implement general settings page with default view, recent limit, confirmation, failure logging, and language fields.
- [x] 6.2 Implement workspace settings page with current workspace summary and manage-workspace entry.
- [x] 6.3 Implement opening tools settings with editable tool type, path, args, and one default tool per type.
- [x] 6.4 Implement collection template settings and ensure new project scenes use the edited templates.
- [x] 6.5 Implement shortcuts page as editable prototype data.
- [x] 6.6 Implement data and backup actions for import, export, clear recent, and reset.
- [x] 6.7 Implement appearance settings for theme, density, sidebar width, and console visibility.
- [x] 6.8 Implement about page with product positioning and prototype/build information.

## 7. Plugin System Prototype

- [x] 7.1 Implement plugin management page with installed plugin summary, plugin cards, permissions, version, category, and enable/disable switches.
- [x] 7.2 Implement built-in plugin library cards and simulated install behavior.
- [x] 7.3 Implement dynamic settings menu injection for installed configurable plugins.
- [x] 7.4 Place plugin settings menu entries between system settings and About with visible spacing.
- [x] 7.5 Implement generic configurable-plugin placeholder settings page for plugins without a custom settings component.

## 8. WebDAV Sync Plugin Prototype

- [x] 8.1 Implement WebDAV Sync plugin settings page as an installed configurable plugin entry.
- [x] 8.2 Implement WebDAV connection fields: server URL, username, credential placeholder/secret reference, and remote path.
- [x] 8.3 Implement sync strategy fields: auto-sync, interval, scope, and conflict policy.
- [x] 8.4 Implement sync status strip with plugin enabled state, status, last sync time, and scope.
- [x] 8.5 Implement test-connection and sync-now actions using mocked or preflight Tauri commands.
- [x] 8.6 Persist WebDAV settings while excluding credential values from ordinary exports.

## 9. Verification
> 当前环境状态：
> - `npm run typecheck` / `npm run build` 通过。
> - `npm run dev` 启动正常，Vite 在 http://127.0.0.1:5180 提供新拆分组件源码。
> - `cargo check` 在 aliyun sparse、USTC sparse、USTC git 镜像下均连接超时（本机网络受限）。
> - 9.2-9.6 桌面验证需在能正常访问 crates.io / aliyun / USTC 索引的环境中执行 `npm run tauri:dev` 后完成。在浏览器中可先通过 `npm run dev` 验证 UI/交互。

**v1 实现说明**（2026-06-07）：
> - 重构 App.vue：从 260 行单文件拆分为 AppSidebar / WorkbenchView / SettingsView / CreateEntityModal + 11 个 settings 子面板。
> - 重构 store.ts：抽取 `helpers.ts`（纯函数/常量）、`storage.ts`（持久化）；store 仅保留 reactive state 与领域操作。
> - 修复 collection-card 嵌套 `<button>` 警告，改为 `<div role="button">` 并支持键盘交互。
> - 新增完整 CRUD 操作：updateScene/deleteScene、updateCollection/deleteCollection、updateItem/deleteItem、updateWorkspace/deleteWorkspace。
> - 模态框升级：支持编辑模式，通过 `state.modal.editingId` 自动预填表单。
> - WorkbenchView 与 AppSidebar 添加内联编辑/删除按钮，删除使用 window.confirm 二次确认。
> - 集合项支持单独指定打开工具（继承集合默认工具或覆盖）。
> - 工作区管理：在侧栏下拉菜单中支持新建、编辑、删除（最少保留一个）。
> - 新增 vitest 单元测试 16 项，覆盖场景/集合/资源/工作区 CRUD、收藏切换、快速视图筛选、搜索筛选、级联删除、最后一个工作区保护、模板到集合类型映射、导出排除凭据。
> - 通过测试发现并修复 2 个生产代码 bug：
>   1. `exportAppData` 之前使用 `structuredClone(data)`，遇到 Vue reactive 代理会抛 `DataCloneError`，改用 `JSON.parse(JSON.stringify(...))`。
>   2. `expandToolArgs` 之前先做模板替换再分词，导致用户路径中的空格被切成两个参数；改为先分词、再对每个 token 替换占位符，路径中的空格被保留。

- [x] 9.1 Run Vue type check and fix type errors. (typecheck + build pass after component refactor)
- [ ] 9.2 Run Tauri dev mode and verify the app launches as a desktop window.
- [ ] 9.3 Verify workspace, scene, collection, item, settings, plugin, and WebDAV flows against the OpenSpec scenarios.
- [ ] 9.4 Verify open actions with safe sample URL/path/command cases and confirmation dialogs.
- [ ] 9.5 Verify app restart restores persisted workspace data.
- [ ] 9.6 Capture or inspect desktop and narrow viewport screenshots for non-overlap and readable layout.
