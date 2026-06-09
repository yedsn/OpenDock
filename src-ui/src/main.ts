import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";
import { useOpenDockStore } from "./store";

const app = createApp(App);
app.mount("#app");

// After the app is mounted, load data from SQLite
const store = useOpenDockStore();
store.init().catch((e) => console.error("Failed to initialize store from DB:", e));
