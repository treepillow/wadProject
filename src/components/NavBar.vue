<script setup>
import SearchBar from './SearchBar.vue';

import { useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const showSearchBar = computed(() => route.path !== "/profile");


</script>

<template>
<div class="container-fluid">
    <nav class="navbar navbar-expand-lg">

    <a class="navbar-brand" href="#">Homes</a>


    <div class="d-flex ms-auto">
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item">
                    <a class="nav-link active" aria-current="page" href="#">
                    <img src="../assets/message_icon.png"></img>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link profile-icon" href="#">
                    <img src="../assets/user.png"></img>
                    </a>
                </li>
            </ul>
        </div>
    </div>

    </nav>

</div>
<SearchBar  v-if="showSearchBar"/>

</template>



<style scoped>
    .navbar{
        background-color: rgb(243, 233, 243); /* Set background color */

    }

    .navbar-brand
    {
        font-size: 50px;
        font-weight: bold;
        color: purple;
    }

    .profile-icon
    {
        border: 3px solid black;
        border-radius: 50px;
    }

    .nav-item img
    {
        width: 50px;
    }






    
</style>