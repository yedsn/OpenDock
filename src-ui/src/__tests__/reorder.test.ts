import { describe, it, expect, beforeEach } from "vitest";
import { useOpenDockStore } from "../store";

describe("reorder with reactive updates", () => {
  let store: ReturnType<typeof useOpenDockStore>;

  beforeEach(() => {
    store = useOpenDockStore();
  });

  it("reorderItems updates item sort and visible order immediately", () => {
    // Ensure manual sort mode
    store.setItemSortMode("手动");
    const collId = store.state.data.activeCollectionId;

    const itemsBefore = store.collectionItems(collId);
    if (itemsBefore.length < 3) {
      console.log("not enough seed items, adding");
      store.createItem(collId, "A", "目录", "/a");
      store.createItem(collId, "B", "目录", "/b");
      store.createItem(collId, "C", "目录", "/c");
    }

    const before = store.collectionItems(collId).map((i: any) => i.name);
    console.log("before:", before);

    // Move position 2 to position 0
    store.reorderItems(collId, 2, 0);

    const after = store.collectionItems(collId).map((i: any) => i.name);
    console.log("after:", after);

    // The item previously at index 2 should now be at index 0
    expect(store.state.reorderSavePending).toBe(true);
    expect(after[0]).toBe(before[2]);
    expect(after[1]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
  });
});
