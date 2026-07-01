<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Activity,
  ArrowUpDown,
  FileText,
  FolderPlus,
  Globe,
  GripVertical,
  Layers,
  Pencil,
  Play,
  Plus,
  Star,
  Trash2,
  Wrench
} from "lucide-vue-next";
import { useOpenDockStore } from "../store";
import { useI18n } from "../i18n";
import { confirmDelete } from "../dialog";
import VirtualList from "./VirtualList.vue";
import { useListReorder } from "../composables/useListReorder";

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

const quickViewLabels = computed<Record<string, string>>(() => ({
  all: t("sidebar.allResources"),
  favorites: t("sidebar.favoriteCollections"),
  recent: t("sidebar.recentlyOpened"),
  unbound: t("sidebar.unboundCollections")
}));

const activeTab = computed(() => store.state.tabs.find((tab) => tab.id === store.state.activeTabId));
const isQuickViewTab = computed(() => activeTab.value?.kind === "quickview");
const paneTitle = computed(() => isQuickViewTab.value ? quickViewLabels.value[store.state.quickView] : store.activeScene().name);
const paneDescription = computed(() => {
  const count = collectionRows.value.length;
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

const collectionSortMode = computed(() => store.effectiveCollectionSortMode());
const itemSortMode = computed(() => store.effectiveItemSortMode());

const sortModeOptions = computed(() => [
  { value: "手动", label: t("workbench.sortManual") },
  { value: "按名称", label: t("workbench.sortByName") },
  { value: "按使用次数", label: t("workbench.sortByUsage") }
]);

function setCollectionSort(mode: string) {
  store.setCollectionSortMode(mode === store.state.data.settings.general.collectionSort ? null : mode as any);
}

function setItemSort(mode: string) {
  store.setItemSortMode(mode === store.state.data.settings.general.itemSort ? null : mode as any);
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
    <section class="collection-pane">
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

      <div v-if="isManualCollectionSort && collectionRows.length" class="collection-list" ref="collectionListRef">
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
              <small>{{ item.subtitle }}</small>
            </span>
            <span class="card-actions">
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
                <small>{{ item.subtitle }}</small>
              </span>
              <span class="card-actions">
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
        </div>
        <div class="resource-actions">
          <span class="sort-control">
            <ArrowUpDown :size="14" />
            <select :value="itemSortMode" @change="setItemSort(($event.target as HTMLSelectElement).value)" class="sort-select">
              <option v-for="opt in sortModeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </span>
          <button class="icon-button" @click="store.state.modal.kind = 'item'; store.state.modal.editingId = undefined;"><Plus /></button>
          <button class="icon-button" v-if="activeCollection" :title="$t('workbench.editCollection')" @click="editCollection(activeCollection.id)"><Pencil /></button>
          <button v-if="activeCollection" class="run-button" @click="store.openCollection(activeCollection)"><Play />{{ $t("workbench.openCollection") }}</button>
        </div>
      </div>

      <div v-if="isManualItemSort && itemRows.length" class="item-list" ref="itemListRef">
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
.sort-control { display: inline-flex; align-items: center; gap: 4px; }
.sort-select { background: var(--bg3); color: var(--text); border: 1px solid var(--line); border-radius: 4px; font-size: 11px; padding: 2px 4px; cursor: pointer; outline: none; }
.sort-select:hover { border-color: var(--accent); }
.pane-header-actions { display: flex; align-items: center; gap: 6px; }
.card-actions { display: flex; align-items: center; gap: 2px; }
.item-actions { display: flex; align-items: center; gap: 4px; }
.icon-button.danger { color: var(--red); }
.icon-button.danger:hover { background: rgba(210, 109, 109, 0.15); }
.collection-list-empty,
.item-list-empty {
  min-height: 110px;
  display: grid;
  place-items: center;
  padding: var(--list-pad, 10px);
}
</style>
