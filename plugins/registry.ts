import { defineAsyncComponent, type Component } from "vue";
import { Blocks, RefreshCw, type LucideIcon } from "lucide-vue-next";
import type { CollectionItem, OpenTool, PluginManifest, PluginStoreEntry } from "../src-ui/src/types";

export interface PluginOpenContext {
  item: CollectionItem;
  tool?: OpenTool;
  callOpenCommand: (command: string, payload: Record<string, unknown>) => Promise<{ ok: boolean; message: string }>;
}

export type PluginOpenHandler = (context: PluginOpenContext) => Promise<{ ok: boolean; message: string }>;

interface PluginModule {
  manifest?: PluginManifest;
  storeEntry?: PluginStoreEntry;
  openHandlers?: Record<string, PluginOpenHandler>;
}

export interface PluginUiRegistration {
  id: string;
  settingsPanel?: Component;
  icon?: LucideIcon;
}

const builtInPluginModules = import.meta.glob<PluginModule>("./.system/*/plugin.ts", {
  eager: true
});

const externalPluginModules = import.meta.glob<PluginModule>("./*/plugin.ts", {
  eager: true
});

const externalPluginPanels = import.meta.glob<Component>("./*/ui/*Panel.vue");

export const builtInPluginManifests: PluginManifest[] = Object.values(builtInPluginModules)
  .map((plugin) => plugin.manifest)
  .filter((plugin): plugin is PluginManifest => Boolean(plugin));

export const builtInPluginStoreEntries: PluginStoreEntry[] = Object.values(builtInPluginModules)
  .map((plugin) => plugin.storeEntry)
  .filter((plugin): plugin is PluginStoreEntry => Boolean(plugin));

export const externalPluginManifests: PluginManifest[] = Object.values(externalPluginModules)
  .map((plugin) => plugin.manifest)
  .filter((plugin): plugin is PluginManifest => Boolean(plugin));

export const externalPluginStoreEntries: PluginStoreEntry[] = Object.values(externalPluginModules)
  .map((plugin) => plugin.storeEntry)
  .filter((plugin): plugin is PluginStoreEntry => Boolean(plugin));

const builtInOpenHandlers: Record<string, PluginOpenHandler> = {
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

const openHandlersByItemType: Record<string, PluginOpenHandler> = Object.values(externalPluginModules)
  .concat(Object.values(builtInPluginModules))
  .reduce<Record<string, PluginOpenHandler>>((handlers, plugin) => ({ ...handlers, ...(plugin.openHandlers || {}) }), { ...builtInOpenHandlers });

export const builtInPluginUi: PluginUiRegistration[] = [
  {
    id: "webdav-sync",
    settingsPanel: defineAsyncComponent(() => import("./.system/webdav-sync/ui/WebdavPanel.vue")),
    icon: RefreshCw
  },
  { id: "theme-forest-mist", icon: Blocks },
  { id: "theme-ink-blue", icon: Blocks }
];

const externalPluginUi: PluginUiRegistration[] = Object.entries(externalPluginPanels).map(([path, loader]) => {
  const pluginId = path.split("/")[1];
  return {
    id: pluginId,
    settingsPanel: defineAsyncComponent(loader),
    icon: Blocks
  };
});

export function getPluginUi(pluginId: string): PluginUiRegistration | undefined {
  return [...builtInPluginUi, ...externalPluginUi].find((plugin) => plugin.id === pluginId);
}

export function getPluginOpenHandler(itemType: string): PluginOpenHandler | undefined {
  return openHandlersByItemType[itemType];
}
