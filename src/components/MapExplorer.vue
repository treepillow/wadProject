<template>
  <Teleport to="body">
    <Transition name="map-explorer">
      <div v-if="isOpen" class="map-explorer-overlay" @click="closeExplorer">
        <div class="map-explorer-container" @click.stop>
          <!-- Header -->
          <div class="map-header">
            <button class="close-btn" @click="closeExplorer">
              <Icon icon="mdi:close" />
            </button>

            <!-- Category Filter Pills -->
            <div class="category-pills">
              <button
                :class="['category-pill', { active: selectedCategory === null }]"
                @click="selectCategory(null)"
              >
                <Icon icon="mdi:view-grid" class="me-1" />
                All
              </button>
              <button
                v-for="cat in categories"
                :key="cat"
                :class="['category-pill', { active: selectedCategory === cat }]"
                @click="selectCategory(cat)"
              >
                {{ cat }}
              </button>
            </div>
          </div>

          <!-- Map Container -->
          <div ref="mapContainer" class="map-container">
            <div v-if="!mapLoaded" class="map-loading">
              <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
              <h3>Loading Map...</h3>
              <p>Please wait while we load the interactive map</p>
            </div>
          </div>

          <!-- Business Cards (Bottom Sheet) -->
          <div class="business-cards-container">
            <div class="business-cards-scroll">
              <div
                v-for="listing in filteredListings"
                :key="listing.id"
                class="business-card"
                @click="openListing(listing)"
              >
                <div class="business-image">
                  <img :src="listing.photoUrls?.[0] || '/placeholder.jpg'" alt="" />
                  <div class="business-category-badge">{{ listing.businessCategory }}</div>
                </div>
                <div class="business-info">
                  <h4 class="business-name">{{ listing.businessName }}</h4>
                  <div class="business-rating">
                    <Icon icon="mdi:star" class="star-icon" />
                    <span>{{ listing.averageRating?.toFixed(1) || 'New' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Listing Popup -->
          <Transition name="popup">
            <div v-if="activeListing" class="listing-popup">
              <div class="popup-content">
                <button class="popup-close" @click="activeListing = null">
                  <Icon icon="mdi:close" />
                </button>
                <img :src="activeListing.photoUrls?.[0] || '/placeholder.jpg'" class="popup-image" />
                <div class="popup-info">
                  <h3>{{ activeListing.businessName }}</h3>
                  <p class="popup-category">{{ activeListing.businessCategory }}</p>
                  <div class="popup-rating">
                    <Icon icon="mdi:star" class="star-icon" />
                    <span>{{ activeListing.averageRating?.toFixed(1) || 'New' }}</span>
                  </div>
                  <button class="popup-view-btn" @click="viewListingDetails(activeListing)">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'

const props = defineProps({
  isOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'openListing'])

const mapContainer = ref(null)
const map = ref(null)
const markers = ref([])
const listings = ref([])
const selectedCategory = ref(null)
const activeListing = ref(null)
const mapLoaded = ref(false)

const categories = computed(() => {
  const cats = new Set(listings.value.map(l => l.businessCategory))
  return Array.from(cats).sort()
})

const filteredListings = computed(() => {
  if (!selectedCategory.value) return listings.value
  return listings.value.filter(l => l.businessCategory === selectedCategory.value)
})

// Load Google Maps API dynamically
function loadGoogleMapsScript() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      resolve()
      return
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
      return
    }

    // Load the script
    const script = document.createElement('script')
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })
}

// Initialize map
async function initMap() {
  try {
    // Load Google Maps API first
    await loadGoogleMapsScript()

    if (!mapContainer.value) return

    // Singapore center
    const singapore = { lat: 1.3521, lng: 103.8198 }

    map.value = new window.google.maps.Map(mapContainer.value, {
      center: singapore,
      zoom: 12,
      styles: zenlyMapStyles,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy'
    })

    mapLoaded.value = true
    await loadListings()
  } catch (error) {
    console.error('Error initializing map:', error)
    mapLoaded.value = false
  }
}

// Load all listings
async function loadListings() {
  try {
    const snapshot = await getDocs(collection(db, 'allListings'))
    listings.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    console.log('Loaded listings:', listings.value.length)
    console.log('Sample listing:', listings.value[0])
    updateMarkers()
  } catch (error) {
    console.error('Error loading listings:', error)
  }
}

// Update markers on map
function updateMarkers() {
  if (!map.value) return

  // Clear existing markers
  markers.value.forEach(marker => marker.setMap(null))
  markers.value = []

  const bounds = new window.google.maps.LatLngBounds()
  let markersAdded = 0

  filteredListings.value.forEach(listing => {
    // Check for location data
    if (!listing.location?.lat || !listing.location?.lng) {
      console.log('Listing missing location:', listing.businessName)
      return
    }

    const position = {
      lat: Number(listing.location.lat),
      lng: Number(listing.location.lng)
    }

    console.log(`Adding marker for ${listing.businessName} at`, position)

    // Create custom marker with simpler icon
    const marker = new window.google.maps.Marker({
      position,
      map: map.value,
      icon: createCustomMarkerIcon(listing.businessCategory),
      title: listing.businessName,
      animation: window.google.maps.Animation.DROP
    })

    marker.addListener('click', () => {
      activeListing.value = listing
      map.value.panTo(position)
      map.value.setZoom(15)
    })

    markers.value.push(marker)
    bounds.extend(position)
    markersAdded++
  })

  console.log(`Added ${markersAdded} markers to map`)

  if (markers.value.length > 0) {
    map.value.fitBounds(bounds)
  }
}

// Create custom Zenly-style marker - simple colorful circles
function createCustomMarkerIcon(category) {
  const colors = {
    'Food & Beverages': '#FF6B6B',
    'Beauty & Wellness': '#FFD93D',
    'Education': '#6BCB77',
    'Home Services': '#4D96FF',
    'Retail': '#9D4EDD',
    'default': '#5A43C5'
  }

  const color = colors[category] || colors.default

  // Simple circle marker (Zenly style)
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 3,
    scale: 10
  }
}

// Zenly-inspired map styles - vibrant and playful
const zenlyMapStyles = [
  {
    "featureType": "all",
    "elementType": "geometry",
    "stylers": [{ "color": "#ebe3cd" }]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#523735" }]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#f5f1e6" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#aadaff" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#92998d" }]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f1e6" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#d6d1c6" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffd98e" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#ffb74d" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#dfd2ae" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#b8e6b8" }]
  },
  {
    "featureType": "poi.school",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffd9d9" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#dfd2ae" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#c9b2a6" }]
  }
]

function selectCategory(category) {
  selectedCategory.value = category
  updateMarkers()
}

function openListing(listing) {
  activeListing.value = listing
  if (listing.location?.lat && listing.location?.lng) {
    map.value.panTo({
      lat: listing.location.lat,
      lng: listing.location.lng
    })
    map.value.setZoom(15)
  }
}

function viewListingDetails(listing) {
  emit('openListing', listing)
  closeExplorer()
}

function closeExplorer() {
  emit('close')
}

// Watch for map open
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    setTimeout(initMap, 100)
  }
})

onMounted(() => {
  if (props.isOpen) {
    initMap()
  }
})

onBeforeUnmount(() => {
  markers.value.forEach(marker => marker.setMap(null))
})
</script>

<style scoped>
.map-explorer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-explorer-container {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 100vw;
  max-height: 100vh;
  background: white;
  overflow: hidden;
}

:root.dark-mode .map-explorer-container {
  background: var(--color-bg-main);
}

/* Header */
.map-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.90) 100%);
  backdrop-filter: blur(10px);
  padding: 15px 70px 15px 20px;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

:root.dark-mode .map-header {
  background: linear-gradient(180deg, rgba(26,26,46,0.98) 0%, rgba(26,26,46,0.90) 100%);
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 20px;
  background: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
  font-size: 20px;
  z-index: 11;
}

:root.dark-mode .close-btn {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.close-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* Category Pills */
.category-pills {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 5px;
}

.category-pills::-webkit-scrollbar {
  height: 4px;
}

.category-pills::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 2px;
}

.category-pill {
  padding: 8px 16px;
  border-radius: 20px;
  border: 2px solid #e0e0e0;
  background: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

:root.dark-mode .category-pill {
  background: var(--color-bg-secondary);
  border-color: #2a2a3e;
  color: var(--color-text-primary);
}

.category-pill:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.category-pill.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

/* Map Container */
.map-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.map-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.map-loading h3 {
  margin: 0 0 12px 0;
  color: #1a1a2e;
  font-size: 24px;
}

:root.dark-mode .map-loading h3 {
  color: var(--color-text-primary);
}

.map-loading p {
  color: #666;
  margin: 0;
  font-size: 16px;
}

:root.dark-mode .map-loading p {
  color: #aaa;
}

.map-loading small {
  display: block;
  color: #999;
}

:root.dark-mode .map-loading small {
  color: #777;
}

/* Business Cards Bottom Sheet */
.business-cards-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
  max-height: 200px;
  z-index: 10;
}

:root.dark-mode .business-cards-container {
  background: var(--color-bg-secondary);
}

.business-cards-scroll {
  display: flex;
  gap: 15px;
  padding: 20px;
  overflow-x: auto;
}

.business-cards-scroll::-webkit-scrollbar {
  height: 6px;
}

.business-cards-scroll::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: 3px;
}

.business-card {
  flex-shrink: 0;
  width: 200px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

:root.dark-mode .business-card {
  background: var(--color-bg-main);
}

.business-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.business-image {
  position: relative;
  width: 100%;
  height: 120px;
  overflow: hidden;
}

.business-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.business-category-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.business-info {
  padding: 12px;
}

.business-name {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:root.dark-mode .business-name {
  color: var(--color-text-primary);
}

.business-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
}

:root.dark-mode .business-rating {
  color: #aaa;
}

.star-icon {
  color: #ffc107;
}

/* Listing Popup */
.listing-popup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  width: 90%;
  max-width: 400px;
}

.popup-content {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  position: relative;
}

:root.dark-mode .popup-content {
  background: var(--color-bg-secondary);
}

.popup-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0,0,0,0.5);
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1;
}

.popup-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.popup-info {
  padding: 20px;
}

.popup-info h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
}

:root.dark-mode .popup-info h3 {
  color: var(--color-text-primary);
}

.popup-category {
  color: var(--color-primary);
  font-size: 14px;
  margin: 0 0 8px 0;
}

.popup-rating {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  margin-bottom: 15px;
}

.popup-view-btn {
  width: 100%;
  padding: 12px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.popup-view-btn:hover {
  background: var(--color-primary-dark);
  transform: scale(1.02);
}

/* Transitions */
.map-explorer-enter-active,
.map-explorer-leave-active {
  transition: opacity 0.3s ease;
}

.map-explorer-enter-from,
.map-explorer-leave-to {
  opacity: 0;
}

.popup-enter-active,
.popup-leave-active {
  transition: all 0.3s ease;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.8);
}

@media (max-width: 768px) {
  .map-header {
    padding: 15px 70px 15px 15px;
  }

  .business-card {
    width: 160px;
  }
}
</style>
