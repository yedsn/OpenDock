# 构建与发布

本文档面向维护者和开发者，说明如何构建桌面应用以及如何发布文档站。

## 本地构建桌面应用

```bash
npm run tauri:build
```

生成的安装包默认位于：

- macOS：`target/release/bundle/`
- Windows：`target/release/bundle/`

构建时 Vite 会提示 `@tauri-apps/api/window.js` 同时被静态和动态导入，该提示不影响当前构建结果。

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

## 文档站发布流程

官网与文档站使用 VitePress 构建，通过 GitHub Pages 发布。

本地命令：

```bash
npm install
npm run docs:dev
npm run docs:build
npm run docs:preview
```

部署细节见：[`/reference/site-deployment`](/reference/site-deployment)
