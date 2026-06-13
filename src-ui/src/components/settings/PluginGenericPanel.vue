<script setup lang="ts">
defineProps<{ title: string }>();
import { useI18n } from "../../i18n";
const { t } = useI18n();
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">{{ title }}</div>
    <div class="settings-card-description">{{ $t("settings.pluginGenericDesc") }}</div>
  </section>
</template>
