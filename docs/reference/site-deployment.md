# 站点与发布说明

OpenDock 官网使用 VitePress 构建，并通过 GitHub Pages 发布。

## 本地预览

安装依赖：

```bash
npm install
```

开发模式：

```bash
npm run docs:dev
```

生产构建：

```bash
npm run docs:build
```

本地预览构建结果：

```bash
npm run docs:preview
```

## GitHub Pages `base` 约束

默认按 GitHub Pages 项目站点构建：

- 仓库：`yedsn/OpenDock`
- 站点地址：`https://yedsn.github.io/OpenDock/`
- 默认 `base`：`/OpenDock/`

VitePress 配置会优先读取 `DOCS_BASE`；如果在 GitHub Actions 中未显式指定，就自动根据 `GITHUB_REPOSITORY` 推导仓库名。

这意味着：

- 本地开发默认使用 `/`
- CI 构建默认使用 `/<repo-name>/`
- 如果未来切到自定义域名，可以把 `DOCS_BASE=/` 作为构建环境变量覆盖

## GitHub Actions 工作流

站点通过 `.github/workflows/pages.yml` 发布，主要步骤为：

1. Checkout 仓库
2. 安装 Node 依赖
3. 执行 `npm run docs:build`
4. 上传 `docs/.vitepress/dist`
5. 调用 GitHub Pages deploy action 发布

## 内容维护约定

- README 保持仓库首页入口角色
- 深度说明优先更新 `docs/` 里的文档页
- 公开站点首页与 README 的产品定位、核心能力和主 CTA 需要同步维护
