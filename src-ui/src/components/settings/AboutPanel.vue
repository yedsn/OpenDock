<script setup lang="ts">
import { useOpenDockStore } from "../../store";
import { useI18n } from "../../i18n";
const store = useOpenDockStore();
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">{{ $t("app.name") }}</div>
    <p>{{ $t("settings.version") }}: 0.1.0 / {{ $t("settings.tauriVueDesktop") }}</p>
    <p>{{ $t("settings.positioning") }}: {{ $t("settings.positioningDesc") }}</p>
    <p>{{ $t("settings.currentWorkspace") }}: {{ store.activeWorkspace().name }} / {{ $t("settings.collectionCount", { count: store.state.data.collections.length }) }} / {{ $t("settings.pluginCount", { count: store.state.data.plugins.length }) }}</p>
  </section>
</template>
