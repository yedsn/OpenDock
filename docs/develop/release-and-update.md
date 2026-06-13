# OpenDock 发布与自动更新

本文档记录 OpenDock 的最小发布链路：Tauri updater 配置、发布签名、GitHub Releases 产物和应用内手动更新。

## 1. 一次性准备

生成 Tauri updater 签名密钥：

```powershell
npx tauri signer generate
```

保存内容：

- 私钥写入发布环境变量或 GitHub Secret：`TAURI_SIGNING_PRIVATE_KEY`
- 私钥密码写入 GitHub Secret：`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- 公钥写入 [src-tauri/tauri.conf.json](/E:/Workspaces/git/my/opendock/src-tauri/tauri.conf.json) 的 `plugins.updater.pubkey`

不要提交私钥或私钥密码。

## 2. 更新源配置

[src-tauri/tauri.conf.json](/E:/Workspaces/git/my/opendock/src-tauri/tauri.conf.json) 已开启：

```json
"bundle": {
  "createUpdaterArtifacts": true
},
"plugins": {
  "updater": {
    "pubkey": "REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY",
    "endpoints": [
      "https://github.com/OWNER/REPO/releases/latest/download/latest.json"
    ]
  }
}
```

发布前必须替换：

- `pubkey`：真实 updater 公钥
- `endpoints`：真实 HTTPS 发布地址。当前配置为：
  - `https://github.com/yedsn/OpenDock/releases/latest/download/latest.json`
  - `https://gitee.com/hongxiaojian/open-dock/releases/download/latest/latest.json`

如果使用自建 Gitea，需要确保 Release 附件能通过稳定 HTTPS 地址访问；Tauri 客户端只需要能访问 `latest.json` 及其中指向的安装包 URL。

## 3. 本地发版脚本

发版脚本：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release/release.ps1 0.1.1
```

脚本会做这些事：

1. 检查工作区必须干净
2. 同步更新 `package.json`、`package-lock.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 版本号
3. 创建提交 `release: v<version>`
4. 创建 tag `v<version>`
5. 输出需要执行的 push 命令

直接推送分支和 tag：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release/release.ps1 0.1.1 -Push
```

## 4. GitHub Actions 发布

[.github/workflows/release.yml](/E:/Workspaces/git/my/opendock/.github/workflows/release.yml) 会在 `v*` tag 推送时执行：

1. 校验 tag 与三个版本文件一致
2. 校验 updater 公钥和 endpoint 不是占位值
3. 校验签名 Secret 已配置
4. 构建 Windows NSIS 安装包
5. 上传安装包、签名和 `latest.json` 到 GitHub Release

仓库需要配置 Secrets：

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `GITEE_ACCESS_TOKEN`，可选；配置后会把 GitHub Release 附件同步到 Gitee 的 `latest` Release

同步脚本：

```powershell
python scripts/release/sync_gitee_release.py --tag v0.1.1
```

本地执行同步时需要先设置 `GITEE_ACCESS_TOKEN` 环境变量。

## 5. 应用内更新

关于页已提供手动更新入口：

- 检查更新：调用 `check_app_update`
- 下载并安装：调用 `download_and_install_update`
- 安装完成后重启：调用 `restart_app`

更新过程中会监听 `app-update-event`，用于展示下载进度和安装状态。

## 6. 发布后验证

每次发布后至少验证：

- Release 页面可访问
- `latest.json` 可通过 endpoint 下载
- `latest.json` 中安装包 URL 可下载
- 旧版本客户端能检查到新版本
- 下载、验签、安装、重启后版本号正确
