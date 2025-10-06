import { createRouter, createWebHistory } from 'vue-router'
import Categories from '../components/Categories.vue'
import Profile from '../components/Profile.vue';

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
 
  ],
})

export default router
