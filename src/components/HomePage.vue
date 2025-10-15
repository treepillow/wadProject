<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  collection, query, orderBy, limit, getDocs, startAfter,
  doc, setDoc, deleteDoc, onSnapshot, where,
  getCountFromServer
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '@/firebase'

import NavBar from './NavBar.vue'
import SearchBar from './SearchBar.vue'
import Categories from './Categories.vue'
import ListingCard from './ListingCard.vue'
import ListingDrawer from './ListingDrawer.vue' // <-- ADDED

/* ---------- state ---------- */
const listings     = ref([])
const loading      = ref(true)
const loadingMore  = ref(false)
const error        = ref('')
const pageSize     = 12
const lastDoc      = ref(null)
const noMore       = ref(false)

/* filters (multi-select categories) */
const selectedCats = ref([])

/* likes: state + listeners */
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
  // Count only if this listing belongs to the current batch and has a photo
  if (!currentBatchIds.includes(listingId)) return
  batchLoadedImages.value++
  if (batchLoadedImages.value >= batchTotalImages.value && batchTotalImages.value > 0) {
    markBatchRevealed(currentBatchIds)
  }
}

/* ---------- helpers ---------- */
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

/* watch: whenever categories change, reload first page */
watch(selectedCats, () => {
  reloadForFilters()
}, { deep: true })

/* ---------- listings pagination ---------- */
async function fetchPage () {
  const first = !lastDoc.value
  if (first) loading.value = true; else loadingMore.value = true
  error.value = ''
  try {
    const base = collection(db, 'allListings')
    const parts = []

    // Apply category filter if any (Firestore 'in' supports up to 10 items)
    if (selectedCats.value.length > 0) {
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
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))

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

/* ---------- lifecycle ---------- */
onMounted(() => {
  fetchPage()
  unsubAuth = onAuthStateChanged(auth, user => startLikesListener(user))
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
      <SearchBar />
      <div class="categories-row mt-3">
        <Categories :selected="selectedCats" @toggle="toggleCategory" />
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
/* categories horizontal scroll */
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

/* centered chips */
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
}
.chip--selected {
  background: #7a5af8;
  color: #fff;
  border-color: #7a5af8;
  box-shadow: 0 2px 10px rgba(122,90,248,.25);
}
.chip-clear {
  background: transparent;
  border: 1px solid #d9c9ff;
  color: #7a5af8;
  padding: 6px 12px;
  border-radius: 999px;
  line-height: 1;
}
.chip-clear:hover {
  background: #f3efff;
  border-color: #c7b4ff;
  color: #5b3fe8;
}

/* layout tweaks */
.card-sm :deep(.img-box) { height: 220px !important; }
.card-sm :deep(.card-title) { font-size: 1rem; }
.card-sm :deep(.badge) { font-size: 0.7rem; }
.card-sm :deep(.card-body) { padding: 0.75rem 1rem; }
.card-sm :deep(.card-footer) { padding: 0.5rem 1rem; }

@media (min-width: 992px) {
  .categories-row { scrollbar-width: none; }
  .categories-row::-webkit-scrollbar { display: none; }
}
</style>
