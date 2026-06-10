<script setup lang="ts">
import { watch } from "vue";
import { useOpenDockStore } from "../../store";
const store = useOpenDockStore();
const general = store.state.data.settings.general;
watch(() => general.autoSnapshotIntervalMinutes, () => store.startAutoSnapshotTimer());
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">基础行为</div>
    <div class="settings-grid">
      <label class="setting-field">
        <span>启动默认视图</span>
        <select v-model="general.defaultView">
          <option>全部资源</option><option>最近打开</option><option>收藏集合</option><option>无场景集合</option>
        </select>
      </label>
      <label class="setting-field">
        <span>最近打开数量</span>
        <input v-model.number="general.recentLimit" type="number" min="1" max="200" />
      </label>
      <label class="setting-field">
        <span>语言</span>
        <select v-model="general.language"><option>简体中文</option><option>English</option></select>
      </label>
      <label class="setting-field">
        <span>打开前确认</span>
        <span class="setting-switch">
          <input v-model="general.confirmBeforeOpen" type="checkbox" /><span></span>
        </span>
      </label>
      <label class="setting-field">
        <span>网页新窗口打开</span>
        <span class="setting-switch">
          <input v-model="general.openWebInNewWindow" type="checkbox" /><span></span>
        </span>
      </label>
      <label class="setting-field">
        <span>关闭窗口后打开</span>
        <span class="setting-switch">
          <input v-model="general.closeWindowAfterOpen" type="checkbox" /><span></span>
        </span>
      </label>
      <label class="setting-field">
        <span>记录打开失败</span>
        <span class="setting-switch">
          <input v-model="general.logOpenFailures" type="checkbox" /><span></span>
        </span>
      </label>
      <label class="setting-field">
        <span>自动快照间隔（分钟）</span>
        <input v-model.number="general.autoSnapshotIntervalMinutes" type="number" min="0" max="1440" />
        <small>设为 0 关闭自动快照</small>
      </label>
    </div>
  </section>
</template>