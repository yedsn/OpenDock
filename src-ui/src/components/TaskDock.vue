<script setup lang="ts">
import { computed } from "vue";
import { CheckCircle2, ChevronUp, LoaderCircle, RefreshCw, Trash2, XCircle } from "lucide-vue-next";
import { useOpenDockStore } from "../store";

const store = useOpenDockStore();

const latest = computed(() => store.latestTask.value);
const latestClass = computed(() => latest.value?.status || "idle");
const latestText = computed(() => latest.value?.message || "暂无后台任务");
const syncRunning = computed(() => store.state.tasks.some((task) => task.id === "webdav-sync" && task.status === "running"));

function taskIcon(status: string) {
  if (status === "running") return LoaderCircle;
  if (status === "success") return CheckCircle2;
  if (status === "error") return XCircle;
  return ChevronUp;
}
</script>

<template>
  <div class="task-dock" aria-label="任务状态">
    <div v-if="store.state.taskPanelOpen" class="task-panel">
      <div class="task-panel-header">
        <strong>任务执行列表</strong>
        <button type="button" class="task-mini-button" @click="store.clearFinishedTasks"><Trash2 />清理完成</button>
      </div>
      <div v-if="store.state.tasks.length === 0" class="task-empty">暂无任务</div>
      <div v-for="task in store.state.tasks" :key="task.id" class="task-row" :class="task.status">
        <component :is="taskIcon(task.status)" :class="{ spin: task.status === 'running' }" />
        <div class="task-row-body">
          <div class="task-row-title"><span>{{ task.title }}</span><small>{{ task.progress }}%</small></div>
          <p>{{ task.message }}</p>
          <div v-if="task.status === 'running'" class="task-progress"><span :style="{ width: task.progress + '%' }"></span></div>
        </div>
      </div>
    </div>

    <button type="button" class="task-status-button" :class="latestClass" @click="store.toggleTaskPanel()">
      <component :is="taskIcon(latest?.status || 'idle')" :class="{ spin: latest?.status === 'running' }" />
      <span class="task-status-text" :title="latestText">{{ latestText }}</span>
      <strong v-if="store.runningTaskCount.value > 0">{{ store.runningTaskCount.value }}</strong>
    </button>

    <button
      v-if="store.webdavPluginInstalled.value"
      type="button"
      class="task-sync-button"
      :disabled="syncRunning"
      title="手动同步 WebDAV"
      @click="store.syncWebdavNow()"
    >
      <LoaderCircle v-if="syncRunning" class="spin" />
      <RefreshCw v-else />
      <span>同步</span>
    </button>
  </div>
</template>

<style scoped>
.task-dock {
  position: relative;
  margin-left: auto;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
}
.task-status-button,
.task-sync-button,
.task-mini-button {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 20px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text);
  box-shadow: none;
  font-size: 11px;
  font-weight: 720;
}
.task-status-button:hover,
.task-sync-button:hover:not(:disabled),
.task-mini-button:hover { background: var(--bg-3); }
.task-status-button {
  max-width: min(460px, 42vw);
  min-width: 0;
  padding: 0 7px;
}
.task-sync-button {
  padding: 0 7px;
}
.task-sync-button:disabled {
  color: var(--muted);
  cursor: wait;
  opacity: 0.82;
}
.task-status-button svg,
.task-sync-button svg,
.task-mini-button svg {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
}
.task-status-button.success { color: var(--green); }
.task-status-button.error { color: var(--red); }
.task-status-button.warning { color: #d19a66; }
.task-status-button.running { color: var(--accent); }
.task-status-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.task-status-button strong {
  min-width: 18px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--accent);
  color: var(--bg);
  font-size: 11px;
}
.task-panel {
  pointer-events: auto;
  position: absolute;
  right: 0;
  bottom: 25px;
  width: min(420px, calc(100vw - 28px));
  max-height: min(360px, calc(100vh - 90px));
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--bg-2);
  box-shadow: 0 18px 42px var(--shadow, rgba(0, 0, 0, 0.42));
}
.task-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 4px 8px;
  border-bottom: 1px solid var(--line);
}
.task-panel-header strong { font-size: 12px; }
.task-mini-button {
  height: 26px;
  padding: 0 8px;
  box-shadow: none;
  color: var(--muted);
  background: var(--bg-3);
}
.task-empty {
  padding: 16px 8px 10px;
  color: var(--muted);
  font-size: 12px;
}
.task-row {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 8px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--line);
}
.task-row:last-child { border-bottom: 0; }
.task-row > svg { width: 16px; height: 16px; margin-top: 1px; }
.task-row.success > svg { color: var(--green); }
.task-row.error > svg { color: var(--red); }
.task-row.warning > svg { color: #d19a66; }
.task-row.running > svg { color: var(--accent); }
.task-row-body { min-width: 0; display: grid; gap: 5px; }
.task-row-title { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; font-weight: 800; }
.task-row-title small { color: var(--muted); font-size: 11px; }
.task-row p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.45; word-break: break-word; }
.task-progress { height: 3px; overflow: hidden; border-radius: 999px; background: var(--bg-3); }
.task-progress span { display: block; height: 100%; border-radius: inherit; background: var(--accent); transition: width .18s ease; }
.spin { animation: task-spin .8s linear infinite; }
@keyframes task-spin { to { transform: rotate(360deg); } }
</style>
