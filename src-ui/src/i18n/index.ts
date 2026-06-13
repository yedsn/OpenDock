import { reactive } from "vue";
import zhCN from "./zh-CN";
import en from "./en";

type LocaleMessages = typeof zhCN;

const locales: Record<string, LocaleMessages> = {
  "\u7b80\u4f53\u4e2d\u6587": zhCN,
  "English": en as unknown as LocaleMessages
};

const state = reactive({
  locale: "\u7b80\u4f53\u4e2d\u6587"
});

function setLocale(locale: string): void {
  if (locales[locale]) {
    state.locale = locale;
  }
}

function getLocale(): string {
  return state.locale;
}

function messages(): LocaleMessages {
  return locales[state.locale] || zhCN;
}

function resolve(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function t(key: string, params?: Record<string, string | number>): string {
  let text = resolve(messages() as unknown as Record<string, unknown>, key);
  if (text === undefined) {
    text = resolve(zhCN as unknown as Record<string, unknown>, key);
  }
  if (text === undefined) return key;
  if (!params) return text;
  return Object.entries(params).reduce(
    (result, [k, v]) => result.split(`{${k}}`).join(String(v)),
    text
  );
}

function typeLabel(chineseType: string): string {
  const typeMap: Record<string, string> = {
    "\u9879\u76ee": t("types.sceneProject"),
    "\u529e\u516c": t("types.sceneOffice"),
    "\u5de5\u7a0b": t("types.sceneEngineering"),
    "\u8bbe\u8ba1": t("types.sceneDesign"),
    "\u901a\u7528": t("types.sceneGeneral"),
    "\u81ea\u5b9a\u4e49": t("types.sceneCustom"),
    "\u76ee\u5f55\u96c6\u5408": t("types.collectionDirectory"),
    "\u7f51\u9875\u96c6\u5408": t("types.collectionWebPage"),
    "\u547d\u4ee4\u96c6\u5408": t("types.collectionCommand"),
    "Office \u96c6\u5408": t("types.collectionOffice"),
    "CAD \u96c6\u5408": t("types.collectionCAD"),
    "\u6587\u4ef6\u96c6\u5408": t("types.collectionFile"),
    "\u5e94\u7528\u96c6\u5408": t("types.collectionApp"),
    "\u63d2\u4ef6\u96c6\u5408": t("types.collectionPlugin"),
    "\u76ee\u5f55": t("types.itemDirectory"),
    "\u547d\u4ee4": t("types.itemCommand"),
    "\u6587\u4ef6": t("types.itemFile"),
    "\u5e94\u7528": t("types.itemApp"),
    "\u63d2\u4ef6\u8d44\u6e90": t("types.itemPluginResource"),
    "\u7f16\u8f91\u5668": t("types.toolEditor"),
    "\u6d4f\u89c8\u5668": t("types.toolBrowser"),
    "\u7ec8\u7aef": t("types.toolTerminal"),
    "\u7cfb\u7edf": t("types.toolSystem"),
    "Office": t("types.toolOffice"),
    "CAD": t("types.toolCAD"),
    "\u65e0\u573a\u666f": t("types.noScene"),
    "\u8212\u9002": t("settings.comfortable"),
    "\u7d27\u51d1": t("settings.compact")
  };
  return typeMap[chineseType] || chineseType;
}

export function useI18n() {
  return { t, typeLabel, setLocale, getLocale, messages, state };
}
