import { describe, expect, it } from "vitest";
import { isImeComposing } from "../keyboard";

function keyEvent(init: KeyboardEventInit & { keyCode?: number }): KeyboardEvent {
  return {
    isComposing: init.isComposing || false,
    keyCode: init.keyCode || 0,
  } as KeyboardEvent;
}

describe("keyboard helpers", () => {
  it("detects IME composition from the composing flag", () => {
    expect(isImeComposing(keyEvent({ key: "Enter", isComposing: true }))).toBe(true);
  });

  it("detects IME composition from keyCode 229 fallback", () => {
    expect(isImeComposing(keyEvent({ key: "Enter", keyCode: 229 }))).toBe(true);
  });

  it("does not treat normal Enter as IME composition", () => {
    expect(isImeComposing(keyEvent({ key: "Enter", keyCode: 13 }))).toBe(false);
  });
});
