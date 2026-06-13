<script setup lang="ts">
import { computed, ref } from "vue";
import { useOpenDockStore } from "../../store";
import { useI18n } from "../../i18n";

const store = useOpenDockStore();
const { t } = useI18n();
const toggleAction = "显示/隐藏窗口";
const pendingKey = ref("");
const captureActive = ref(false);
const status = ref("");
const statusKind = ref<"idle" | "success" | "error">("idle");

const toggleShortcut = computed(() => {
  let shortcut = store.state.data.settings.shortcuts.find((entry) => entry.action === toggleAction);
  if (!shortcut) {
    shortcut = { action: toggleAction, key: "Alt+O" };
    store.state.data.settings.shortcuts.unshift(shortcut);
  }
  return shortcut;
});

const otherShortcuts = computed(() => store.state.data.settings.shortcuts.filter((entry) => entry.action !== toggleAction));

function keyLabel(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");

  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  if (!["Control", "Alt", "Shift", "Meta"].includes(key)) {
    parts.push(key);
  }
  return parts.join("+");
}

async function applyKey(key: string): Promise<void> {
  const normalized = key.trim();
  if (!normalized) return;
  pendingKey.value = normalized;
  const result = await store.updateToggleWindowHotkey(normalized);
  statusKind.value = result.ok ? "success" : "error";
  status.value = result.message;
}

async function captureKey(event: KeyboardEvent): Promise<void> {
  event.preventDefault();
  event.stopPropagation();
  const next = keyLabel(event);
  if (!next || !next.includes("+")) {
    statusKind.value = "error";
    status.value = t("settings.comboKeyHint");
    return;
  }
  captureActive.value = false;
  await applyKey(next);
}

async function resetDefault(): Promise<void> {
  captureActive.value = false;
  await applyKey("Alt+O");
}

pendingKey.value = toggleShortcut.value.key;
</script>

<template>
  <section class="settings-card shortcuts-settings-card">
    <div class="settings-card-title">
      <span>{{ $t("settings.shortcutKeys") }}</span>
      <button class="secondary-button" type="button" @click="resetDefault">{{ $t("settings.restoreDefaultShortcuts") }}</button>
    </div>
    <p class="settings-card-description">{{ $t("settings.setGlobalShortcuts") }}</p>

    <div class="shortcut-editor">
      <div>
        <div class="shortcut-name">{{ $t("settings.showHideWindow") }}</div>
        <div class="shortcut-note">{{ $t("settings.currentBinding") }}<code>{{ toggleShortcut.key }}</code></div>
      </div>
      <input
        v-model="pendingKey"
        class="shortcut-capture-input"
        :class="{ capturing: captureActive }"
        readonly
        @focus="captureActive = true"
        @keydown="captureKey"
        :placeholder="$t('settings.clickThenPress')"
      />
      <button class="primary-button" type="button" @click="captureActive = true">{{ $t("settings.record") }}</button>
    </div>

    <div v-if="status" class="shortcut-status" :class="statusKind">{{ status }}</div>

    <div v-if="otherShortcuts.length" class="settings-table shortcuts-table">
      <div v-for="shortcut in otherShortcuts" :key="shortcut.action" class="settings-row shortcut-row">
        <strong>{{ shortcut.action }}</strong>
        <input v-model="shortcut.key" />
        <code>{{ $t("settings.appShortcut") }}</code>
        <span></span>
      </div>
    </div>
  </section>
</template>