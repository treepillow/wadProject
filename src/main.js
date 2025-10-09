import './assets/main.css'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";

const app = createApp(App)

app.use(router)

onAuthStateChanged(auth, (user) => {
  const to = router.currentRoute.value;
  // If user just became null while sitting on a protected page → redirect
  if (!user && to.meta?.requiresAuth) {
    router.replace({ name: "loginsignup", query: { redirect: to.fullPath } });
  }
  // If user logs in while on guest-only page, you can optionally bounce them:
  if (user && to.meta?.guestOnly) {
    router.replace({ name: "home" });
  }
});
app.mount('#app')
