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
  <section class="settings-card">
    <div class="settings-card-title">{{ $t("settings.searchTagColors") }}</div>
    <div class="settings-card-description">{{ $t("settings.searchTagColorsDesc") }}</div>
    <div class="settings-grid">
      <label class="setting-field search-color-field">
        <span>{{ $t("settings.sceneTagColor") }}</span>
        <span class="color-input-row">
          <input v-model="search.sceneTagColor" type="color" :aria-label="$t('settings.sceneTagColor')" />
          <input v-model="search.sceneTagColor" class="color-text-input" />
          <span class="search-tag-preview" :style="{ '--tag-color': search.sceneTagColor }">{{ $t("search.scene") }}</span>
        </span>
      </label>
      <label class="setting-field search-color-field">
        <span>{{ $t("settings.collectionTagColor") }}</span>
        <span class="color-input-row">
          <input v-model="search.collectionTagColor" type="color" :aria-label="$t('settings.collectionTagColor')" />
          <input v-model="search.collectionTagColor" class="color-text-input" />
          <span class="search-tag-preview" :style="{ '--tag-color': search.collectionTagColor }">{{ $t("search.collection") }}</span>
        </span>
      </label>
      <label class="setting-field search-color-field">
        <span>{{ $t("settings.itemTagColor") }}</span>
        <span class="color-input-row">
          <input v-model="search.itemTagColor" type="color" :aria-label="$t('settings.itemTagColor')" />
          <input v-model="search.itemTagColor" class="color-text-input" />
          <span class="search-tag-preview" :style="{ '--tag-color': search.itemTagColor }">{{ $t("search.resource") }}</span>
        </span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.color-input-row { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 8px; }
.color-input-row input[type="color"] { width: 38px; padding: 3px; cursor: pointer; }
.color-text-input { font-family: var(--mono); text-transform: uppercase; }
.search-tag-preview { height: 22px; display: inline-flex; align-items: center; padding: 0 8px; color: var(--tag-color); background: color-mix(in srgb, var(--tag-color) 12%, var(--bg)); border: 1px solid color-mix(in srgb, var(--tag-color) 34%, var(--line)); border-radius: 999px; font-size: 10px; white-space: nowrap; }
</style>
