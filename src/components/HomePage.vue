<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  getFirestore, collection, query, orderBy, limit, getDoc, getDocs, startAfter,
  doc, setDoc, updateDoc, increment, deleteDoc, onSnapshot, where,
  getCountFromServer
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '@/firebase'

import NavBar from './NavBar.vue'
import SearchBar from './SearchBar.vue'
import Categories from './Categories.vue'
import ListingCard from './ListingCard.vue'
import ListingDrawer from './ListingDrawer.vue'
import { nextTick } from 'vue'

const listings     = ref([])
const loading      = ref(true)
const loadingMore  = ref(false)
const error        = ref('')
const pageSize     = 12
const lastDoc      = ref(null)
const noMore       = ref(false)

const selectedCats = ref([])
const searchFilters = ref({ business: '', location: '' })

const filterOpen = ref(false)
const minLikes = ref(0)
const minRating = ref(0)

async function applyFilter() {
  await nextTick()

  const filtered = listings.value.filter(r => {
    const likes = likeCounts[r.listingId || r.id] ?? 0
    const rating = r.rating ?? 0
    return likes >= minLikes.value && rating >= minRating.value
  })

  if (filtered.length === 0) {
    alert("No listings match the selected filters.")
  }

  listings.value = filtered
  filterOpen.value = false
}

function resetFilter() {
  minLikes.value = 0
  minRating.value = 0
  reloadForFilters()
  filterOpen.value = false
}

// likes state
const likedSet     = ref(new Set())
let unsubLikes     = null
let unsubAuth      = null

/* like counts per listing */
const likeCounts   = reactive({})

/* seller names/avatars (live) */
const profileMap   = ref({})
const profileUnsubs = new Map()

/* ---------- batch reveal state ---------- */
/** IDs whose images are allowed to show (revealed). */
const revealedIds = ref(new Set())
/** The IDs added by the most recent fetch (current batch). */
let currentBatchIds = []
/** Count images in the current batch that we must wait for. */
const batchTotalImages = ref(0)
/** Track how many of those images have fired load/error. */
const batchLoadedImages = ref(0)

function hasPhoto(l) {
  return Boolean(l.photoUrls?.[0] || l.photos?.[0]?.url)
}

function markBatchRevealed(ids) {
  const s = new Set(revealedIds.value)
  ids.forEach(id => s.add(id))
  revealedIds.value = s
  // reset batch counters
  currentBatchIds = []
  batchTotalImages.value = 0
  batchLoadedImages.value = 0
}

function handleImageLoaded(listingId) {
  if (!currentBatchIds.includes(listingId)) return
  batchLoadedImages.value++
  if (batchLoadedImages.value >= batchTotalImages.value && batchTotalImages.value > 0) {
    markBatchRevealed(currentBatchIds)
  }
}

function startProfileListener(uid) {
  if (!uid || profileUnsubs.has(uid)) return
  const unsub = onSnapshot(doc(db, 'users', uid), snap => {
    const data = snap.data() || {}
    const displayName = data.username || data.displayName || ''
    const photoURL    = data.photoURL || data.avatarUrl || data.profilePhoto || ''
    profileMap.value = { ...profileMap.value, [uid]: { displayName, photoURL } }
  })
  profileUnsubs.set(uid, unsub)
}

function attachProfileListeners(rows) {
  const uids = new Set(rows.map(r => r.userId).filter(Boolean))
  uids.forEach(startProfileListener)
}

/* ---------- reload helpers (for filters) ---------- */
function resetPaging() {
  listings.value = []
  lastDoc.value = null
  noMore.value = false
  // reset reveal state
  revealedIds.value = new Set()
  currentBatchIds = []
  batchTotalImages.value = 0
  batchLoadedImages.value = 0
}
function reloadForFilters() {
  loading.value = true
  resetPaging()
  fetchPage()
}

/* watch: whenever categories or search changes, reload first page */
watch(selectedCats, () => {
  reloadForFilters()
}, { deep: true })

watch(searchFilters, () => {
  reloadForFilters()
}, { deep: true })

/* handle search from SearchBar component */
function handleSearch(filters) {
  searchFilters.value = filters
}

/* ---------- listings pagination ---------- */
async function fetchPage () {
  const first = !lastDoc.value
  if (first) loading.value = true; else loadingMore.value = true
  error.value = ''
  try {
    const base = collection(db, 'allListings')
    const parts = []

    // Apply category filter if any (Firestore 'in' supports up to 10 items)
    if (selectedCats.value.includes('Trending')) {
      // "Trending" selected → show all, sorted by viewCount
      parts.push(orderBy('viewCount', 'desc'))
    } 
    else if (selectedCats.value.length > 0) {
      // Filter by selected categories (max 10 for Firestore `in` clause)
      parts.push(where('businessCategory', 'in', selectedCats.value.slice(0, 10)))
    }

    parts.push(orderBy('createdAt','desc'))
    if (lastDoc.value) parts.push(startAfter(lastDoc.value))
    parts.push(limit(pageSize))

    const q = query(base, ...parts)
    const snap = await getDocs(q)
    if (snap.empty) {
      if (first) listings.value = []
      noMore.value = true
      return
    }

    lastDoc.value = snap.docs[snap.docs.length - 1]
    let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    // ----- Client-side filtering by search terms -----
    const bizQuery = searchFilters.value.business.toLowerCase()
    const locQuery = searchFilters.value.location.toLowerCase()

    if (bizQuery || locQuery) {
      rows = rows.filter(r => {
        const name = (r.businessName || '').toLowerCase()
        const desc = (r.businessDesc || '').toLowerCase()
        const location = (r.locationFormatted || r.location?.street || '').toLowerCase()

        const matchesBusiness = !bizQuery || name.includes(bizQuery) || desc.includes(bizQuery)
        const matchesLocation = !locQuery || location.includes(locQuery)

        return matchesBusiness && matchesLocation
      })
    }

    // ----- Batch reveal prep (for *new* rows only) -----
    currentBatchIds = rows.map(r => r.listingId || r.id)
    // Count only listings with a real image to wait for
    batchTotalImages.value = rows.filter(hasPhoto).length
    batchLoadedImages.value = 0

    // If there are no images in this batch, reveal immediately
    if (batchTotalImages.value === 0) {
      markBatchRevealed(currentBatchIds)
    }

    // Merge data and listeners
    listings.value.push(...rows)
    attachProfileListeners(rows)
    rows.forEach(r => fetchLikesCount(r.listingId || r.id))

    // added this to Fetch average rating for each listing (from 'reviews' subcollection)
await Promise.all(rows.map(async (r) => {
  try {
    const listingId = r.listingId || r.id
    const reviewsCol = collection(db, 'allListings', listingId, 'reviews')
    const snap = await getDocs(reviewsCol)

    if (!snap.empty) {
      const ratings = snap.docs.map(d => d.data().rating || 0)
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
      r.rating = Number(avg.toFixed(1))
    } else {
      r.rating = 0
    }
  } catch (err) {
    console.warn('rating fetch failed for', r.id, err)
    r.rating = 0
  }
}))


//added this to debug ratings fetch step
console.log('Loaded listing ratings:', rows.map(r => ({ name: r.businessName, rating: r.rating })));



    if (snap.size < pageSize) noMore.value = true
  } catch (e) {
    console.error(e)
    error.value = 'Failed to load listings.'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

/* ---------- like counts ---------- */
async function fetchLikesCount(listingId) {
  try {
    const col = collection(db, 'listingLikes', listingId, 'users')
    const snap = await getCountFromServer(col)
    likeCounts[listingId] = snap.data().count || 0
  } catch (e) {
    console.warn('likes count error:', listingId, e)
  }
}

/* ---------- likes listener ---------- */
function startLikesListener(user) {
  if (unsubLikes) { unsubLikes(); unsubLikes = null }
  likedSet.value = new Set()
  if (!user) return
  const colRef = collection(db, 'users', user.uid, 'likedListings')
  unsubLikes = onSnapshot(colRef, snap => {
    const s = new Set()
    snap.forEach(d => s.add(d.id))
    likedSet.value = s
  })
}

/* ---------- like toggle ---------- */
async function onToggleLike(listing) {
  const uid = auth.currentUser?.uid
  if (!uid) return alert('Please log in to like.')

  const id = listing.listingId || listing.id
  const userLikeRef   = doc(db, 'users', uid, 'likedListings', id)
  const publicLikeRef = doc(db, 'listingLikes', id, 'users', uid)

  const isLiked = likedSet.value.has(id)
  if (isLiked) likedSet.value.delete(id); else likedSet.value.add(id)
  const prev = likeCounts[id] || 0
  likeCounts[id] = Math.max(0, prev + (isLiked ? -1 : +1))

  try {
    if (isLiked) {
      await Promise.all([ deleteDoc(userLikeRef), deleteDoc(publicLikeRef) ])
    } else {
      const payload = { at: new Date() }
      await Promise.all([ setDoc(userLikeRef, { listingId: id, ...payload }), setDoc(publicLikeRef, payload) ])
    }
  } catch (e) {
    if (isLiked) likedSet.value.add(id); else likedSet.value.delete(id)
    likeCounts[id] = prev
    console.error('like toggle error:', e)
    alert('Could not update like. Please try again.')
  }
}

/* UI actions */
function toggleCategory(name) {
  const s = new Set(selectedCats.value)
  s.has(name) ? s.delete(name) : s.add(name)
  selectedCats.value = [...s]
}
function clearFilters() {
  if (selectedCats.value.length === 0) return
  selectedCats.value = []
}

/* ---------- drawer wiring (ADDED) ---------- */
const drawerOpen          = ref(false)
const drawerListing       = ref(null)
const drawerSellerName    = ref('')
const drawerSellerAvatar  = ref('')

function openDrawer(l) {
  drawerListing.value = l
  const prof = l?.userId ? profileMap.value[l.userId] : null
  drawerSellerName.value   = prof?.displayName || ''
  drawerSellerAvatar.value = prof?.photoURL || ''
  drawerOpen.value = true
}
function closeDrawer() {
  drawerOpen.value = false
  drawerListing.value = null
}

async function incrementViewCount(listingId) {
  const db = getFirestore();
  try {
    // Reference to the document in 'allListings' collection
    const listingDocRef = doc(db, 'allListings', listingId);
    
    // Get the current document to check if viewCount exists
    const docSnap = await getDoc(listingDocRef);

    if (docSnap.exists()) {
      const listingData = docSnap.data();
      if (listingData.viewCount === undefined) {
        // If viewCount doesn't exist, set it to 0 first
        await updateDoc(listingDocRef, {
          viewCount: 0
        });
      }

      // Increment the 'viewCount' field
      await updateDoc(listingDocRef, {
        viewCount: increment(1)  // This will increment the view count by 1
      });

      console.log("View count incremented successfully.");
    } else {
      console.log("Listing document does not exist.");
    }
  } catch (error) {
    console.error("Error incrementing view count: ", error);
  }
}

async function handleListingClick(listingId) {
      try {
        // Increment view count when the listing is clicked
        await this.incrementViewCount(listingId);
      } catch (error) {
        console.error('Error handling listing click:', error);
      }
    }
  

/* ---------- lifecycle ---------- */
onMounted(() => {
  fetchPage()
  unsubAuth = onAuthStateChanged(auth, user => startLikesListener(user))
  const listingId = drawerListing.value?.listingId;  // Or use the relevant listing ID from context
  if (listingId) {
    onViewListing({ id: listingId });  // Call this function to increment the view count
  }
})
onBeforeUnmount(() => {
  if (unsubLikes) unsubLikes()
  if (unsubAuth) unsubAuth()
  profileUnsubs.forEach(unsub => unsub && unsub())
  profileUnsubs.clear()
})
</script>

<template>
  <div class="container-fluid">
    <NavBar />

    <div class="container py-3">
      <SearchBar @search="handleSearch" />
      <div class="categories-row mt-3">
        <Categories :selected="selectedCats" @toggle="toggleCategory" />
      </div>

      <!-- Filter + Reset Buttons -->
<div class="d-flex justify-content-end align-items-center my-3 gap-2">
  <button class="btn btn-outline-primary" @click="filterOpen = true">
    <i class="fas fa-filter me-2"></i> Filter
  </button>
  <button class="btn btn-outline-secondary" @click="resetFilter">
    Reset
  </button>
</div>


      <!-- centered selected chips -->
      <div v-if="selectedCats.length" class="chip-bar my-3">
        <span v-for="c in selectedCats" :key="c" class="chip chip--selected">{{ c }}</span>
        <button class="btn btn-sm chip-clear ms-2" @click="clearFilters">Clear</button>
      </div>
    </div>

    <div class="container pb-5">
      <!-- loading / error -->
      <div v-if="loading" class="d-flex justify-content-center my-5">
        <div class="spinner-border" role="status" aria-label="Loading"></div>
      </div>
      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <!-- listings grid -->
      <div v-else>
        <div class="row g-3 row-cols-2 row-cols-sm-3 row-cols-lg-4 row-cols-xxl-5">
          <div class="col" v-for="l in listings" :key="l.id">
            <div class="card-sm">
              <ListingCard
                :listing="l"
                :liked="likedSet?.has(l.listingId || l.id)"
                :likesCount="likeCounts[l.listingId || l.id] || 0"
                :sellerNameOverride="profileMap[l.userId]?.displayName || ''"
                :sellerAvatarOverride="profileMap[l.userId]?.photoURL || ''"
                :reveal="revealedIds.has(l.listingId || l.id)"
                @toggle-like="onToggleLike"
                @image-loaded="() => handleImageLoaded(l.listingId || l.id)"
                @open="openDrawer(l)" 
                @click="handleListingClick(l.listingId || l.id)" 
              />
            </div>
          </div>
        </div>

        <div v-if="!listings.length" class="text-center text-muted py-5">No listings yet.</div>

        <!-- pagination -->
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

<!-- Slide-in Filter Drawer -->
<div class="filter-drawer" :class="{ open: filterOpen }">
  <div class="drawer-content p-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">Filter Listings</h4>
      <button class="btn-close" @click="filterOpen = false"></button>
    </div>

    <div class="mb-4">
      <label class="form-label fw-semibold">Minimum Likes: {{ minLikes }}</label>
      <input type="range" class="form-range" min="0" max="100" step="1" v-model.number="minLikes" />
    </div>

    <div class="mb-4">
      <label class="form-label fw-semibold">Minimum Rating: {{ minRating }}</label>
      <input type="range" class="form-range" min="0" max="5" step="0.1" v-model.number="minRating" />
    </div>

    <div class="d-flex gap-2">
      <button class="btn btn-primary w-100" @click="applyFilter">Apply</button>
      <button class="btn btn-outline-secondary w-100" @click="resetFilter">Reset</button>
    </div>
  </div>
</div>

<!-- Overlay -->
<div v-if="filterOpen" class="drawer-overlay" @click="filterOpen = false"></div>


    <!-- Drawer (REUSED) -->
    <ListingDrawer
      :open="drawerOpen"
      :listing="drawerListing"
      :sellerName="drawerSellerName"
      :sellerAvatar="drawerSellerAvatar"
      @close="closeDrawer"
    />
  </div>
</template>

<style scoped>
.categories-row {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.25rem;
}
.categories-row :deep(.navbar) {
  flex-wrap: nowrap !important;
  gap: 18px;
}
.categories-row :deep(.category img) {
  width: 110px;
  height: 110px;
}
.categories-row :deep(.category-text) {
  font-size: 0.95rem !important;
}

.chip-bar { text-align: center; }
.chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  margin: 4px;
  border-radius: 999px;
  font-weight: 600;
  line-height: 1;
  border: 1px solid transparent;
  user-select: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.chip:hover:not(.chip--selected) {
  background: var(--color-primary-pale);
  transform: translateY(-1px);
}
.chip--selected {
  background: var(--color-primary);
  color: var(--color-text-white);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}
.chip-clear {
  background: transparent;
  border: 1px solid var(--color-border-purple);
  color: var(--color-primary);
  padding: 6px 12px;
  border-radius: 999px;
  line-height: 1;
  transition: all var(--transition-fast);
}
.chip-clear:hover {
  background: var(--color-primary-pale);
  border-color: var(--color-primary-light);
  color: var(--color-primary-hover);
}

.card-sm :deep(.img-box) { height: 220px !important; }
.card-sm :deep(.card-title) { font-size: 1rem; }
.card-sm :deep(.badge) { font-size: 0.7rem; }
.card-sm :deep(.card-body) { padding: 0.75rem 1rem; }
.card-sm :deep(.card-footer) { padding: 0.5rem 1rem; }

@media (min-width: 992px) {
  .categories-row { scrollbar-width: none; }
  .categories-row::-webkit-scrollbar { display: none; }
}

.filter-drawer {
  position: fixed;
  top: 0;
  right: -75%;
  width: 75%;
  height: 100vh;
  background: #fff;
  box-shadow: -4px 0 15px rgba(0, 0, 0, 0.2);
  transition: right 0.35s ease;
  z-index: 1050;
  overflow-y: auto;
  border-radius: 12px 0 0 12px;
}
.filter-drawer.open {
  right: 0;
}
.drawer-content {
  max-width: 600px;
  margin: 0 auto;
}
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1040;
}

input[type='range'] {
  width: 100%;
  accent-color: #7a5af8;
  cursor: pointer;
}

@media (max-width: 767.98px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .filter-drawer {
    width: 90%;
    right: -90%;
  }

  .row-cols-2 {
    --bs-columns: 1;
  }

  .card-sm :deep(.img-box) {
    height: 180px !important;
  }

  .chip-bar {
    font-size: 0.875rem;
  }

  .chip {
    padding: 5px 10px;
    font-size: 0.813rem;
  }
}

@media (max-width: 575.98px) {
  .filter-drawer {
    width: 100%;
    right: -100%;
    border-radius: 0;
  }

  .card-sm :deep(.img-box) {
    height: 160px !important;
  }

  .btn {
    font-size: 0.813rem;
    padding: 0.4rem 0.75rem;
  }

  .container {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .py-3 {
    padding-top: 0.75rem !important;
    padding-bottom: 0.75rem !important;
  }
}

</style>
