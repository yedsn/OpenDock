# 资源与打开

OpenDock 支持多种资源类型和打开方式，并且可以通过插件扩展。

## 内置打开工具类型

主应用提供以下基础打开工具类型：

| 工具类型 | 说明 |
|----------|------|
| 编辑器 | 用配置的编辑器打开文件或目录 |
| 浏览器 | 用系统默认或指定浏览器打开 URL |
| 终端 | 在终端中执行命令 |
| 系统 | 用系统默认方式打开 |
| 应用 | 启动本地应用程序 |

## 配置打开方式

每个集合项都可以配置自己的打开方式：

1. 在集合项的设置中选择打开工具类型
2. 选择或配置具体的工具
3. 保存后点击集合项即可用配置的方式打开

## 批量打开

集合支持一键打开所有集合项：

- 点击集合的"打开全部"按钮
- 集合中的所有集合项会按配置的打开方式依次打开
- 适合快速恢复整个工作场景

## 插件贡献的打开工具

插件可以声明自定义的打开工具类型：

```ts
toolTypes: [
  {
    type: "Design",
    collectionTypes: ["网页集合"],
    itemTypes: ["URL"]
  }
]
```

插件停用后，它贡献的工具类型会从设置页消失，对应类型的工具配置仍保存在数据中，重新启用插件后会再次显示。

## 插件贡献的打开流程

插件可以导出 `openHandlers` 接管特定资源类型的打开流程：

```ts
export const openHandlers = {
  "Diagram Spec": async ({ item, tool, callOpenCommand }) => {
    return await callOpenCommand("run_command", {
      command: `echo Open ${item.value}`,
      workingDirectory: item.workingDirectory || null
    });
  }
};
```

详情见：[`/guide/plugin-development`](/guide/plugin-development)

## 全局快捷键

- `Alt+O`：唤起应用窗口（系统全局快捷键）
- 在搜索框中输入关键词可快速搜索集合项
- 搜索支持中文和拼音

## 系统托盘

OpenDock 启动后会在系统托盘显示图标：

- 单击托盘图标可显示/隐藏主窗口
- 右键托盘图标可退出应用
- 最小化窗口后仍可通过托盘或 `Alt+O` 唤起
