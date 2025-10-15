<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import userPng from '../assets/user.png' // Vite will give you a URL

const auth = getAuth()
const db = getFirestore()
const router = useRouter()

const loggingOut = ref(false)
const avatarUrl = ref(userPng) // default placeholder
let unsubAuth = null

onMounted(() => {
  unsubAuth = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      avatarUrl.value = userPng
      return
    }
    try {
      // Prefer Firestore photoURL you stored; fallback to Auth.photoURL; else placeholder
      const snap = await getDoc(doc(db, 'users', user.uid))
      const url = snap.exists() && snap.data().photoURL
        ? snap.data().photoURL
        : (user.photoURL || userPng)
      avatarUrl.value = url || userPng
    } catch {
      avatarUrl.value = user.photoURL || userPng
    }
  })
})

onBeforeUnmount(() => { unsubAuth && unsubAuth() })

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
<div class="container-fluid">
    <nav class="navbar navbar-expand-lg">

    <a class="navbar-brand">
        <RouterLink to ='/home'><img src="../assets/homes_logo.png"></img>Homes</RouterLink></a>


    <div class="d-flex ms-auto">
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item">
                    <RouterLink to="/chat">
                    <img src="../assets/message.png" />
                    </RouterLink>
                </li>
                <li class="nav-item">
                    <div class="dropdown show">
                        <a class="btn dropdown-toggle" href="#" role="button" id="dropdownMenuLink" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <img :src="avatarUrl" class="profile-icon" alt="User avatar" />
                        </a>
                        <div class="dropdown-menu dropdown-menu-end m-0" aria-labelledby="dropdownMenuLink">
                            <RouterLink to ='/profile'><a class="dropdown-item">Profile</a></RouterLink>
                            <RouterLink to="/"><a @click="logout" class="dropdown-item" id="logoutButton">Sign out</a></RouterLink>
                        </div>
                    </div>
                </li>
            </ul>
        </div>
    </div>

    </nav>
</div>


</template>



<style scoped>
    .navbar{
        background-color: transparent;

    }

    .navbar img
    {
        width: 100px;
    }

    .navbar-brand
    {
        font-size: 50px;
        font-weight: bold;
        color: white;
    }

    .profile-icon
    {
        border: 3px solid black;
        border-radius: 50px;
        background-color: white;
    }

    .nav-item img
    {
        width: 50px;
        margin-right: 10px;
    }
    a
    {
        text-decoration: none;
        color: black;
    }
</style>