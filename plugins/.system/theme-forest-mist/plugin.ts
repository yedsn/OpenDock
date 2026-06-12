import type { PluginManifest, ThemeDefinition } from "../../src-ui/src/types";

export const forestMistTheme: ThemeDefinition = {
  id: "plugin-forest-mist",
  name: "Forest Mist",
  kind: "light",
  source: "plugin",
  pluginId: "theme-forest-mist",
  swatches: ["#f3f6f1", "#ffffff", "#4d8064"],
  colors: {
    bg: "#f3f6f1",
    bg2: "#ffffff",
    bg3: "#e6ece5",
    bg4: "#d9e2d8",
    text: "#172119",
    muted: "#2f3b34",
    faint: "#4d5b52",
    line: "#d4ddd3",
    lineStrong: "#bdcabd",
    accent: "#4d8064",
    accentSoft: "rgba(77, 128, 100, 0.15)",
    green: "#4d8064",
    red: "#b65a54",
    titlebarBg: "linear-gradient(180deg, #ffffff 0%, #edf3ec 100%)",
    titlebarLine: "#d4ddd3",
    cardActiveBg: "#e7f0e8",
    consoleBg: "#edf2ec",
    shadow: "rgba(48, 64, 55, 0.18)"
  }
};

export const manifest: PluginManifest = {
  id: "theme-forest-mist",
  name: "Forest Mist Theme",
  version: "1.0.0",
  category: "主题",
  capability: "提供清爽的浅色绿色工作台主题",
  permissions: ["appearance:theme"],
  installed: true,
  enabled: true,
  configurable: false,
  theme: forestMistTheme
};

export const forestMistPlugin = manifest;
