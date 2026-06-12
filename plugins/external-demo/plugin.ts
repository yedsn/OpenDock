import type { PluginStoreEntry } from "../../src-ui/src/types";

export const storeEntry: PluginStoreEntry = {
  name: "External Demo",
  category: "示例",
  capability: "演示外置插件的动态发现、安装、停用和删除流程",
  permissions: ["workspace:read", "plugin-data:read"],
  configurable: true,
  toolTypes: [{ type: "Demo Tool", collectionTypes: ["插件集合"], itemTypes: ["插件资源"] }]
};
