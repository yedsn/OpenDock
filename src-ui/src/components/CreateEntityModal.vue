<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { X } from "lucide-vue-next";
import { useOpenDockStore } from "../store";
import { sceneTypeOptions, collectionTypeOptions, itemTypeOptions } from "../helpers";
import type { Collection, CollectionItem, CollectionType, ItemType, Scene, SceneType, Workspace } from "../types";

const store = useOpenDockStore();

const form = reactive({
  sceneName: "",
  sceneType: "项目" as SceneType,
  sceneDescription: "",
  collectionName: "",
  collectionType: "网页集合" as CollectionType,
  collectionSceneId: "",
  collectionDescription: "",
  itemName: "",
  itemType: "URL" as ItemType,
  itemValue: "",
  itemWorkingDirectory: "",
  itemToolId: "",
  workspaceName: "",
  workspaceStorage: "本地数据",
  workspaceRemark: ""
});

const isEdit = computed(() => Boolean(store.state.modal.editingId));
const modalTitle = computed(() => {
  const kind = store.state.modal.kind;
  const verb = isEdit.value ? "编辑" : "新建";
  if (kind === "scene") return verb + "场景";
  if (kind === "collection") return verb + "集合";
  if (kind === "workspace") return verb + "工作区";
  if (kind === "item") return verb === "新建" ? "添加资源" : "编辑资源";
  return "";
});

// Pre-fill form when editingId is set, or initialize from current context for new items.
watch(
  () => [store.state.modal.kind, store.state.modal.editingId],
  ([kind, id]) => {
    if (!kind) return;
    if (kind === "scene") {
      const scene = id ? store.state.data.scenes.find((s) => s.id === id) : null;
      form.sceneName = scene?.name || "";
      form.sceneType = scene?.type || "项目";
      form.sceneDescription = scene?.description || "";
    } else if (kind === "collection") {
      const coll = id ? store.state.data.collections.find((c) => c.id === id) : null;
      form.collectionName = coll?.name || "";
      form.collectionType = coll?.type || "网页集合";
      form.collectionSceneId = coll?.sceneId || (id ? "" : store.state.data.activeSceneId);
      form.collectionDescription = coll?.description || "";
    } else if (kind === "item") {
      const item = id ? store.state.data.items.find((i) => i.id === id) : null;
      const activeColl = store.activeCollection();
      form.itemName = item?.name || "";
      form.itemType = item?.type || (activeColl?.type === "命令集合" ? "命令" : "URL");
      form.itemValue = item?.value || "";
      form.itemWorkingDirectory = item?.workingDirectory || "";
      form.itemToolId = item?.toolId || activeColl?.defaultToolId || "";
    } else if (kind === "workspace") {
      const ws = id ? store.state.data.workspaces.find((w) => w.id === id) : null;
      form.workspaceName = ws?.name || "";
      form.workspaceStorage = ws?.storage || "本地数据";
      form.workspaceRemark = ws?.remark || "";
    }
  },
  { immediate: true }
);

function closeModal() {
  store.state.modal.kind = null;
  store.state.modal.editingId = undefined;
}

function submitModal() {
  const kind = store.state.modal.kind;
  const id = store.state.modal.editingId;
  if (kind === "scene" && form.sceneName.trim()) {
    if (id) store.updateScene(id, { name: form.sceneName.trim(), type: form.sceneType, description: form.sceneDescription.trim() });
    else store.createScene(form.sceneName.trim(), form.sceneType, form.sceneDescription.trim());
  } else if (kind === "collection" && form.collectionName.trim()) {
    if (id) store.updateCollection(id, { name: form.collectionName.trim(), type: form.collectionType, sceneId: form.collectionSceneId || null, description: form.collectionDescription.trim() });
    else store.createCollection(form.collectionName.trim(), form.collectionType, form.collectionSceneId || null, form.collectionDescription.trim());
  } else if (kind === "item" && form.itemName.trim() && form.itemValue.trim()) {
    const activeColl = store.activeCollection();
    if (id) store.updateItem(id, { name: form.itemName.trim(), type: form.itemType, value: form.itemValue.trim(), workingDirectory: form.itemWorkingDirectory.trim(), toolId: form.itemToolId || undefined });
    else if (activeColl) store.createItem(activeColl.id, form.itemName.trim(), form.itemType, form.itemValue.trim(), form.itemWorkingDirectory.trim(), form.itemToolId || undefined);
  } else if (kind === "workspace" && form.workspaceName.trim()) {
    if (id) store.updateWorkspace(id, { name: form.workspaceName.trim(), storage: form.workspaceStorage.trim(), remark: form.workspaceRemark.trim() });
    else store.createWorkspace(form.workspaceName.trim(), form.workspaceStorage.trim(), form.workspaceRemark.trim());
  }
  closeModal();
}
</script>

<template>
  <div v-if="store.state.modal.kind && store.state.modal.kind !== 'manageWorkspaces'" class="modal-backdrop" @click.self="closeModal">
    <form class="modal" @submit.prevent="submitModal">
      <div class="modal-header">
        <div class="modal-title">{{ modalTitle }}</div>
        <button class="icon-button" type="button" @click="closeModal"><X /></button>
      </div>

      <div v-if="store.state.modal.kind === 'scene'" class="settings-grid">
        <label class="setting-field"><span>场景名称</span><input v-model="form.sceneName" required /></label>
        <label class="setting-field"><span>场景类型</span>
          <select v-model="form.sceneType">
            <option v-for="type in sceneTypeOptions" :key="type">{{ type }}</option>
          </select>
        </label>
        <label class="setting-field full"><span>描述</span><textarea v-model="form.sceneDescription"></textarea></label>
      </div>

      <div v-if="store.state.modal.kind === 'collection'" class="settings-grid">
        <label class="setting-field"><span>集合名称</span><input v-model="form.collectionName" required /></label>
        <label class="setting-field"><span>集合类型</span>
          <select v-model="form.collectionType">
            <option v-for="type in collectionTypeOptions" :key="type">{{ type }}</option>
          </select>
        </label>
        <label class="setting-field"><span>关联场景</span>
          <select v-model="form.collectionSceneId">
            <option value="">无场景</option>
            <option v-for="scene in store.activeScenes.value" :key="scene.id" :value="scene.id">{{ scene.name }}</option>
          </select>
        </label>
        <label class="setting-field full"><span>描述</span><textarea v-model="form.collectionDescription"></textarea></label>
      </div>

      <div v-if="store.state.modal.kind === 'item'" class="settings-grid">
        <label class="setting-field"><span>资源名称</span><input v-model="form.itemName" required /></label>
        <label class="setting-field"><span>资源类型</span>
          <select v-model="form.itemType">
            <option v-for="type in itemTypeOptions" :key="type">{{ type }}</option>
          </select>
        </label>
        <label class="setting-field full"><span>资源内容</span><input v-model="form.itemValue" required placeholder="路径、URL 或命令" /></label>
        <label class="setting-field"><span>打开工具</span>
          <select v-model="form.itemToolId">
            <option value="">使用集合默认</option>
            <option v-for="tool in store.state.data.tools" :key="tool.id" :value="tool.id">{{ tool.name }} ({{ tool.type }})</option>
          </select>
        </label>
        <label class="setting-field"><span>工作目录</span><input v-model="form.itemWorkingDirectory" placeholder="命令资源使用，可选" /></label>
      </div>

      <div v-if="store.state.modal.kind === 'workspace'" class="settings-grid">
        <label class="setting-field"><span>工作区名称</span><input v-model="form.workspaceName" required /></label>
        <label class="setting-field"><span>存储说明</span><input v-model="form.workspaceStorage" /></label>
        <label class="setting-field full"><span>备注</span><textarea v-model="form.workspaceRemark"></textarea></label>
      </div>

      <div class="modal-actions">
        <button class="settings-action-button" type="button" @click="closeModal">取消</button>
        <button class="run-button" type="submit">{{ isEdit ? '保存' : '确认' }}</button>
      </div>
    </form>
  </div>
</template>
