<script setup lang="ts">
import { Blocks, Download, Trash2 } from "lucide-vue-next";
import { useOpenDockStore } from "../../store";
import { useI18n } from "../../i18n";

const store = useOpenDockStore();
const { t } = useI18n();

function pluginEnabledCount() {
  return store.state.data.plugins.filter((plugin) => plugin.enabled).length;
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">{{ $t("settings.pluginManagement") }}</div>
    <div class="plugin-summary-grid">
      <div class="plugin-summary-item"><span>{{ $t("settings.installed") }}</span><strong>{{ store.state.data.plugins.length }}</strong></div>
      <div class="plugin-summary-item"><span>{{ $t("settings.enabled") }}</span><strong>{{ pluginEnabledCount() }}</strong></div>
      <div class="plugin-summary-item"><span>{{ $t("settings.configurable") }}</span><strong>{{ store.state.data.plugins.filter((plugin) => plugin.configurable).length }}</strong></div>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">{{ $t("settings.installedPlugins") }}</div>
    <div class="plugin-list">
      <div v-for="plugin in store.state.data.plugins" :key="plugin.id" class="plugin-card" :class="{ enabled: plugin.enabled }">
        <div class="plugin-card-main">
          <div class="plugin-icon"><Blocks /></div>
          <div>
            <div class="plugin-title">
              <strong>{{ plugin.name }}</strong>
              <code>v{{ plugin.version }}</code>
              <span>{{ plugin.category }}</span>
              <span v-if="plugin.theme">theme</span>
            </div>
            <p>{{ plugin.capability }}</p>
            <div class="plugin-permissions">
              <span v-for="permission in plugin.permissions" :key="permission">{{ permission }}</span>
            </div>
          </div>
        </div>
        <div class="plugin-card-actions">
          <code>{{ plugin.enabled ? "enabled" : "disabled" }}</code>
          <span class="setting-switch">
            <input :checked="plugin.enabled" type="checkbox" @change="store.togglePlugin(plugin)" /><span></span>
          </span>
          <button class="settings-action-button" @click="store.deletePlugin(plugin)"><Trash2 />{{ $t("settings.deletePlugin") }}</button>
        </div>
      </div>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">{{ $t("settings.pluginStore") }}</div>
    <div class="plugin-store-grid">
      <div v-for="(plugin, index) in store.state.data.pluginStore" :key="plugin.name" class="plugin-store-card">
        <div class="plugin-title"><strong>{{ plugin.name }}</strong><span>{{ plugin.category }}</span></div>
        <div v-if="plugin.theme" class="plugin-theme-swatches">
          <i v-for="color in plugin.theme.swatches" :key="color" :style="{ background: color }"></i>
        </div>
        <p>{{ plugin.capability }}</p>
        <div class="plugin-permissions">
          <span v-for="permission in plugin.permissions" :key="permission">{{ permission }}</span>
        </div>
        <button class="settings-action-button" @click="store.installPlugin(index)"><Download />{{ $t("settings.install") }}</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.plugin-theme-swatches { display: inline-flex; align-items: center; gap: 4px; }
.plugin-theme-swatches i { width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(255,255,255,.12); }
</style>
