<script setup>
import { computed } from 'vue'

const props = defineProps({ listing: { type: Object, required: true } })

const photo = computed(() =>
  (props.listing.photoUrls && props.listing.photoUrls[0]) ||
  (props.listing.photos && props.listing.photos[0]?.url) || null
)
const firstPrice = computed(() => props.listing.menu?.[0]?.price ?? null)
const addr = computed(() =>
  props.listing.locationFormatted ??
  (props.listing.location
    ? `BLK ${props.listing.location.blk} ${props.listing.location.street} Singapore ${props.listing.location.postal} ${props.listing.location.unit}`
    : '')
)
</script>

<template>
  <div class="card h-100 shadow-sm">
    <img v-if="photo" :src="photo" class="card-img-top object-fit-cover" style="height:180px" :alt="listing.businessName" />
    <div v-else class="bg-light d-flex align-items-center justify-content-center" style="height:180px">
      <span class="text-muted">No photo</span>
    </div>

    <div class="card-body d-flex flex-column">
      <div class="d-flex justify-content-between align-items-start">
        <h5 class="card-title mb-1">{{ listing.businessName }}</h5>
        <span class="badge text-bg-primary">{{ listing.businessCategory }}</span>
      </div>
      <p class="card-text text-muted mb-2">
        {{ (listing.businessDesc || '').slice(0,90) }}<span v-if="(listing.businessDesc||'').length>90">…</span>
      </p>
      <div class="mt-auto">
        <div v-if="firstPrice" class="fw-semibold mb-1">From ${{ firstPrice }}</div>
        <div class="small text-secondary">{{ addr }}</div>
      </div>
    </div>

    <div class="card-footer bg-white">
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary flex-grow-1" type="button">View</button>
        <button class="btn btn-sm btn-outline-secondary" type="button">Share</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.object-fit-cover{object-fit:cover}
</style>
