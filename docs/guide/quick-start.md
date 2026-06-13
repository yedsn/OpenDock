# 快速开始

如果你只是想把 OpenDock 用起来，优先按这条路径操作。

## 路线 1：直接下载安装包

- 下载地址：<https://github.com/yedsn/OpenDock/releases/latest>
- 如果你在国内网络环境使用，也可以关注 Gitee Release 同步页：<https://gitee.com/hongxiaojian/open-dock>

安装后首次打开应用，即可开始创建场景和集合。

## 路线 2：从源码运行

如果你还没有可用安装包，或者想先本地体验最新版本：

1. 准备开发运行环境：[`/develop/setup`](/develop/setup)
2. 在仓库根目录执行：

```bash
npm install
npm run tauri:dev
```

## 首次使用

启动应用后：

1. 系统会自动创建默认工作空间
2. 创建一个场景，例如"前端开发"
3. 在场景下创建集合，例如"项目目录"
4. 添加集合项：本地目录、网页 URL、命令等
5. 配置打开方式后，点击即可打开资源

## 下一步建议

- 想了解核心概念：[`/guide/core-concepts`](/guide/core-concepts)
- 想了解资源类型和打开方式：[`/guide/resources-and-open`](/guide/resources-and-open)
- 想开发插件：[`/guide/plugin-development`](/guide/plugin-development)
- 想参与开发：[`/develop/setup`](/develop/setup)
