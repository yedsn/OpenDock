<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

interface Props {
  items: T[];
  itemHeight: number;
  /** Extra rows rendered above/below the visible window. Higher = smoother but more DOM. */
  buffer?: number;
  /** Gap between rows in px (must match the CSS gap of the surrounding list). */
  gap?: number;
  /** Padding applied to the inner padder element, in px. */
  padding?: number;
}

const props = withDefaults(defineProps<Props>(), {
  buffer: 6,
  gap: 0,
  padding: 0
});

const viewport = ref<HTMLDivElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);

const rowStride = computed(() => props.itemHeight + props.gap);
const totalHeight = computed(() => {
  if (props.items.length === 0) return 0;
  return props.items.length * rowStride.value - props.gap + props.padding * 2;
});

const visibleRange = computed(() => {
  const stride = rowStride.value || 1;
  const offset = Math.max(0, scrollTop.value - props.padding);
  const startIdx = Math.max(0, Math.floor(offset / stride) - props.buffer);
  const visibleCount = Math.ceil(viewportHeight.value / stride);
  const endIdx = Math.min(props.items.length, startIdx + visibleCount + props.buffer * 2);
  return { startIdx, endIdx };
});

const visibleItems = computed(() => {
  const { startIdx, endIdx } = visibleRange.value;
  const slice = props.items.slice(startIdx, endIdx);
  return slice.map((item, i) => ({ item, index: startIdx + i }));
});

const translateY = computed(() => {
  const { startIdx } = visibleRange.value;
  return props.padding + startIdx * rowStride.value;
});

function handleScroll(event: Event) {
  const target = event.target as HTMLDivElement;
  scrollTop.value = target.scrollTop;
}

let resizeObserver: ResizeObserver | null = null;

function syncViewportHeight() {
  if (viewport.value) viewportHeight.value = viewport.value.clientHeight;
}

onMounted(() => {
  syncViewportHeight();
  if (viewport.value && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => syncViewportHeight());
    resizeObserver.observe(viewport.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

defineExpose({
  scrollToIndex(index: number) {
    if (!viewport.value) return;
    viewport.value.scrollTop = props.padding + index * rowStride.value;
  }
});
</script>

<template>
  <div ref="viewport" class="virtual-list" @scroll.passive="handleScroll">
    <div class="virtual-list-spacer" :style="{ height: totalHeight + 'px' }">
      <div
        class="virtual-list-window"
        :style="{ transform: 'translateY(' + translateY + 'px)', gap: gap + 'px' }"
      >
        <template v-for="entry in visibleItems" :key="(entry.item as any).id ?? entry.index">
          <slot name="row" :item="entry.item" :index="entry.index" />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-list {
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  /* Promote to its own layer so scroll repaints stay cheap. */
  will-change: transform;
  scrollbar-gutter: stable;
  margin-left: 10px;
}
.virtual-list-spacer {
  position: relative;
  width: 100%;
}
.virtual-list-window {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
}
</style>