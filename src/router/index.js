import { createRouter, createWebHistory } from 'vue-router'
import Profile from '../components/Profile.vue';
// import LoginSignup from '../components/LoginSignup.vue';
import AboutPage from '../components/AboutPage.vue';
import HomePage from '@/components/HomePage.vue';
import NewBusinessPage from '../components/NewBusiness.vue'
import Login from "@/components/Login.vue";
import Signup from "@/components/Signup.vue";
import ChatPage from '../components/ChatPage.vue';
import ForgotPassword from '../components/ForgotPassword.vue';
import NewBusiness from '../components/NewBusiness.vue';
import Boosting from '../components/Boosting.vue'
import UserProfile from '../components/UserProfile.vue'
import EmailVerified from '../components/EmailVerified.vue'
import AdminDashboard from '../components/AdminDashboard.vue'
import Feedback from '@/components/Feedback.vue';

import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/newbusiness',
      name: 'newbusiness',
      component: NewBusinessPage, meta: {requiresAuth: true}
    },
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
    // { path: '/signup', 
    //   name: 'loginsignup',
    //   component: LoginSignup, meta: {guestOnly: true}
    // },
    { path: "/login", 
      name: 'login',
      component: Login
    },
    { path: "/signup", 
      name: 'signup',
      component: Signup 
    },
    {
      path: '/chat',
      name: 'chat',
      component: ChatPage,
      meta: { requiresAuth: true }
    },
    {
      path:'/forgotpassword',
      name: 'forgotpassword',
      component: ForgotPassword
    },
    {
      path:'/createService',
      name: 'createservice',
      component: NewBusiness
    },
    {
      path: '/boosting',
      name: 'Boosting',
      component: Boosting
    },
    {
      path: '/user/:userId',
      name: 'UserProfile',
      component: UserProfile,
      meta: { requiresAuth: true }
    },
    {
      path: '/email-verified',
      name: 'emailVerified',
      component: EmailVerified
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminDashboard,
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/feedback',
      name: 'feedback',
      component: Feedback,
    },
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

  // Check if authenticated user has completed profile
  if (user && to.meta.requiresAuth && to.name !== 'signup') {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || !userDoc.data().profileComplete) {
      return next({ name: "signup" });
    }

    // Check if route requires admin privileges
    if (to.meta.requiresAdmin && !userDoc.data().isAdmin) {
      return next({ name: "home" });
    }
  }

  next();
});

 
export default router
