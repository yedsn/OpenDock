# OpenDock Plugins

OpenDock 的插件实现统一放在本目录下。插件管理页、通用插件配置页属于主应用设置模块，不放在 `plugins/` 下。

```text
plugins/
  .system/                 # 内置插件
    webdav-sync/
      plugin.json
      ui/
      service/
    theme-forest-mist/
      plugin.json
      plugin.ts
    theme-ink-blue/
      plugin.json
      plugin.ts
  registry.ts              # 插件动态注册表
  external-demo/           # 外置插件 demo
    plugin.json
    plugin.ts
    ui/
  tool-type-demo/          # 示例工具类型插件 demo
    plugin.json
    plugin.ts
    ui/
```

目录约定：

- `plugin.json`：插件元信息、权限声明和入口说明。
- `ui/`：插件自己的前端配置页或业务界面。
- `service/`：插件自己的后端服务实现，由 `src-tauri` 显式加载。
- `plugin.ts`：纯前端插件定义，例如主题插件导出的主题对象、插件清单或商店条目。
- `.system/`：OpenDock 随应用发布的内置插件目录。
- `registry.ts`：动态发现 `.system/*/plugin.ts` 和外置插件 `*/plugin.ts`，并按需异步加载插件 UI 面板。
- 插件数据不得写入仓库目录，应写入用户数据目录中的应用数据库；插件私有数据使用 `plugin_data(plugin_id, key, value)` 命名空间。
