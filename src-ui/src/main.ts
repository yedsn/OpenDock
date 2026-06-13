import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";
import { useOpenDockStore } from "./store";
import { useI18n } from "./i18n";
import { watch } from "vue";

const app = createApp(App);

// Register i18n functions as global properties so templates can use $t() and $typeLabel() without importing
const { t, typeLabel, setLocale } = useI18n();
app.config.globalProperties.$t = t;
app.config.globalProperties.$typeLabel = typeLabel;

app.mount("#app");

// After the app is mounted, load data from SQLite
const store = useOpenDockStore();
store.init().catch((e) => console.error("Failed to initialize store from DB:", e));

watch(() => store.state.data.settings.general.language, (lang) => setLocale(lang), { immediate: true });
