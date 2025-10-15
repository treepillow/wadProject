<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import userPng from '../assets/user.png'

const props = defineProps({
  /** About page uses this to show Login/Sign up instead of user items */
  authCtasOnly: { type: Boolean, default: false },
  /** Optional: customize where Create Service points to */
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
      <div class="container-fluid px-3 px-lg-4">

        <!-- Brand -->
        <RouterLink to="/" class="navbar-brand d-flex align-items-center gap-2 text-decoration-none">
          <img src="../assets/homes_logo.png" alt="Homes" class="brand-logo" />
          <span class="brand-name">Homes</span>
        </RouterLink>

        <!-- Toggler -->
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"
                aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <!-- Right side -->
        <div id="mainNav" class="collapse navbar-collapse">
          <ul class="navbar-nav ms-auto align-items-center gap-lg-2">

            <!-- About page only: Login / Sign up -->
            <template v-if="showAuthCtas">
              <li class="nav-item">
                <RouterLink to="/login" class="btn btn-outline-primary me-2">Login</RouterLink>
              </li>
              <li class="nav-item">
                <RouterLink to="/signup" class="btn btn-primary">Sign up</RouterLink>
              </li>
            </template>

            <!-- Logged in, everywhere else -->
            <template v-else-if="isLoggedIn">


              <li class="nav-item">
                <RouterLink to="/chat" class="nav-link d-flex align-items-center">
                  <img src="../assets/message.png" alt="Messages" class="icon-24 me-1" />
                  <span class="d-none d-sm-inline">Messages</span>
                </RouterLink>
              </li>
              <li class="nav-item me-1">
                <RouterLink to="/createService" class="btn btn-brand">
                  + Create Service
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

            <!-- Not logged in on other pages => show nothing (your guards handle redirects) -->

          </ul>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.bg-page { background: var(--page-bg, rgb(245,239,239)) !important; }
.elevate { z-index: 1045; }

.brand-logo { height: 40px; width: auto; }
.brand-name {
  font-size: clamp(1.25rem, 1.2vw + 1rem, 2.25rem);
  font-weight: 800;
  letter-spacing: .2px;
  color: black;
}

.icon-24 { width: 24px; height: 24px; object-fit: contain; }
.avatar-36 {
  width: 36px; height: 36px; object-fit: cover;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,.08);
  background: #fff;
}
.avatar-btn { background: transparent; border: 0; border-radius: 999px; }

/* Brand button */
.btn-brand {
  --brand: #4b2aa6;
  --brand-contrast: #fff;
  background: var(--brand);
  color: var(--brand-contrast);
  border: 1px solid var(--brand);
  padding: .45rem .85rem;
  border-radius: .75rem;
  font-weight: 600;
}
.btn-brand:hover {
  filter: brightness(1.05);
  color: var(--brand-contrast);
  text-decoration: none;
}

/* Link color on light bg */
.navbar-light .nav-link { color: #2b2b2b; }
.navbar-light .nav-link:hover { color: #4b2aa6; }

/* Dropdown look */
.dropdown-menu {
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 8px 24px rgba(0,0,0,.08);
}

/* Toggler */
.navbar-toggler { border-color: rgba(0,0,0,.15); }
.navbar-toggler:focus { box-shadow: 0 0 0 .15rem rgba(75,42,166,.15); }
</style>
