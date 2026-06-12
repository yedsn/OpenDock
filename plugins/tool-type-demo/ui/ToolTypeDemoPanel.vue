<script setup lang="ts">
import { computed } from "vue";
import { Wrench } from "lucide-vue-next";
import { useOpenDockStore } from "../../../src-ui/src/store";

const store = useOpenDockStore();
const plugin = computed(() => store.state.data.plugins.find((entry) => entry.id === "tool-type-demo"));
const diagramTools = computed(() => store.visibleTools().filter((tool) => tool.type === "Diagram Tool"));
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      Tool Type Demo
      <span><Wrench />工具类型插件</span>
    </div>
    <div class="settings-card-description">
      该外置插件贡献 `Diagram Tool` 打开工具类型、`Diagram Spec` 资源类型、专属表单字段和插件打开流程。
    </div>
    <div class="sync-status-strip">
      <span>插件状态：{{ plugin?.enabled ? "已启用" : "未启用" }}</span>
      <span>贡献类型：Diagram Tool</span>
      <span>资源类型：Diagram Spec</span>
      <span>当前工具数：{{ diagramTools.length }}</span>
    </div>
    <div class="plugin-permissions">
      <span>字段：renderer</span>
      <span>字段：layout</span>
      <span>打开流程：插件 handler</span>
    </div>
  </section>
</template>
