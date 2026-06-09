import { pinyin } from "pinyin-pro";

const fullCache = new Map<string, string>();
const initialCache = new Map<string, string>();

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function getPinyinFull(text: string): string {
  const key = normalize(text);
  if (!key) return "";
  const cached = fullCache.get(key);
  if (cached !== undefined) return cached;

  const value = pinyin(text, { toneType: "none", type: "array" }).join("").toLowerCase();
  fullCache.set(key, value);
  return value;
}

export function getPinyinInitials(text: string): string {
  const key = normalize(text);
  if (!key) return "";
  const cached = initialCache.get(key);
  if (cached !== undefined) return cached;

  const value = pinyin(text, { toneType: "none", type: "array", pattern: "first" }).join("").toLowerCase();
  initialCache.set(key, value);
  return value;
}

export function createSearchText(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function matchesSearchText(text: string, keyword: string): boolean {
  const normalizedKeyword = normalize(keyword);
  if (!normalizedKeyword) return true;

  const normalizedText = normalize(text);
  if (!normalizedText) return false;
  if (normalizedText.includes(normalizedKeyword)) return true;

  return getPinyinFull(text).includes(normalizedKeyword) || getPinyinInitials(text).includes(normalizedKeyword);
}

export function scoreSearchText(title: string, body: string, keyword: string): number {
  const normalizedKeyword = normalize(keyword);
  if (!normalizedKeyword) return 0;

  const normalizedTitle = normalize(title);
  const normalizedBody = normalize(body);
  if (normalizedTitle === normalizedKeyword) return 100;
  if (normalizedTitle.startsWith(normalizedKeyword)) return 90;
  if (normalizedTitle.includes(normalizedKeyword)) return 80;
  if (normalizedBody.includes(normalizedKeyword)) return 60;

  const fullTitle = getPinyinFull(title);
  const initialsTitle = getPinyinInitials(title);
  if (fullTitle.startsWith(normalizedKeyword) || initialsTitle.startsWith(normalizedKeyword)) return 70;
  if (fullTitle.includes(normalizedKeyword) || initialsTitle.includes(normalizedKeyword)) return 55;

  const fullBody = getPinyinFull(body);
  const initialsBody = getPinyinInitials(body);
  if (fullBody.includes(normalizedKeyword) || initialsBody.includes(normalizedKeyword)) return 40;
  return -1;
}
