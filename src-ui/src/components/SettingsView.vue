<script setup lang="ts">
import { computed, type Component } from "vue";
import {
  Archive,
  Blocks,
  Database,
  Info,
  Keyboard,
  Paintbrush,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Wrench
} from "lucide-vue-next";
import { useOpenDockStore } from "../store";
import type { PluginManifest } from "../types";

import GeneralPanel from "./settings/GeneralPanel.vue";
import WorkspacePanel from "./settings/WorkspacePanel.vue";
import ToolsPanel from "./settings/ToolsPanel.vue";
import TemplatesPanel from "./settings/TemplatesPanel.vue";
import PluginsPanel from "./settings/PluginsPanel.vue";
import { getPluginUi } from "../../../plugins/registry";
import PluginGenericPanel from "./settings/PluginGenericPanel.vue";
import ShortcutsPanel from "./settings/ShortcutsPanel.vue";
import SearchPanel from "./settings/SearchPanel.vue";
import DataPanel from "./settings/DataPanel.vue";
import AppearancePanel from "./settings/AppearancePanel.vue";
import AboutPanel from "./settings/AboutPanel.vue";

const store = useOpenDockStore();

interface SettingsCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  group?: "plugin";
  panel: Component;
}

const iconMap: Record<string, Component> = {
  SlidersHorizontal, Database, Wrench, Blocks, Keyboard, Search, Archive, Paintbrush, Info, RefreshCw
};

function pluginPanel(plugin: PluginManifest): Component {
  return getPluginUi(plugin.id)?.settingsPanel || PluginGenericPanel;
}

function pluginIconName(plugin: PluginManifest): string {
  return getPluginUi(plugin.id)?.icon === RefreshCw ? "RefreshCw" : "Blocks";
}

const categories = computed<SettingsCategory[]>(() => {
  const system: SettingsCategory[] = [
    { id: "general", label: "通用设置", icon: "SlidersHorizontal", description: "配置启动入口、最近记录和基础行为。", panel: GeneralPanel },
    { id: "workspace", label: "工作区设置", icon: "Database", description: "查看当前工作区，并进入工作区管理。", panel: WorkspacePanel },
    { id: "tools", label: "打开工具", icon: "Wrench", description: "配置基础打开工具，以及由插件启用后贡献的专业工具类型。", panel: ToolsPanel },
    { id: "templates", label: "集合模板", icon: "Blocks", description: "配置项目类场景默认创建的集合模板。", panel: TemplatesPanel },
    { id: "plugins", label: "插件管理", icon: "Blocks", description: "管理插件状态和扩展能力。", panel: PluginsPanel },
    { id: "shortcuts", label: "快捷键", icon: "Keyboard", description: "配置高频操作快捷键。", panel: ShortcutsPanel },
    { id: "search", label: "搜索", icon: "Search", description: "配置搜索结果的回车执行行为和链接打开后的窗口处理。", panel: SearchPanel },
    { id: "data", label: "数据与备份", icon: "Archive", description: "导入、导出、清理和重置操作。", panel: DataPanel },
    { id: "appearance", label: "外观", icon: "Paintbrush", description: "调整主题、密度、侧栏宽度和 Console 显示。", panel: AppearancePanel }
  ];
  const pluginItems = store.state.data.plugins
    .filter((plugin: PluginManifest) => plugin.installed && plugin.enabled && plugin.configurable)
    .map<SettingsCategory>((plugin: PluginManifest) => ({
      id: `plugin:${plugin.id}`,
      label: plugin.name,
      icon: pluginIconName(plugin),
      description: `${plugin.name} 插件配置。`,
      group: "plugin",
      panel: pluginPanel(plugin)
    }));
  return [
    ...system,
    ...pluginItems,
    { id: "about", label: "关于", icon: "Info", description: "查看产品定位、版本和当前实现说明。", panel: AboutPanel }
  ];
});

const active = computed<SettingsCategory>(() => {
  return categories.value.find((item) => item.id === store.state.settingsCategory) || categories.value[0];
});

function settingIcon(name: string): Component {
  return iconMap[name] || SlidersHorizontal;
}
</script>

<template>
  <section class="settings-page">
    <aside class="settings-nav">
      <div class="settings-nav-title">Settings</div>
      <div class="settings-nav-list">
        <button v-for="category in categories" :key="category.id"
          class="settings-nav-item"
          :class="{ active: store.state.settingsCategory === category.id, 'plugin-settings-item': category.group === 'plugin' }"
          @click="store.state.settingsCategory = category.id">
          <component :is="settingIcon(category.icon)" />
          <span>{{ category.label }}</span>
        </button>
      </div>
    </aside>

    <section class="settings-content">
      <header class="settings-header">
        <div>
          <div class="type-label">{{ active.id }}</div>
          <h1>{{ active.label }}</h1>
          <p>{{ active.description }}</p>
        </div>
      </header>
      <div class="settings-body">
        <component :is="active.panel" :title="active.label" />
      </div>
    </section>
  </section>
</template>

