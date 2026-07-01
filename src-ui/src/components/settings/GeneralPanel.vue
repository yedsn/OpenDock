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
      <label class="setting-field">
        <span>{{ $t("settings.autoStart") }}</span>
        <span class="setting-switch">
          <input v-model="general.autoStart" type="checkbox" /><span></span>
        </span>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.startMinimized") }}</span>
        <span class="setting-switch">
          <input v-model="general.startMinimized" type="checkbox" /><span></span>
        </span>
      </label>
    </div>
  
    <div class="settings-card-title">{{ $t("settings.sortSettings") }}</div>
    <div class="settings-grid">
      <label class="setting-field">
        <span>{{ $t("settings.sceneSort") }}</span>
        <select v-model="general.sceneSort">
          <option value="手动">{{ $t("settings.sortManual") }}</option>
          <option value="按名称">{{ $t("settings.sortByName") }}</option>
          <option value="按使用次数">{{ $t("settings.sortByUsage") }}</option>
        </select>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.collectionSort") }}</span>
        <select v-model="general.collectionSort">
          <option value="手动">{{ $t("settings.sortManual") }}</option>
          <option value="按名称">{{ $t("settings.sortByName") }}</option>
          <option value="按使用次数">{{ $t("settings.sortByUsage") }}</option>
        </select>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.itemSort") }}</span>
        <select v-model="general.itemSort">
          <option value="手动">{{ $t("settings.sortManual") }}</option>
          <option value="按名称">{{ $t("settings.sortByName") }}</option>
          <option value="按使用次数">{{ $t("settings.sortByUsage") }}</option>
        </select>
      </label>
    </div>
  </section>
</template>