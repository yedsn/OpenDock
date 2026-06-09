<script setup lang="ts">
import { useOpenDockStore } from "../../store";

const store = useOpenDockStore();
const search = store.state.data.settings.search;
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">搜索回车行为</div>
    <div class="settings-card-description">分别设置搜索结果中不同类型条目的 Enter 执行动作。</div>
    <div class="settings-grid">
      <label class="setting-field">
        <span>场景结果</span>
        <select v-model="search.sceneEnterBehavior">
          <option value="open">直接打开场景</option>
          <option value="navigate">定位到场景标签</option>
        </select>
      </label>
      <label class="setting-field">
        <span>集合结果</span>
        <select v-model="search.collectionEnterBehavior">
          <option value="open">直接打开集合内容</option>
          <option value="navigate">定位到集合标签</option>
        </select>
      </label>
      <label class="setting-field">
        <span>资源结果</span>
        <select v-model="search.itemEnterBehavior">
          <option value="open">直接打开资源</option>
          <option value="navigate">定位到所在集合</option>
        </select>
      </label>
      <label class="setting-field">
        <span>打开链接后隐藏窗口</span>
        <span class="setting-switch">
          <input v-model="store.state.data.settings.general.closeWindowAfterOpen" type="checkbox" /><span></span>
        </span>
      </label>
    </div>
  </section>
</template>
