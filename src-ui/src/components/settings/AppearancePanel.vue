<script setup lang="ts">
import { useOpenDockStore } from "../../store";
const store = useOpenDockStore();
const appearance = store.state.data.settings.appearance;

function setTheme(theme: string) {
  appearance.theme = theme;
}

function setDensity(density: string) {
  appearance.density = density;
}

function resetAppearance() {
  appearance.theme = "obsidian-dark";
  appearance.density = "紧凑";
  appearance.sidebarWidth = 306;
  appearance.interfaceFontFamily = "Segoe UI, Microsoft YaHei, system-ui, sans-serif";
  appearance.monospaceFontFamily = "Cascadia Code, Consolas, monospace";
  appearance.baseFontSize = 12;
  appearance.showConsole = true;
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      <span>外观</span>
      <button class="settings-action-button" type="button" @click="resetAppearance">重置外观</button>
    </div>
    <div class="settings-grid">
      <div class="setting-field full">
        <span>主题</span>
        <div class="theme-options">
          <button v-for="theme in store.availableThemes()" :key="theme.id" class="theme-option" :class="{ active: appearance.theme === theme.id }" type="button" @click="setTheme(theme.id)">
            <span class="theme-swatches"><i v-for="color in theme.swatches" :key="color" :style="{ background: color }"></i></span>
            <span class="theme-copy">
              <strong>{{ theme.name }}</strong>
              <small>{{ theme.source === 'plugin' ? '主题插件' : theme.kind === 'light' ? '内置亮色' : '内置深色' }}</small>
            </span>
          </button>
        </div>
      </div>

      <div class="setting-field">
        <span>密度</span>
        <div class="segmented-control">
          <button type="button" :class="{ active: appearance.density === '紧凑' }" @click="setDensity('紧凑')">紧凑</button>
          <button type="button" :class="{ active: appearance.density === '舒适' }" @click="setDensity('舒适')">舒适</button>
        </div>
      </div>

      <label class="setting-field full">
        <span>界面字体</span>
        <input v-model="appearance.interfaceFontFamily" type="text" placeholder="Segoe UI, Microsoft YaHei, system-ui, sans-serif" />
      </label>

      <label class="setting-field full">
        <span>等宽字体</span>
        <input v-model="appearance.monospaceFontFamily" type="text" placeholder="Cascadia Code, Consolas, monospace" />
      </label>

      <label class="setting-field">
        <span>基础字号</span>
        <div class="range-field">
          <input v-model.number="appearance.baseFontSize" type="range" min="11" max="16" step="1" />
          <input v-model.number="appearance.baseFontSize" type="number" min="11" max="16" />
        </div>
      </label>

      <label class="setting-field">
        <span>侧边栏宽度</span>
        <div class="range-field">
          <input v-model.number="appearance.sidebarWidth" type="range" min="240" max="420" step="2" />
          <input v-model.number="appearance.sidebarWidth" type="number" min="240" max="420" />
        </div>
      </label>
      <label class="setting-field">
        <span>显示 Console</span>
        <span class="setting-switch">
          <input v-model="appearance.showConsole" type="checkbox" /><span></span>
        </span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.theme-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.theme-option { min-height: 62px; display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 10px; padding: 10px; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; text-align: left; cursor: pointer; }
.theme-option:hover, .theme-option.active { color: var(--text); border-color: color-mix(in srgb, var(--accent) 48%, var(--line)); background: var(--bg-3); }
.theme-copy { min-width: 0; display: grid; gap: 3px; }
.theme-copy strong { color: var(--text); font-weight: 400; }
.theme-copy small { color: var(--muted); font-size: 10px; font-weight: 400; }
.theme-swatches { display: inline-flex; align-items: center; gap: 4px; }
.theme-swatches i { width: 18px; height: 18px; border-radius: 5px; border: 1px solid rgba(255,255,255,.12); }
.segmented-control { height: 32px; display: inline-grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 2px; background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); }
.segmented-control button { min-width: 72px; color: var(--text); background: transparent; border-radius: 5px; font-size: 12px; font-weight: 400; cursor: pointer; }
.segmented-control button.active { color: var(--text); background: var(--bg-3); }
.range-field { display: grid; grid-template-columns: minmax(140px, 1fr) 74px; align-items: center; gap: 8px; }
.range-field input[type="range"] { padding: 0; accent-color: var(--accent); cursor: pointer; }
</style>
