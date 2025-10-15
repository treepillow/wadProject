<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  collection, query, orderBy, limit, getDocs, startAfter,
  doc, setDoc, deleteDoc, onSnapshot,
  collectionGroup, getCountFromServer, where
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '@/firebase'

import NavBar from './NavBar.vue'
import SearchBar from './SearchBar.vue'
import Categories from './Categories.vue'
import ListingCard from './ListingCard.vue'

/* ---------- state ---------- */
const listings     = ref([])
const loading      = ref(true)
const loadingMore  = ref(false)
const error        = ref('')
const pageSize     = 12
const lastDoc      = ref(null)
const noMore       = ref(false)

/* likes: state + listeners */
const likedSet     = ref(new Set())      // which listings current user liked
let unsubLikes     = null
let unsubAuth      = null

/* like counts per listing (aggregated) */
const likeCounts   = ref(new Map())      // listingId -> number

/* seller names (live), with unsub per uid */
const profileMap   = ref({})             // uid -> { displayName }
const profileUnsubs = new Map()          // uid -> unsubscribe

/* ---------- helpers ---------- */
async function fetchLikesCount(listingId) {
  try {
    const cg = collectionGroup(db, 'likedListings')
    const q = query(cg, where('listingId', '==', listingId))
    const snap = await getCountFromServer(q)
    likeCounts.value.set(listingId, snap.data().count || 0)
  } catch (e) {
    // non-fatal; keep quiet in prod
    console.warn('likes count error:', listingId, e)
  }
}

function startProfileListener(uid) {
  if (!uid || profileUnsubs.has(uid)) return
  const unsub = onSnapshot(doc(db, 'users', uid), snap => {
    const data = snap.data() || {}
    const displayName = data.username || data.displayName || ''
    profileMap.value = { ...profileMap.value, [uid]: { displayName } }
  })
  profileUnsubs.set(uid, unsub)
}

function attachProfileListeners(rows) {
  const uids = new Set(rows.map(r => r.userId).filter(Boolean))
  uids.forEach(startProfileListener)
}

/* ---------- listings pagination ---------- */
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
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    // push rows
    listings.value.push(...rows)

    // start live username listeners
    attachProfileListeners(rows)

    // fetch like counts (non-blocking)
    Promise.all(rows.map(r => fetchLikesCount(r.listingId || r.id))).catch(()=>{})
    if (snap.size < pageSize) noMore.value = true
  } catch (e) {
    console.error(e)
    error.value = 'Failed to load listings.'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

/* ---------- likes (for current user) ---------- */
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

async function onToggleLike(listing) {
  const uid = auth.currentUser?.uid
  if (!uid) return alert('Please log in to like.')

  const id = listing.listingId || listing.id
  const refDoc = doc(db, 'users', uid, 'likedListings', id)
  const isLiked = likedSet.value.has(id)

  // optimistic state
  if (isLiked) likedSet.value.delete(id); else likedSet.value.add(id)
  const prevCount = likeCounts.value.get(id) || 0
  likeCounts.value.set(id, Math.max(0, prevCount + (isLiked ? -1 : +1)))

  try {
    if (isLiked) await deleteDoc(refDoc)
    else await setDoc(refDoc, { listingId: id, at: new Date() })
  } catch (e) {
    // revert
    if (isLiked) likedSet.value.add(id); else likedSet.value.delete(id)
    likeCounts.value.set(id, prevCount)
    console.error('like toggle error:', e)
    alert('Could not update like. Please try again.')
  }
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
        <Categories />
      </div>
    </div>

    <div class="container pb-5">
      <!-- loading / error -->
      <div v-if="loading" class="d-flex justify-content-center my-5">
        <div class="spinner-border" role="status" aria-label="Loading"></div>
      </div>
      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <!-- grid -->
      <div v-else>
        <div v-if="listings.length" class="row g-3 row-cols-2 row-cols-sm-3 row-cols-lg-4 row-cols-xxl-5">
          <div class="col" v-for="l in listings" :key="l.id">
            <div class="card-sm">
              <ListingCard
                :listing="l"
                :liked="likedSet.has(l.listingId || l.id)"
                :likesCount="(likeCounts.get(l.listingId || l.id) || 0)"
                :sellerNameOverride="profileMap[l.userId]?.displayName || ''"
                @toggle-like="onToggleLike"
              />
            </div>
          </div>
        </div>

        <div v-else class="text-center text-muted py-5">No listings yet.</div>

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
  </div>
</template>

<style scoped>
/* keep Categories in a single row with horizontal scroll on small screens */
.categories-row { overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:.25rem; }
.categories-row :deep(.navbar){ flex-wrap:nowrap !important; gap:18px; }
.categories-row :deep(.category img){ width:110px; height:110px; }
.categories-row :deep(.category-text){ font-size:.95rem !important; }

/* make cards a bit denser without touching the Card component internals */
.card-sm :deep(.img-box){ height:220px !important; }
.card-sm :deep(.card-img-top){ height:220px !important; } /* fallback if used */
.card-sm :deep(.card-title){ font-size:1rem; }
.card-sm :deep(.badge){ font-size:.7rem; }
.card-sm :deep(.card-body){ padding:.75rem 1rem; }
.card-sm :deep(.card-footer){ padding:.5rem 1rem; }

.object-fit-cover{ object-fit:cover; }

@media (min-width:992px){
  .categories-row{ scrollbar-width:none; }
  .categories-row::-webkit-scrollbar{ display:none; }
}
</style>
