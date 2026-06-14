# 项目结构

```text
opendock/
├── src-ui/                 # Vue 3 前端源码
│   └── src/
│       ├── App.vue         # 应用外壳和主布局
│       ├── main.ts         # 前端入口
│       ├── store.ts        # 核心状态、资源操作、Tauri 命令桥接
│       ├── storage.ts      # 数据读写封装
│       ├── seed.ts         # 初始示例数据
│       ├── db.ts           # 数据库访问封装
│       ├── themes.ts       # 主题配置
│       ├── components/     # 业务组件和设置面板
│       └── __tests__/      # Vitest 测试
├── src-tauri/              # Tauri/Rust 桌面端源码
│   ├── src/lib.rs          # Tauri 命令、托盘、快捷键、SQLite 初始化
│   ├── src/main.rs         # 桌面端入口
│   ├── tauri.conf.json     # Tauri 配置
│   └── Cargo.toml          # Rust 依赖配置
├── plugins/                # 内置插件系统\r\n│   ├── .system/            # 随应用发布的内置插件\r\n│   │   ├── webdav-sync/    # WebDAV Sync 插件\r\n│   │   ├── theme-forest-mist/  # Forest Mist 主题插件\r\n│   │   └── theme-ink-blue/     # Ink Blue 主题插件\r\n│   └── registry.ts         # 内置插件动态注册表
├── docs/                   # 官网源码与项目文档
│   ├── .vitepress/         # VitePress 站点配置与主题
│   ├── guide/              # 使用说明
│   ├── develop/            # 开发文档
│   └── reference/          # 参考文档
├── scripts/                # 打包与发布辅助脚本
├── openspec/               # OpenSpec 变更设计与规格
├── package.json            # npm 脚本和前端依赖
├── vite.config.ts          # Vite 配置，前端根目录为 src-ui
├── vitest.config.ts        # 测试配置
└── tsconfig.json           # TypeScript 配置
```

## 核心模块

- `src-ui/src/store.ts`：核心状态管理、资源 CRUD 操作、Tauri 命令桥接
- `src-ui/src/storage.ts`：数据读写封装，SQLite 交互
- `src-ui/src/db.ts`：数据库访问封装
- `src-tauri/src/lib.rs`：Tauri 命令、系统托盘、全局快捷键、SQLite 初始化
- `plugins/registry.ts`：插件动态注册与发现

## 官网源码

文档站基于 VitePress，核心目录包括：

- `docs/index.md`：产品首页
- `docs/.vitepress/`：站点配置与主题样式
- `docs/guide/`：使用说明和插件开发文档
- `docs/develop/`：开发环境、构建与发布文档
- `docs/reference/`：项目结构、命令参考、站点部署说明

