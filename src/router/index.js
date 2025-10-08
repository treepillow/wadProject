import { createRouter, createWebHistory } from 'vue-router'
import Profile from '../components/Profile.vue';
import LoginSignup from '../components/LoginSignup.vue';
import AboutPage from '../components/AboutPage.vue';
import HomePage from '@/components/HomePage.vue';
import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'about',
      component: AboutPage, meta: {guestOnly: true}
    },
    {
      path: '/home',
      name: 'home',
      component: HomePage, meta: {requiresAuth: true}
    },
    {
      path: '/Profile',
      name: 'profile',
      component: Profile, meta: {requiresAuth: true}
    },
    { path: '/signup', 
      name: 'loginsignup',
      component: LoginSignup, meta: {guestOnly: true}
    }, // default page
  ],
})


// --- Auth guard ---
function getCurrentUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

router.beforeEach(async (to, _from, next) => {
  const user = await getCurrentUser();

  if (to.meta.requiresAuth && !user) {
    
    return next({ name: "about", query: { redirect: to.fullPath } });
  }

  if (to.meta.guestOnly && user) {
    return next({ name: "home" });
  }

  next();
});

 
export default router
