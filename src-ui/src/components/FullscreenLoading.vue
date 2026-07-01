<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

type LoadingParam = string | { message?: string; count?: number };

const visible = ref(false);
const message = ref("加载中...");

function normalizeMessage(param?: LoadingParam): string {
  const rawMessage = typeof param === "string" ? param : param?.message || "加载中...";
  const count = typeof param === "object" ? param.count ?? 40 : 40;
  return rawMessage.length > count ? rawMessage.substring(0, count) : rawMessage;
}

function show(param?: LoadingParam): void {
  message.value = normalizeMessage(param);
  visible.value = true;
}

function loading(param?: LoadingParam): void {
  show(param);
}

function dismiss(): void {
  visible.value = false;
}

onMounted(() => {
  window.vloading = { show, loading, dismiss };
});

onBeforeUnmount(() => {
  if (window.vloading?.show === show) {
    delete window.vloading;
  }
});
</script>

<template>
  <div v-if="visible" class="fullscreen-loading" role="status" aria-live="polite">
    <div class="fullscreen-loading-box">
      <span class="fullscreen-loading-spinner"></span>
      <span>{{ message }}</span>
    </div>
  </div>
</template>

<style scoped>
.fullscreen-loading { position: fixed; inset: 0; z-index: 2000; display: grid; place-items: center; background: rgba(9, 12, 18, 0.28); backdrop-filter: blur(2px); }
.fullscreen-loading-box { display: inline-flex; align-items: center; gap: 10px; min-width: 148px; height: 46px; padding: 0 16px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--bg-2); color: var(--text); box-shadow: 0 18px 48px var(--shadow, rgba(0, 0, 0, 0.42)); font-size: 13px; font-weight: 700; }
.fullscreen-loading-spinner { width: 16px; height: 16px; border: 2px solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: fullscreen-loading-spin 0.75s linear infinite; }
@keyframes fullscreen-loading-spin { to { transform: rotate(360deg); } }
</style>