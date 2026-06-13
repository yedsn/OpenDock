<script setup lang="ts">
import { useOpenDockStore } from "../../store";
import { useI18n } from "../../i18n";

const store = useOpenDockStore();
const search = store.state.data.settings.search;
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">{{ $t("settings.searchEnterBehavior") }}</div>
    <div class="settings-card-description">{{ $t("settings.searchEnterDesc") }}</div>
    <div class="settings-grid">
      <label class="setting-field">
        <span>{{ $t("settings.sceneResult") }}</span>
        <select v-model="search.sceneEnterBehavior">
          <option value="open">{{ $t("settings.directlyOpenScene") }}</option>
          <option value="navigate">{{ $t("settings.navigateToScene") }}</option>
        </select>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.collectionResult") }}</span>
        <select v-model="search.collectionEnterBehavior">
          <option value="open">{{ $t("settings.directlyOpenCollection") }}</option>
          <option value="navigate">{{ $t("settings.navigateToCollection") }}</option>
        </select>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.itemResult") }}</span>
        <select v-model="search.itemEnterBehavior">
          <option value="open">{{ $t("settings.directlyOpenItem") }}</option>
          <option value="navigate">{{ $t("settings.navigateToCollectionItem") }}</option>
        </select>
      </label>
      <label class="setting-field">
        <span>{{ $t("settings.hideWindowAfterOpenLink") }}</span>
        <span class="setting-switch">
          <input v-model="store.state.data.settings.general.closeWindowAfterOpen" type="checkbox" /><span></span>
        </span>
      </label>
    </div>
  </section>
</template>
