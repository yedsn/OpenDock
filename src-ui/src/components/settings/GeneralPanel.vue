<script setup lang="ts">
import { useOpenDockStore } from "../../store";
import { useI18n } from "../../i18n";
const store = useOpenDockStore();
const general = store.state.data.settings.general;
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">{{ $t("settings.basicBehavior") }}</div>
    <div class="settings-grid">
      <label class="setting-field">
        <span>{{ $t("settings.defaultView") }}</span>
        <select v-model="general.defaultView">
          <option value="全部资源">{{ $t("settings.allResources") }}</option><option value="最近打开">{{ $t("settings.recentlyOpened") }}</option><option value="收藏集合">{{ $t("settings.favoriteCollections") }}</option><option value="无场景集合">{{ $t("settings.unboundCollections") }}</option>
        </select>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.recentLimit") }}</span>
        <input v-model.number="general.recentLimit" type="number" min="1" max="200" />
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.language") }}</span>
        <select v-model="general.language"><option>简体中文</option><option>English</option></select>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.confirmBeforeOpen") }}</span>
        <span class="setting-switch">
          <input v-model="general.confirmBeforeOpen" type="checkbox" /><span></span>
        </span>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.openWebInNewWindow") }}</span>
        <span class="setting-switch">
          <input v-model="general.openWebInNewWindow" type="checkbox" /><span></span>
        </span>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.closeWindowAfterOpen") }}</span>
        <span class="setting-switch">
          <input v-model="general.closeWindowAfterOpen" type="checkbox" /><span></span>
        </span>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.logOpenFailures") }}</span>
        <span class="setting-switch">
          <input v-model="general.logOpenFailures" type="checkbox" /><span></span>
        </span>
      </label>
    </div>
  </section>
</template>