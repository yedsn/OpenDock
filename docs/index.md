---
layout: home
hero:
  name: OpenDock
  text: 桌面资源集合与启动工具
  tagline: 用集合的方式管理目录、网页、命令、文件、应用入口和插件扩展资源，按场景快速打开。
  image:
    src: /logo.png
    alt: OpenDock
  actions:
    - theme: brand
      text: 立即下载
      link: https://github.com/yedsn/OpenDock/releases/latest
    - theme: alt
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: GitHub 仓库
      link: https://github.com/yedsn/OpenDock
features:
  - icon: "📦"
    title: 集合式资源管理
    details: 工作空间、场景、集合、集合项四级结构，统一收纳目录、网页、命令、文件和应用入口，不再散落各处。
  - icon: "🚀"
    title: 场景驱动启动
    details: 按场景一键打开单个资源、批量资源或整个集合，快速恢复工作上下文，告别手动逐个打开。
  - icon: "🔧"
    title: 多类型打开支持
    details: 系统默认、浏览器、终端、应用启动、命令执行，不同资源用不同方式打开，灵活配置。
  - icon: "🧩"
    title: 插件扩展平台
    details: 自定义资源类型、工具类型、表单字段和打开流程，通过插件机制扩展能力，不受内置功能限制。
  - icon: "💾"
    title: 数据自主可控
    details: 本地 SQLite 存储 + WebDAV 同步，数据始终在自己手中，不依赖云服务。
  - icon: "🖥️"
    title: 桌面端原生体验
    details: 基于 Tauri 2 + Rust 构建，系统托盘、全局快捷键 Alt+O、单实例运行，面向桌面工作流优化。
---

<div class="od-home-section od-showcase">

## 界面预览

<div class="od-showcase-media">
  <img src="/assets/screenshot.png" alt="OpenDock 界面截图" />
</div>

<div class="od-showcase-video">
  <p><strong>快速打开整个集合</strong></p>
  <video src="/assets/open-collection-demo.mp4" controls muted loop playsinline>快速打开整个集合演示</video>
</div>

</div>

<div class="od-home-section">

## 核心概念

<div class="od-concept-grid">
  <div class="od-concept-card">
    <div class="icon">🏢</div>
    <div class="title">工作空间</div>
    <div class="desc">顶层环境，承载全部集合、资源、工具和插件配置</div>
  </div>
  <div class="od-concept-card">
    <div class="icon">📂</div>
    <div class="title">场景</div>
    <div class="desc">集合的上层归类，如"前端开发"、"CAD 出图"</div>
  </div>
  <div class="od-concept-card">
    <div class="icon">📚</div>
    <div class="title">集合</div>
    <div class="desc">核心管理单位，类似可打开的资源收藏夹</div>
  </div>
  <div class="od-concept-card">
    <div class="icon">📌</div>
    <div class="title">集合项</div>
    <div class="desc">单个资源条目，支持目录、网页、命令等类型</div>
  </div>
</div>

</div>

<div class="od-home-section">

## 从这里开始

- 想安装并开始使用：去 [`/guide/quick-start`](/guide/quick-start)
- 想了解核心概念：看 [`/guide/core-concepts`](/guide/core-concepts)
- 想开发插件：看 [`/guide/plugin-development`](/guide/plugin-development)
- 想参与开发或自己构建：看 [`/develop/setup`](/develop/setup)
- 想了解项目结构：看 [`/reference/project-structure`](/reference/project-structure)

</div>
