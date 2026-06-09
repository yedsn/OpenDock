<script setup lang="ts">
import { Blocks, Download } from "lucide-vue-next";
import { useOpenDockStore } from "../../store";
const store = useOpenDockStore();

function pluginEnabledCount() {
  return store.state.data.plugins.filter((p) => p.enabled).length;
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">插件管理</div>
    <div class="plugin-summary-grid">
      <div class="plugin-summary-item"><span>已安装</span><strong>{{ store.state.data.plugins.length }}</strong></div>
      <div class="plugin-summary-item"><span>已启用</span><strong>{{ pluginEnabledCount() }}</strong></div>
      <div class="plugin-summary-item"><span>可配置</span><strong>{{ store.state.data.plugins.filter(p => p.configurable).length }}</strong></div>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">已安装插件</div>
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
          <code>{{ plugin.enabled ? 'enabled' : 'disabled' }}</code>
          <span class="setting-switch">
            <input :checked="plugin.enabled" type="checkbox" @change="store.togglePlugin(plugin)" /><span></span>
          </span>
        </div>
      </div>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">插件库</div>
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
        <button class="settings-action-button" @click="store.installPlugin(index)"><Download />安装</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.plugin-theme-swatches { display: inline-flex; align-items: center; gap: 4px; }
.plugin-theme-swatches i { width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(255,255,255,.12); }
</style>
