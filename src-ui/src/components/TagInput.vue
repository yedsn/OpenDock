<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { X } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{ modelValue: string[]; options?: string[]; placeholder?: string }>(),
  { options: () => [], placeholder: "" }
);
const emit = defineEmits<{ (e: "update:modelValue", value: string[]): void }>();

const draft = ref("");
const open = ref(false);
const fieldEl = ref<HTMLInputElement | null>(null);

const suggestions = computed(() => {
  const q = draft.value.trim().toLowerCase();
  const taken = new Set(props.modelValue.map((t) => t.toLowerCase()));
  return props.options
    .filter((t) => !taken.has(t.toLowerCase()))
    .filter((t) => (q ? t.toLowerCase().includes(q) : true))
    .slice(0, 12);
});

function commit(raw: string) {
  const value = raw.trim();
  if (!value) return;
  const lower = value.toLowerCase();
  if (!props.modelValue.some((t) => t.toLowerCase() === lower)) {
    emit("update:modelValue", [...props.modelValue, value]);
  }
  draft.value = "";
  nextTick(() => fieldEl.value?.focus());
}

function remove(tag: string) {
  emit("update:modelValue", props.modelValue.filter((t) => t !== tag));
  nextTick(() => fieldEl.value?.focus());
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === "," || e.key === "\u3001") {
    e.preventDefault();
    commit(draft.value);
  } else if (e.key === "Backspace" && !draft.value && props.modelValue.length) {
    e.preventDefault();
    emit("update:modelValue", props.modelValue.slice(0, -1));
  }
}
</script>

<template>
  <div class="tag-input" @click="fieldEl?.focus()">
    <span v-for="tag in modelValue" :key="tag" class="tag-input-chip">
      <span class="tag-input-chip-label">{{ tag }}</span>
      <button type="button" class="tag-input-chip-remove" :title="tag" @click.stop="remove(tag)"><X /></button>
    </span>
    <input
      ref="fieldEl"
      v-model="draft"
      class="tag-input-field"
      :placeholder="modelValue.length ? '' : placeholder"
      @keydown="onKeydown"
      @focus="open = true"
      @blur="open = false"
    />
    <ul v-if="open && suggestions.length" class="tag-input-suggestions" @mousedown.prevent>
      <li v-for="tag in suggestions" :key="tag" @mousedown.prevent="commit(tag)">{{ tag }}</li>
    </ul>
  </div>
</template>

<style scoped>
.tag-input {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 3px 6px;
  width: 100%;
  min-width: 0;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  cursor: text;
}
.tag-input-chip {
  display: inline-flex;
  align-items: center;
  max-width: 160px;
  height: 20px;
  padding: 0 2px 0 6px;
  overflow: hidden;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 11%, var(--bg-2));
  border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--line));
  border-radius: 4px;
  font-size: 11px;
  line-height: 20px;
}
.tag-input-chip-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag-input-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 2px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  border-radius: 3px;
}
.tag-input-chip-remove:hover { color: var(--text); background: color-mix(in srgb, var(--accent) 22%, transparent); }
.tag-input-chip-remove :deep(svg) { width: 11px; height: 11px; }
.tag-input-field {
  flex: 1 1 60px;
  min-width: 40px;
  width: auto;
  height: 24px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 12px;
}
.tag-input-field::placeholder { color: var(--faint); }
.tag-input-suggestions {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 2px);
  z-index: 30;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--bg-2);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  max-height: 220px;
  overflow-y: auto;
}
.tag-input-suggestions li {
  padding: 5px 8px;
  font-size: 12px;
  color: var(--text);
  border-radius: 4px;
  cursor: pointer;
}
.tag-input-suggestions li:hover { background: color-mix(in srgb, var(--accent) 16%, var(--bg-2)); color: var(--accent); }
</style>
