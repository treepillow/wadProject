<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import userPng from '../assets/user.png'
import DarkModeToggle from './DarkModeToggle.vue'
import { Icon } from '@iconify/vue'; 

const props = defineProps({
  // for about page - show login/signup instead of profile stuff
  authCtasOnly: { type: Boolean, default: false },
  createPath: { type: String, default: '/service/new' }
})

const router = useRouter()
const auth = getAuth()
const db = getFirestore()

const user = ref(null)
const avatarUrl = ref(userPng)
const loggingOut = ref(false)
let unsubAuth = null

onMounted(() => {
  unsubAuth = onAuthStateChanged(auth, async (u) => {
    user.value = u
    if (!u) { avatarUrl.value = userPng; return }
    try {
      const snap = await getDoc(doc(db, 'users', u.uid))
      const url = snap.exists() && snap.data().photoURL ? snap.data().photoURL : (u.photoURL || userPng)
      avatarUrl.value = url || userPng
    } catch {
      avatarUrl.value = u.photoURL || userPng
    }
  })
})
onBeforeUnmount(() => { unsubAuth && unsubAuth() })

const isLoggedIn = computed(() => !!user.value)
const showAuthCtas = computed(() => props.authCtasOnly)

async function logout() {
  try {
    loggingOut.value = true
    await signOut(auth)
    router.push('/')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <header class="sticky-top elevate">
    <nav class="navbar navbar-expand-lg navbar-light bg-page shadow-sm border-bottom">
      <div class="navbar-container">

        <!-- Hamburger on left for mobile -->
        <button class="navbar-toggler order-0 me-2" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"
                aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <RouterLink to="/" class="navbar-brand d-flex align-items-center gap-2 text-decoration-none order-1 flex-grow-1">
          <img src="../assets/homes_logo.png" alt="Homes" class="brand-logo" />
          <span class="brand-name">Homes</span>
        </RouterLink>

        <div id="mainNav" class="collapse navbar-collapse order-2">
          <!-- Close button for mobile -->
          <div class="d-lg-none d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
            <span class="fw-bold">Menu</span>
            <button type="button" class="btn-close" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-label="Close menu"></button>
          </div>

          <ul class="navbar-nav ms-auto align-items-center gap-lg-2">

            <li class="nav-item">
              <DarkModeToggle />
            </li>
            <template v-if="showAuthCtas">
              <li class="nav-item">
                <RouterLink to="/login" class="btn btn-outline-primary me-2">Login</RouterLink>
              </li>
              <li class="nav-item">
                <RouterLink to="/signup" class="btn btn-primary">Sign up</RouterLink>
              </li>
            </template>

            <template v-else-if="isLoggedIn">
              <li class="nav-item">
                <RouterLink to="/chat" class="btn btn-brand d-flex align-items-center">
                  <Icon icon="mdi:email" class="icon-24 me-1" />
                  <span class="d-none d-sm-inline">Messages</span>
                </RouterLink>
              </li>
              <li class="nav-item me-1">
                <RouterLink to="/createService" class="btn btn-brand d-flex align-items-center">
                  <Icon icon="mdi:plus-circle" class="icon-24 me-1" />
                  <span class="btn-text">Create Service</span>
                </RouterLink>
              </li>
              <li class="nav-item dropdown">
                <button class="btn p-0 dropdown-toggle avatar-btn" data-bs-toggle="dropdown" aria-expanded="false">
                  <img :src="avatarUrl" alt="User avatar" class="avatar-36" />
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><RouterLink to="/profile" class="dropdown-item">Profile</RouterLink></li>
                  <li><hr class="dropdown-divider" /></li>
                  <li>
                    <button class="dropdown-item text-danger" @click="logout" :disabled="loggingOut">
                      {{ loggingOut ? 'Signing out…' : 'Sign out' }}
                    </button>
                  </li>
                </ul>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.bg-page {
  background: var(--color-bg-white) !important;
  transition: background var(--transition-normal);
}

.elevate {
  z-index: 1045;
}

.navbar {
  padding-left: 0;
  padding-right: 0;
}

.navbar-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

@media (max-width: 991.98px) {
  .navbar-container {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
}

@media (max-width: 575.98px) {
  .navbar-container {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
}

.brand-logo { 
  height: 40px; 
  width: auto; 
}

.brand-name {
  font-size: clamp(1.25rem, 1.2vw + 1rem, 2.25rem);
  font-weight: 800;
  letter-spacing: 0.2px;
  color: var(--color-text-primary);
}

.icon-24 {
  width: 24px;               /* Adjust the size to ensure the icon shows up */
  height: 24px;              /* Adjust the size */
  object-fit: contain;       /* Ensure the icon fits properly */
  background-color: transparent; /* Transparent background behind the icon */
  padding: 0;                /* No extra padding */
  box-shadow: none;          /* Remove box shadow (if any) */
  border-radius: 50%;        /* Ensure the icon is circular */
  display: inline-block;     /* Make it behave like an inline element */
}

/* Avatar image styles */
.avatar-36 {
  width: 36px; 
  height: 36px; 
  object-fit: cover;  /* Ensures the image covers the circular area */
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  background: #fff;
}

.avatar-btn { 
  background: transparent; 
  border: 0; 
  border-radius: 999px; 
}

/* Button styling */
.btn-brand,
.btn-outline-primary,
.btn-primary,
.btn-common {
  font-size: 0.875rem;  /* Standard font size for all buttons */
  padding: 0.5rem 1rem;  /* Consistent padding */
  height: 40px;  /* Ensure uniform button height */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;  /* Rounded corners */
  font-weight: 600;
  transition: all 0.2s ease;
  border: 1px solid transparent;  /* Transparent border */
  min-width: 120px; /* Ensure buttons have a consistent width */
  width: auto;  /* Allow width to adapt based on content */
}

/* Mobile responsive buttons */
@media (max-width: 575.98px) {
  .btn-brand,
  .btn-outline-primary,
  .btn-primary,
  .btn-common {
    font-size: 0.813rem;
    padding: 0.4rem 0.75rem;
    height: 36px;
    min-width: 100px;
  }

  .navbar-nav {
    padding: 1rem 0;
  }

  .navbar-nav .nav-item {
    margin-bottom: 0.5rem;
  }

  /* Make Create Service button more compact on small screens */
  .btn-text {
    font-size: 0.813rem;
  }
}

/* Extra responsive for very small screens */
@media (max-width: 380px) {
  .btn-brand .btn-text {
    font-size: 0.75rem;
  }

  .btn-brand,
  .btn-outline-primary,
  .btn-primary {
    padding: 0.35rem 0.6rem;
    min-width: 90px;
  }
}

/* Specific styles for .btn-brand */
.btn-brand {
  background: var(--color-primary);
  color: var(--color-text-white);
  border-color: var(--color-primary);
}

/* Icon Styling for Buttons */
.btn-brand img, 
.icon-24 {
  width: 18px;  /* Standard icon size */
  height: 18px; /* Standard icon size */
  margin-right: 8px; /* Consistent spacing between icon and text */
  object-fit: contain;  /* Ensures icons fit properly */
}

/* Message Button Specific Styles */
.btn-common {
  width: auto;  /* Ensures buttons don't have fixed widths */
}

/* Hover Effects for Buttons */
.btn-brand:hover,
.btn-outline-primary:hover,
.btn-primary:hover,
.btn-common:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Focus Effects */
.btn-brand:focus,
.btn-outline-primary:focus,
.btn-primary:focus,
.btn-common:focus {
  outline: none;
  box-shadow: var(--focus-ring-sm);
}

/* Link colors for light backgrounds */
.navbar-light .nav-link {
  color: var(--color-text-primary);
}

.navbar-light .nav-link:hover {
  color: var(--color-primary);
}

/* Dropdown Menu */
.dropdown-menu {
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 8px 24px rgba(0,0,0,.08);
}

/* Navbar Toggler */
.navbar-toggler {
  border-color: rgba(0,0,0,.15);
}

.navbar-toggler:focus {
  box-shadow: 0 0 0 .15rem rgba(75,42,166,.15);
}

/* Dark mode hamburger visibility */
:root.dark-mode .navbar-toggler {
  border-color: rgba(255, 255, 255, 0.3);
}

:root.dark-mode .navbar-toggler-icon {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28255, 255, 255, 0.85%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e");
}

/* Mobile side menu slide from left */
@media (max-width: 991.98px) {
  .navbar-collapse {
    position: fixed !important;
    top: 0;
    left: -280px;
    width: 280px;
    height: 100vh;
    background: var(--color-bg-white);
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
    transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1) !important;
    z-index: 1050;
    overflow-y: auto;
    padding: 1.5rem 1rem;
    display: block !important;
    visibility: hidden;
  }

  .navbar-collapse.show {
    left: 0;
    visibility: visible;
  }

  .navbar-collapse.collapsing {
    left: -280px;
    transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s linear 0.35s !important;
    height: 100vh !important;
    visibility: hidden;
  }

  .navbar-collapse.show.collapsing {
    left: 0;
    visibility: visible;
    transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .navbar-nav {
    padding-top: 1rem;
    gap: 1rem !important;
  }

  .navbar-nav .nav-item {
    width: 100%;
    margin-bottom: 0;
  }

  .navbar-nav .btn {
    width: 100%;
    justify-content: center;
    min-height: 44px;
    font-size: 0.95rem;
  }

  .navbar-nav .btn-brand,
  .navbar-nav .btn-primary,
  .navbar-nav .btn-outline-primary {
    padding: 0.65rem 1rem;
  }

  .navbar-nav .dropdown-menu {
    position: static !important;
    width: 100%;
    border: none;
    box-shadow: none;
    background: transparent;
    padding: 0;
    margin-top: 0.5rem;
  }

  .navbar-nav .dropdown-item {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 0.5rem;
    background: var(--color-bg-purple-tint);
  }

  /* Backdrop overlay */
  .navbar-collapse.show::before {
    content: '';
    position: fixed;
    top: 0;
    left: 280px;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: -1;
  }

  /* Dark mode support for mobile menu */
  :root.dark-mode .navbar-collapse {
    background: var(--color-bg-dark);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }

  :root.dark-mode .navbar-collapse .border-bottom {
    border-color: rgba(255, 255, 255, 0.1) !important;
  }

  :root.dark-mode .btn-close {
    filter: invert(1);
  }
}

</style>
