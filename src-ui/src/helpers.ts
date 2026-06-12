import type { Collection, CollectionType, ItemType, SceneType } from "./types";

export const sceneTypeOptions: SceneType[] = ["项目", "办公", "工程", "设计", "通用", "自定义"];

export const collectionTypeOptions: CollectionType[] = [
  "目录集合",
  "网页集合",
  "命令集合",
  "Office 集合",
  "CAD 集合",
  "文件集合",
  "应用集合",
  "插件集合"
];

export const itemTypeOptions: ItemType[] = [
  "目录",
  "URL",
  "命令",
  "Excel",
  "CAD",
  "文件",
  "应用",
  "插件资源"
];

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Tokenize "{path} --flag" -> ["/foo", "--flag"], honoring "quoted segments".
// We tokenize the template first so user-supplied values (e.g. paths with spaces)
// stay as one argument even when they aren't quoted in the template.
export function expandToolArgs(template: string, values: Record<string, string>): string[] {
  const tokens = template.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return tokens.map((token) => {
    const unquoted = token.replace(/^"|"$/g, "");
    return Object.entries(values).reduce(
      (text, [key, value]) => text.split(`{${key}}`).join(value),
      unquoted
    );
  });
}

// Pick the default collection type when a project template name only hints at intent.
export function templateToCollectionType(template: string): CollectionType {
  if (template.includes("代码") || template.includes("目录")) return "目录集合";
  if (template.includes("命令")) return "命令集合";
  return "网页集合";
}

export function describeCollection(collection: Collection, sceneName: string | undefined): string {
  return `${collection.type} · ${sceneName || "无场景"}`;
}
