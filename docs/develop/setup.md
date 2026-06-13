# 开发环境

本文档面向源码运行、调试和二次开发场景。

## 1. 安装 Node.js

- 推荐使用 Node.js 18+（LTS 版本）
- 安装 npm（随 Node.js 一起安装）

## 2. 安装 Rust

### Windows

- 推荐使用 `winget install Rustlang.Rustup`
- 或前往 <https://rustup.rs>
- 安装完成后重新打开终端，并确认：`cargo --version`

### macOS

执行：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

安装完成后重新打开终端，并确认：`cargo --version`

## 3. 安装 Tauri CLI

```bash
cargo install tauri-cli --locked
```

## 4. 系统依赖

### Windows

- 安装 Visual Studio 2022 Build Tools
- 选择 `Desktop development with C++`
- 安装 WebView2 Runtime（Windows 11 通常已自带）

### macOS

```bash
xcode-select --install
```

Tauri 环境可参考官方文档：<https://v2.tauri.app/start/prerequisites/>

## 5. 启动项目

安装前端依赖：

```bash
npm install
```

启动桌面应用开发模式：

```bash
npm run tauri:dev
```

如果只想启动 Web 前端：

```bash
npm run dev
```

默认访问地址：`http://127.0.0.1:5180`

## 6. 常见问题

- **提示找不到 cargo**：Rust 工具链未安装或终端未重启
- **构建失败（Windows）**：检查 VS Build Tools 是否完整安装
- **无法启动窗口**：确认 WebView2 Runtime 是否可用
- **端口 5180 被占用**：项目配置了 `strictPort: true`，端口被占用时 Vite 不会自动切换端口
- **构建缓存异常**：尝试 `cargo clean` 后重新构建

### 端口 5180 被占用

可在 PowerShell 中查看占用进程：

```powershell
Get-NetTCPConnection -LocalPort 5180 | Select-Object LocalAddress,LocalPort,State,OwningProcess
```

### 只能打开 Web 页面，桌面功能不可用

直接运行 `npm run dev` 时只启动 Web 前端。系统托盘、全局快捷键、本地 SQLite、打开本地文件和应用等能力需要通过 Tauri 运行：

```bash
npm run tauri:dev
```
