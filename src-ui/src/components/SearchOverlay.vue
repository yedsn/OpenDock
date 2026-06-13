<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { FileText, FolderKanban, Globe, Layers, Search } from "lucide-vue-next";
import { useOpenDockStore } from "../store";
import { useI18n } from "../i18n";
import type { SearchSuggestion } from "../types";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const store = useOpenDockStore();
const { t } = useI18n();
const activeIndex = ref(0);
const listRef = ref<HTMLElement | null>(null);

const results = computed(() => store.searchSuggestions.value);
const hasQuery = computed(() => Boolean(store.state.search.trim()));

watch(results, () => {
  activeIndex.value = results.value.length ? Math.min(activeIndex.value, results.value.length - 1) : 0;
}, { immediate: true });

function iconFor(result: SearchSuggestion) {
  if (result.kind === "scene") return FolderKanban;
  if (result.kind === "collection") return Layers;
  return result.isUrl ? Globe : FileText;
}

function labelFor(result: SearchSuggestion): string {
  if (result.kind === "scene") return t("search.scene");
  if (result.kind === "collection") return t("search.collection");
  return result.isUrl ? t("search.link") : t("search.resource");
}

function setActive(index: number) {
  if (!results.value.length) return;
  activeIndex.value = Math.max(0, Math.min(index, results.value.length - 1));
}

async function scrollActiveIntoView() {
  await nextTick();
  const active = listRef.value?.querySelector<HTMLElement>(".search-result.active");
  active?.scrollIntoView({ block: "nearest" });
}

async function move(delta: number) {
  if (!results.value.length) return;
  const next = (activeIndex.value + delta + results.value.length) % results.value.length;
  activeIndex.value = next;
  await scrollActiveIntoView();
}

async function run(result = results.value[activeIndex.value]) {
  if (!result) return;
  await store.executeSuggestionAndMaybeHide(result);
  emit("close");
}

defineExpose({
  move,
  run,
});
</script>

<template>
  <div v-if="open && hasQuery" class="search-overlay" role="listbox" :aria-label="$t('search.searchResults')">
    <div v-if="results.length" ref="listRef" class="search-results">
      <button
        v-for="(result, index) in results"
        :key="result.id"
        class="search-result"
        :class="{ active: index === activeIndex }"
        type="button"
        role="option"
        :aria-selected="index === activeIndex"
        @mouseenter="setActive(index)"
        @mousedown.prevent="run(result)"
      >
        <span class="search-result-icon"><component :is="iconFor(result)" /></span>
        <span class="search-result-main">
          <strong>{{ result.title }}</strong>
          <small>{{ result.subtitle }}</small>
        </span>
        <span class="search-result-kind">{{ labelFor(result) }}</span>
      </button>
    </div>
    <div v-else class="search-empty">
      <Search />
      <span>{{ $t("search.noMatchResults") }}</span>
    </div>
  </div>
</template>
