<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, signOut } from 'firebase/auth'


const auth = getAuth()
const router = useRouter()
const loggingOut = ref(false)

    async function logout() {
    try {
        loggingOut.value = true
        await signOut(auth)
        // redirect after sign out
        router.push('/') 
    } catch (err) {
        console.error('Error signing out:', err)
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
                            <img src="../assets/user.png" class="profile-icon"></img>
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
        color: purple;
    }
</style>