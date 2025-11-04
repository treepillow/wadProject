<template>
  <Teleport to="body">
    <Transition name="map-explorer">
      <div v-if="isOpen" class="map-explorer-overlay" @click="closeExplorer">
        <div class="map-explorer-container" @click.stop>
          <!-- Navigation Bar -->
          <div class="map-navbar">
            <button class="close-btn" @click="closeExplorer">
              <Icon icon="mdi:close" />
            </button>
            
            <!-- Search and Filters Bar -->
            <div class="navbar-search-filters">
              <!-- Search Bar -->
              <div class="search-input-wrapper">
                <Icon icon="mdi:magnify" class="search-icon" />
                <input
                  type="text"
                  v-model="searchQuery"
                  placeholder="Search businesses..."
                  class="search-input"
                  @input="handleSearch"
                />
                <button
                  v-if="searchQuery"
                  class="search-clear-btn"
                  @click="clearSearch"
                >
                  <Icon icon="mdi:close-circle" />
                </button>
              </div>

              <!-- Categories Dropdown -->
              <div class="filter-control">
                <select
                  v-model="selectedCategory"
                  class="category-select"
                  @change="updateMarkers"
                >
                  <option :value="null">All Categories</option>
                  <option v-for="cat in categories" :key="cat" :value="cat">
                    {{ cat }}
                  </option>
                </select>
              </div>

              <!-- Distance Filter -->
              <div v-if="userLocation && mapLoaded" class="filter-control">
                <select
                  v-model.number="distanceFilter"
                  class="distance-select"
                  @change="updateDistanceRing"
                  :disabled="!distanceFilterEnabled"
                >
                  <option :value="0.5">0.5 km</option>
                  <option :value="1">1 km</option>
                  <option :value="2">2 km</option>
                  <option :value="5">5 km</option>
                  <option :value="10">10 km</option>
                  <option :value="20">20 km</option>
                  <option :value="50">50 km</option>
                </select>
                <button
                  class="distance-toggle-btn"
                  @click="toggleDistanceFilter"
                  :class="{ active: distanceFilterEnabled }"
                  title="Toggle Distance Filter"
                >
                  <Icon icon="mdi:map-marker-radius" />
                </button>
              </div>
            </div>
          </div>

          <!-- Location Permission Prompt -->
          <Transition name="prompt">
            <div v-if="showLocationPrompt" class="location-prompt">
              <div class="location-prompt-content">
                <Icon icon="mdi:map-marker-off" class="prompt-icon" />
                <h3>Enable Location Services</h3>
                <p>To see nearby businesses and use the distance filter, please enable location services.</p>
                <div class="prompt-buttons">
                  <button class="btn btn-primary" @click="requestLocation">
                    Enable Location
                  </button>
                  <button class="btn btn-secondary" @click="dismissLocationPrompt">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </Transition>


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
                    <span>{{ (listingsReviews[listing.id || listing.listingId]?.avgRating || listing.averageRating || 0).toFixed(1) }}</span>
                    <span class="review-count" v-if="listingsReviews[listing.id || listing.listingId]?.totalReviews">
                      ({{ listingsReviews[listing.id || listing.listingId].totalReviews }})
                    </span>
                    <span v-else-if="listing.totalReviews">({{ listing.totalReviews }})</span>
                  </div>
                  <div v-if="listingsReviews[listing.id || listing.listingId]?.topReview" class="business-review-preview">
                    <p class="review-text">{{ listingsReviews[listing.id || listing.listingId].topReview.text }}</p>
                    <span class="review-author">— {{ listingsReviews[listing.id || listing.listingId].topReview.author }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Listing Drawer -->
          <ListingDrawer
            :open="drawerOpen"
            :listing="drawerListing"
            :sellerName="drawerSellerName"
            :sellerAvatar="drawerSellerAvatar"
            @close="closeDrawer"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { db } from '@/firebase'
import { collection, getDocs, query, orderBy, limit, getDoc, doc, onSnapshot } from 'firebase/firestore'
import ListingDrawer from './ListingDrawer.vue'

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
const drawerOpen = ref(false)
const drawerListing = ref(null)
const drawerSellerName = ref('')
const drawerSellerAvatar = ref('')
const mapLoaded = ref(false)

// Reviews data for listings
const listingsReviews = ref({}) // { listingId: { avgRating, totalReviews, topReview } }

// Seller profile map (for names and avatars)
const profileMap = ref({})
const profileUnsubs = new Map()

// Location services
const userLocation = ref(null)
const locationPermissionDenied = ref(false)
const showLocationPrompt = ref(false)
const hasRequestedLocation = ref(false)

// Distance filter - preset values
const distanceFilter = ref(5) // Default 5km
const distanceFilterEnabled = ref(false)
const distancePresets = [0.5, 1, 2, 5, 10, 20, 50] // Preset distances in km

// Search
const searchQuery = ref('')


const categories = computed(() => {
  const cats = new Set(listings.value.map(l => l.businessCategory))
  return Array.from(cats).sort()
})

const filteredListings = computed(() => {
  let filtered = [...listings.value]
  
  // Category filter
  if (selectedCategory.value) {
    filtered = filtered.filter(l => l.businessCategory === selectedCategory.value)
  }
  
  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(l => {
      const name = (l.businessName || '').toLowerCase()
      const desc = (l.businessDesc || '').toLowerCase()
      const category = (l.businessCategory || '').toLowerCase()
      return name.includes(query) || desc.includes(query) || category.includes(query)
    })
  }
  
  // Distance filter
  if (distanceFilterEnabled.value && userLocation.value) {
    filtered = filtered.filter(l => {
      if (!l.location?.lat || !l.location?.lng) return false
      const distance = calculateDistance(
        userLocation.value.lat,
        userLocation.value.lng,
        Number(l.location.lat),
        Number(l.location.lng)
      )
      return distance <= distanceFilter.value
    })
  }
  
  return filtered
})

// Watch for filtered listings changes to fetch reviews for new listings
watch(filteredListings, (newListings) => {
  // Fetch reviews for listings that don't have them yet
  newListings.forEach(listing => {
    const listingId = listing.id || listing.listingId
    if (listingId && !listingsReviews.value[listingId]) {
      fetchListingReviews(listingId)
    }
  })
}, { immediate: true })

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

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Request user location
async function requestLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.')
    return
  }

  hasRequestedLocation.value = true
  showLocationPrompt.value = false

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
      locationPermissionDenied.value = false
      
      // Center map on user location
      if (map.value) {
        map.value.setCenter(userLocation.value)
        map.value.setZoom(14)
        
        // Add user location marker
        addUserLocationMarker()
        
        // Show distance ring if enabled
        if (distanceFilterEnabled.value) {
          updateDistanceRing()
        }
      }
    },
    (error) => {
      console.error('Error getting location:', error)
      locationPermissionDenied.value = true
      showLocationPrompt.value = true
      
      if (error.code === 1) {
        // Permission denied
        alert('Location access denied. Please enable location services in your browser settings.')
      } else {
        alert('Unable to get your location. Please try again.')
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}

// Add user location marker
function addUserLocationMarker() {
  if (!map.value || !userLocation.value) return
  
  // Remove existing marker if any
  if (window.userLocationMarker) {
    window.userLocationMarker.setMap(null)
  }
  
  // Create user location marker
  window.userLocationMarker = new window.google.maps.Marker({
    position: userLocation.value,
    map: map.value,
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 3
    },
    zIndex: 1000,
    title: 'Your Location'
  })
}

// Update distance filter (no visual ring, just filtering)
function updateDistanceRing() {
  // Just update markers based on distance filter
  // No visual circles on the map
  updateMarkers()
}

// Toggle distance filter
function toggleDistanceFilter() {
  distanceFilterEnabled.value = !distanceFilterEnabled.value
  updateDistanceRing()
}


// Dismiss location prompt
function dismissLocationPrompt() {
  showLocationPrompt.value = false
  hasRequestedLocation.value = true
}

// Handle search
function handleSearch() {
  updateMarkers()
}

// Clear search
function clearSearch() {
  searchQuery.value = ''
  updateMarkers()
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
    
    // Check if location services are available and request permission
    if (navigator.geolocation && !hasRequestedLocation.value) {
      // Try to get location silently first
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLocation.value = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          if (map.value) {
            map.value.setCenter(userLocation.value)
            map.value.setZoom(14)
            addUserLocationMarker()
          }
        },
        () => {
          // Location denied or unavailable - show prompt
          showLocationPrompt.value = true
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      )
    } else if (!navigator.geolocation) {
      // Geolocation not supported
      showLocationPrompt.value = true
    }
    
    await loadListings()
  } catch (error) {
    console.error('Error initializing map:', error)
    mapLoaded.value = false
  }
}

// Start profile listener for a user
function startProfileListener(uid) {
  if (!uid || profileUnsubs.has(uid)) return
  const unsub = onSnapshot(doc(db, 'users', uid), snap => {
    const data = snap.data() || {}
    const displayName = data.username || data.displayName || ''
    const photoURL = data.photoURL || data.profilePicture || data.avatarUrl || data.profilePhoto || ''
    profileMap.value = { ...profileMap.value, [uid]: { displayName, photoURL } }
  })
  profileUnsubs.set(uid, unsub)
}

// Attach profile listeners for listings
function attachProfileListeners(rows) {
  const uids = new Set(rows.map(r => r.userId).filter(Boolean))
  uids.forEach(startProfileListener)
}

// Load all listings
async function loadListings() {
  try {
    const snapshot = await getDocs(collection(db, 'allListings'))
    listings.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    console.log('Loaded listings:', listings.value.length)
    console.log('Sample listing:', listings.value[0])
    
    // Attach profile listeners
    attachProfileListeners(listings.value)
    
    // Fetch reviews for all listings
    await fetchAllReviews()
    
    updateMarkers()
  } catch (error) {
    console.error('Error loading listings:', error)
  }
}

// Update markers on map
function updateMarkers() {
  if (!map.value) return

  // Clear existing markers and overlays
  markers.value.forEach(marker => {
    if (marker.overlay) {
      marker.overlay.setMap(null)
    }
    marker.setMap(null)
  })
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

    // Create invisible marker for click handling
    const marker = new window.google.maps.Marker({
      position,
      map: map.value,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 0
      },
      title: listing.businessName
    })

    // Create custom HTML overlay with image and name
    const overlay = createCustomOverlay(position, listing)
    overlay.setMap(map.value)
    marker.overlay = overlay

    marker.addListener('click', () => {
      openDrawer(listing)
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

// Create custom HTML overlay with business image and name
function createCustomOverlay(position, listing) {
  class CustomOverlay extends window.google.maps.OverlayView {
    constructor(position, listing) {
      super()
      this.position = position
      this.listing = listing
      this.div = null
    }

    onAdd() {
      const div = document.createElement('div')
      div.style.position = 'absolute'
      div.style.cursor = 'pointer'
      div.style.display = 'flex'
      div.style.flexDirection = 'column'
      div.style.alignItems = 'center'
      div.style.gap = '4px'
      div.style.transform = 'translate(-50%, -100%)'
      div.style.zIndex = '1000'

      // Business image container
      const imageContainer = document.createElement('div')
      imageContainer.style.width = '48px'
      imageContainer.style.height = '48px'
      imageContainer.style.borderRadius = '50%'
      imageContainer.style.overflow = 'hidden'
      imageContainer.style.border = '3px solid white'
      imageContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'
      imageContainer.style.backgroundColor = '#f0f0f0'

      const img = document.createElement('img')
      img.src = this.listing.photoUrls?.[0] || this.listing.imageUrl || 'https://via.placeholder.com/48'
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = 'cover'
      imageContainer.appendChild(img)

      // Business name label
      const nameLabel = document.createElement('div')
      nameLabel.textContent = this.listing.businessName
      nameLabel.style.backgroundColor = 'white'
      nameLabel.style.padding = '4px 8px'
      nameLabel.style.borderRadius = '12px'
      nameLabel.style.fontSize = '11px'
      nameLabel.style.fontWeight = '600'
      nameLabel.style.whiteSpace = 'nowrap'
      nameLabel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
      nameLabel.style.maxWidth = '120px'
      nameLabel.style.overflow = 'hidden'
      nameLabel.style.textOverflow = 'ellipsis'

      div.appendChild(imageContainer)
      div.appendChild(nameLabel)

      // Click handler - need to access Vue refs from closure
      const listingData = this.listing
      const listingPosition = this.position
      div.addEventListener('click', () => {
        // Access current profileMap value
        const currentProfileMap = profileMap.value
        const prof = listingData?.userId ? currentProfileMap[listingData.userId] : null
        drawerListing.value = listingData
        drawerSellerName.value = prof?.displayName || ''
        drawerSellerAvatar.value = prof?.photoURL || ''
        drawerOpen.value = true
        if (map.value) {
          map.value.panTo(listingPosition)
          map.value.setZoom(15)
        }
      })

      this.div = div
      const panes = this.getPanes()
      panes.overlayMouseTarget.appendChild(div)
    }

    draw() {
      const overlayProjection = this.getProjection()
      const pos = overlayProjection.fromLatLngToDivPixel(
        new window.google.maps.LatLng(this.position.lat, this.position.lng)
      )

      if (this.div) {
        this.div.style.left = pos.x + 'px'
        this.div.style.top = pos.y + 'px'
      }
    }

    onRemove() {
      if (this.div) {
        this.div.parentNode.removeChild(this.div)
        this.div = null
      }
    }
  }

  return new CustomOverlay(position, listing)
}

// Zenly-inspired map styles - vibrant, colorful, and playful
const zenlyMapStyles = [
  {
    "featureType": "all",
    "elementType": "geometry",
    "stylers": [{ "color": "#FFE8D6" }]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#4A4A4A" }]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#FFFFFF", "weight": 3 }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#A8D8EA" }]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [{ "color": "#FFE8D6" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#FFFFFF" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#FFD4A3" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#FFCAA8" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#FFB088" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [{ "color": "#FFE4C4" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#FFD4E5" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#C7F0BD" }]
  },
  {
    "featureType": "poi.school",
    "elementType": "geometry",
    "stylers": [{ "color": "#FFE8A1" }]
  },
  {
    "featureType": "poi.business",
    "elementType": "geometry",
    "stylers": [{ "color": "#E8D4F0" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#D4E8FF" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#FFB4D4", "weight": 1 }]
  }
]

// Category selection is now handled by the select dropdown directly via v-model

// Fetch reviews for a listing
async function fetchListingReviews(listingId) {
  if (!listingId || listingsReviews.value[listingId]) return // Already fetched
  
  try {
    const reviewsRef = collection(db, 'allListings', listingId, 'reviews')
    const q = query(reviewsRef, orderBy('createdAt', 'desc'), limit(5))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      listingsReviews.value[listingId] = {
        avgRating: 0,
        totalReviews: 0,
        topReview: null
      }
      return
    }
    
    let totalRating = 0
    let topReview = null
    
    for (const docSnap of snapshot.docs) {
      const reviewData = docSnap.data()
      totalRating += (reviewData.rating || 0)
      
      // Get top review (first one with text)
      if (!topReview && reviewData.reviewText) {
        let reviewerName = 'Anonymous'
        if (reviewData.userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', reviewData.userId))
            if (userDoc.exists()) {
              const userData = userDoc.data()
              reviewerName = userData.username || userData.displayName || 'Anonymous'
            }
          } catch (e) {
            // Use default
          }
        }
        topReview = {
          text: reviewData.reviewText,
          author: reviewerName,
          rating: reviewData.rating
        }
      }
    }
    
    const avgRating = totalRating / snapshot.size
    
    listingsReviews.value[listingId] = {
      avgRating,
      totalReviews: snapshot.size,
      topReview
    }
  } catch (e) {
    console.warn('Error fetching reviews for listing:', listingId, e)
    listingsReviews.value[listingId] = {
      avgRating: 0,
      totalReviews: 0,
      topReview: null
    }
  }
}

// Fetch reviews for all listings
async function fetchAllReviews() {
  const promises = listings.value.map(listing => {
    const listingId = listing.id || listing.listingId
    return fetchListingReviews(listingId)
  })
  await Promise.all(promises)
}

function openListing(listing) {
  openDrawer(listing)
  if (listing.location?.lat && listing.location?.lng) {
    map.value.panTo({
      lat: listing.location.lat,
      lng: listing.location.lng
    })
    map.value.setZoom(15)
  }
}

function openDrawer(listing) {
  drawerListing.value = listing
  // Get seller info from profile map if available
  const prof = listing?.userId ? profileMap.value[listing.userId] : null
  drawerSellerName.value = prof?.displayName || ''
  drawerSellerAvatar.value = prof?.photoURL || ''
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  drawerListing.value = null
  activeListing.value = null
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
  // Clean up profile listeners
  profileUnsubs.forEach(unsub => unsub && unsub())
  profileUnsubs.clear()
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

/* Navigation Bar */
.map-navbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%);
  backdrop-filter: blur(10px);
  padding: 12px 20px;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 12px;
}

:root.dark-mode .map-navbar {
  background: linear-gradient(180deg, rgba(26,26,46,0.98) 0%, rgba(26,26,46,0.95) 100%);
}

/* Search and Filters Bar - All in one line */
.navbar-search-filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.filter-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-select {
  padding: 8px 32px 8px 12px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  min-width: 150px;
  height: 40px;
}

:root.dark-mode .category-select {
  background: var(--color-bg-secondary);
  border-color: #2a2a3e;
  color: var(--color-text-primary);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23aaa' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.category-select:hover {
  border-color: var(--color-primary);
}

.category-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.distance-toggle-btn {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
  font-size: 20px;
  padding: 0;
}

:root.dark-mode .distance-toggle-btn {
  background: var(--color-bg-secondary);
  border-color: #2a2a3e;
  color: #aaa;
}

.distance-toggle-btn:hover {
  background: var(--color-primary-pale);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.distance-toggle-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

:root.dark-mode .distance-toggle-btn.active {
  background: var(--color-primary);
  color: white;
}

.distance-select {
  padding: 8px 32px 8px 12px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  min-width: 110px;
  height: 40px;
}

.distance-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

:root.dark-mode .distance-select {
  background: var(--color-bg-secondary);
  border-color: #2a2a3e;
  color: var(--color-text-primary);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23aaa' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.distance-select:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.distance-select:focus:not(:disabled) {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.navbar-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.navbar-toggle-btn {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
  font-size: 20px;
}

:root.dark-mode .navbar-toggle-btn {
  background: var(--color-bg-secondary);
  border-color: #2a2a3e;
  color: #aaa;
}

.navbar-toggle-btn:hover {
  background: var(--color-primary-pale);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-2px);
}

.navbar-toggle-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

:root.dark-mode .navbar-toggle-btn.active {
  background: var(--color-primary);
  color: white;
}


.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e0e0e0;
  flex: 1;
  min-width: 200px;
}

:root.dark-mode .search-input-wrapper {
  background: var(--color-bg-secondary);
  border-color: #2a2a3e;
}

.search-icon {
  color: #666;
  font-size: 20px;
  margin-right: 8px;
  flex-shrink: 0;
}

:root.dark-mode .search-icon {
  color: #aaa;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--color-text-primary);
  padding: 4px 0;
}

.search-input::placeholder {
  color: #999;
}

:root.dark-mode .search-input::placeholder {
  color: #666;
}

.search-clear-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  transition: color 0.2s ease;
}

.search-clear-btn:hover {
  color: #666;
}

:root.dark-mode .search-clear-btn {
  color: #666;
}

:root.dark-mode .search-clear-btn:hover {
  color: #aaa;
}

.close-btn {
  background: white;
  border: 1px solid #e0e0e0;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
  font-size: 20px;
  color: #666;
}

:root.dark-mode .close-btn {
  background: var(--color-bg-secondary);
  border-color: #2a2a3e;
  color: var(--color-text-primary);
}

.close-btn:hover {
  background: var(--color-primary-pale);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* Location Prompt */
.location-prompt {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.location-prompt-content {
  background: white;
  border-radius: 20px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
}

:root.dark-mode .location-prompt-content {
  background: var(--color-bg-secondary);
}

.prompt-icon {
  font-size: 64px;
  color: var(--color-primary);
  margin-bottom: 16px;
}

.location-prompt-content h3 {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.location-prompt-content p {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

:root.dark-mode .location-prompt-content p {
  color: #aaa;
}

.prompt-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.prompt-buttons .btn {
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.prompt-buttons .btn-primary {
  background: var(--color-primary);
  color: white;
}

.prompt-buttons .btn-primary:hover {
  background: var(--color-primary-dark);
  transform: scale(1.02);
}

.prompt-buttons .btn-secondary {
  background: #e0e0e0;
  color: #333;
}

:root.dark-mode .prompt-buttons .btn-secondary {
  background: #2a2a3e;
  color: var(--color-text-primary);
}

.prompt-buttons .btn-secondary:hover {
  background: #d0d0d0;
}

:root.dark-mode .prompt-buttons .btn-secondary:hover {
  background: #3a3a4e;
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
  right: 0;
  bottom: 0;
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
  z-index: 99;
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
  min-height: 200px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  display: flex;
  flex-direction: column;
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

/* Business Review Preview */
.business-review-preview {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.review-text {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0 0 4px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.review-author {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.review-count {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-left: 4px;
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


.prompt-enter-active,
.prompt-leave-active {
  transition: opacity 0.3s ease;
}

.prompt-enter-from,
.prompt-leave-to {
  opacity: 0;
}

/* Slide down animation for header */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Fade animation for search and categories */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .map-navbar {
    padding: 10px 12px;
    gap: 8px;
  }

  .navbar-search-filters {
    gap: 8px;
  }

  .search-input-wrapper {
    min-width: 120px;
    padding: 6px 10px;
  }

  .category-select {
    min-width: 120px;
    height: 36px;
    font-size: 13px;
    padding: 6px 28px 6px 10px;
  }

  .distance-select {
    min-width: 90px;
    height: 36px;
    font-size: 13px;
    padding: 6px 28px 6px 10px;
  }

  .distance-toggle-btn {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .navbar-toggle-btn {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .business-card {
    width: 160px;
  }

  .location-prompt-content {
    padding: 24px;
    margin: 20px;
  }

  .prompt-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .location-prompt-content h3 {
    font-size: 20px;
  }

  .prompt-buttons {
    flex-direction: column;
  }

  .prompt-buttons .btn {
    width: 100%;
  }
}
</style>
