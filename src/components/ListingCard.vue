<script setup>

import StartChatButton from './StartChatButton.vue'
import { computed } from 'vue'

const props = defineProps({
  listing: { type: Object, required: true },
  liked: { type: Boolean, default: false },
  likesCount: { type: Number, default: 0 },
  sellerNameOverride: { type: String, default: '' },
  sellerAvatarOverride: { type: String, default: '' }   // <— NEW
})
const emit = defineEmits(['toggle-like'])

const photo = computed(() =>
  (props.listing.photoUrls?.[0]) ||
  (props.listing.photos?.[0]?.url) || null
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
  props.sellerAvatarOverride ||
  props.listing.userPhotoURL ||   // if you stored it on the listing
  ''
)
</script>

<template>
  <div class="card h-100 shadow-sm">
    <!-- Header with avatar + name -->
    <div class="card-header bg-transparent border-0 pb-0 d-flex align-items-center gap-2">
      <div class="avatar-box rounded-circle overflow-hidden d-inline-block" style="width:28px;height:28px;">
        <img v-if="sellerAvatar" :src="sellerAvatar" alt="avatar" class="w-100 h-100" style="object-fit:cover;">
        <div v-else class="w-100 h-100 d-flex align-items-center justify-content-center bg-secondary-subtle text-secondary small">
          {{ (sellerName || 'S').toString().trim().charAt(0).toUpperCase() }}
        </div>
      </div>
      <span class="fw-semibold small text-truncate" style="max-width: 140px;" :title="sellerName">{{ sellerName }}</span>
    </div>

    <!-- Image -->
    <div class="px-3 pt-2">
      <div class="img-box rounded" style="height: 220px; background:#f8f9fa;">
        <img v-if="photo" :src="photo" :alt="listing.businessName" class="w-100 h-100" style="object-fit: contain;" />
        <div v-else class="w-100 h-100 d-flex align-items-center justify-content-center text-muted">No photo</div>
      </div>
    </div>

    <div class="card-body d-flex flex-column">
      <h6 class="card-title mb-1 text-truncate" :title="listing.businessName">{{ listing.businessName }}</h6>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <div class="fw-bold"><span v-if="firstPrice">S${{ firstPrice }}</span></div>
        <span class="badge text-bg-primary">{{ listing.businessCategory }}</span>
      </div>

      <div class="mt-auto"></div>
    </div>

<<<<<<< HEAD
    <div class="card-footer bg-transparent d-flex justify-content-end align-items-center gap-2">
        <span class="small text-muted">{{ likesCount }}</span>
      <button
        class="btn btn-sm"
        :class="liked ? 'btn-danger' : 'btn-outline-danger'"
        type="button"
        @click="emit('toggle-like', listing)"
        aria-label="Like"
        title="Like"
      >
        ♥
      </button>
=======
    <div class="card-footer bg-white">
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary flex-grow-1" type="button">View</button>
        <StartChatButton :targetUserId="listing.userId" />
      </div>
>>>>>>> e7eb7f9 (chatbox+listingabit)
    </div>
  </div>
</template>

<style scoped>
.img-box { overflow: hidden; }
</style>
