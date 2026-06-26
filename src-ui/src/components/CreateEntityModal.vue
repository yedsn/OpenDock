<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { X } from "lucide-vue-next";
import { useOpenDockStore } from "../store";
import { useI18n } from "../i18n";
import type { Collection, CollectionItem, CollectionType, ItemType, Scene, SceneType, Workspace } from "../types";

const store = useOpenDockStore();
const { t } = useI18n();

const form = reactive({
  sceneName: "",
  sceneType: "通用" as SceneType,
  sceneDescription: "",
  collectionName: "",
  collectionType: "网页集合" as CollectionType,
  collectionSceneId: "",
  collectionDescription: "",
  itemName: "",
  itemType: "浏览器" as ItemType,
  itemValue: "",
  itemWorkingDirectory: "",
  itemToolId: "",
  itemPluginData: {} as Record<string, string>,
  workspaceName: "",
  workspaceStorage: "本地数据",
  workspaceRemark: ""
});

const isEdit = computed(() => Boolean(store.state.modal.editingId));
const toolTypeOptions = computed(() => store.availableToolTypes());
const itemTypeConfig = computed(() => store.pluginItemTypeConfig(form.itemType));
const itemValueLabel = computed(() => itemTypeConfig.value?.valueLabel || t("modal.resourceContent"));
const itemValuePlaceholder = computed(() => itemTypeConfig.value?.valuePlaceholder || t("modal.resourceContentPlaceholder"));
const itemPluginFields = computed(() => store.pluginItemFields(form.itemType));
const itemToolOptions = computed(() => {
  const allowed = new Set(store.allowedToolTypesForItem(form.itemType));
  return store.visibleTools().filter((tool) => allowed.has(tool.type));
});
const modalTitle = computed(() => {
  const kind = store.state.modal.kind;
  const verb = isEdit.value ? t("modal.edit") : t("modal.create");
  if (kind === "scene") return verb + t("modal.editScene").replace(t("modal.edit"), "");
  if (kind === "collection") return verb + t("modal.editCollection").replace(t("modal.edit"), "");
  if (kind === "workspace") return verb + t("modal.editWorkspace").replace(t("modal.edit"), "");
  if (kind === "item") return isEdit.value ? t("modal.editResource") : t("modal.addResource");
  return "";
});

function resetItemPluginData(source: Record<string, unknown> = {}) {
  form.itemPluginData = Object.fromEntries(
    itemPluginFields.value.map((field) => [field.key, String(source[field.key] || "")])
  );
}

function ensureItemToolCompatible() {
  if (!form.itemToolId) return;
  if (!itemToolOptions.value.some((tool) => tool.id === form.itemToolId)) form.itemToolId = "";
}

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
      form.itemType = item?.type || (activeColl?.type === "命令集合" ? "终端" : "浏览器");
      form.itemValue = item?.value || "";
      form.itemWorkingDirectory = item?.workingDirectory || "";
      form.itemToolId = item?.toolId || "";
      resetItemPluginData(item?.pluginData || {});
      ensureItemToolCompatible();
    } else if (kind === "workspace") {
      const ws = id ? store.state.data.workspaces.find((w) => w.id === id) : null;
      form.workspaceName = ws?.name || "";
      form.workspaceStorage = ws?.storage || "本地数据";
      form.workspaceRemark = ws?.remark || "";
    }
  },
  { immediate: true }
);

watch(
  () => form.itemType,
  () => {
    resetItemPluginData(form.itemPluginData);
    ensureItemToolCompatible();
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
    const pluginData = Object.fromEntries(itemPluginFields.value.map((field) => [field.key, form.itemPluginData[field.key] || ""]));
    if (id) store.updateItem(id, { name: form.itemName.trim(), type: form.itemType, value: form.itemValue.trim(), workingDirectory: form.itemWorkingDirectory.trim(), toolId: form.itemToolId || undefined, pluginData });
    else if (activeColl) store.createItem(activeColl.id, form.itemName.trim(), form.itemType, form.itemValue.trim(), form.itemWorkingDirectory.trim(), form.itemToolId || undefined, pluginData);
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
        <label class="setting-field full"><span>{{ $t("modal.sceneName") }}</span><input v-model="form.sceneName" required /></label>
        <label class="setting-field full"><span>{{ $t("modal.description") }}</span><textarea v-model="form.sceneDescription"></textarea></label>
      </div>

      <div v-if="store.state.modal.kind === 'collection'" class="settings-grid">
        <label class="setting-field"><span>{{ $t("modal.collectionName") }}</span><input v-model="form.collectionName" required /></label>
        <label class="setting-field"><span>{{ $t("modal.associatedScene") }}</span>
          <select v-model="form.collectionSceneId">
            <option value="">{{ $t("modal.noScene") }}</option>
            <option v-for="scene in store.activeScenes.value" :key="scene.id" :value="scene.id">{{ scene.name }}</option>
          </select>
        </label>
        <label class="setting-field full"><span>{{ $t("modal.description") }}</span><textarea v-model="form.collectionDescription"></textarea></label>
      </div>

      <div v-if="store.state.modal.kind === 'item'" class="settings-grid">
        <label class="setting-field"><span>{{ $t("modal.resourceName") }}</span><input v-model="form.itemName" required /></label>
        <label class="setting-field"><span>打开工具类型</span>
          <select v-model="form.itemType">
            <option v-for="type in toolTypeOptions" :key="type">{{ type }}</option>
          </select>
        </label>
        <label class="setting-field full"><span>{{ itemValueLabel }}</span><input v-model="form.itemValue" required :placeholder="itemValuePlaceholder" /></label>
        <label v-for="field in itemPluginFields" :key="field.key" class="setting-field" :class="{ full: field.kind === 'textarea' }">
          <span>{{ field.label }}</span>
          <textarea v-if="field.kind === 'textarea'" v-model="form.itemPluginData[field.key]" :required="field.required" :placeholder="field.placeholder"></textarea>
          <input v-else v-model="form.itemPluginData[field.key]" :required="field.required" :placeholder="field.placeholder" />
        </label>
        <label class="setting-field"><span>{{ $t("modal.openTool") }}</span>
          <select v-model="form.itemToolId">
            <option value="">{{ $t("modal.useDefaultTool") }}</option>
            <option v-for="tool in itemToolOptions" :key="tool.id" :value="tool.id">{{ tool.name }} ({{ tool.type }})</option>
          </select>
        </label>
        <label class="setting-field"><span>{{ $t("modal.workingDirectory") }}</span><input v-model="form.itemWorkingDirectory" :placeholder="$t('modal.workingDirectoryHint')" /></label>
      </div>

      <div v-if="store.state.modal.kind === 'workspace'" class="settings-grid">
        <label class="setting-field"><span>{{ $t("modal.workspaceName") }}</span><input v-model="form.workspaceName" required /></label>
        <label class="setting-field"><span>{{ $t("modal.storageDescription") }}</span><input v-model="form.workspaceStorage" /></label>
        <label class="setting-field full"><span>{{ $t("modal.remark") }}</span><textarea v-model="form.workspaceRemark"></textarea></label>
      </div>

      <div class="modal-actions">
        <button class="settings-action-button" type="button" @click="closeModal">{{ $t("modal.cancel") }}</button>
        <button class="run-button" type="submit">{{ isEdit ? $t("modal.save") : $t("modal.confirm") }}</button>
      </div>
    </form>
  </div>
</template>
