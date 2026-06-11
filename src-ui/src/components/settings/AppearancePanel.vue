<script setup lang="ts">
import { computed, ref } from "vue";
import { ImageUp, RotateCcw, Upload } from "lucide-vue-next";
import { useOpenDockStore } from "../../store";

const store = useOpenDockStore();
const appearance = store.state.data.settings.appearance as typeof store.state.data.settings.appearance & {
  appIconStyle?: "dark" | "light" | "custom";
  customAppIconDataUrl?: string;
};
const fileInputRef = ref<HTMLInputElement | null>(null);
const iconError = ref("");

const iconOptions = computed(() => [
  { id: "dark" as const, label: "Dark", description: "Dark O + Dock icon for the default desktop style.", src: "/icons/opendock-o-dock-dark.svg" },
  { id: "light" as const, label: "Light", description: "Light high-contrast icon for bright system themes.", src: "/icons/opendock-o-dock-light.svg" },
  { id: "custom" as const, label: "Custom", description: "Upload a PNG, JPG, WebP, or SVG icon.", src: appearance.customAppIconDataUrl || "/icons/opendock-o-dock-dark.svg" }
]);

function setTheme(theme: string) {
  appearance.theme = theme;
}

function setDensity(density: string) {
  appearance.density = density;
}

function setAppIconStyle(style: "dark" | "light" | "custom") {
  appearance.appIconStyle = style;
  iconError.value = "";
}

function chooseCustomIcon() {
  fileInputRef.value?.click();
}

function handleCustomIconChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    iconError.value = "Choose a PNG, JPG, WebP, or SVG icon.";
    input.value = "";
    return;
  }
  if (file.size > 1024 * 1024) {
    iconError.value = "Icon file should be smaller than 1MB.";
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== "string") return;
    appearance.customAppIconDataUrl = reader.result;
    appearance.appIconStyle = "custom";
    iconError.value = "";
  };
  reader.onerror = () => {
    iconError.value = "Failed to read the icon file.";
  };
  reader.readAsDataURL(file);
  input.value = "";
}

function clearCustomIcon() {
  appearance.customAppIconDataUrl = "";
  appearance.appIconStyle = "dark";
  iconError.value = "";
}

function resetAppearance() {
  appearance.theme = "obsidian-dark";
  appearance.density = "compact";
  appearance.sidebarWidth = 306;
  appearance.interfaceFontFamily = "Segoe UI, Microsoft YaHei, system-ui, sans-serif";
  appearance.monospaceFontFamily = "Cascadia Code, Consolas, monospace";
  appearance.baseFontSize = 12;
  appearance.showConsole = true;
  appearance.appIconStyle = "dark";
  appearance.customAppIconDataUrl = "";
  iconError.value = "";
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      <span>Appearance</span>
      <button class="settings-action-button" type="button" @click="resetAppearance"><RotateCcw />Reset</button>
    </div>
    <div class="settings-grid">
      <div class="setting-field full">
        <span>App icon</span>
        <div class="app-icon-options">
          <button
            v-for="option in iconOptions"
            :key="option.id"
            class="app-icon-option"
            :class="{ active: (appearance.appIconStyle || 'dark') === option.id }"
            type="button"
            @click="setAppIconStyle(option.id)"
          >
            <span class="app-icon-preview"><img :src="option.src" alt="" /></span>
            <span class="app-icon-copy">
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </span>
          </button>
        </div>
        <div class="custom-icon-actions">
          <button class="settings-action-button" type="button" @click="chooseCustomIcon"><Upload />Choose custom icon</button>
          <button v-if="appearance.customAppIconDataUrl" class="settings-action-button" type="button" @click="clearCustomIcon"><ImageUp />Clear custom</button>
          <input ref="fileInputRef" class="hidden-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" @change="handleCustomIconChange" />
        </div>
        <small class="setting-help">This updates the in-app titlebar icon immediately. Installer and system Dock icons still need regenerated Tauri icon assets.</small>
        <small v-if="iconError" class="setting-error">{{ iconError }}</small>
      </div>

      <div class="setting-field full">
        <span>Theme</span>
        <div class="theme-options">
          <button v-for="theme in store.availableThemes()" :key="theme.id" class="theme-option" :class="{ active: appearance.theme === theme.id }" type="button" @click="setTheme(theme.id)">
            <span class="theme-swatches"><i v-for="color in theme.swatches" :key="color" :style="{ background: color }"></i></span>
            <span class="theme-copy">
              <strong>{{ theme.name }}</strong>
              <small>{{ theme.source === 'plugin' ? 'Plugin theme' : theme.kind === 'light' ? 'Built-in light' : 'Built-in dark' }}</small>
            </span>
          </button>
        </div>
      </div>

      <div class="setting-field">
        <span>Density</span>
        <div class="segmented-control">
          <button type="button" :class="{ active: appearance.density === 'compact' }" @click="setDensity('compact')">Compact</button>
          <button type="button" :class="{ active: appearance.density === 'comfortable' }" @click="setDensity('comfortable')">Comfortable</button>
        </div>
      </div>

      <label class="setting-field full">
        <span>Interface font</span>
        <input v-model="appearance.interfaceFontFamily" type="text" placeholder="Segoe UI, Microsoft YaHei, system-ui, sans-serif" />
      </label>

      <label class="setting-field full">
        <span>Monospace font</span>
        <input v-model="appearance.monospaceFontFamily" type="text" placeholder="Cascadia Code, Consolas, monospace" />
      </label>

      <label class="setting-field">
        <span>Base font size</span>
        <div class="range-field">
          <input v-model.number="appearance.baseFontSize" type="range" min="11" max="16" step="1" />
          <input v-model.number="appearance.baseFontSize" type="number" min="11" max="16" />
        </div>
      </label>

      <label class="setting-field">
        <span>Sidebar width</span>
        <div class="range-field">
          <input v-model.number="appearance.sidebarWidth" type="range" min="240" max="420" step="2" />
          <input v-model.number="appearance.sidebarWidth" type="number" min="240" max="420" />
        </div>
      </label>
      <label class="setting-field">
        <span>Show Console</span>
        <span class="setting-switch">
          <input v-model="appearance.showConsole" type="checkbox" /><span></span>
        </span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.app-icon-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.app-icon-option { min-height: 92px; display: grid; grid-template-columns: 58px minmax(0, 1fr); align-items: center; gap: 12px; padding: 10px; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; text-align: left; cursor: pointer; }
.app-icon-option:hover, .app-icon-option.active { border-color: color-mix(in srgb, var(--accent) 54%, var(--line)); background: var(--bg-3); }
.app-icon-preview { width: 58px; height: 58px; display: grid; place-items: center; overflow: hidden; border-radius: 14px; background: var(--bg-2); border: 1px solid var(--line); }
.app-icon-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.app-icon-copy { min-width: 0; display: grid; gap: 4px; }
.app-icon-copy strong { color: var(--text); font-weight: 650; }
.app-icon-copy small, .setting-help { color: var(--muted); font-size: 11px; line-height: 1.45; }
.custom-icon-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.hidden-file-input { display: none; }
.setting-error { color: var(--red); font-size: 11px; }
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
@media (max-width: 920px) { .app-icon-options, .theme-options { grid-template-columns: 1fr; } }
</style>
