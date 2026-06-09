<script setup lang="ts">
import { useOpenDockStore } from "../../store";
const store = useOpenDockStore();
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">项目默认集合模板</div>
    <div class="settings-card-description">新建项目场景时会按这里的模板自动生成集合。</div>
    <div class="settings-grid">
      <label v-for="(_, index) in store.state.data.settings.templates" :key="index" class="setting-field">
        <span>模板 {{ index + 1 }}</span>
        <input v-model="store.state.data.settings.templates[index]" />
      </label>
    </div>
  </section>
</template>
