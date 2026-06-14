# OpenDock 插件市场

OpenDock 插件市场是一个独立的 Git 仓库，存放所有社区插件的索引和源码。客户端通过读取索引发现可用插件，下载安装到本地用户数据目录。

## 仓库地址

- GitHub：https://github.com/yedsn/OpenDockPlugins
- Gitee 镜像：https://gitee.com/hongxiaojian/open-dock-plugins

> **注意**：默认分支为 `master`，非 `main`。

## 索引仓库结构

```text
OpenDockPlugins/
  index.json                  # 全量插件索引清单
  plugins/
    <plugin-id>/
      plugin.json             # 插件元信息（与现有格式兼容）
      versions.json           # 版本列表（引用模式必须）
      0.1.0/                  # 内嵌模式：插件源码按版本存放
        plugin.ts
        ui/
        service/
        assets/
      0.2.0/
        ...
  scripts/
    validate.py               # PR 校验脚本
  README.md
```

## index.json 格式

`index.json` 是客户端发现插件的唯一入口：

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-06-14T10:00:00Z",
  "plugins": [
    {
      "id": "office-support",
      "name": "Office Support",
      "version": "0.2.0",
      "category": "tool",
      "description": "Open Word/Excel/PPT files with custom tools.",
      "permissions": ["workspace:read", "plugin-data:read"],
      "author": "someone",
      "repository": "https://github.com/someone/opendock-plugin-office",
      "tags": ["office", "word", "excel"],
      "minAppVersion": "0.1.5",
      "verified": false
    }
  ]
}
```

字段说明：

- `id`：插件唯一标识，与 `plugin.json` 中的 `id` 一致。
- `version`：当前最新版本号。
- `category`：插件分类，如 `tool`、`sync`、`theme`、`demo`。
- `permissions`：插件需要的权限声明，安装前会向用户展示。
- `minAppVersion`：插件要求的最低 OpenDock 版本，低于此版本的客户端不展示该插件。
- `verified`：是否经过官方审核，`true` 会在 UI 中展示认证标记。
- `repository`：插件源码仓库地址（可选，引用模式下必须）。

## 两种插件来源模式

### 内嵌模式

插件源码直接放在索引仓库的 `plugins/<id>/<version>/` 下。适合小型插件、主题插件、官方维护的插件。

安装时客户端直接从索引仓库下载对应版本目录的全部文件。

### 引用模式

插件源码放在开发者自己的仓库，通过 GitHub/Gitee Release 发布打包产物。索引仓库中只存放 `plugin.json` 和 `versions.json`，`versions.json` 指向外部下载地址。

适合大型插件、需要 CI 构建产物的插件、独立维护的插件。

`versions.json` 格式：

```json
{
  "latest": "0.2.0",
  "versions": {
    "0.2.0": {
      "source": "https://github.com/someone/opendock-plugin-office/releases/download/v0.2.0/office-support.tar.gz",
      "sha256": "a1b2c3d4...",
      "releasedAt": "2026-06-01T00:00:00Z"
    },
    "0.1.0": {
      "source": "https://gitee.com/someone/opendock-plugin-office/releases/download/v0.1.0/office-support.tar.gz",
      "sha256": "e5f6g7h8...",
      "releasedAt": "2026-05-01T00:00:00Z"
    }
  }
}
```

引用模式安装时，客户端从 `source` URL 下载 tar.gz，校验 `sha256` 后解压到本地目录。

## 客户端安装流程

1. 客户端启动时拉取 `index.json`（优先 Gitee，失败后尝试 GitHub）。
2. 插件管理页展示可用插件列表：名称、描述、分类、下载量、认证标记。
3. 用户点击安装：
   - 内嵌模式：从索引仓库直接下载对应版本目录的文件。
   - 引用模式：从 `source` URL 下载 tar.gz，校验 sha256，解压。
4. 插件文件写入用户数据目录（非应用仓库目录）：

```text
%LOCALAPPDATA%/OpenDock/plugins/
  <plugin-id>/
    <version>/
      plugin.json
      plugin.ts
      ui/
      service/
    installed.json      # 安装元数据（版本、来源、安装时间）
```

5. 客户端动态加载新插件（运行时热加载或重启后生效）。
6. 更新 PluginManifest 的 `installed = true`、`enabled = true`。

## 内置插件

内置插件（`plugins/.system/` 目录）随应用构建时打包，自动出现在已安装列表中：

| 插件 | 分类 | 说明 |
|------|------|------|
| Browser | 资源打开 | 多浏览器网页集合打开 |
| Terminal | 资源打开 | 命令集合执行策略 |
| WebDAV Sync | 同步 | 通过 WebDAV 同步工作区数据 |
| Office | 专业文件 | Word / Excel / PPT 文件集合 |
| CAD | 专业文件 | DWG / DXF 图纸集合 |
| Database | 开发工具 | 数据库连接入口 |
| Forest Mist Theme | 主题 | 内置浅色主题 |
| Ink Blue Theme | 主题 | 内置深色主题 |

内置插件不可删除，只能启用/禁用。

## 更新与卸载

### 更新

- 客户端定期比对本地 `installed.json` 中的版本与 `index.json` 中的 `version`。
- 有新版本时在插件管理页显示可更新标记。
- 用户确认后下载新版本到新目录，切换后删除旧版本目录。

### 卸载

- 删除 `%LOCALAPPDATA%/OpenDock/plugins/<id>/` 目录。
- 可选保留 `plugin_data` 中的数据（卸载时询问用户）。
- 更新 PluginManifest 状态。

## 双源策略

客户端支持配置插件索引源地址，默认 Gitee 优先，GitHub 作为镜像：

- 优先访问 Gitee 源（国内速度快）。
- Gitee 失败或超时后自动尝试 GitHub 源。
- Rust 后端 `marketplace_fetch_text` 命令自动探测本地代理（7890/7779 端口）。

## 安全与审核

| 层级 | 措施 |
|------|------|
| 提交审核 | 插件必须通过 PR 提交到索引仓库，维护者 Review 后合入 |
| CI 校验 | GitHub Actions 自动检查 plugin.json 格式、id 唯一性、permissions 声明、文件完整性 |
| sha256 校验 | 引用模式下载后必须校验哈希，防篡改 |
| 权限展示 | 安装前展示 permissions 列表，用户确认后才安装 |
| 沙箱隔离 | 插件代码运行在 Tauri WebView 中，Rust 服务由主进程显式加载 |
| verified 标记 | 官方审核过的插件标记 verified: true，UI 展示认证标识 |
| 下架机制 | 恶意插件从 index.json 移除，客户端同步后标记不可用 |

## 插件开发者工作流

### 提交新插件（内嵌模式）

1. Fork `OpenDockPlugins` 仓库。
2. 在 `plugins/<id>/` 下创建插件目录，放入 `plugin.json` 和插件代码。
3. 按版本组织目录结构：`plugins/<id>/0.1.0/`。
4. 更新 `index.json`，添加插件条目。
5. 提交 PR，CI 自动校验格式和唯一性。
6. 维护者 Review 后合入，客户端可发现并安装。

### 提交新插件（引用模式）

1. 在自己的 GitHub/Gitee 仓库开发插件。
2. 发布 Release，上传打包产物 tar.gz。
3. Fork `OpenDockPlugins`，在 `plugins/<id>/` 下放置 `plugin.json` 和 `versions.json`。
4. 更新 `index.json`。
5. 提交 PR，CI 校验 sha256 和 source URL 可访问性。
6. 维护者 Review 后合入。

### 发布更新

1. 内嵌模式：在 `plugins/<id>/` 下新增版本目录，更新 `index.json` 中的 `version`。
2. 引用模式：在自己的仓库发新 Release，更新 `versions.json`，更新 `index.json` 中的 `version`。
3. 提交 PR。

## Rust 编译问题排查

在国内网络环境下，编译可能遇到 `SEC_E_DECRYPT_FAILURE` 或超时错误。解决方案：

```powershell
# 设置代理
$env:HTTPS_PROXY = "http://127.0.0.1:7890"

# 禁用证书吊销检查
$env:CARGO_HTTP_CHECK_REVOKE = "false"

# 使用自定义 CARGO_HOME（已配置阿里云镜像）
$env:CARGO_HOME = "E:\Workspaces\git\my\opendock\.cargo-home"

cargo check
```

`.cargo/config.toml` 已配置阿里云 crates.io 镜像和 `check-revoke = false`。

## 与现有插件系统的关系

现有 `plugins/.system/` 内置插件随应用构建时打包，不受插件市场影响。插件市场只管理社区和第三方插件。

关键改动点：

- `registry.ts` 增加从用户数据目录 `plugins/` 扫描已安装插件的逻辑。
- 使用动态 `import()` 加载市场安装的插件模块（替代构建时 glob）。
- `PluginManifest` 已有 `installed` / `enabled` 字段，直接复用。
- 安装流程由 Tauri 后端命令执行（下载、校验、解压、写文件），前端通过 `callOpenCommand` 调用。

## 分期实施建议

| 阶段 | 内容 | 产出 |
|------|------|------|
| P0 | 创建索引仓库 + index.json 规范 + 客户端读取展示插件列表 | 能看到可用插件 |
| P1 | 内嵌模式安装/卸载 + 运行时动态加载 | 能装能用 |
| P2 | 引用模式安装 + sha256 校验 + 双源切换 | 支持外部仓库插件 |
| P3 | 自动更新检测 + CI 校验 + 权限展示 + verified 标记 | 完善市场体验 |
| P4 | 下载统计 + 插件评分 + 搜索过滤 + 分类浏览 | 市场生态完善 |
