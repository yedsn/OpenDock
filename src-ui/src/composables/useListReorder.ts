import { computed, unref, watch, type Ref } from "vue";
import { useDraggable } from "vue-draggable-plus";

export interface UseListReorderOptions {
  /**
   * Ref pointing to the container element that wraps the list rows.
   * The immediate children of this element must be the row DOM nodes.
   */
  el: Ref<HTMLElement | null>;
  /**
   * Enable/disable the sortable dynamically. When false, Sortable is
   * completely disabled (no drag, no cursor changes).
   */
  enabled: Ref<boolean>;
  /**
   * Called once the user finishes a reorder. Provides the from-index
   * and to-index in the currently-visible list.
   */
  onReorder: (fromIndex: number, toIndex: number) => void;
}

/**
 * Thin wrapper around vue-draggable-plus' useDraggable that plays nicely
 * with a store-owned list. Instead of mutating a v-model list, we let
 * Sortable do its DOM shuffle and then hand the resulting (from, to)
 * indices to the caller, which persists the new order through its own
 * store mutation.
 *
 * Remote-desktop compatibility:
 *   forceFallback = true tells SortableJS to drive the drag via mouse /
 *   pointer events instead of the native HTML5 Drag-and-Drop API, which
 *   is often broken through Parsec / RDP / TeamViewer because those
 *   input injection paths do not raise OLE drag events.
 */
export function useListReorder(opts: UseListReorderOptions) {
  const options = computed(() => ({
    animation: 150,
    handle: ".drag-handle",
    forceFallback: true,
    fallbackTolerance: 4,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    disabled: !unref(opts.enabled),
    // We defer the initial start() call to the watcher below so that we
    // never try to attach Sortable to a null root element.
    immediate: false,
    onEnd(event: { oldIndex?: number; newIndex?: number }) {
      const from = event.oldIndex;
      const to = event.newIndex;
      if (typeof from !== "number" || typeof to !== "number") return;
      if (from === to) return;
      opts.onReorder(from, to);
    },
  }));

  const draggable = useDraggable(opts.el, options);

  let started = false;
  watch(
    () => [opts.el.value, opts.enabled.value] as const,
    ([el, enabled]) => {
      if (el && enabled && !started) {
        draggable.start(el);
        started = true;
      } else if (started && (!el || !enabled)) {
        draggable.destroy();
        started = false;
      }
    },
    { immediate: true, flush: "post" }
  );

  return draggable;
}
