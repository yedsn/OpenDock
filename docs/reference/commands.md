# 常用命令

## 前端开发

```bash
# 启动 Vite Web 开发服务
npm run dev

# TypeScript 类型检查
npm run typecheck

# 运行测试
npm run test

# 构建 Web 产物
npm run build
```

## 桌面应用开发

```bash
# 启动 Tauri 桌面开发模式
npm run tauri:dev

# 构建 Tauri 桌面安装包/可执行产物
npm run tauri:build
```

## 文档站

```bash
# 启动 VitePress 文档开发服务
npm run docs:dev

# 构建文档站
npm run docs:build

# 本地预览构建结果
npm run docs:preview
```

## Rust 后端

```bash
# 检查 Rust 代码
cargo check

# 运行 Rust 测试
cargo test

# 清理构建缓存
cargo clean
```

## npm scripts 完整列表

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite Web 开发服务 |
| `npm run build` | TypeScript 类型检查 + Vite 构建 |
| `npm run typecheck` | 仅 TypeScript 类型检查 |
| `npm run test` | 运行 Vitest 测试 |
| `npm run tauri:dev` | 启动 Tauri 桌面开发模式 |
| `npm run tauri:build` | 构建 Tauri 桌面安装包 |
| `npm run docs:dev` | 启动 VitePress 文档开发服务 |
| `npm run docs:build` | 构建 VitePress 文档站 |
| `npm run docs:preview` | 本地预览文档站构建结果 |
