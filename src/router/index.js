import { createRouter, createWebHistory } from 'vue-router'
import Categories from '../components/Categories.vue'
import Profile from '../components/Profile.vue';
import LoginSignup from '../components/LoginSignup.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Categories,
    },
    {
      path: '/Profile',
      name: 'profile',
      component: Profile,
    },
    { path: '/', 
      name: 'loginsignup',
      component: LoginSignup 
    }, // default page
  ],
})

export default router
