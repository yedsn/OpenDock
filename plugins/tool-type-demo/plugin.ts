import type { PluginStoreEntry } from "../../src-ui/src/types";
import type { PluginOpenHandler } from "../registry";

export const storeEntry: PluginStoreEntry = {
  name: "Tool Type Demo",
  category: "示例",
  capability: "演示插件如何贡献自定义打开工具类型 Diagram Tool",
  permissions: ["workspace:read", "opener:diagram"],
  configurable: true,
  toolTypes: [
    {
      type: "Diagram Tool",
      collectionTypes: ["文件集合", "插件集合"],
      itemTypes: ["文件", "插件资源", "Diagram Spec"]
    }
  ],
  itemTypes: [
    {
      type: "Diagram Spec",
      label: "图表规格",
      valueLabel: "图表源文件或规格 ID",
      valuePlaceholder: "例如 D:\\diagrams\\flow.drawio 或 diagram://order-flow",
      fields: [
        { key: "renderer", label: "渲染器", placeholder: "drawio / mermaid / plantuml", required: true },
        { key: "layout", label: "布局参数", placeholder: "例如 left-to-right", required: false }
      ]
    }
  ]
};

export const openHandlers: Record<string, PluginOpenHandler> = {
  "Diagram Spec": async ({ item, tool, callOpenCommand }) => {
    const renderer = String(item.pluginData?.renderer || "diagram");
    const layout = String(item.pluginData?.layout || "default");
    const command = `echo Open diagram ${JSON.stringify(item.value)} with ${renderer} layout=${layout}`;

    if (tool?.path && tool.path !== "shell:open") {
      return await callOpenCommand("open_application", {
        path: tool.path,
        args: [item.value, `--renderer=${renderer}`, `--layout=${layout}`]
      });
    }

    return await callOpenCommand("run_command", { command, workingDirectory: item.workingDirectory || null });
  }
};
