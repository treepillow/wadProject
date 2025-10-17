<script setup>
import StartChatButton from './StartChatButton.vue'
import { computed, ref, onMounted, reactive } from 'vue'
import { db } from '@/firebase'
import { collection, query, getDocs } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

/* ---------------- AUTH ---------------- */
const auth = getAuth()
const $auth = reactive({ currentUser: auth.currentUser })
onAuthStateChanged(auth, (u) => { $auth.currentUser = u })

/* ---------------- PROPS + EMITS ---------------- */
const props = defineProps({
  listing: { type: Object, required: true },
  liked: { type: Boolean, default: false },
  likesCount: { type: Number, default: 0 },
  sellerNameOverride: { type: String, default: '' },
  sellerAvatarOverride: { type: String, default: '' },
  reveal: { type: Boolean, default: true } // for batch reveal fade-in
})
const emit = defineEmits(['toggle-like', 'image-loaded', 'open'])

/* ---------------- RATINGS ---------------- */
const avgRating = ref(0)
const totalReviews = ref(0)

async function fetchRating() {
  try {
    const listingId = props.listing.listingId || props.listing.id
    if (!listingId) return

    const reviewsRef = collection(db, 'allListings', listingId, 'reviews')
    const snapshot = await getDocs(query(reviewsRef))

    if (snapshot.empty) {
      avgRating.value = 0
      totalReviews.value = 0
      return
    }

    let totalRating = 0
    snapshot.forEach(doc => {
      const data = doc.data()
      totalRating += (data.rating || 0)
    })

    totalReviews.value = snapshot.size
    avgRating.value = totalReviews.value > 0 ? totalRating / totalReviews.value : 0
  } catch (e) {
    console.warn('Failed to fetch rating for listing:', e)
  }
}

onMounted(() => {
  fetchRating()
})

/* ---------------- LISTING DATA ---------------- */
const photo = computed(() =>
  props.listing.photoUrls?.[0] || props.listing.photos?.[0]?.url || null
)
const firstPrice = computed(() => props.listing.menu?.[0]?.price ?? null)

const sellerName = computed(() =>
  props.sellerNameOverride ||
  props.listing.userDisplayName ||
  props.listing.username ||
  props.listing.ownerName ||
  (props.listing.userId ? `user_${props.listing.userId.slice(0,6)}` : 'Seller')
)

const sellerAvatar = computed(() =>
  props.sellerAvatarOverride || props.listing.userPhotoURL || ''
)

/* ---------------- IMAGE LOADING ---------------- */
const imgLoaded = ref(false)
const imgErrored = ref(false)
function onImgLoad () {
  imgLoaded.value = true
  emit('image-loaded', props.listing.listingId || props.listing.id)
}
function onImgError() {
  imgErrored.value = true
  emit('image-loaded', props.listing.listingId || props.listing.id)
}

/* ---------------- BOOST COUNTDOWN ---------------- */
const boostCountdown = computed(() => {
  let ts = props.listing.boostedUntil
  if (!ts) return null

  // Handle Firestore REST format: { timestampValue: "..." }
  if (ts.timestampValue) ts = ts.timestampValue

  const target = typeof ts === 'object' && ts.seconds ? ts.seconds * 1000 : Date.parse(ts)
  if (!target || isNaN(target)) return null

  const diff = target - Date.now()
  if (diff <= 0) return 'Expired'

  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
})
</script>

<template>
  <div
    class="card h-100 shadow-sm selectable"
    :class="{ 'reveal-in': reveal }"
    @click="emit('open', listing)"
  >
    <!-- Header -->
    <div class="card-header bg-transparent border-0 pb-0 d-flex align-items-center gap-2">
      <div class="avatar-box rounded-circle overflow-hidden d-inline-block" style="width:28px;height:28px;">
        <img v-if="sellerAvatar" :src="sellerAvatar" alt="avatar" class="w-100 h-100" style="object-fit:cover;">
        <div v-else class="w-100 h-100 d-flex align-items-center justify-content-center bg-secondary-subtle text-secondary small">
          {{ (sellerName || 'S').toString().trim().charAt(0).toUpperCase() }}
        </div>
      </div>
      <span class="fw-semibold small text-truncate" style="max-width:140px" :title="sellerName">{{ sellerName }}</span>
    </div>

    <!-- Image box -->
    <div class="px-3 pt-2">
      <div class="img-box rounded-4 overflow-hidden position-relative">
        <!-- Skeleton placeholder -->
        <div v-if="!imgLoaded && !imgErrored" class="skeleton"></div>

        <!-- Actual image -->
        <img
          v-if="photo && !imgErrored"
          :src="photo"
          :alt="listing.businessName"
          class="img-cover"
          loading="lazy"
          decoding="async"
          @load="onImgLoad"
          @error="onImgError"
          :class="{ 'img-visible': imgLoaded }"
        />

        <!-- Fallback -->
        <div v-if="!photo || imgErrored" class="img-fallback">No photo</div>
      </div>
    </div>

    <!-- Content -->
    <div class="card-body d-flex flex-column">
      <h6 class="card-title mb-1 text-truncate" :title="listing.businessName">{{ listing.businessName }}</h6>

      <!-- Rating Display -->
      <div v-if="totalReviews > 0" class="rating-display mb-2">
        <div class="stars-small">
          <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.round(avgRating) }">★</span>
        </div>
        <span class="rating-text">{{ avgRating.toFixed(1) }} ({{ totalReviews }})</span>
      </div>
      <div v-else class="rating-display mb-2">
        <span class="text-muted small">No reviews yet</span>
      </div>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <div class="fw-bold">
          <span v-if="firstPrice">S${{ firstPrice }}</span>
        </div>
        <span class="badge text-bg-primary">{{ listing.businessCategory }}</span>
      </div>

      <!-- Boost Countdown -->

      <div class="mt-auto"></div>
    </div>

    <!-- Footer -->
    <div class="card-footer bg-transparent d-flex justify-content-between align-items-center">
      <div class="d-flex align-items-center gap-2">
        <span class="small text-muted">{{ likesCount }}</span>
        <button
          class="btn btn-sm"
          :class="liked ? 'btn-danger' : 'btn-outline-danger'"
          @click.stop="emit('toggle-like', listing)"
          aria-label="Toggle like"
        >♥</button>
      </div>
      <div class="d-flex gap-2">
        <!-- ✅ Only show StartChatButton if this is NOT your own listing -->
        <StartChatButton
          v-if="listing.userId !== $auth?.currentUser?.uid"
          :targetUserId="listing.userId"
          @click.stop
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.selectable { cursor: pointer; }
.reveal-in { animation: fadeIn .35s ease both; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }

.img-box { height: 220px; position: relative; background: #f8f9fa; border-radius: 0.75rem; overflow: hidden; }
.img-cover { width: 100%; height: 100%; object-fit: cover; object-position: center; opacity: 0; transition: opacity 0.4s ease; }
.img-visible { opacity: 1; }
.skeleton { position: absolute; inset: 0; background: linear-gradient(90deg,#eee 0%,#f5f5f5 20%,#eee 40%,#eee 100%); background-size:200% 100%; animation: shimmer 1.1s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
.img-fallback { position:absolute; inset:0; background:#f0f2f5; color:#999; display:flex; justify-content:center; align-items:center; }

/* Rating Display */
.rating-display { display: flex; align-items: center; gap: 6px; }
.stars-small { display: flex; gap: 1px; }
.stars-small .star { color: #ddd; font-size: 14px; }
.stars-small .star.filled { color: #ffc107; }
.rating-text { font-size: 0.85rem; font-weight: 600; color: #666; }

.boost-timer {
  background: #f7f4ff;
  border-radius: 6px;
  padding: 4px 8px;
  display: inline-block;
}
</style>
