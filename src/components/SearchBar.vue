<script setup>
import { ref, computed, watch } from 'vue'

const emit = defineEmits(['search'])

const searchQuery = ref('')
const locationQuery = ref('')
const showLocationDropdown = ref(false)
const locationSuggestions = ref([])
const searchTimeout = ref(null)

// Singapore Planning Areas organized by region
const singaporeRegions = {
  'Central': ['Bishan', 'Bukit Merah', 'Bukit Timah', 'Central Area', 'Geylang', 'Kallang', 'Marine Parade', 'Queenstown', 'Toa Payoh'],
  'East': ['Bedok', 'Pasir Ris', 'Tampines'],
  'North': ['Ang Mo Kio', 'Sembawang', 'Woodlands', 'Yishun'],
  'North-East': ['Hougang', 'Punggol', 'Sengkang', 'Serangoon'],
  'West': ['Bukit Batok', 'Bukit Panjang', 'Choa Chu Kang', 'Clementi', 'Jurong East', 'Jurong West']
}

// Flatten for searching
const singaporePlanningAreas = Object.values(singaporeRegions).flat().sort()

// Watch for location input changes and fetch suggestions
watch(locationQuery, async (newVal) => {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)

  if (!newVal || newVal.length < 2) {
    locationSuggestions.value = singaporePlanningAreas.slice(0, 10)
    return
  }

  // Debounce API calls
  searchTimeout.value = setTimeout(async () => {
    await fetchLocationSuggestions(newVal)
  }, 300)
})

async function fetchLocationSuggestions(query) {
  try {
    // Use OneMap API for geocoding
    const response = await fetch(
      `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=N&getAddrDetails=Y&pageNum=1`
    )
    const data = await response.json()

    if (data.results && data.results.length > 0) {
      // Extract unique addresses/locations
      const uniqueLocations = [...new Set(
        data.results.map(r => {
          // Try to extract the area/town name
          const roadName = r.ROAD_NAME || ''
          const building = r.BUILDING || ''
          return building || roadName
        }).filter(Boolean)
      )].slice(0, 8)

      locationSuggestions.value = uniqueLocations
    } else {
      // Fallback to planning areas that match
      const filtered = singaporePlanningAreas.filter(area =>
        area.toLowerCase().includes(query.toLowerCase())
      )
      locationSuggestions.value = filtered.slice(0, 10)
    }
  } catch (error) {
    console.error('Error fetching location suggestions:', error)
    // Fallback to local filtering
    const filtered = singaporePlanningAreas.filter(area =>
      area.toLowerCase().includes(query.toLowerCase())
    )
    locationSuggestions.value = filtered.slice(0, 10)
  }
}

const filteredLocations = computed(() => {
  return locationSuggestions.value.length > 0
    ? locationSuggestions.value
    : singaporePlanningAreas.slice(0, 10)
})

function selectLocation(location) {
  locationQuery.value = location
  showLocationDropdown.value = false
  handleSearch(new Event('submit'))
}

function handleSearch(e) {
  e.preventDefault()
  showLocationDropdown.value = false
  emit('search', {
    business: searchQuery.value.trim(),
    location: locationQuery.value.trim()
  })
}

function handleLocationFocus() {
  showLocationDropdown.value = true
  if (locationSuggestions.value.length === 0) {
    locationSuggestions.value = singaporePlanningAreas.slice(0, 10)
  }
}

function handleLocationBlur() {
  // Delay to allow click on dropdown item
  setTimeout(() => {
    showLocationDropdown.value = false
  }, 200)
}
</script>

<template>
  <div class="search mt-2">
    <form class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3" role="search" @submit="handleSearch">
      <input
        class="home-business form-control flex-grow-1"
        type="search"
        placeholder="🔍 Search for a home business"
        aria-label="Search"
        v-model="searchQuery"
      />
      <div class="location-dropdown-wrapper flex-grow-1 flex-md-grow-0">
        <input
          class="location-search form-control w-100"
          type="search"
          placeholder="📍 Search location"
          aria-label="Search Location"
          v-model="locationQuery"
          @focus="handleLocationFocus"
          @blur="handleLocationBlur"
          autocomplete="off"
        />
        <div v-if="showLocationDropdown" class="location-dropdown">
          <!-- Show API suggestions if available and user typed something -->
          <div v-if="locationQuery && locationSuggestions.length > 0">
            <div class="dropdown-header">Search Results</div>
            <div
              v-for="location in locationSuggestions"
              :key="location"
              class="location-item"
              @click="selectLocation(location)"
            >
              📍 {{ location }}
            </div>
          </div>

          <!-- Show categorized regions when no search or as fallback -->
          <div v-else>
            <div v-for="(areas, region) in singaporeRegions" :key="region" class="region-group">
              <div class="dropdown-header">{{ region }}</div>
              <div
                v-for="area in areas"
                :key="area"
                class="location-item"
                @click="selectLocation(area)"
              >
                {{ area }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <button class="btn btn-search w-100 w-md-auto flex-shrink-0" type="submit">Search</button>
    </form>
  </div>
</template>



<style scoped>
.search form {
  width: 100%;
}

.home-business {
  flex: 1;
  min-width: 0;
  padding: 15px;
  border-radius: 8px;
  border: 2px solid var(--color-border);
  background: var(--color-bg-white);
  color: var(--color-text-primary);
  transition: border-color 0.3s ease;
  height: 52px;
}

.home-business::placeholder {
  color: var(--color-text-secondary);
}

.home-business:focus {
  border-color: var(--color-primary);
  outline: none;
}

.location-dropdown-wrapper {
  position: relative;
  flex: 0 0 auto;
  width: 280px;
}

.location-search {
  width: 100%;
  padding: 15px;
  border-radius: 8px;
  border: 2px solid var(--color-border);
  background: var(--color-bg-white);
  color: var(--color-text-primary);
  transition: border-color var(--transition-normal);
  height: 52px;
}

.location-search::placeholder {
  color: var(--color-text-secondary);
}

.location-search:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: var(--focus-ring);
}

.location-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-bg-white);
  border: 2px solid var(--color-primary);
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: var(--shadow-lg);
}

.dropdown-header {
  padding: 8px 15px;
  background: var(--color-bg-purple-tint);
  color: var(--color-primary);
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 1px solid var(--color-border);
}

.region-group:not(:last-child) {
  border-bottom: 2px solid var(--color-border);
}

.location-item {
  padding: 12px 15px;
  padding-left: 25px;
  cursor: pointer;
  color: var(--color-text-primary);
  transition: background-color 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.location-item:last-child {
  border-bottom: none;
}

.location-item:hover {
  background-color: var(--color-bg-purple-tint);
  color: var(--color-primary);
  padding-left: 30px;
}

.btn-search {
  flex: 0 0 auto;
  color: white;
  background-color: var(--color-primary);
  padding: 0 40px;
  height: 52px;
  transition: all var(--transition-fast);
  border: none;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
}

.btn-search:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-search:active {
  transform: translateY(0);
}

.search {
  animation: slideDown 0.4s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .search form {
    flex-wrap: wrap;
    gap: 0.65rem !important;
  }

  .home-business {
    width: 100%;
    flex: 1 1 100%;
    height: 46px;
    padding: 11px;
  }

  .location-dropdown-wrapper {
    width: 100%;
    flex: 1 1 100%;
  }

  .location-search {
    height: 46px;
    padding: 11px;
  }

  .btn-search {
    width: 100%;
    flex: 1 1 100%;
    height: 46px;
    padding: 0 18px;
  }
}

@media (max-width: 575.98px) {
  .search form {
    gap: 0.45rem !important;
  }

  .home-business,
  .location-search {
    height: 42px;
    padding: 9px;
    font-size: 0.8rem;
  }

  .btn-search {
    height: 42px;
    font-size: 0.8rem;
  }

  .location-dropdown {
    max-height: 350px;
  }

  .dropdown-header {
    padding: 7px 12px;
    font-size: 0.8rem;
  }

  .location-item {
    padding: 10px 12px;
    padding-left: 22px;
    font-size: 0.85rem;
  }

  .location-item:hover {
    padding-left: 26px;
  }
}

/* iPhone 15 Pro and similar narrow screens (393px) */
@media (max-width: 400px) {
  .search form {
    gap: 0.4rem !important;
  }

  .home-business,
  .location-search {
    height: 40px;
    padding: 8px;
    font-size: 0.75rem;
    border-radius: 6px;
  }

  .home-business::placeholder,
  .location-search::placeholder {
    font-size: 0.75rem;
  }

  .btn-search {
    height: 40px;
    font-size: 0.75rem;
    padding: 0 16px;
    border-radius: 8px;
  }

  .location-dropdown {
    max-height: 320px;
    border-radius: 6px;
  }

  .dropdown-header {
    padding: 6px 10px;
    font-size: 0.75rem;
  }

  .location-item {
    padding: 9px 10px;
    padding-left: 20px;
    font-size: 0.8rem;
  }

  .location-item:hover {
    padding-left: 24px;
  }
}
</style>