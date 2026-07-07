## Why

OpenDock 已经形成了较完整的需求文档和静态交互原型，但当前实现仍是 HTML/CSS/JS 内存模拟，无法作为真实桌面效率工具使用。基于 Tauri + Vue 实现可以保留现有 Obsidian-like 交互方向，同时补齐本地数据、系统打开、设置、插件配置和后续同步能力的工程基础。

## What Changes

- 将当前静态原型迁移为 Tauri + Vue 桌面应用。
- 实现 OpenDock 的核心信息架构：左侧 OpenDock 标题、搜索、快速视图、场景列表、左下角工作区切换与设置入口。
- 实现工作区、场景、集合、集合项的前端状态管理和本地持久化。
- 实现集合和集合项的创建、编辑、删除、筛选、搜索、收藏、最近打开等交互。
- 实现集合标签能力：一个集合可设置多个标签，并在快速视图中提供标签过滤查询页面。
- 实现打开工具配置，并通过 Tauri 命令调用系统能力打开目录、URL、命令、文件和应用入口。
- 实现设置页，包括通用设置、工作区设置、打开工具、集合模板、插件管理、快捷键、数据与备份、外观、关于。
- 实现类似 Obsidian 的插件管理原型：插件安装、启用、禁用、权限展示，以及插件安装后的独立设置菜单项。
- 实现 WebDAV Sync 插件配置原型，包括连接信息、自动同步、同步范围、冲突策略、测试连接和立即同步的模拟/预留接口。
- 保留 AI / MCP 友好能力的数据结构预留，但不在本次实现真实 MCP 服务。

## Capabilities

### New Capabilities
- `desktop-shell`: Tauri + Vue 桌面应用壳、布局、导航和基础应用生命周期。
- `workspace-resource-model`: 工作区、场景、集合、集合项、工具、插件配置的数据模型和本地持久化。
- `resource-management`: 工作区、场景、集合、集合项的增删改查、筛选、搜索、收藏、最近打开、集合标签过滤和默认集合模板。
- `open-actions`: 使用配置的编辑器、浏览器、终端、系统默认应用或插件运行时打开资源、集合和场景。
- `settings-management`: 设置页、工作区管理、打开工具配置、集合模板、快捷键、数据备份、外观和关于。
- `plugin-system-prototype`: 类 Obsidian 插件管理原型，支持已安装插件、插件库、启用/禁用、权限展示和插件设置菜单注入。
- `webdav-sync-plugin-prototype`: WebDAV Sync 插件配置、状态展示、测试连接和立即同步的原型能力。

### Modified Capabilities

None. This repository does not yet contain existing OpenSpec capabilities.

## Impact

- Adds a Tauri + Vue application scaffold and runtime dependencies.
- Replaces static prototype behavior with Vue components, stores, router/state coordination and Tauri commands.
- Adds Rust-side Tauri commands for opening paths, URLs, commands and files, with safety confirmation boundaries.
- Adds local persistence for OpenDock workspace data and settings.
- Extends collection records with tag metadata and adds a tag-filter quick view for querying collections by one or more tags.
- Keeps the current static prototype files as reference artifacts unless explicitly removed in a later cleanup.
- Introduces a plugin data model and plugin settings UI, but not a full executable plugin SDK or real online plugin marketplace.
