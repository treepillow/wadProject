<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'

let io = null
let descriptionIo = null

onMounted(() => {
  const section = document.querySelector('.about-section')
  if (!section) return

  io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting) {
        section.classList.add('in-view')
        io && io.unobserve(section)
      }
    },
    { root: null, threshold: 0.35, rootMargin: '0px 0px -10% 0px' }
  )

  io.observe(section)

  const containers = document.querySelectorAll('.container-description, .container-description2')
  descriptionIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('fade-in')
      })
    },
    { root: null, threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
  )
  containers.forEach((c) => descriptionIo.observe(c))
})

onBeforeUnmount(() => {
  if (io) io.disconnect()
  if (descriptionIo) descriptionIo.disconnect()
})
</script>

<template>
  <div class="background-section position-relative d-flex align-items-center justify-content-center min-vh-100 w-100">
    <div class="video-background position-absolute top-0 start-0 w-100 h-100">
      <video class="w-100 h-100" autoplay loop muted playsinline style="object-fit: cover; opacity: .35;">
        <source src="../assets/homes_video/homes_video.mp4" type="video/mp4">
      </video>
    </div>

    <nav class="navbar navbar-expand-lg w-100 position-fixed top-0 start-0 z-3 bg-transparent">
      <div class="container-fluid px-4">
        <a class="navbar-brand d-flex align-items-center gap-2 fw-bold" href="#" style="color: purple;">
          <img src="../assets/homes_logo.png" class="img-fluid" style="width: 100px;" />
          <span class="fs-1">Homes</span>
        </a>
        <button class="navbar-toggler ms-auto" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse flex-grow-0" id="navbarNav">
          <ul class="navbar-nav ms-lg-3">
            <li class="nav-item">
              <RouterLink class="nav-link text-white" to="/login">Login</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link text-white" to="/signup">Sign up</RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <div class="content container text-center position-relative px-3">
      <h1 class="text-white fw-semibold" style="font-size: clamp(32px,6vw,70px)">Discover trusted <br class="d-none d-md-block">home businesses</h1>
    </div>
  </div>

  <div class="about-section">
    <img src="../assets/category_images/beauty.jpg" class="rounded" />
    <img src="../assets/category_images/fitness.jpg" class="rounded" />
    <img src="../assets/category_images/arts_craft.jpg" class="rounded" />
    <img src="../assets/category_images/education.jpg" class="rounded" />
    <img src="../assets/category_images/food_drinks.jpg" class="rounded" />

    <div class="content text-center px-3">
      <h1 class="text-white fw-semibold" style="font-size: clamp(32px,6vw,70px)">One app for <br class="d-none d-md-block">all you need</h1>
    </div>

    <div class="mission px-3">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-12 col-md-10 col-lg-8">
            <h3 class="text-center text-white fs-2 fw-semibold">Our mission<br>Discover, support, and grow with<br><span class="green text-success"> trusted home businesses</span></h3>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="description bg-black py-5">
    <div class="container">
      <div class="row justify-content-start mb-4">
        <div class="col-12 col-md-8 col-lg-6">
          <div class="container-description p-4 bg-white rounded-4">
            <h3 class="h3">Discover unique local services</h3>
            <p>From homemade cakes to yoga classes, <br>find autentic services right in your neighbourhood.</p>
          </div>
        </div>
      </div>

      <div class="row justify-content-end mb-4">
        <div class="col-12 col-md-8 col-lg-6">
          <div class="container-description2 p-4 bg-white rounded-4">
            <h3 class="h3">Discover unique local services</h3>
            <p>Every booking supports a real person, <br>not a big corporation helping small businessess thrive</p>
          </div>
        </div>
      </div>

      <div class="row justify-content-start mb-4">
        <div class="col-12 col-md-8 col-lg-6">
          <div class="container-description p-4 bg-white rounded-4">
            <h3 class="h3">Connect instantly</h3>
            <p>Message providers directly, ask questions, customise your order, <br>and book easily - all in one place.</p>
          </div>
        </div>
      </div>

      <div class="row justify-content-end">
        <div class="col-12 col-md-8 col-lg-6">
          <div class="container-description2 p-4 bg-white rounded-4">
            <h3 class="h3">Discover unique local services</h3>
            <p>From homemade cakes to yoga classes, <br>find autentic services right in your neighbourhood.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.background-section{ background-color: black; }
.navbar .nav-link{ color:#fff; font-size:17px; }
.profile-icon{ border:3px solid black; border-radius:50px; }
button{ background-color: transparent; border:1px solid black; }

.about-section {
  position: relative;
  padding: 0 6%;
  width: 100%;
  min-height: 100vh;
  display: block;
}
.about-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 50%, rgba(128, 0, 128, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(0, 128, 0, 0.12) 0%, transparent 50%);
  pointer-events: none;
  z-index: 1;
}
.about-section .content{ position: relative; z-index: 3; }

.about-section img{
  position: absolute;
  width: 280px;
  height: 200px;
  object-fit: cover;
  border-radius: 24px;
  box-shadow: 0 10px 28px rgba(0,0,0,.22);
  opacity: 0;
  transform: scale(.92);
  filter: brightness(1.05);
  transition: filter 0.3s ease;
}
.about-section img:nth-of-type(1){ top: 20%; left: 12%;  --delay: .00s; }
.about-section img:nth-of-type(2){ top: 10%; left: 50%; transform: translateX(-50%) scale(.92); --delay: .30s; }
.about-section img:nth-of-type(3){ top: 20%; right: 12%; --delay: .60s; }
.about-section img:nth-of-type(4){ bottom: 16%; left: 28%; --delay: .90s; }
.about-section img:nth-of-type(5){ bottom: 16%; right: 28%; --delay: 1.20s; }

.about-section.in-view img{
  animation: fly-to-title 1.1s cubic-bezier(.22,.61,.36,1) forwards;
  animation-delay: var(--delay, 0s);
}

@keyframes fly-to-title{
  to{
    top: 45%; left: 50%;
    right: auto; bottom: auto;
    transform: translate(-50%, -50%) scale(.96);
    opacity: 1;
  }
}

.content h1{ font-family: "Figtree", sans-serif; }
.mission::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-radius: 20px;
  background: linear-gradient(90deg, purple, green, purple) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.3;
  animation: borderRotate 3s linear infinite;
}
@keyframes borderRotate { to { background-position: 200% center; } }
.mission{
  position: absolute;
  left: 50%;
  bottom: 6vh;
  transform: translateX(-50%);
  width: 100%;
  display: flex;
  justify-content: center;
}
.mission h3{ font-family: "Figtree", sans-serif; }
.mission h3 .green{ color: green; }

.container-description,
.container-description2{
  font-family: "Figtree", sans-serif;
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.8s ease-out, transform 0.8s ease-out;
}
.container-description.fade-in,
.container-description2.fade-in{ opacity: 1; transform: translateY(0); }

@media (prefers-reduced-motion: reduce) {
  .container-description,
  .container-description2 { opacity: 1; transform: none; transition: none; }
}

.nav-item
{
  font-family: "Poppins", system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif; 
}
</style>
