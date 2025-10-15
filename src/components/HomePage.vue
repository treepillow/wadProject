<script setup>
import { ref, onMounted } from 'vue'
import { collection, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore'
import { db } from '@/firebase'

import NavBar from './NavBar.vue'
import SearchBar from './SearchBar.vue'
import Categories from './Categories.vue'
import ListingCard from './ListingCard.vue'

const listings = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const pageSize = 12
const lastDoc = ref(null)
const noMore = ref(false)

async function fetchPage () {
  const first = !lastDoc.value
  if (first) loading.value = true; else loadingMore.value = true
  error.value = ''
  try {
    const base = collection(db, 'allListings')
    const q = lastDoc.value
      ? query(base, orderBy('createdAt','desc'), startAfter(lastDoc.value), limit(pageSize))
      : query(base, orderBy('createdAt','desc'), limit(pageSize))

    const snap = await getDocs(q)
    if (snap.empty) {
      if (first) listings.value = []
      noMore.value = true
      return
    }
    lastDoc.value = snap.docs[snap.docs.length - 1]
    listings.value.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })))
    if (snap.size < pageSize) noMore.value = true
  } catch (e) {
    console.error(e)
    error.value = 'Failed to load listings.'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

onMounted(fetchPage)
</script>

<template>
  <div class="container-fluid">
    <NavBar />

    <div class="container py-3">
      <SearchBar />
      <Categories />
    </div>

    <div class="container pb-5">
      <!-- Loading / error -->
      <div v-if="loading" class="d-flex justify-content-center my-5">
        <div class="spinner-border" role="status" aria-label="Loading"></div>
      </div>
      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <!-- Grid -->
      <div v-else>
        <div v-if="listings.length"
             class="row g-3 row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xxl-4">
          <div class="col" v-for="l in listings" :key="l.id">
            <ListingCard :listing="l" />
          </div>
        </div>

        <div v-else class="text-center text-muted py-5">No listings yet.</div>

        <!-- Load more -->
        <div v-if="listings.length && !noMore" class="d-flex justify-content-center mt-4">
          <button class="btn btn-outline-primary px-4" :disabled="loadingMore" @click="fetchPage">
            <span v-if="loadingMore" class="spinner-border spinner-border-sm me-2"></span>
            Load more
          </button>
        </div>
        <div v-else-if="listings.length && noMore" class="text-center text-muted mt-4">
          You’ve reached the end.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Helper for images inside ListingCard */
.object-fit-cover { object-fit: cover; }
</style>
