<script setup>
import { ref } from 'vue'

const emit = defineEmits(['search'])

const searchQuery = ref('')
const locationQuery = ref('')

function handleSearch(e) {
  e.preventDefault()
  emit('search', {
    business: searchQuery.value.trim(),
    location: locationQuery.value.trim()
  })
}

function clearSearch() {
  searchQuery.value = ''
  locationQuery.value = ''
  emit('search', { business: '', location: '' })
}
</script>

<template>
  <div class="search mt-2">
    <form class="d-flex" role="search" @submit="handleSearch">
      <input
        class="home-business form-control me-3"
        type="search"
        placeholder="🔍 Search for a home business"
        aria-label="Search"
        v-model="searchQuery"
      />
      <input
        class="location-search form-control me-3"
        type="search"
        placeholder="📍 Search location"
        aria-label="Search Location"
        v-model="locationQuery"
      />
      <button class="btn btn-search" type="submit">Search</button>
      <button
        v-if="searchQuery || locationQuery"
        class="btn btn-clear ms-2"
        type="button"
        @click="clearSearch"
      >Clear</button>
    </form>
  </div>
</template>



<style scoped>
.home-business {
  width: 50%;
  padding: 15px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  transition: border-color 0.3s ease;
}

.home-business:focus {
  border-color: #4b2aa6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(75, 42, 166, 0.1);
}

.location-search {
  width: 25%;
  padding: 15px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  transition: border-color 0.3s ease;
}

.location-search:focus {
  border-color: #4b2aa6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(75, 42, 166, 0.1);
}

.btn-search {
  color: white;
  background-color: #4b2aa6d7;
  padding: 0 30px;
  transition: all 0.2s ease;
  border: 1px solid white;
  font-weight: bold;
  border-radius: 8px;
  white-space: nowrap;
}

.btn-search:hover {
  background-color: #4b2aa6;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(75, 42, 166, 0.3);
}

.btn-clear {
  color: #666;
  background-color: #f5f5f5;
  padding: 0 20px;
  transition: all 0.2s ease;
  border: 1px solid #ddd;
  font-weight: 500;
  border-radius: 8px;
  white-space: nowrap;
}

.btn-clear:hover {
  background-color: #e0e0e0;
  border-color: #999;
}

.search {
  animation: slideDown 0.4s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>