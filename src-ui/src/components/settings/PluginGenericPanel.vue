<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">{{ title }}</div>
    <div class="settings-card-description">该页面来自插件配置入口。具体配置 schema 可由插件 manifest 提供。</div>
  </section>
</template>
