<script setup>
import Categories from './Categories.vue'
import NavBar from './NavBar.vue'
import SearchBar from './SearchBar.vue'
</script>

<template>
  <div class="container-fluid">
    <NavBar/>
    <SearchBar/>
    <Categories/>
  </div>
</template>
<style>
.container-fluid {
  /* background-color: rgba(165, 100, 179, 0.792); */
}
</style>