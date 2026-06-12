import type { PluginStoreEntry, ThemeDefinition } from "../../src-ui/src/types";

export const inkBlueTheme: ThemeDefinition = {
  id: "plugin-ink-blue",
  name: "Ink Blue",
  kind: "dark",
  source: "plugin",
  pluginId: "theme-ink-blue",
  swatches: ["#17202c", "#223044", "#6da8d8"],
  colors: {
    bg: "#17202c",
    bg2: "#1d2938",
    bg3: "#273649",
    bg4: "#31445b",
    text: "#edf4fb",
    muted: "#b8c7d7",
    faint: "#8193a6",
    line: "#314154",
    lineStrong: "#4c6278",
    accent: "#6da8d8",
    accentSoft: "rgba(109, 168, 216, 0.18)",
    green: "#72b9aa",
    red: "#d27676",
    titlebarBg: "linear-gradient(180deg, #1c2a3a 0%, #17202c 100%)",
    titlebarLine: "#2d3c50",
    cardActiveBg: "#243348",
    consoleBg: "#121a25",
    shadow: "rgba(0, 0, 0, 0.42)"
  }
};

export const storeEntry: PluginStoreEntry = {
  name: "Ink Blue Theme",
  category: "主题",
  capability: "安装后提供深蓝墨色主题",
  permissions: ["appearance:theme"],
  configurable: false,
  theme: inkBlueTheme
};

export const inkBlueStoreEntry = storeEntry;
