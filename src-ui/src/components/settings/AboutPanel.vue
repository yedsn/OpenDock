<script setup lang="ts">
import { useOpenDockStore } from "../../store";
const store = useOpenDockStore();
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">OpenDock</div>
    <p>版本：0.1.0 · Tauri + Vue 桌面端</p>
    <p>定位：面向开发者和专业软件用户的资源集合与启动工具。</p>
    <p>当前工作区：{{ store.activeWorkspace().name }} · 集合 {{ store.state.data.collections.length }} 个 · 插件 {{ store.state.data.plugins.length }} 个</p>
  </section>
</template>
