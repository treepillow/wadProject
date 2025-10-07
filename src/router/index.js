import { createRouter, createWebHistory } from 'vue-router'
import Profile from '../components/Profile.vue';
import LoginSignup from '../components/LoginSignup.vue';
import AboutPage from '../components/AboutPage.vue';
import HomePage from '@/components/HomePage.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'about',
      component: AboutPage,
    },
    {
      path: '/home',
      name: 'home',
      component: HomePage,
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
