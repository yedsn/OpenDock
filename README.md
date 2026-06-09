# OpenDock

OpenDock 是一个面向开发者、办公和专业软件用户的桌面资源集合与启动工具。它用于统一管理目录、网页、命令、文件、应用入口和插件扩展资源，并支持按工作场景快速打开单个资源、批量资源或整个集合。

当前项目采用 Vue 3 + Vite 构建前端界面，使用 Tauri 2 提供桌面壳、系统托盘、全局快捷键、本地 SQLite 存储和系统打开能力。

## 功能概览

- 工作空间、场景、集合、集合项的资源组织模型
- 目录、网页、命令、文件、Office、CAD、应用等资源类型原型
- 场景视图、快捷视图、标签页和搜索入口
- 资源打开能力：系统默认打开、浏览器打开、应用启动、命令执行
- 设置中心：通用、外观、搜索、快捷键、工具、插件、数据等配置面板
- 本地 SQLite 数据存储
- Tauri 桌面能力：系统托盘、单实例运行、全局快捷键 `Alt+O`
- WebDAV 同步和插件系统原型入口

## 技术栈

- 前端：Vue 3、TypeScript、Vite
- 桌面端：Tauri 2、Rust
- UI 图标：lucide-vue-next
- 搜索辅助：pinyin-pro
- 测试：Vitest
- 本地数据：SQLite（Tauri/Rust 侧通过 rusqlite 管理）

## 目录结构

```text
.
├── src-ui/                 # Vue 前端源码
│   ├── index.html          # Vite 入口 HTML
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
├── docs/                   # 产品和需求文档
├── openspec/               # OpenSpec 变更设计与规格
├── vite.config.ts          # Vite 配置，前端根目录为 src-ui
├── vitest.config.ts        # 测试配置
├── package.json            # npm 脚本和前端依赖
└── tsconfig.json           # TypeScript 配置
```

## 环境要求

### Web 前端开发

- Node.js 18+（建议使用当前 LTS 版本）
- npm

### Tauri 桌面开发

除 Node.js/npm 外，还需要：

- Rust stable toolchain
- Windows 环境下的 Microsoft C++ Build Tools / Visual Studio Build Tools
- Tauri 2 所需系统依赖

Tauri 环境可参考官方文档：[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## 本地启动

安装依赖：

```bash
npm install
```

启动 Web 开发服务：

```bash
npm run dev
```

默认访问地址：

```text
http://127.0.0.1:5180
```

Vite 配置启用了固定端口：`5180`。如果该端口被占用，开发服务会启动失败，需要先释放端口或修改 `vite.config.ts`。

## 启动桌面应用

在已安装 Tauri/Rust 环境后运行：

```bash
npm run tauri:dev
```

该命令会先执行 `npm run dev` 启动前端服务，然后通过 Tauri 打开桌面窗口。Tauri 开发地址配置在 `src-tauri/tauri.conf.json`：

```text
http://127.0.0.1:5180
```

## 常用命令

```bash
# 启动 Vite Web 开发服务
npm run dev

# TypeScript 类型检查
npm run typecheck

# 运行测试
npm run test

# 构建 Web 产物
npm run build

# 启动 Tauri 桌面开发模式
npm run tauri:dev

# 构建 Tauri 桌面安装包/可执行产物
npm run tauri:build
```

## 构建产物

Web 构建输出目录为：

```text
dist/
```

Tauri 桌面构建时会使用 `dist/` 作为前端静态资源目录，配置项为 `src-tauri/tauri.conf.json` 中的 `frontendDist`。

## 数据存储

桌面应用使用本地 SQLite 数据库保存工作空间、场景、集合、集合项、工具、插件和活动记录等数据。

Windows 默认数据库位置：

```text
%LOCALAPPDATA%\OpenDock\opendock.db
```

前端启动时会尝试从数据库加载数据；如果数据库不可用或读取失败，会使用 `src-ui/src/seed.ts` 中的初始数据。

## 当前验证状态

在当前工作区已完成以下验证：

```bash
npm install
npm run test
npm run build
```

验证结果：

- `npm run test`：1 个测试文件通过，32 个用例通过
- `npm run build`：构建成功，输出到 `dist/`
- `npm run dev`：本地服务已在 `http://127.0.0.1:5180` 可访问

构建时 Vite 会提示 `@tauri-apps/api/window.js` 同时被静态和动态导入，该提示不影响当前构建结果。

## 常见问题

### 端口 5180 被占用

项目配置了 `strictPort: true`，端口被占用时 Vite 不会自动切换端口。

可在 PowerShell 中查看占用进程：

```powershell
Get-NetTCPConnection -LocalPort 5180 | Select-Object LocalAddress,LocalPort,State,OwningProcess
```

### 只能打开 Web 页面，桌面功能不可用

直接运行 `npm run dev` 时只启动 Web 前端。系统托盘、全局快捷键、本地 SQLite、打开本地文件和应用等能力需要通过 Tauri 运行：

```bash
npm run tauri:dev
```

### Tauri 启动失败

优先检查 Rust 和 Windows 构建工具是否安装完整，然后运行：

```bash
npm run build
npm run tauri:dev
```

如果 Web 构建通过但 Tauri 失败，通常是 Rust/Tauri 本地环境或系统依赖问题。

## 相关文档

- 产品需求：[docs/OpenDock需求文档.md](docs/OpenDock需求文档.md)
- OpenSpec 变更说明：[openspec/changes/implement-tauri-vue-opendock](openspec/changes/implement-tauri-vue-opendock)
