<script setup lang="ts">
import { computed } from "vue";
import { Blocks } from "lucide-vue-next";
import { useOpenDockStore } from "../../../src-ui/src/store";

const store = useOpenDockStore();
const plugin = computed(() => store.state.data.plugins.find((entry) => entry.id === "external-demo"));
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      External Demo
      <span><Blocks />外置插件</span>
    </div>
    <div class="settings-card-description">
      该页面来自 `plugins/external-demo`，用于验证外置插件可以被动态发现、安装后出现菜单、停用后菜单消失。
    </div>
    <div class="plugin-card enabled" v-if="plugin">
      <div class="plugin-card-main">
        <div class="plugin-icon"><Blocks /></div>
        <div>
          <div class="plugin-title"><strong>{{ plugin.name }}</strong><code>v{{ plugin.version }}</code><span>{{ plugin.category }}</span></div>
          <p>{{ plugin.capability }}</p>
          <div class="plugin-permissions">
            <span v-for="permission in plugin.permissions" :key="permission">{{ permission }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

