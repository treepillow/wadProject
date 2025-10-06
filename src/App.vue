<script setup>
import { RouterLink, RouterView } from "vue-router";
import NavBar from "./components/NavBar.vue";
import Categories from "./components/Categories.vue";
</script>

<template>

    <NavBar />
    <Categories/>
  <RouterView />
</template>

<style>


</style>
