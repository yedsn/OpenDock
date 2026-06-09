<script setup lang="ts">
import { computed } from "vue";
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

const store = useOpenDockStore();

const activeCollection = computed(() => store.activeCollection());
const activeItems = computed(() =>
  activeCollection.value ? store.collectionItems(activeCollection.value.id) : []
);

const quickViewLabels: Record<string, string> = {
  all: "全部资源",
  favorites: "收藏集合",
  recent: "最近打开",
  unbound: "无场景集合"
};

const activeTab = computed(() => store.state.tabs.find((tab) => tab.id === store.state.activeTabId));
const isQuickViewTab = computed(() => activeTab.value?.kind === "quickview");
const paneTitle = computed(() => isQuickViewTab.value ? quickViewLabels[store.state.quickView] : store.activeScene().name);
const paneDescription = computed(() => {
  const count = store.visibleCollections.value.length;
  if (isQuickViewTab.value) return `全部场景 · ${count} 个集合`;
  return `${store.activeScene().type}场景 · ${count} 个集合`;
});

function collectionSceneLabel(collection: { sceneId: string | null }): string {
  if (!collection.sceneId) return "无场景";
  return store.state.data.scenes.find((scene) => scene.id === collection.sceneId)?.name || "无场景";
}

function editScene(sceneId: string) {
  store.state.modal.editingId = sceneId;
  store.state.modal.kind = "scene";
}

function deleteSceneConfirm(sceneId: string) {
  const scene = store.state.data.scenes.find((s) => s.id === sceneId);
  if (scene && window.confirm(`确认删除场景「${scene.name}」？此场景下的集合将变为无场景集合。`)) {
    store.deleteScene(sceneId);
  }
}

function editCollection(collectionId: string) {
  store.state.modal.editingId = collectionId;
  store.state.modal.kind = "collection";
}

function deleteCollectionConfirm(collectionId: string) {
  const coll = store.state.data.collections.find((c) => c.id === collectionId);
  if (coll && window.confirm(`确认删除集合「${coll.name}」及其所有资源？`)) {
    store.deleteCollection(collectionId);
  }
}

function editItem(itemId: string) {
  store.state.modal.editingId = itemId;
  store.state.modal.kind = "item";
}

function deleteItemConfirm(itemId: string) {
  const item = store.state.data.items.find((i) => i.id === itemId);
  if (item && window.confirm(`确认删除资源「${item.name}」？`)) {
    store.deleteItem(itemId);
  }
}

function selectCollection(collection: { id: string; name: string; sceneId: string | null }) {
  const fullCollection = store.state.data.collections.find((item) => item.id === collection.id);
  if (!fullCollection) return;
  if (!(isQuickViewTab.value && store.state.quickView === "recent")) {
    store.markCollectionRecent(fullCollection);
  }
  if (isQuickViewTab.value) {
    store.state.data.activeCollectionId = fullCollection.id;
    return;
  }
  store.openTab({ id: 'collection-' + collection.id, kind: 'collection', title: collection.name, collectionId: collection.id, sceneId: collection.sceneId || undefined });
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
          <button class="icon-button" title="编辑场景" @click="editScene(store.state.data.activeSceneId)"><Pencil /></button>
          <button class="icon-button" title="删除场景" @click="deleteSceneConfirm(store.state.data.activeSceneId)"><Trash2 /></button>
          <button class="run-button" @click="store.openScene(store.activeScene())"><Play />打开场景</button>
        </div>
      </div>

      <div class="pane-tools">
        <button class="tool-chip" :class="{ active: store.state.collectionMode === 'collections' }" @click="store.state.collectionMode = 'collections'"><Layers />集合</button>
        <button class="tool-chip" :class="{ active: store.state.collectionMode === 'web' }" @click="store.state.collectionMode = 'web'"><Globe />网页</button>
        <button class="tool-chip" :class="{ active: store.state.collectionMode === 'tool' }" @click="store.state.collectionMode = 'tool'"><Wrench />工具</button>
        <span class="tool-spacer"></span>
        <button class="tool-chip action" @click="store.state.modal.kind = 'collection'; store.state.modal.editingId = undefined;"><FolderPlus />新建集合</button>
      </div>

      <div class="collection-list">
        <div v-for="collection in store.visibleCollections.value" :key="collection.id"
          class="collection-card"
          :class="{ active: activeCollection?.id === collection.id }"
          role="button"
          tabindex="0"
          @click="selectCollection(collection)"
          @keydown.enter.prevent="selectCollection(collection)"
          @keydown.space.prevent="selectCollection(collection)">
          <span class="card-icon"><Layers /></span>
          <span>
            <strong>{{ collection.name }}</strong>
            <small>{{ collection.type }} · {{ collectionSceneLabel(collection) }}</small>
          </span>
          <span class="card-actions">
            <button class="icon-button" type="button" title="编辑" @click.stop="editCollection(collection.id)"><Pencil /></button>
            <button class="icon-button danger" type="button" title="删除" @click.stop="deleteCollectionConfirm(collection.id)"><Trash2 /></button>
            <button class="icon-button" type="button" @click.stop="store.toggleFavorite(collection)">
              <Star :fill="collection.favorite ? 'currentColor' : 'none'" />
            </button>
          </span>
        </div>
        <div v-if="!store.visibleCollections.value.length" class="empty-state">没有匹配的集合</div>
      </div>
    </section>

    <section class="resource-pane">
      <div class="resource-header">
        <div>
          <div class="type-label">{{ activeCollection?.type || 'Collection' }}</div>
          <h2>{{ activeCollection?.name || '未选择集合' }}</h2>
          <p>{{ activeCollection?.description || '选择一个集合查看资源。' }}</p>
        </div>
        <div class="resource-actions">
          <button class="icon-button" @click="store.state.modal.kind = 'item'; store.state.modal.editingId = undefined;"><Plus /></button>
          <button class="icon-button" v-if="activeCollection" title="编辑集合" @click="editCollection(activeCollection.id)"><Pencil /></button>
          <button v-if="activeCollection" class="run-button" @click="store.openCollection(activeCollection)"><Play />打开集合</button>
        </div>
      </div>

      <div class="item-list">
        <div v-for="item in activeItems" :key="item.id" class="item-row">
          <span class="card-icon"><FileText /></span>
          <span class="item-main">
            <strong>{{ item.name }}</strong>
            <small>{{ item.type }} · {{ item.value }}</small>
          </span>
          <span class="item-actions">
            <button class="row-open" @click="store.openItem(item)"><Play />打开</button>
            <button class="icon-button" title="编辑" @click="editItem(item.id)"><Pencil /></button>
            <button class="icon-button danger" title="删除" @click="deleteItemConfirm(item.id)"><Trash2 /></button>
          </span>
        </div>
        <div v-if="!activeItems.length" class="empty-state">这个集合还没有资源</div>
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
</style>
