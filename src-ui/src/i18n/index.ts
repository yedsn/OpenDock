import { reactive } from "vue";
import zhCN from "./zh-CN";
import en from "./en";

type LocaleMessages = typeof zhCN;

const locales: Record<string, LocaleMessages> = {
  "简体中文": zhCN,
  "English": en as unknown as LocaleMessages
};

const state = reactive({
  locale: "简体中文"
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
    "项目": t("types.sceneProject"),
    "办公": t("types.sceneOffice"),
    "工程": t("types.sceneEngineering"),
    "设计": t("types.sceneDesign"),
    "通用": t("types.sceneGeneral"),
    "自定义": t("types.sceneCustom"),
    "目录集合": t("types.collectionDirectory"),
    "网页集合": t("types.collectionWebPage"),
    "命令集合": t("types.collectionCommand"),
    "Office 集合": t("types.collectionOffice"),
    "CAD 集合": t("types.collectionCAD"),
    "文件集合": t("types.collectionFile"),
    "应用集合": t("types.collectionApp"),
    "插件集合": t("types.collectionPlugin"),
    "目录": t("types.itemDirectory"),
    "命令": t("types.itemCommand"),
    "文件": t("types.itemFile"),
    "应用": t("types.itemApp"),
    "插件资源": t("types.itemPluginResource"),
    "编辑器": t("types.toolEditor"),
    "浏览器": t("types.toolBrowser"),
    "终端": t("types.toolTerminal"),
    "系统": t("types.toolSystem"),
    "Office": t("types.toolOffice"),
    "CAD": t("types.toolCAD"),
    "无场景": t("types.noScene"),
    "舒适": t("settings.comfortable"),
    "紧凑": t("settings.compact")
  };
  return typeMap[chineseType] || chineseType;
}

export function useI18n() {
  return { t, typeLabel, setLocale, getLocale, messages, state };
}
