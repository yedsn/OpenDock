<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  Activity,  Check,
  Copy,
  FileText,
  FolderPlus,
  Globe,
  GripVertical,
  Layers,
  Pencil,
  Play,
  Plus,
  Star,
  Tags,
  Trash2,
  Wrench
} from "lucide-vue-next";
import { useOpenDockStore } from "../store";
import { useI18n } from "../i18n";
import { confirmDelete } from "../dialog";
import VirtualList from "./VirtualList.vue";
import { useListReorder } from "../composables/useListReorder";
import { copyText, showToast } from "../helpers";

const store = useOpenDockStore();
const { t, typeLabel } = useI18n();

const activeCollection = computed(() => store.activeCollection());
const activeCollectionId = computed(() => store.state.data.activeCollectionId);
const deferredActiveCollectionId = ref(store.state.data.activeCollectionId);
let pendingItemsFrame = 0;

watch(activeCollectionId, (collectionId) => {
  if (pendingItemsFrame) cancelAnimationFrame(pendingItemsFrame);
  pendingItemsFrame = requestAnimationFrame(() => {
    deferredActiveCollectionId.value = collectionId;
    pendingItemsFrame = 0;
  });
});

onBeforeUnmount(() => {
  if (pendingItemsFrame) cancelAnimationFrame(pendingItemsFrame);
  if (copyCollectionTimer) window.clearTimeout(copyCollectionTimer);
  if (copyItemTimer) window.clearTimeout(copyItemTimer);
});

const activeItems = computed(() =>
  deferredActiveCollectionId.value ? store.collectionItems(deferredActiveCollectionId.value) : []
);

// Cache scene-name lookup so each row does not pay an O(N) find() on every render.
const sceneNameById = computed(() => {
  const map = new Map<string, string>();
  for (const scene of store.state.data.scenes) {
    map.set(scene.id, scene.name);
  }
  return map;
});

interface CollectionRow {
  id: string;
  name: string;
  type: string;
  sceneId: string | null;
  favorite: boolean;
  subtitle: string;
  tags: string[];
  source: any;
}

const collectionRows = computed<CollectionRow[]>(() => {
  const sceneMap = sceneNameById.value;
  return store.visibleCollections.value.map((collection) => {
    const sceneName = collection.sceneId ? (sceneMap.get(collection.sceneId) || t("types.noScene")) : t("types.noScene");
    return {
      id: collection.id,
      name: collection.name,
      type: collection.type,
      sceneId: collection.sceneId,
      favorite: collection.favorite,
      subtitle: sceneName,
      tags: collection.tags || [],
      source: collection
    };
  });
});

interface ItemRow {
  id: string;
  name: string;
  type: string;
  value: string;
  subtitle: string;
  source: any;
}

const itemRows = computed<ItemRow[]>(() =>
  activeItems.value.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    value: item.value,
    subtitle: item.value,
    source: item
  }))
);

// Row stride tracks CSS density so virtual scroll positions stay flush with the cards.
const isComfortable = computed(() => store.state.data.settings.appearance.density === "舒适");
const cardPad = computed(() => (isComfortable.value ? 12 : 10));
const rowGap = computed(() => (isComfortable.value ? 10 : 8));
const listPad = computed(() => (isComfortable.value ? 12 : 10));
const collectionItemHeight = computed(() => 36 + cardPad.value * 2);
const itemPad = computed(() => (isComfortable.value ? 12 : 9));
const itemRowHeight = computed(() => 36 + itemPad.value * 2);
const collectionSkeletonRows = [0, 1, 2, 3, 4, 5];
const itemSkeletonRows = [0, 1, 2, 3, 4, 5, 6];
const collectionsLoading = computed(() => store.state.dataLoading);
const itemsLoading = computed(() => store.state.dataLoading || deferredActiveCollectionId.value !== activeCollectionId.value);

const quickViewLabels = computed<Record<string, string>>(() => ({
  all: t("sidebar.allResources"),
  favorites: t("sidebar.favoriteCollections"),
  recent: t("sidebar.recentlyOpened"),
  tags: t("sidebar.tagFilter"),
  unbound: t("sidebar.unboundCollections")
}));

const activeTab = computed(() => store.state.tabs.find((tab) => tab.id === store.state.activeTabId));
const isQuickViewTab = computed(() => activeTab.value?.kind === "quickview");
const paneTitle = computed(() => isQuickViewTab.value ? quickViewLabels.value[store.state.quickView] : store.activeScene().name);
const paneDescription = computed(() => {
  const count = collectionRows.value.length;
  if (store.state.quickView === "tags" && store.state.activeTag) return `${store.state.activeTag} · ${count} ${t("settings.collections")}`;
  if (isQuickViewTab.value) return `${t("workbench.allScenes")} \u00b7 ${count} ${t("settings.collections")}`;
  return `${count} ${t("settings.collections")}`;
});

function editScene(sceneId: string) {
  store.state.modal.editingId = sceneId;
  store.state.modal.kind = "scene";
}

async function deleteSceneConfirm(sceneId: string) {
  const scene = store.state.data.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  if (await confirmDelete(t("sidebar.confirmDeleteScene", { name: scene.name }))) {
    store.deleteScene(sceneId);
  }
}

function editCollection(collectionId: string) {
  store.state.modal.editingId = collectionId;
  store.state.modal.kind = "collection";
}

async function deleteCollectionConfirm(collectionId: string) {
  const coll = store.state.data.collections.find((c) => c.id === collectionId);
  if (!coll) return;
  if (await confirmDelete(t("workbench.confirmDeleteCollection", { name: coll.name }))) {
    store.deleteCollection(collectionId);
  }
}

function editItem(itemId: string) {
  store.state.modal.editingId = itemId;
  store.state.modal.kind = "item";
}

async function deleteItemConfirm(itemId: string) {
  const item = store.state.data.items.find((i) => i.id === itemId);
  if (!item) return;
  if (await confirmDelete(t("workbench.confirmDeleteItem", { name: item.name }))) {
    store.deleteItem(itemId);
  }
}

const copiedCollectionId = ref<string | null>(null);
const copiedItemId = ref<string | null>(null);
let copyCollectionTimer = 0;
let copyItemTimer = 0;

async function copyCollectionName(collection: { id: string; name: string }) {
  if (await copyText(collection.name)) {
    copiedCollectionId.value = collection.id;
    showToast(t("common.copySuccess"));
    if (copyCollectionTimer) window.clearTimeout(copyCollectionTimer);
    copyCollectionTimer = window.setTimeout(() => { copiedCollectionId.value = null; }, 1200);
  }
}

async function copyItemName(item: { id: string; name: string }) {
  if (await copyText(item.name)) {
    copiedItemId.value = item.id;
    showToast(t("common.copySuccess"));
    if (copyItemTimer) window.clearTimeout(copyItemTimer);
    copyItemTimer = window.setTimeout(() => { copiedItemId.value = null; }, 1200);
  }
}


const isManualCollectionSort = computed(() => store.effectiveCollectionSortMode() === "手动");
const isManualItemSort = computed(() => store.effectiveItemSortMode() === "手动");

const collectionListRef = ref<HTMLElement | null>(null);
const itemListRef = ref<HTMLElement | null>(null);

useListReorder({
  el: collectionListRef,
  enabled: isManualCollectionSort,
  onReorder: (fromIndex, toIndex) => store.reorderCollections(fromIndex, toIndex)
});

useListReorder({
  el: itemListRef,
  enabled: isManualItemSort,
  onReorder: (fromIndex, toIndex) => {
    const collectionId = store.state.data.activeCollectionId;
    if (collectionId) store.reorderItems(collectionId, fromIndex, toIndex);
  }
});

function selectCollection(collection: { id: string; name: string; sceneId: string | null }) {
  const fullCollection = store.findCollectionById(collection.id);
  if (!fullCollection) return;
  if (isQuickViewTab.value) {
    if (store.state.data.activeCollectionId !== fullCollection.id) store.state.data.activeCollectionId = fullCollection.id;
    return;
  }
  store.setActiveCollection(fullCollection);
}
</script>
<template>
  <section class="workspace">
    <section class="collection-pane" :class="{ 'with-tag-filter': store.state.quickView === 'tags' }">
      <div class="pane-header">
        <div>
          <h1>{{ paneTitle }}</h1>
          <p>{{ paneDescription }}</p>
        </div>
        <div v-if="!isQuickViewTab" class="pane-header-actions">
          <button class="icon-button" :title="$t('workbench.editScene')" @click="editScene(store.state.data.activeSceneId)"><Pencil /></button>
          <button class="icon-button" :title="$t('workbench.deleteScene')" @click="deleteSceneConfirm(store.state.data.activeSceneId)"><Trash2 /></button>
          <button class="run-button" @click="store.openScene(store.activeScene())"><Play />{{ $t("workbench.openScene") }}</button>
        </div>
      </div>

      <div class="pane-tools">
        <button class="tool-chip" :class="{ active: store.state.collectionMode === 'collections' }" @click="store.state.collectionMode = 'collections'"><Layers />{{ $t("workbench.collections") }}</button>
        <button class="tool-chip" :class="{ active: store.state.collectionMode === 'web' }" @click="store.state.collectionMode = 'web'"><Globe />{{ $t("workbench.webPages") }}</button>
        <button class="tool-chip" :class="{ active: store.state.collectionMode === 'tool' }" @click="store.state.collectionMode = 'tool'"><Wrench />{{ $t("workbench.tools") }}</button>
        <span class="tool-spacer"></span>
        <button class="tool-chip action" @click="store.state.modal.kind = 'collection'; store.state.modal.editingId = undefined;"><FolderPlus />{{ $t("workbench.newCollection") }}</button>
      </div>

      <section v-if="store.state.quickView === 'tags'" class="tag-filter-panel">
        <div class="tag-filter-heading">
          <div>
            <div class="tag-filter-title"><Tags />{{ $t("sidebar.tagFilter") }}</div>
            <p v-if="!store.collectionTags.value.length">{{ $t("workbench.tagFilterHint") }}</p>
          </div>
          <div class="tag-filter-actions">
            <button
              class="tag-filter-open"
              type="button"
              :disabled="!store.state.activeTag || !collectionRows.length"
              @click="store.openCollectionsBatch(collectionRows.map((row) => row.source), store.state.activeTag || $t('workbench.allTags'))">
              <Play />{{ $t("workbench.openTaggedCollections") }}
            </button>
            <button
              class="tag-filter-reset"
              type="button"
              :class="{ active: !store.state.activeTag }"
              @click="store.state.activeTag = ''">
              {{ $t("workbench.allTags") }}
            </button>
          </div>
        </div>
        <div v-if="store.collectionTags.value.length" class="tag-filter-grid">
          <button
            v-for="tag in store.collectionTags.value"
            :key="tag.name"
            class="tag-filter-card"
            :class="{ active: store.state.activeTag === tag.name }"
            :title="tag.name"
            @click="store.state.activeTag = store.state.activeTag === tag.name ? '' : tag.name">
            <span class="tag-filter-name">{{ tag.name }}</span>
            <span class="tag-filter-count">{{ tag.count }}</span>
          </button>
        </div>
        <div v-else class="tag-filter-empty">{{ $t("workbench.noTagsYet") }}</div>
      </section>

      <div v-if="collectionsLoading" class="collection-list skeleton-list" aria-busy="true" aria-live="polite">
        <div v-for="row in collectionSkeletonRows" :key="row" class="collection-card skeleton-card" :style="{ height: collectionItemHeight + 'px' }">
          <span class="skeleton-block skeleton-icon"></span>
          <span class="skeleton-text-group">
            <span class="skeleton-block skeleton-title"></span>
            <span class="skeleton-block skeleton-subtitle"></span>
          </span>
          <span class="skeleton-actions">
            <span class="skeleton-block skeleton-action"></span>
            <span class="skeleton-block skeleton-action"></span>
          </span>
        </div>
      </div>
      <div v-else-if="isManualCollectionSort && collectionRows.length" class="collection-list" ref="collectionListRef">
          <div v-for="(item, index) in collectionRows" :key="item.id"
            class="collection-card"
            :class="{ active: activeCollectionId === item.id, 'manual-sort': isManualCollectionSort }"
            role="button"
            tabindex="0"
            :style="{ height: collectionItemHeight + 'px' }"
            @click="selectCollection(item.source)"
            @keydown.enter.prevent="selectCollection(item.source)"
            @keydown.space.prevent="selectCollection(item.source)">
            <GripVertical v-if="isManualCollectionSort" class="drag-handle" />
            <span class="card-icon"><Layers /></span>
            <span class="card-text">
              <strong>{{ item.name }}</strong>
              <small class="collection-meta"><span class="collection-scene-name">{{ item.subtitle }}</span><span v-if="item.tags.length" class="collection-tags"><span v-for="tag in item.tags" :key="tag" class="collection-tag">{{ tag }}</span></span></small>
            </span>
            <span class="card-actions">
              <button class="icon-button" type="button" :title="$t('workbench.copyName')" @click.stop="copyCollectionName(item)"><component :is="copiedCollectionId === item.id ? Check : Copy" /></button>
              <button class="icon-button" type="button" :title="$t('workbench.edit')" @click.stop="editCollection(item.id)"><Pencil /></button>
              <button class="icon-button danger" type="button" :title="$t('workbench.delete')" @click.stop="deleteCollectionConfirm(item.id)"><Trash2 /></button>
              <button class="icon-button" type="button" @click.stop="store.toggleFavorite(item.source)">
                <Star :fill="item.favorite ? 'currentColor' : 'none'" />
              </button>
            </span>
          </div>
        </div>
        <VirtualList
          v-else-if="collectionRows.length"
          class="collection-list virtual-collection-list"
          :items="collectionRows"
          :item-height="collectionItemHeight"
          :gap="rowGap"
          :padding="listPad"
        >
          <template #row="{ item, index }">
            <div
              class="collection-card"
              :class="{ active: activeCollectionId === item.id }"
              role="button"
              tabindex="0"
              :style="{ height: collectionItemHeight + 'px' }"
              @click="selectCollection(item.source)"
              @keydown.enter.prevent="selectCollection(item.source)"
              @keydown.space.prevent="selectCollection(item.source)">
              <span class="card-icon"><Layers /></span>
              <span class="card-text">
                <strong>{{ item.name }}</strong>
                <small class="collection-meta"><span class="collection-scene-name">{{ item.subtitle }}</span><span v-if="item.tags.length" class="collection-tags"><span v-for="tag in item.tags" :key="tag" class="collection-tag">{{ tag }}</span></span></small>
              </span>
              <span class="card-actions">
                <button class="icon-button" type="button" :title="$t('workbench.copyName')" @click.stop="copyCollectionName(item)"><component :is="copiedCollectionId === item.id ? Check : Copy" /></button>
                <button class="icon-button" type="button" :title="$t('workbench.edit')" @click.stop="editCollection(item.id)"><Pencil /></button>
                <button class="icon-button danger" type="button" :title="$t('workbench.delete')" @click.stop="deleteCollectionConfirm(item.id)"><Trash2 /></button>
                <button class="icon-button" type="button" @click.stop="store.toggleFavorite(item.source)">
                  <Star :fill="item.favorite ? 'currentColor' : 'none'" />
                </button>
              </span>
            </div>
          </template>
        </VirtualList>
      <div v-else class="collection-list collection-list-empty">
        <div class="empty-state">{{ $t("workbench.noMatchingCollections") }}</div>
      </div>
    </section>

    <section class="resource-pane">
      <div class="resource-header">
        <div>
          <h2>{{ activeCollection?.name || t("workbench.unselectedCollection") }}</h2>
          <p>{{ activeCollection?.description || t("workbench.selectCollectionHint") }}</p>
          <div v-if="activeCollection?.tags?.length" class="collection-tags detail-tags"><span v-for="tag in activeCollection.tags" :key="tag" class="collection-tag">{{ tag }}</span></div>
        </div>
        <div class="resource-actions">
          <button class="icon-button" @click="store.state.modal.kind = 'item'; store.state.modal.editingId = undefined;"><Plus /></button>
          <button class="icon-button" v-if="activeCollection" :title="$t('workbench.editCollection')" @click="editCollection(activeCollection.id)"><Pencil /></button>
          <button v-if="activeCollection" class="run-button" @click="store.openCollection(activeCollection)"><Play />{{ $t("workbench.openCollection") }}</button>
        </div>
      </div>

      <div v-if="itemsLoading" class="item-list skeleton-list" aria-busy="true" aria-live="polite">
        <div v-for="row in itemSkeletonRows" :key="row" class="item-row skeleton-row" :style="{ height: itemRowHeight + 'px' }">
          <span class="skeleton-block skeleton-icon compact"></span>
          <span class="skeleton-text-group">
            <span class="skeleton-block skeleton-title"></span>
            <span class="skeleton-block skeleton-subtitle wide"></span>
          </span>
          <span class="skeleton-actions">
            <span class="skeleton-block skeleton-pill"></span>
            <span class="skeleton-block skeleton-action"></span>
            <span class="skeleton-block skeleton-action"></span>
          </span>
        </div>
      </div>
      <div v-else-if="isManualItemSort && itemRows.length" class="item-list" ref="itemListRef">
          <div v-for="(item, index) in itemRows" :key="item.id" class="item-row"
            :class="{ 'manual-sort': isManualItemSort }"
            :style="{ height: itemRowHeight + 'px' }" role="button" tabindex="0"
            @keydown.enter.prevent="store.openItem(item.source)">
            <GripVertical v-if="isManualItemSort" class="drag-handle" />
            <span class="card-icon"><FileText /></span>
            <span class="item-main">
              <strong>{{ item.name }}</strong>
              <small>{{ item.subtitle }}</small>
            </span>
            <span class="item-actions">
              <button class="row-open" @click="store.openItem(item.source)"><Play />{{ $t("workbench.open") }}</button>
              <button class="icon-button" :title="$t('workbench.copyName')" @click="copyItemName(item)"><component :is="copiedItemId === item.id ? Check : Copy" /></button>
              <button class="icon-button" :title="$t('workbench.edit')" @click="editItem(item.id)"><Pencil /></button>
              <button class="icon-button danger" :title="$t('workbench.delete')" @click="deleteItemConfirm(item.id)"><Trash2 /></button>
            </span>
          </div>
        </div>
        <VirtualList
          v-else-if="itemRows.length"
          class="item-list virtual-item-list"
          :items="itemRows"
          :item-height="itemRowHeight"
          :gap="rowGap"
          :padding="listPad"
        >
          <template #row="{ item, index }">
            <div class="item-row"
              :style="{ height: itemRowHeight + 'px' }" role="button" tabindex="0"
              @keydown.enter.prevent="store.openItem(item.source)">
              <span class="card-icon"><FileText /></span>
              <span class="item-main">
                <strong>{{ item.name }}</strong>
                <small>{{ item.subtitle }}</small>
              </span>
              <span class="item-actions">
                <button class="row-open" @click="store.openItem(item.source)"><Play />{{ $t("workbench.open") }}</button>
                <button class="icon-button" :title="$t('workbench.copyName')" @click="copyItemName(item)"><component :is="copiedItemId === item.id ? Check : Copy" /></button>
                <button class="icon-button" :title="$t('workbench.edit')" @click="editItem(item.id)"><Pencil /></button>
                <button class="icon-button danger" :title="$t('workbench.delete')" @click="deleteItemConfirm(item.id)"><Trash2 /></button>
              </span>
            </div>
          </template>
        </VirtualList>
      <div v-else class="item-list item-list-empty">
        <div class="empty-state">{{ $t("workbench.noResourcesYet") }}</div>
      </div>

      <section v-if="store.state.data.settings.appearance.showConsole" class="console-pane">
        <div class="console-title"><Activity />Console</div>
        <div class="activity-log">
          <div v-for="entry in store.state.data.activity.slice(0, 8)" :key="entry.id">{{ entry.text }}</div>
        </div>
      </section>
    </section>
  </section>
</template>
<style scoped>
.collection-card.manual-sort { grid-template-columns: 16px 36px minmax(0,1fr) auto; user-select: none; }
.item-row.manual-sort { grid-template-columns: 16px 28px minmax(0,1fr) auto; user-select: none; }
.drag-handle { width: 14px; height: 14px; opacity: 0.35; cursor: grab; flex-shrink: 0; }
.drag-handle:hover { opacity: 0.7; }
.collection-card.sortable-ghost, .item-row.sortable-ghost { opacity: 0.35; }
.collection-card.sortable-chosen, .item-row.sortable-chosen { cursor: grabbing; }
.collection-card.sortable-drag, .item-row.sortable-drag { opacity: 0.9; }
.collection-card.manual-sort .drag-handle,
.item-row.manual-sort .drag-handle { cursor: grab; }
.collection-card.manual-sort.sortable-chosen .drag-handle,
.item-row.manual-sort.sortable-chosen .drag-handle { cursor: grabbing; }
.collection-list:not(.virtual-collection-list),
.item-list:not(.virtual-item-list) {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
  padding: 10px;
  gap: 8px;
  margin-left: 10px;
}
.pane-header-actions { display: flex; align-items: center; gap: 6px; }
.card-actions { display: flex; align-items: center; gap: 2px; }
.item-actions { display: flex; align-items: center; gap: 4px; }
.tag-filter-panel {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg-2) 55%, var(--bg));
}
.tag-filter-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.tag-filter-title { display: inline-flex; align-items: center; gap: 6px; color: var(--text); font-size: 12px; font-weight: 800; }
.tag-filter-title svg { width: 14px; height: 14px; color: var(--accent); }
.tag-filter-heading p { margin-top: 3px; color: var(--faint); font-size: 11px; line-height: 1.35; }
.tag-filter-actions { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.tag-filter-reset, .tag-filter-open, .tag-filter-card { border: 1px solid var(--line); color: var(--muted); background: var(--bg); border-radius: var(--radius); cursor: pointer; }
.tag-filter-reset, .tag-filter-open { min-height: 28px; padding: 0 10px; font-size: 11px; font-weight: 750; }
.tag-filter-open { display: inline-flex; align-items: center; gap: 5px; color: var(--text); background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 34%, var(--line)); }
.tag-filter-open svg { width: 12px; height: 12px; }
.tag-filter-open:disabled { opacity: 0.42; cursor: not-allowed; background: var(--bg); color: var(--faint); border-color: var(--line); }
.tag-filter-reset:hover, .tag-filter-reset.active { color: var(--text); border-color: color-mix(in srgb, var(--accent) 38%, var(--line)); background: var(--accent-soft); }
.tag-filter-open:not(:disabled):hover { border-color: color-mix(in srgb, var(--accent) 56%, var(--line)); background: color-mix(in srgb, var(--accent) 22%, var(--bg)); }
.tag-filter-grid { display: flex; flex-wrap: wrap; gap: 6px; max-height: 68px; overflow-y: auto; padding-right: 2px; }
.tag-filter-card { display: inline-grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; min-width: 86px; max-width: 180px; height: 30px; padding: 0 9px; text-align: left; }
.tag-filter-card:hover { color: var(--text); border-color: var(--line-strong); background: var(--bg-3); }
.tag-filter-card.active { color: var(--text); border-color: color-mix(in srgb, var(--accent) 58%, var(--line)); background: color-mix(in srgb, var(--accent) 20%, var(--bg)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent); }
.tag-filter-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 750; }
.tag-filter-count { min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px; color: var(--accent); background: color-mix(in srgb, var(--accent) 13%, var(--bg-2)); font-size: 10px; line-height: 18px; text-align: center; }
.tag-filter-empty { min-height: 28px; display: flex; align-items: center; color: var(--faint); font-size: 12px; }
.collection-meta { display: flex !important; align-items: center; gap: 6px; min-width: 0; }
.collection-scene-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.collection-tags { display: flex; align-items: center; gap: 4px; min-width: 0; overflow: hidden; white-space: nowrap; }
.collection-tag { display: inline-flex; align-items: center; max-width: 96px; height: 18px; padding: 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--accent); background: color-mix(in srgb, var(--accent) 11%, var(--bg-2)); border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--line)); border-radius: 4px; font-size: 10px; line-height: 18px; }
.detail-tags { margin-top: 8px; flex-wrap: wrap; white-space: normal; }
.icon-button.danger { color: var(--red); }
.icon-button.danger:hover { background: rgba(210, 109, 109, 0.15); }
.collection-list-empty,
.item-list-empty {
  min-height: 110px;
  display: grid;
  place-items: center;
  padding: var(--list-pad, 10px);
}
.skeleton-list {
  pointer-events: none;
}
.skeleton-card,
.skeleton-row {
  cursor: default;
}
.skeleton-card:hover {
  background: var(--bg-2);
  border-color: var(--line);
}
.skeleton-block {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 6px;
  background: color-mix(in srgb, var(--bg-4) 74%, var(--bg-2));
}
.skeleton-block::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--text) 10%, transparent), transparent);
  animation: skeleton-shimmer 1.2s ease-in-out infinite;
}
.skeleton-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
}
.skeleton-icon.compact {
  width: 28px;
  height: 28px;
}
.skeleton-text-group {
  min-width: 0;
  display: grid;
  gap: 7px;
}
.skeleton-title {
  width: min(68%, 180px);
  height: 13px;
}
.skeleton-subtitle {
  width: min(48%, 140px);
  height: 10px;
  opacity: 0.78;
}
.skeleton-subtitle.wide {
  width: min(72%, 300px);
}
.skeleton-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}
.skeleton-action {
  width: 28px;
  height: 28px;
  border-radius: var(--radius);
}
.skeleton-pill {
  width: 58px;
  height: 28px;
  border-radius: var(--radius);
}
@keyframes skeleton-shimmer {
  100% { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton-block::after { animation: none; }
}
</style>
