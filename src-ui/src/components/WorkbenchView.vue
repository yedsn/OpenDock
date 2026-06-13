<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Activity,
  FileText,
  FolderPlus,
  Globe,
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

const store = useOpenDockStore();
const { t } = useI18n();

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
      subtitle: `${collection.type} · ${sceneName}`,
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
    subtitle: `${item.type} · ${item.value}`,
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

const quickViewLabels: Record<string, string> = {
  all: t("sidebar.allResources"),
  favorites: t("sidebar.favoriteCollections"),
  recent: t("sidebar.recentlyOpened"),
  unbound: t("sidebar.unboundCollections")
};

const activeTab = computed(() => store.state.tabs.find((tab) => tab.id === store.state.activeTabId));
const isQuickViewTab = computed(() => activeTab.value?.kind === "quickview");
const paneTitle = computed(() => isQuickViewTab.value ? quickViewLabels[store.state.quickView] : store.activeScene().name);
const paneDescription = computed(() => {
  const count = collectionRows.value.length;
  if (isQuickViewTab.value) return `${t("workbench.allScenes")} \u00b7 ${count} ${t("settings.collections")}`;
  return `${t("types.scene" + store.activeScene().type.charAt(0).toUpperCase() + store.activeScene().type.slice(1)) || store.activeScene().type}${t("types.sceneSuffix")} \u00b7 ${count} ${t("settings.collections")}`;
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

      <VirtualList
        v-if="collectionRows.length"
        class="collection-list virtual-collection-list"
        :items="collectionRows"
        :item-height="collectionItemHeight"
        :gap="rowGap"
        :padding="listPad"
      >
        <template #row="{ item }">
          <div
            class="collection-card"
            v-memo="[item.id, item.favorite, activeCollectionId === item.id, collectionItemHeight]"
            :class="{ active: activeCollectionId === item.id }"
            role="button"
            tabindex="0"
            :style="{ height: collectionItemHeight + 'px' }"
            @click="selectCollection(item.source)"
            @keydown.enter.prevent="selectCollection(item.source)"
            @keydown.space.prevent="selectCollection(item.source)"
          >
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
          <div class="type-label">{{ activeCollection?.type || 'Collection' }}</div>
          <h2>{{ activeCollection?.name || t("workbench.unselectedCollection") }}</h2>
          <p>{{ activeCollection?.description || t("workbench.selectCollectionHint") }}</p>
        </div>
        <div class="resource-actions">
          <button class="icon-button" @click="store.state.modal.kind = 'item'; store.state.modal.editingId = undefined;"><Plus /></button>
          <button class="icon-button" v-if="activeCollection" :title="$t('workbench.editCollection')" @click="editCollection(activeCollection.id)"><Pencil /></button>
          <button v-if="activeCollection" class="run-button" @click="store.openCollection(activeCollection)"><Play />{{ $t("workbench.openCollection") }}</button>
        </div>
      </div>

      <VirtualList
        v-if="itemRows.length"
        class="item-list virtual-item-list"
        :items="itemRows"
        :item-height="itemRowHeight"
        :gap="rowGap"
        :padding="listPad"
      >
        <template #row="{ item }">
          <div class="item-row" v-memo="[item.id, item.subtitle, itemRowHeight]" :style="{ height: itemRowHeight + 'px' }">
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
