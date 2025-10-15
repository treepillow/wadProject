<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { db } from '@/firebase'
import {
  collection, query, where, limit as fsLimit, getDocs,
  doc, updateDoc
} from 'firebase/firestore'

const props = defineProps({
  open: { type: Boolean, default: false },
  listing: { type: Object, default: null },
  sellerName: { type: String, default: '' },
  sellerAvatar: { type: String, default: '' },
  radiusM: { type: Number, default: 3000 },
  nearbyCap: { type: Number, default: 60 },
  cacheGeocode: { type: Boolean, default: true },
})

const emit = defineEmits(['close'])

/* Esc to close */
function onEsc(e){ if (e.key === 'Escape') emit('close') }
onMounted(() => document.addEventListener('keydown', onEsc))
onBeforeUnmount(() => document.removeEventListener('keydown', onEsc))

/* Hours helpers */
const DAY_LABEL = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun' }
const dayKeys = ['mon','tue','wed','thu','fri','sat','sun']
function isStructuredHours(v){ return v && typeof v === 'object' && !Array.isArray(v) }
function fmt(h){
  if (!h || h.closed) return 'Closed'
  if (h.open && h.close) return `${h.open} – ${h.close}`
  return ''
}

/* Active business (changes when clicking map markers) */
const active = ref(null)
watch(() => props.listing, (v)=> { active.value = v || null }, { immediate: true })

/* Photos from active */
const photos = computed(() => {
  const L = active.value
  if (!L) return []
  // prefer photoUrls; fall back to photos[]
  const urls = (Array.isArray(L.photoUrls) && L.photoUrls.length)
    ? [...L.photoUrls]
    : (Array.isArray(L.photos) ? L.photos.map(p => p?.url).filter(Boolean) : [])
  const seen = new Set()
  return urls.filter(u => u && !seen.has(u) && (seen.add(u), true))
})

/* Map state */
const mapEl = ref(null)
let map = null
let markers = []
let infoWindow = null
let geocoder = null
const geoCache = new Map()

/* Load Maps JS once */
let mapsLoadingPromise
function loadGoogleMaps() {
  if (typeof window !== 'undefined' && window.google?.maps) return Promise.resolve()
  if (mapsLoadingPromise) return mapsLoadingPromise
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) {
    console.warn('Missing VITE_GOOGLE_MAPS_API_KEY')
    return Promise.resolve()
  }
  mapsLoadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google Maps JS'))
    document.head.appendChild(s)
  })
  return mapsLoadingPromise
}

/* Geocode helpers */
async function getLatLngForListing(L) {
  if (!L) return null
  if (L.geo?.lat && L.geo?.lng) return { lat: L.geo.lat, lng: L.geo.lng }

  const addr = L.locationFormatted
    || (L.location
        ? `BLK ${L.location?.blk || ''} ${L.location?.street || ''} Singapore ${L.location?.postal || ''} ${L.location?.unit || ''}`.trim()
        : null)
  if (!addr) return null

  const cacheKey = `addr:${addr}`
  if (geoCache.has(cacheKey)) return geoCache.get(cacheKey)

  if (!window.google?.maps) return null
  if (!geocoder) geocoder = new window.google.maps.Geocoder()
  const res = await geocoder.geocode({ address: addr })
  const g = res?.results?.[0]?.geometry?.location
  if (!g) return null
  const pair = { lat: g.lat(), lng: g.lng() }
  geoCache.set(cacheKey, pair)

  try {
    if (props.cacheGeocode && L.listingId) {
      await updateDoc(doc(db, 'allListings', L.listingId), { geo: pair })
    }
  } catch (_) { /* ignore write errors */ }

  return pair
}

function distM(a, b) {
  const R = 6371e3
  const φ1 = a.lat * Math.PI/180, φ2 = b.lat * Math.PI/180
  const Δφ = (b.lat - a.lat) * Math.PI/180
  const Δλ = (b.lng - a.lng) * Math.PI/180
  const s = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2
  return 2*R*Math.asin(Math.sqrt(s))
}

const gmapsLink = computed(() => {
  const L = active.value
  if (!L) return '#'
  const addr = L.locationFormatted
    || (L.location
        ? `BLK ${L.location?.blk || ''} ${L.location?.street || ''} Singapore ${L.location?.postal || ''} ${L.location?.unit || ''}`.trim()
        : L.businessName)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr || L.businessName)}`
})

/* Nearby */
const nearby = ref([])
const loadingNearby = ref(false)
const errorNearby = ref('')

async function fetchNearby(centerLL, category) {
  if (!centerLL || !category) { nearby.value = []; return }
  loadingNearby.value = true
  errorNearby.value = ''
  try {
    const qy = query(
      collection(db, 'allListings'),
      where('businessCategory', '==', category),
      fsLimit(props.nearbyCap)
    )
    const snap = await getDocs(qy)
    const raw = []
    snap.forEach(d => raw.push({ listingId: d.id, ...d.data() }))

    const withGeo = []
    for (const L of raw) {
      try {
        const ll = await getLatLngForListing(L)
        if (ll) withGeo.push({ ...L, geo: ll })
      } catch (_) {}
    }

    const within = withGeo
      .filter(L => L.listingId !== props.listing?.listingId)
      .map(L => ({ ...L, _distanceM: distM(centerLL, L.geo) }))
      .filter(L => L._distanceM <= props.radiusM)
      .sort((a,b) => a._distanceM - b._distanceM)

    nearby.value = within
  } catch (e) {
    errorNearby.value = e?.message || String(e)
    nearby.value = []
  } finally {
    loadingNearby.value = false
  }
}

/* Build / refresh map + markers */
async function initMapAndMarkers() {
  if (!props.open) return
  if (!mapEl.value) return
  if (!window.google?.maps) return

  const center = await getLatLngForListing(props.listing)
  if (!center) return

  // Create or re-create map
  if (!map) {
    map = new window.google.maps.Map(mapEl.value, {
      center, zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })
    infoWindow = new window.google.maps.InfoWindow()
  } else {
    map.setCenter(center)
  }

  // Clear markers
  markers.forEach(m => m.setMap(null))
  markers = []

  // Current listing marker
  const currentMarker = new window.google.maps.Marker({
    position: center, map,
    title: props.listing?.businessName || 'Current',
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8, fillColor: '#0d6efd', fillOpacity: 1,
      strokeColor: '#fff', strokeWeight: 2
    }
  })
  markers.push(currentMarker)

  // Nearby markers
  for (const L of nearby.value) {
    const m = new window.google.maps.Marker({
      position: L.geo, map,
      title: L.businessName || 'Listing'
    })
    m.addListener('click', () => {
      active.value = L
      infoWindow.setContent(
        `<div style="font-size:13px;"><strong>${escapeHtml(L.businessName||'Listing')}</strong><br>${escapeHtml(L.businessCategory||'')}</div>`
      )
      infoWindow.open({ map, anchor: m })
    })
    markers.push(m)
  }

  // Ensure map lays out correctly after transition
  setTimeout(() => window.google.maps.event.trigger(map, 'resize'), 50)
}

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))
}

/* Orchestration */
async function refreshAll() {
  if (!props.open || !props.listing) return
  await loadGoogleMaps().catch(()=>{})
  if (window.google && !geocoder) geocoder = new window.google.maps.Geocoder()

  const center = await getLatLngForListing(props.listing)
  if (!center) return

  await fetchNearby(center, props.listing.businessCategory)
  await initMapAndMarkers()
}

/* Watchers */
watch([() => props.open, () => props.listing?.listingId], async ([isOpen]) => {
  if (isOpen) {
    active.value = props.listing || null
    await nextTick()          // wait for panel DOM
    setTimeout(refreshAll, 10)
  } else {
    // TEARDOWN (fixes "map not appearing again" on re-open)
    if (infoWindow) { try { infoWindow.close() } catch(_){} }
    infoWindow = null
    markers.forEach(m => m.setMap(null))
    markers = []
    map = null
    // do not clear geocoder/geoCache; re-use across opens
  }
})

/* Resize */
function handleResize(){ if (map && window.google?.maps) window.google.maps.event.trigger(map, 'resize') }
onMounted(() => window.addEventListener('resize', handleResize))
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  // final teardown
  if (infoWindow) { try { infoWindow.close() } catch(_){} }
  infoWindow = null
  markers.forEach(m => m.setMap(null))
  markers = []
  map = null
})
</script>

<template>
  <!-- Backdrop -->
  <transition name="fade">
    <div v-if="open" class="drawer-backdrop" @click="$emit('close')" />
  </transition>

  <!-- Panel -->
  <transition name="slide">
    <aside v-if="open" class="drawer-panel">
      <button class="btn-close close-btn" aria-label="Close" @click="$emit('close')" />

      <!-- Header -->
      <div class="header d-flex align-items-center gap-3 mb-3">
        <div class="rounded-circle overflow-hidden avatar">
          <img v-if="sellerAvatar" :src="sellerAvatar" class="w-100 h-100" style="object-fit:cover" alt="">
          <div v-else class="w-100 h-100 d-flex align-items-center justify-content-center bg-secondary-subtle text-secondary fw-bold">
            {{ (sellerName||'S').toString().trim().charAt(0).toUpperCase() }}
          </div>
        </div>
        <div class="flex-grow-1">
          <div class="fw-semibold small text-muted">Seller</div>
          <div class="fw-semibold">{{ sellerName || 'Seller' }}</div>
        </div>
        <span class="badge text-bg-primary">{{ active?.businessCategory || listing?.businessCategory }}</span>
      </div>

      <!-- Title row -->
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h4 class="mb-0 truncate">{{ active?.businessName || listing?.businessName }}</h4>
        <a class="btn btn-outline-primary btn-sm" :href="gmapsLink" target="_blank" rel="noopener">
          View in Google Maps
        </a>
      </div>

      <!-- Two-column layout -->
      <div class="grid">
        <!-- Left -->
        <section class="left">
          <div class="map" ref="mapEl">
            <div v-if="!active" class="map-fallback">Loading map…</div>
          </div>

          <div class="nearby card">
            <div class="card-body p-2">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="m-0">Nearby in category</h6>
                <small class="text-muted" v-if="active">within ~{{ Math.round(radiusM/1000) }}km</small>
              </div>

              <div v-if="loadingNearby" class="small text-muted">Loading nearby…</div>
              <div v-else-if="errorNearby" class="small text-danger">{{ errorNearby }}</div>
              <ul v-else class="list-unstyled m-0 nearby-list">
                <li v-for="n in nearby" :key="n.listingId"
                    :class="['nearby-item', {'is-active': n.listingId === active?.listingId}]"
                    @click="active = n">
                  <div class="d-flex align-items-center gap-2">
                    <img v-if="(n.photoUrls && n.photoUrls[0]) || (n.photos && n.photos[0]?.url)"
                         :src="n.photoUrls?.[0] || n.photos?.[0]?.url"
                         class="thumb" alt="">
                    <div class="flex-grow-1">
                      <div class="fw-semibold small truncate">{{ n.businessName }}</div>
                      <div class="xsmall text-muted">{{ (n._distanceM/1000).toFixed(2) }} km</div>
                    </div>
                  </div>
                </li>
                <li v-if="!nearby.length" class="small text-muted px-2 py-1">No nearby businesses found.</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Right -->
        <section class="right">
          <!-- Gallery -->
          <div v-if="photos?.length" class="gallery mb-3">
            <img v-for="(p,i) in photos" :key="i" :src="p" class="gallery-img" :alt="`photo-${i+1}`" />
          </div>

          <!-- Menu / Services -->
          <div v-if="active?.menu?.length" class="mb-3">
            <h6 class="section-title">Menu / Services</h6>
            <ul class="list-unstyled small m-0">
              <li v-for="(m,i) in active.menu" :key="i" class="d-flex justify-content-between border-bottom py-1">
                <span>{{ m.name }}</span>
                <strong v-if="m.price">S${{ m.price }}</strong>
              </li>
            </ul>
          </div>

          <!-- Description -->
          <div v-if="active?.businessDesc" class="mb-3">
            <h6 class="section-title">Description</h6>
            <p class="mb-0">{{ active.businessDesc }}</p>
          </div>

          <!-- Operating hours -->
          <div v-if="active?.operatingHours" class="mb-3">
            <h6 class="section-title">Operating Hours</h6>
            <div v-if="isStructuredHours(active.operatingHours)" class="oh-table small">
              <div class="oh-row" v-for="k in dayKeys" :key="k">
                <div class="oh-day">{{ DAY_LABEL[k] }}</div>
                <div class="oh-time">{{ fmt(active.operatingHours[k]) }}</div>
              </div>
            </div>
            <pre v-else class="small mb-0">{{ active.operatingHours }}</pre>
          </div>

          <!-- Location -->
          <div v-if="active?.locationFormatted || active?.location" class="mb-2">
            <h6 class="section-title">Location</h6>
            <div class="small">
              {{ active.locationFormatted ||
                 `BLK ${active.location?.blk} ${active.location?.street} Singapore ${active.location?.postal} ${active.location?.unit || ''}` }}
            </div>
          </div>
        </section>
      </div>
    </aside>
  </transition>
</template>

<style scoped>
.drawer-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(1px);
  z-index: 1050;
}
.drawer-panel {
  position: fixed; top: 0; right: 0; height: 100vh;
  width: min(1040px, 100vw);
  background: rgb(245, 239, 239);
  z-index: 1060;
  box-shadow: -10px 0 35px rgba(0,0,0,.18);
  padding: 22px 24px;
  overflow-y: auto;
  border-top-left-radius: 14px;
  border-bottom-left-radius: 14px;
}
.close-btn { position: absolute; top: 12px; right: 12px; }
.header .avatar { width:42px; height:42px; border:1px solid #eee; }
.truncate { max-width: 62ch; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
@media (max-width: 980px){ .grid { grid-template-columns: 1fr; } }
.left .map {
  width: 100%; height: 360px;
  border-radius: 12px; border: 1px solid #e9ecef; overflow: hidden; margin-bottom: 10px;
}
.map-fallback { width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; color:#777; font-size: .9rem; }
.nearby .nearby-list { max-height: 240px; overflow:auto; }
.nearby-item { padding: 6px 8px; border-radius: 10px; border:1px solid transparent; cursor: pointer; }
.nearby-item:hover { background:#fafafa; border-color:#eee; }
.nearby-item.is-active { background:#f0f6ff; border-color:#cfe2ff; }
.thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 8px; border:1px solid #eee; }
.xsmall { font-size: .75rem; }
.section-title { color:#6c757d; margin-bottom: .4rem; }
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.gallery-img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 10px; border: 1px solid #eee; }
.oh-table { display: grid; gap: 6px; }
.oh-row { display:flex; justify-content:space-between; border-bottom:1px dashed #eee; padding-bottom:4px; }
.oh-day { width:64px; color:#666; }
.oh-time { font-weight:600; }
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform .22s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
</style>
