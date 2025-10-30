<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import NavBar from './NavBar.vue'
import { db } from '@/firebase'
import { collection, query, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore'

let io = null
let descriptionIo = null

const testimonials = ref([])
const loadingReviews = ref(true)
const trendingListings = ref([])
const loadingTrending = ref(true)
const statistics = ref({
  businesses: 0,
  users: 0,
  categories: 0
})
const loadingStats = ref(true)

// fetch real reviews from database
async function fetchRealReviews() {
  try {
    // get all listings
    const listingsRef = collection(db, 'allListings')
    const listingsSnap = await getDocs(query(listingsRef, limit(50)))

    const allReviews = []

    // fetch reviews from each listing
    for (const listingDoc of listingsSnap.docs) {
      const listingId = listingDoc.id
      const listingData = listingDoc.data()

      const reviewsRef = collection(db, 'allListings', listingId, 'reviews')
      const reviewsQuery = query(reviewsRef, orderBy('createdAt', 'desc'), limit(5))
      const reviewsSnap = await getDocs(reviewsQuery)

      for (const reviewDoc of reviewsSnap.docs) {
        const reviewData = reviewDoc.data()

        // only include reviews with actual text and rating >= 4
        if (reviewData.rating >= 4 && reviewData.comment && reviewData.comment.trim().length > 20) {
          // fetch user data
          let userName = reviewData.userName || 'Anonymous'
          let userLocation = 'Singapore'

          if (reviewData.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', reviewData.userId))
              if (userDoc.exists()) {
                const userData = userDoc.data()
                userName = userData.displayName || userData.username || userName
                // Try to get location from address
                if (userData.address?.street) {
                  const street = userData.address.street
                  // Extract area name (usually after last space)
                  const parts = street.split(' ')
                  userLocation = parts[parts.length - 1] || 'Singapore'
                }
              }
            } catch (e) {
              // fallback to review data
            }
          }

          allReviews.push({
            text: reviewData.comment,
            rating: reviewData.rating,
            userName: userName,
            userLocation: userLocation,
            businessName: listingData.businessName
          })
        }
      }

      // stop once we have at least 6 reviews to have variety
      if (allReviews.length >= 6) break
    }

    // shuffle and pick 3
    const shuffled = allReviews.sort(() => 0.5 - Math.random())
    testimonials.value = shuffled.slice(0, 3)

    // fallback if no reviews found
    if (testimonials.value.length === 0) {
      testimonials.value = [
        {
          text: "Found the most amazing homemade pastries right in my neighbourhood. The quality is incredible and the service is so personal!",
          rating: 5,
          userName: "Sarah T.",
          userLocation: "Tampines"
        },
        {
          text: "As a home baker, this platform helped me reach so many new customers. The booking system makes everything seamless!",
          rating: 5,
          userName: "Michelle L.",
          userLocation: "Jurong West"
        },
        {
          text: "Best platform for finding local services. I've tried yoga classes, art workshops, and cooking lessons—all amazing!",
          rating: 5,
          userName: "James W.",
          userLocation: "Bishan"
        }
      ]
    }

  } catch (error) {
    console.error('Failed to fetch reviews:', error)
    // fallback to dummy data if fetch fails
    testimonials.value = [
      {
        text: "Found the most amazing homemade pastries right in my neighbourhood. The quality is incredible and the service is so personal!",
        rating: 5,
        userName: "Sarah T.",
        userLocation: "Tampines"
      },
      {
        text: "As a home baker, this platform helped me reach so many new customers. The booking system makes everything seamless!",
        rating: 5,
        userName: "Michelle L.",
        userLocation: "Jurong West"
      },
      {
        text: "Best platform for finding local services. I've tried yoga classes, art workshops, and cooking lessons—all amazing!",
        rating: 5,
        userName: "James W.",
        userLocation: "Bishan"
      }
    ]
  } finally {
    loadingReviews.value = false
  }
}

// fetch trending listings (sorted by viewCount)
async function fetchTrendingListings() {
  try {
    const listingsRef = collection(db, 'allListings')
    const trendingQuery = query(listingsRef, orderBy('viewCount', 'desc'), limit(4))
    const snapshot = await getDocs(trendingQuery)

    const listings = []
    for (const doc of snapshot.docs) {
      const data = doc.data()
      const listingId = doc.id

      // fetch rating
      let avgRating = 0
      let totalReviews = 0
      try {
        const reviewsRef = collection(db, 'allListings', listingId, 'reviews')
        const reviewsSnap = await getDocs(reviewsRef)
        if (!reviewsSnap.empty) {
          const ratings = reviewsSnap.docs.map(d => d.data().rating || 0)
          avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
          totalReviews = reviewsSnap.size
        }
      } catch (e) {
        console.warn('Failed to fetch ratings for', listingId)
      }

      // Try multiple possible image field names
      const imageUrl = data.imageUrl ||
                      data.businessImage ||
                      data.image ||
                      (Array.isArray(data.photoUrls) && data.photoUrls.length > 0 ? data.photoUrls[0] : null) ||
                      (Array.isArray(data.photos) && data.photos.length > 0 ? data.photos[0].url : null) ||
                      (Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : null) ||
                      data.photoURL ||
                      null

      listings.push({
        id: listingId,
        businessName: data.businessName,
        businessCategory: data.businessCategory,
        price: data.menu?.[0]?.price || null,
        avgRating: avgRating.toFixed(1),
        totalReviews: totalReviews,
        imageUrl: imageUrl
      })
    }

    trendingListings.value = listings

  } catch (error) {
    console.error('Failed to fetch trending listings:', error)
  } finally {
    loadingTrending.value = false
  }
}

// helper to get category background class
function getCategoryClass(category) {
  const categoryMap = {
    'Fitness': 'fitness-bg',
    'Food & Drinks': 'food-bg',
    'Arts & Craft': 'arts-bg',
    'Education': 'education-bg',
    'Health & Wellness': 'fitness-bg',
    'Beauty': 'arts-bg',
    'Home Services': 'education-bg'
  }
  return categoryMap[category] || 'fitness-bg'
}

// helper to generate star rating display
function getStars(rating) {
  const roundedRating = Math.round(parseFloat(rating))
  return '★'.repeat(roundedRating) + '☆'.repeat(5 - roundedRating)
}

// fetch real statistics from database
async function fetchStatistics() {
  try {
    // Count total businesses
    const listingsRef = collection(db, 'allListings')
    const listingsSnap = await getDocs(listingsRef)
    statistics.value.businesses = listingsSnap.size

    // Count total users
    const usersRef = collection(db, 'users')
    const usersSnap = await getDocs(usersRef)
    statistics.value.users = usersSnap.size

    // Count unique categories
    const categories = new Set()
    listingsSnap.docs.forEach(doc => {
      const category = doc.data().businessCategory
      if (category) categories.add(category)
    })
    statistics.value.categories = categories.size

  } catch (error) {
    console.error('Failed to fetch statistics:', error)
    // Fallback to minimal values if fetch fails
    statistics.value = {
      businesses: 0,
      users: 0,
      categories: 0
    }
  } finally {
    loadingStats.value = false
  }
}

onMounted(() => {
  fetchRealReviews()
  fetchTrendingListings()
  fetchStatistics()

  const section = document.querySelector('.about-section')
  if (!section) return

  io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting) {
        section.classList.add('in-view')   // triggers the fade-in of images
        io && io.unobserve(section)
      }
    },
    { root: null, threshold: 0.25 }
  )
  io.observe(section)

  const containers = document.querySelectorAll('.container-description, .container-description2')
  descriptionIo = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('fade-in')),
    { threshold: 0.15 }
  )
  containers.forEach((c) => descriptionIo.observe(c))
})

onBeforeUnmount(() => {
  io && io.disconnect()
  descriptionIo && descriptionIo.disconnect()
})
</script>

<template>

  
<NavBar :auth-ctas-only="true" />  <!-- shows Login / Sign up on About only -->




  <!-- HERO -->
  <div class="background-section position-relative d-flex align-items-center justify-content-center min-vh-100 w-100">
    <div class="video-background position-absolute top-0 start-0 w-100 h-100">
      <video class="w-100 h-100 video-darken" autoplay loop muted playsinline>
        <source src="../assets/homes_video/homes_video.mp4" type="video/mp4">
      </video>
      <div class="video-overlay"></div>
    </div>


    <div class="content container text-center position-relative px-3">
      <h1 class="text-white fw-semibold" style="font-size: clamp(32px,6vw,70px)">
        Discover trusted <br class="d-none d-md-block">home businesses
      </h1>
    </div>
  </div>

  <!-- CENTERED GRID + TITLE -->
  <section class="about-section">
    <div class="content text-center px-3 mb-5">
      <h1 class="about-title fw-semibold" style="font-size: clamp(28px,5vw,55px)">
        One app for <br class="d-none d-md-block">all you need
      </h1>
    </div>

    <!-- Clean, centered, responsive grid -->
    <div class="about-grid mb-4">
      <div class="category-item">
        <img src="../assets/category_images/fitness.png" alt="Fitness" />
        <p class="category-label">Fitness</p>
      </div>
      <div class="category-item">
        <img src="../assets/category_images/arts_craft.png" alt="Arts & Craft" />
        <p class="category-label">Arts & Craft</p>
      </div>
      <div class="category-item">
        <img src="../assets/category_images/education.png" alt="Education" />
        <p class="category-label">Education</p>
      </div>
      <div class="category-item">
        <img src="../assets/category_images/food_drinks.png" alt="Food & Drinks" />
        <p class="category-label">Food & Drinks</p>
      </div>
    </div>

    <div class="mission px-3">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-12 col-md-10 col-lg-8">
            <h3 class="text-center mission-text fs-2 fw-semibold">
              <span class="underline">Our mission</span><br>
              Discover, support, and grow with<br>
              <span class="green">trusted home businesses</span>
            </h3>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- DESCRIPTION CARDS -->
  <div class="description bg-page py-5">
    <div class="container">
      <div class="row justify-content-start mb-4">
        <div class="col-12 col-md-8 col-lg-6">
          <div class="container-description p-4 rounded-4">
            <h3 class="h3">Discover unique local services</h3>
            <p>From homemade cakes to yoga classes, find authentic services right in your neighbourhood.</p>
          </div>
        </div>
      </div>

      <div class="row justify-content-end mb-4">
        <div class="col-12 col-md-8 col-lg-6">
          <div class="container-description2 p-4 rounded-4">
            <h3 class="h3">Support real people</h3>
            <p>Every booking supports a real person, not a big corporation.</p>
          </div>
        </div>
      </div>

      <div class="row justify-content-start mb-4">
        <div class="col-12 col-md-8 col-lg-6">
          <div class="container-description p-4 rounded-4">
            <h3 class="h3">Connect instantly</h3>
            <p>Message providers directly, customise your order, and book easily—in one place.</p>
          </div>
        </div>
      </div>

      <div class="row justify-content-end">
        <div class="col-12 col-md-8 col-lg-6">
          <div class="container-description2 p-4 rounded-4">
            <h3 class="h3">Explore more</h3>
            <p>From food to fitness, discover what's around you.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- SOCIAL PROOF SECTION -->
  <section class="social-proof-section py-5">
    <div class="container">
      <!-- Section Title -->
      <div class="text-center mb-5 social-proof-header">
        <h2 class="display-5 fw-bold mb-3">Loved by our community</h2>
        <p class="lead text-muted">Join thousands discovering amazing home businesses</p>
      </div>

      <!-- Testimonials Grid -->
      <div v-if="loadingReviews" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading reviews...</span>
        </div>
      </div>

      <div v-else class="row g-4 mb-5">
        <div v-for="(testimonial, index) in testimonials" :key="index" class="col-12 col-md-6 col-lg-4">
          <div class="testimonial-card">
            <div class="stars mb-2">★★★★★</div>
            <p class="testimonial-text">"{{ testimonial.text }}"</p>
            <div class="testimonial-author">
              <div class="author-avatar">{{ testimonial.userName.charAt(0).toUpperCase() }}</div>
              <div>
                <div class="author-name">{{ testimonial.userName }}</div>
                <div class="author-location">{{ testimonial.userLocation }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Featured Listings Preview -->
      <div class="featured-preview-section">
        <h3 class="text-center mb-4 fw-semibold">Popular right now</h3>

        <div v-if="loadingTrending" class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading trending listings...</span>
          </div>
        </div>

        <div v-else class="row g-4 mb-4">
          <div v-for="listing in trendingListings" :key="listing.id" class="col-12 col-sm-6 col-lg-3">
            <div class="preview-card">
              <div
                class="preview-image"
                :class="{ 'has-image': listing.imageUrl, [getCategoryClass(listing.businessCategory)]: !listing.imageUrl }"
                :style="listing.imageUrl ? `background-image: url('${listing.imageUrl}')` : ''"
              >
              </div>
              <div class="preview-content">
                <h6 class="preview-title">{{ listing.businessName }}</h6>
                <div class="preview-rating">
                  <span class="stars-small">{{ getStars(listing.avgRating) }}</span>
                  <span class="rating-count">{{ listing.avgRating }} ({{ listing.totalReviews }})</span>
                </div>
                <div class="preview-price" v-if="listing.price">From S${{ listing.price }}</div>
                <div class="preview-price text-muted" v-else>Price varies</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="cta-section">
        <div class="cta-card">
          <div class="cta-content">
            <h3 class="cta-title">Ready to get started?</h3>
            <p class="cta-subtitle">Join our community and discover amazing local businesses today</p>
            <div v-if="loadingStats" class="cta-stats">
              <div class="spinner-border text-light" role="status">
                <span class="visually-hidden">Loading statistics...</span>
              </div>
            </div>
            <div v-else class="cta-stats">
              <div class="stat-item">
                <div class="stat-number">{{ statistics.businesses }}+</div>
                <div class="stat-label">Businesses</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-number">{{ statistics.users }}+</div>
                <div class="stat-label">Users</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-number">{{ statistics.categories }}+</div>
                <div class="stat-label">Categories</div>
              </div>
            </div>
            <RouterLink to="/signup" class="btn btn-primary btn-lg cta-button">
              Sign Up Free
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Let your global page bg show */
.background-section { background-color: transparent; }

/* Video darken */
.video-background { position: absolute; inset: 0; z-index: 0; }
.video-darken {
  width: 100%; height: 100%;
  object-fit: cover;
  filter: brightness(0.5) contrast(1.05);
}
.video-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.32); pointer-events: none;  }

/* -------- Minimal, centered grid -------- */
.about-section {
  position: relative;
  padding: 6vh 6% 10vh;
  width: 100%;
}

.about-section::before { content: none; } /* no colored gradient */
.about-section .content { position: relative; z-index: 1; }

/* The grid itself */
.about-grid {
  margin: 0 auto;
  max-width: 1100px;
  display: grid;
  grid-template-columns: repeat( auto-fit, minmax(220px, 1fr) );
  gap: 30px;
  place-items: center;   /* centers items in their cells */
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.category-label {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
}

/* Image cards */
.about-grid img {
  width: 100%;
  max-width: 320px;      /* prevents over-stretch on large screens */
  aspect-ratio: 4 / 3;   /* consistent shape */
  object-fit: cover;
  border-radius: 20px;
  box-shadow: 0 8px 22px rgba(0,0,0,.12);
  opacity: 0;            /* start hidden */
  transform: translateY(10px);
  transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
  cursor: default;
}

/* Invert logos in dark mode so they're visible */
:root.dark-mode .about-grid img {
  filter: invert(1) brightness(1.2);
}

.about-grid img:hover {
  transform: translateY(-6px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

:root.dark-mode .about-grid img:hover {
  filter: invert(1) brightness(1);
}

/* Simple fade-in on scroll (once) */
.about-section.in-view .about-grid .category-item img {
  animation: fadeIn .5s ease-out forwards;
}
.about-section.in-view .about-grid .category-item:nth-child(1) img { animation-delay: .00s; }
.about-section.in-view .about-grid .category-item:nth-child(2) img { animation-delay: .05s; }
.about-section.in-view .about-grid .category-item:nth-child(3) img { animation-delay: .10s; }
.about-section.in-view .about-grid .category-item:nth-child(4) img { animation-delay: .15s; }
.about-section.in-view .about-grid .category-item:nth-child(5) img { animation-delay: .20s; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* About title */
.about-title {
  color: var(--color-text-primary);
}

/* Mission (static) */
.mission {
  margin-top: 36px;
  display: flex;
  justify-content: center;
}
.mission h3 { font-family: "Figtree", sans-serif; }
.mission-text {
  color: var(--color-text-primary);
}
.mission .green { color: #198754; }
.underline {
  border-bottom: 3px solid var(--color-text-primary);
  padding-bottom: 3px;
  display: inline-block;
}

/* Description cards fade-in (minimal) */
.container-description,
.container-description2{
  font-family: "Figtree", sans-serif;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity .5s ease-out, transform .5s ease-out, background-color .25s ease;
  background: var(--color-bg-white);
  color: var(--color-text-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: default;
}
.container-description.fade-in,
.container-description2.fade-in{ opacity: 1; transform: translateY(0); }

.container-description:hover,
.container-description2:hover {
  transform: translateY(-6px);
  background: var(--color-bg-purple-tint);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  transition: transform 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease;
}


/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .about-grid img,
  .container-description,
  .container-description2 {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}

/* Navbar text */
.navbar .nav-link{ color:#fff; font-size:17px; }

/* -------- SOCIAL PROOF SECTION -------- */
.social-proof-section {
  background: var(--color-bg-page);
  position: relative;
}

.social-proof-header {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: 0.2s;
}

/* Testimonial Cards */
.testimonial-card {
  background: var(--color-bg-white);
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 4px 16px rgba(75, 42, 166, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s ease-out forwards;
  border: 1px solid var(--color-border);
}

.testimonial-card:nth-child(1) { animation-delay: 0.3s; }
.testimonial-card:nth-child(2) { animation-delay: 0.4s; }
.testimonial-card:nth-child(3) { animation-delay: 0.5s; }

.testimonial-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(75, 42, 166, 0.15);
}

.testimonial-card .stars {
  color: #ffc107;
  font-size: 1.25rem;
  letter-spacing: 2px;
}

.testimonial-text {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  margin-bottom: 1.5rem;
  font-style: italic;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.author-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-lighter));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
}

.author-name {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 0.95rem;
}

.author-location {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

/* Featured Preview Cards */
.featured-preview-section {
  margin-top: 3rem;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: 0.6s;
}

.featured-preview-section h3 {
  color: var(--color-text-primary);
}

.preview-card {
  background: var(--color-bg-white);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(75, 42, 166, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
  border: 1px solid var(--color-border);
  height: 100%;
}

.preview-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(75, 42, 166, 0.15);
}

.preview-image {
  height: 180px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image.has-image {
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}

.fitness-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.food-bg {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.arts-bg {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.education-bg {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.preview-badge {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.4rem 0.9rem;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-content {
  padding: 1.25rem;
}

.preview-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary);
}

.preview-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.preview-rating .stars-small {
  color: #ffc107;
  font-size: 0.9rem;
}

.preview-rating .rating-count {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.preview-price {
  font-weight: 700;
  color: var(--color-primary);
  font-size: 1.1rem;
}

/* CTA Section */
.cta-section {
  margin-top: 4rem;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: 0.7s;
}

.cta-card {
  background: linear-gradient(135deg, #4b2aa6 0%, #6d3cc4 100%);
  border-radius: 1.5rem;
  padding: 3rem 2rem;
  text-align: center;
  box-shadow: 0 12px 32px rgba(75, 42, 166, 0.25);
  position: relative;
  overflow: hidden;
}

/* Dark mode: use dark background instead of purple */
:root.dark-mode .cta-card {
  background: var(--color-bg-white);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--color-border);
}

/* Ensure text is always white in light mode, adapt in dark mode */
.cta-card * {
  color: white !important;
}

:root.dark-mode .cta-card * {
  color: var(--color-text-primary) !important;
}

.cta-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}

.cta-content {
  position: relative;
  z-index: 1;
}

.cta-title {
  color: white;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.cta-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.cta-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.3);
}

.cta-button {
  background: white !important;
  color: #4b2aa6 !important;
  font-weight: 600;
  padding: 0.875rem 3rem;
  border: none !important;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  text-decoration: none;
}

.cta-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  background: rgba(255, 255, 255, 0.95) !important;
  color: #4b2aa6 !important;
}

/* Dark mode button styling */
:root.dark-mode .cta-button {
  background: var(--color-primary) !important;
  color: white !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

:root.dark-mode .cta-button:hover {
  background: var(--color-primary-hover) !important;
  color: white !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile Responsive */
@media (max-width: 991.98px) {
  .stat-divider {
    display: none;
  }

  .cta-stats {
    gap: 1.5rem;
  }

  .preview-image {
    height: 160px;
  }
}

@media (max-width: 767.98px) {
  .testimonial-card {
    padding: 1.5rem;
  }

  .testimonial-text {
    font-size: 0.95rem;
  }

  .cta-card {
    padding: 2rem 1.5rem;
  }

  .cta-title {
    font-size: 1.5rem;
  }

  .cta-subtitle {
    font-size: 1rem;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  .stat-label {
    font-size: 0.8rem;
  }

  .cta-button {
    padding: 0.75rem 2rem;
    font-size: 1rem;
  }

  .preview-image {
    height: 140px;
  }

  .preview-content {
    padding: 1rem;
  }
}

@media (max-width: 575.98px) {
  .social-proof-header h2 {
    font-size: 1.75rem;
  }

  .social-proof-header p {
    font-size: 1rem;
  }

  .featured-preview-section h3 {
    font-size: 1.25rem;
  }
}
</style>
