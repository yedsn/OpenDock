/// <reference types="vite/client" />

import "vue";

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

declare module "vue" {
  interface ComponentCustomProperties {
    $t: (key: string, params?: Record<string, string | number>) => string;
    $typeLabel: (chineseType: string) => string;
  }
}
