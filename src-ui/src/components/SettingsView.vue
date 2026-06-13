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
import { useI18n } from "../i18n";
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
const { t } = useI18n();

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
    { id: "general", label: t("settings.general"), icon: "SlidersHorizontal", description: t("settings.generalDesc"), panel: GeneralPanel },
    { id: "workspace", label: t("settings.workspace"), icon: "Database", description: t("settings.workspaceDesc"), panel: WorkspacePanel },
    { id: "tools", label: t("settings.tools"), icon: "Wrench", description: t("settings.toolsDesc"), panel: ToolsPanel },
    { id: "templates", label: t("settings.templates"), icon: "Blocks", description: t("settings.templatesDesc"), panel: TemplatesPanel },
    { id: "plugins", label: t("settings.plugins"), icon: "Blocks", description: t("settings.pluginsDesc"), panel: PluginsPanel },
    { id: "shortcuts", label: t("settings.shortcuts"), icon: "Keyboard", description: t("settings.shortcutsDesc"), panel: ShortcutsPanel },
    { id: "search", label: t("settings.search"), icon: "Search", description: t("settings.searchDesc"), panel: SearchPanel },
    { id: "data", label: t("settings.data"), icon: "Archive", description: t("settings.dataDesc"), panel: DataPanel },
    { id: "appearance", label: t("settings.appearance"), icon: "Paintbrush", description: t("settings.appearanceDesc"), panel: AppearancePanel }
  ];
  const pluginItems = store.state.data.plugins
    .filter((plugin: PluginManifest) => plugin.installed && plugin.enabled && plugin.configurable)
    .map<SettingsCategory>((plugin: PluginManifest) => ({
      id: `plugin:${plugin.id}`,
      label: plugin.name,
      icon: pluginIconName(plugin),
      description: t("settings.pluginConfig", { name: plugin.name }),
      group: "plugin",
      panel: pluginPanel(plugin)
    }));
  return [
    ...system,
    ...pluginItems,
    { id: "about", label: t("settings.about"), icon: "Info", description: t("settings.aboutDesc"), panel: AboutPanel }
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

