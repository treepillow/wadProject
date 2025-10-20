<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import NavBar from './NavBar.vue'

let io = null
let descriptionIo = null

onMounted(() => {
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
    <div class="content text-center px-3 mb-4">
      <h1 class="about-title fw-semibold" style="font-size: clamp(32px,6vw,70px)">
        One app for <br class="d-none d-md-block">all you need
      </h1>
    </div>

    <!-- Clean, centered, responsive grid -->
    <div class="about-grid">
      <img src="../assets/category_images/fitness.png" alt="Fitness" />
      <img src="../assets/category_images/arts_craft.png" alt="Arts & Craft" />
      <img src="../assets/category_images/education.png" alt="Education" />
      <img src="../assets/category_images/food_drinks.png" alt="Food & Drinks" />
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
  gap: 20px;
  place-items: center;   /* centers items in their cells */
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
  cursor: pointer;
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
.about-section.in-view .about-grid img {
  animation: fadeIn .5s ease-out forwards;
}
.about-section.in-view .about-grid img:nth-child(1){ animation-delay: .00s; }
.about-section.in-view .about-grid img:nth-child(2){ animation-delay: .05s; }
.about-section.in-view .about-grid img:nth-child(3){ animation-delay: .10s; }
.about-section.in-view .about-grid img:nth-child(4){ animation-delay: .15s; }
.about-section.in-view .about-grid img:nth-child(5){ animation-delay: .20s; }

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
</style>
