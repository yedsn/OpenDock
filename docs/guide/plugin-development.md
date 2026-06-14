# OpenDock 插件开发说明

## 目录边界

插件自己的服务代码、前端代码和插件定义统一放在仓库根目录的 `plugins/` 下。

内置插件统一放在 `plugins/.system/` 下：

```text
plugins/
  .system/
    <plugin-id>/
      plugin.json
      ui/                  # 插件自己的 Vue 页面，可选
      service/             # 插件自己的 Tauri/Rust 服务，可选
      assets/              # 插件资源，可选
      plugin.ts            # 前端插件定义，可选，主题插件常用
  registry.ts              # 插件动态注册表
```

当前内置插件示例：

- `plugins/.system/webdav-sync/`：WebDAV Sync 设置页和 WebDAV 服务实现。
- `plugins/.system/theme-forest-mist/`：内置 Forest Mist 主题插件。
- `plugins/.system/theme-ink-blue/`：内置 Ink Blue 主题插件商店条目。
- `https://github.com/yedsn/OpenDockPlugins`：社区插件市场仓库，包含 `external-demo` 和 `tool-type-demo` 等外置插件示例。

## 动态加载

前端通过 `plugins/registry.ts` 注册插件能力：

- 使用 `import.meta.glob("./.system/*/plugin.ts", { eager: true })` 自动发现内置插件定义。
- 使用 `defineAsyncComponent(() => import(...))` 按需加载内置插件设置面板。
- 设置页只通过插件 id 查询注册表，不在页面内硬编码具体插件组件。

插件菜单只在插件同时满足 `installed && enabled && configurable` 时出现。停用或删除插件后，对应设置菜单会立即消失；如果当前正在该插件设置页，主应用会自动回到插件管理页。

## 打开工具类型扩展

打开工具类型由两部分组成：

- 主应用基础类型：`编辑器`、`浏览器`、`终端`、`系统`、`应用`、`插件`。
- 已安装且已启用插件贡献的类型：类型名由插件自定义，例如可以是 `Office`、`CAD`、`Demo Tool`、`Diagram Tool`、`Design` 或任意业务名称。

插件可以在 `PluginManifest` 或 `PluginStoreEntry` 中声明工具类型及适用范围：

```ts
toolTypes: [
  {
    type: "Design",
    collectionTypes: ["网页集合"],
    itemTypes: ["URL"]
  }
]
```

设置页的“打开工具”只展示当前可用工具类型及其工具。插件停用后，它贡献的工具类型会从设置页消失，对应类型的工具配置仍保存在数据中，重新启用插件后会再次显示。主应用不需要提前知道该类型名称，也不需要为新类型改枚举。

## 资源类型、表单和打开流程扩展

插件还可以声明自己的资源类型和表单字段：

```ts
itemTypes: [
  {
    type: "Diagram Spec",
    label: "图表规格",
    valueLabel: "图表源文件或规格 ID",
    valuePlaceholder: "例如 diagram://order-flow",
    fields: [
      { key: "renderer", label: "渲染器", required: true },
      { key: "layout", label: "布局参数" }
    ]
  }
]
```

插件可以导出 `openHandlers` 接管特定资源类型的打开流程：

```ts
export const openHandlers = {
  "Diagram Spec": async ({ item, tool, callOpenCommand }) => {
    return await callOpenCommand("run_command", {
      command: `echo Open ${item.value}`,
      workingDirectory: item.workingDirectory || null
    });
  }
};
```

插件市场仓库中的 `tool-type-demo` 演示了完整链路：`Diagram Tool` 工具类型、`Diagram Spec` 资源类型、`renderer/layout` 表单字段，以及插件自己的打开处理器。

## manifest 约定

每个插件目录必须包含 `plugin.json`，建议字段如下：

```json
{
  "id": "webdav-sync",
  "name": "WebDAV Sync",
  "version": "0.2.0",
  "category": "sync",
  "description": "Sync OpenDock workspace data to a user-owned WebDAV endpoint.",
  "permissions": ["workspace:read", "workspace:write", "network:webdav"],
  "entries": {
    "ui": "ui/WebdavPanel.vue",
    "service": "service/webdav.rs"
  },
  "dataNamespace": "webdav-sync"
}
```

`id` 必须稳定，并应与插件数据命名空间一致。权限先声明后使用，后续权限审计、安装确认和插件管理页展示都以该字段为准。

## 前端插件

插件前端页面放在 `plugins/.system/<plugin-id>/ui/` 或外部插件目录的 `ui/`。页面可以导入主应用公开的 store 和类型，例如：

```ts
import { useOpenDockStore } from "../../../../src-ui/src/store";
```

可配置插件会在设置侧边栏中生成 `plugin:<plugin-id>` 菜单项。通用插件配置页仍由主应用提供，路径为 `src-ui/src/components/settings/PluginGenericPanel.vue`。

## 主题插件

内置主题也按插件维护，放在 `plugins/.system/<theme-plugin-id>/` 下。主题插件通常提供：

- `plugin.json`：主题插件元信息。
- `plugin.ts`：导出 `manifest: PluginManifest` 或 `storeEntry: PluginStoreEntry`。

主应用种子数据从动态注册表读取主题插件定义，而不是在 `src-ui/src/seed.ts` 中直接维护大段主题对象。

## 服务插件

服务代码放在 `plugins/.system/<plugin-id>/service/` 或外部插件目录的 `service/`。Tauri 侧通过 `#[path = "../../plugins/.system/<plugin-id>/service/<file>.rs"]` 显式加载，不在 `src-tauri/src` 下混放插件实现。

服务插件只暴露必要函数，由 `src-tauri/src/lib.rs` 中的 Tauri command 负责参数校验、权限边界和返回值转换。

## 插件数据

插件数据必须写到用户数据目录，不写入仓库目录。OpenDock 当前数据库路径为：

```text
<user-data-dir>/OpenDock/opendock.db
```

Windows 上通常位于 `%LOCALAPPDATA%/OpenDock/opendock.db`。数据库由 Tauri 后端创建，插件私有数据使用：

```sql
plugin_data(plugin_id TEXT, key TEXT, value TEXT, PRIMARY KEY(plugin_id, key))
```

例如 WebDAV Sync 的凭据保存为：

```text
plugin_id = webdav-sync
key       = secret:default
```

普通导出不能包含明文凭据。配置对象中只保留 `credentialRef`，例如 `plugin-data:webdav-sync/secret:default`；真实值保存在用户数据目录的插件数据命名空间里。

## 新增插件步骤

1. 内置插件在 `plugins/.system/<plugin-id>/` 下创建 `plugin.json`；社区插件在插件市场仓库 `plugins/<plugin-id>/<version>/` 下创建 `plugin.json`。
2. 如有插件专属设置页，把 Vue 组件放入 `ui/`。
3. 如有后端能力，把 Rust/服务实现放入 `service/`。
4. 如是主题插件，在 `plugin.ts` 中导出 `manifest` 或 `storeEntry`。
5. 在 `plugins/registry.ts` 中注册插件 UI；内置主题插件可被 glob 自动发现。
6. 插件持久化数据写入 `plugin_data`，key 使用插件内部稳定名称。

## 验证清单

- `npm run build` 可以通过。
- `npm test -- --run` 可以通过。
- `cargo check` 可以通过。
- 插件管理页和通用插件配置页仍位于 `src-ui/src/components/settings/`。
- 内置插件位于 `plugins/.system/`。
- 可配置插件停用或删除后，对应设置菜单消失。
- 插件私有数据写入用户数据目录数据库，不写入项目目录。
- 导出 JSON 不包含插件凭据明文。

