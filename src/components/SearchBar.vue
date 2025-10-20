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
</script>

<template>
  <div class="search mt-2">
    <form class="d-flex align-items-center gap-3" role="search" @keyup="handleSearch">
      <input
        class="home-business form-control"
        type="search"
        placeholder="🔍 Search for a home business"
        aria-label="Search"
        v-model="searchQuery"
      />
      <input
        class="location-search form-control"
        type="search"
        placeholder="📍 Search location"
        aria-label="Search Location"
        v-model="locationQuery"
      />
      <button class="btn btn-search" type="submit">Search</button>
    </form>
  </div>
</template>



<style scoped>
.search form {
  width: 100%;
}

.home-business {
  flex: 1;
  min-width: 0;
  padding: 15px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  transition: border-color 0.3s ease;
  height: 52px;
}

.home-business:focus {
  border-color: var(--color-primary);
  outline: none;
}

.location-search {
  flex: 0 0 auto;
  width: 280px;
  padding: 15px;
  border-radius: 8px;
  border: 2px solid var(--color-border);
  transition: border-color var(--transition-normal);
  height: 52px;
}

.location-search:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn-search {
  flex: 0 0 auto;
  color: white;
  background-color: var(--color-primary);
  padding: 0 40px;
  height: 52px;
  transition: all var(--transition-fast);
  border: none;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
}

.btn-search:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-search:active {
  transform: translateY(0);
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

/* Responsive */
@media (max-width: 768px) {
  .search form {
    flex-wrap: wrap;
  }

  .home-business,
  .location-search {
    width: 100%;
    flex: 1 1 100%;
  }

  .btn-search {
    width: 100%;
    flex: 1 1 100%;
  }
}
</style>