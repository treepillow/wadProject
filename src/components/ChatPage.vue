<script setup>
import SearchBar from './SearchBar.vue'
import ChatBox from './ChatBox.vue'
</script>

<template>
  <div>
    <!-- Top section (search) -->
    <div class="container py-3">
      <SearchBar />
    </div>

    <!-- Main chat container -->
    <div class="container pb-5">
      <ChatBox :key="$route.fullPath" />
    </div>
  </div>
</template>
