import type { ThemeDefinition } from "./types";

export const builtInThemes: ThemeDefinition[] = [
  {
    id: "obsidian-dark",
    name: "Obsidian Dark",
    kind: "dark",
    source: "built-in",
    swatches: ["#1f1f1f", "#303030", "#8a7ff0"],
    colors: {
      bg: "#1f1f1f",
      bg2: "#252525",
      bg3: "#303030",
      bg4: "#383838",
      text: "#e7e7e7",
      muted: "#b8b8b8",
      faint: "#858585",
      line: "#383838",
      lineStrong: "#505050",
      accent: "#8a7ff0",
      accentSoft: "rgba(138, 127, 240, 0.18)",
      green: "#6fb29d",
      red: "#d26d6d",
      titlebarBg: "linear-gradient(180deg, #202020 0%, #1b1b1b 100%)",
      titlebarLine: "#2b2b2b",
      cardActiveBg: "#2b2b2b",
      consoleBg: "#181818",
      shadow: "rgba(0, 0, 0, 0.42)"
    }
  },
  {
    id: "graphite",
    name: "Graphite",
    kind: "dark",
    source: "built-in",
    swatches: ["#202124", "#34373c", "#7db5a5"],
    colors: {
      bg: "#202124",
      bg2: "#282a2e",
      bg3: "#34373c",
      bg4: "#3f4349",
      text: "#eeeeec",
      muted: "#c2c5c8",
      faint: "#90959b",
      line: "#3a3d42",
      lineStrong: "#555a61",
      accent: "#7db5a5",
      accentSoft: "rgba(125, 181, 165, 0.18)",
      green: "#72b59b",
      red: "#d06f6f",
      titlebarBg: "linear-gradient(180deg, #25272b 0%, #202124 100%)",
      titlebarLine: "#36393f",
      cardActiveBg: "#303338",
      consoleBg: "#1b1c1f",
      shadow: "rgba(0, 0, 0, 0.38)"
    }
  },
  {
    id: "paper-light",
    name: "Paper Light",
    kind: "light",
    source: "built-in",
    swatches: ["#f7f7f4", "#ffffff", "#4f6fbd"],
    colors: {
      bg: "#f7f7f4",
      bg2: "#ffffff",
      bg3: "#ecefed",
      bg4: "#e1e5e3",
      text: "#171a1f",
      muted: "#303741",
      faint: "#4f5964",
      line: "#d8ddda",
      lineStrong: "#c3cbc7",
      accent: "#4f6fbd",
      accentSoft: "rgba(79, 111, 189, 0.14)",
      green: "#3e8f72",
      red: "#b94e4e",
      titlebarBg: "linear-gradient(180deg, #ffffff 0%, #f0f2ef 100%)",
      titlebarLine: "#d8ddda",
      cardActiveBg: "#eef2ff",
      consoleBg: "#f1f3f0",
      shadow: "rgba(54, 62, 72, 0.18)"
    }
  }
];

export function themeCssVars(theme: ThemeDefinition): Record<string, string> {
  return {
    "--bg": theme.colors.bg,
    "--bg-2": theme.colors.bg2,
    "--bg-3": theme.colors.bg3,
    "--bg-4": theme.colors.bg4,
    "--text": theme.colors.text,
    "--muted": theme.colors.muted,
    "--faint": theme.colors.faint,
    "--line": theme.colors.line,
    "--line-strong": theme.colors.lineStrong,
    "--accent": theme.colors.accent,
    "--accent-soft": theme.colors.accentSoft,
    "--green": theme.colors.green,
    "--red": theme.colors.red,
    "--titlebar-bg": theme.colors.titlebarBg,
    "--titlebar-line": theme.colors.titlebarLine,
    "--card-active-bg": theme.colors.cardActiveBg,
    "--console-bg": theme.colors.consoleBg,
    "--shadow": theme.colors.shadow
  };
}
