<script setup lang="ts">
import { onMounted } from "vue";
import { Blocks, Download, Trash2, RefreshCw, Store, CheckCircle, Loader2 } from "lucide-vue-next";
import { useOpenDockStore } from "../../store";
import { useI18n } from "../../i18n";

const store = useOpenDockStore();
const { t } = useI18n();

function pluginEnabledCount() {
  return store.state.data.plugins.filter((plugin) => plugin.enabled).length;
}

onMounted(() => {
  if (store.state.marketplacePlugins.length === 0 && !store.state.marketplaceLoading) {
    store.fetchMarketplaceIndex();
  }
});
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
              <span v-if="plugin.builtIn" class="plugin-badge-built-in">内置</span>
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
          <button v-if="!plugin.builtIn" class="settings-action-button" @click="store.uninstallFromMarketplace(plugin)"><Trash2 />{{ $t("settings.deletePlugin") }}</button>
        </div>
      </div>
    </div>
  </section>

  <section class="settings-card">
    <div class="settings-card-title">
      <span><Store /> {{ $t("settings.pluginMarketplace") }}</span>
      <button class="settings-action-button marketplace-refresh" @click="store.fetchMarketplaceIndex()" :disabled="store.state.marketplaceLoading">
        <RefreshCw :class="{ spinning: store.state.marketplaceLoading }" />
      </button>
    </div>

    <div v-if="store.state.marketplaceLoading" class="marketplace-status">
      <Loader2 class="spinning" /> {{ $t("settings.marketplaceLoading") }}
    </div>
    <div v-else-if="store.state.marketplaceError" class="marketplace-status marketplace-error">
      {{ store.state.marketplaceError }}
    </div>
    <div v-else-if="store.state.marketplacePlugins.length === 0" class="marketplace-status">
      {{ $t("settings.marketplaceEmpty") }}
    </div>

    <div class="plugin-store-grid">
      <div v-for="plugin in store.state.marketplacePlugins" :key="plugin.id" class="plugin-store-card">
        <div class="plugin-title">
          <strong>{{ plugin.name }}</strong>
          <code>v{{ plugin.version }}</code>
          <span>{{ plugin.category }}</span>
          <CheckCircle v-if="plugin.verified" class="marketplace-verified" />
        </div>
        <p>{{ plugin.description }}</p>
        <div class="plugin-permissions">
          <span v-for="permission in plugin.permissions" :key="permission">{{ permission }}</span>
        </div>
        <div class="marketplace-meta">
          <span v-if="plugin.author">{{ plugin.author }}</span>
          <span v-for="tag in plugin.tags" :key="tag" class="marketplace-tag">{{ tag }}</span>
        </div>
        <button class="settings-action-button" @click="store.installFromMarketplace(plugin)" :disabled="store.state.marketplaceInstalling === plugin.id"><Loader2 v-if="store.state.marketplaceInstalling === plugin.id" class="spinning" /><Download v-else />{{ store.state.marketplaceInstalling === plugin.id ? $t("settings.installing") : $t("settings.install") }}</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.plugin-badge-built-in { font-size: 11px; padding: 1px 5px; border-radius: 3px; background: rgba(255,255,255,.08); color: var(--muted, #888); }
.marketplace-refresh { margin-left: auto; padding: 2px 6px; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.marketplace-status { padding: 12px 0; color: var(--muted, #888); display: flex; align-items: center; gap: 8px; }
.marketplace-error { color: var(--red, #e55); }
.marketplace-verified { width: 14px; height: 14px; color: var(--green, #4c4); vertical-align: middle; margin-left: 4px; }
.marketplace-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.marketplace-tag { font-size: 11px; padding: 1px 5px; border-radius: 3px; background: rgba(255,255,255,.08); color: var(--muted, #888); }
</style>
