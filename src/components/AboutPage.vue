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
        section.classList.add('in-view') // start animations
        io && io.unobserve(section)      // run once
      }
    },
    {
      root: null,
      threshold: 0.35,            // fire when ~35% visible
      rootMargin: '0px 0px -10% 0px',
    }
  )

  io.observe(section)

  const containers = document.querySelectorAll('.container-description, .container-description2')
  
  descriptionIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in')
        }
      })
    },
    {
      root: null,
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px',
    }
  )

  containers.forEach((container) => {
    descriptionIo.observe(container)
  })
})

onBeforeUnmount(() => {
  if (io) io.disconnect()
  if (descriptionIo) descriptionIo.disconnect()
})
</script>

<template>
  <div class="background-section">

    <div class="video-background">
      <video autoplay loop muted playsinline>
        <source src="../assets/homes_video/homes_video.mp4" type="video/mp4">
      </video>
    </div>

    <nav class="navbar navbar-expand-lg">
      <a class="navbar-brand" href="#">
        <img src="../assets/homes_logo.png" />Homes
      </a>
      <div class="d-flex ms-auto">
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item">
              <RouterLink to="/signup">Login</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink to="/signup">Sign up</RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <div class="content">
      <h1>Discover trusted <br>home businesses</h1>
    </div>

  </div>

  <div class="about-section">

    <img src="../assets/arts.jpg" class="rounded w-25"></img>
    <img src="../assets/beauty.jpg" class="rounded w-25"></img>
    <img src="../assets/education.jpg" class="rounded w-25"></img>
    <img src="../assets/fitness.jpg" class="rounded w-25"></img>
    <img src="../assets/fooddrinks.jpg" class="rounded w-25"></img>

    <div class="content">
      <h1>One app for <br>all you need</h1>
    </div>
    <div class="mission">
        <h3>Our mission<br>Discover, support, and grow with<br><span class="green"> trusted home businesses</span></h3>
    </div>
  </div>

  <div class="description">
        <div class="container-description">
            <h3>Discover unique local services</h3>
            <p>From homemade cakes to yoga classes, <br>find autentic services right in your neighbourhood.</p>
        </div>

        <div class="container-description2">
            <h3>Discover unique local services</h3>
            <p>Every booking supports a real person, <br>not a big corporation helping small businessess thrive</p>
        </div>

        <div class="container-description">
            <h3>Connect instantly</h3>
            <p>Message providers directly, ask questions, customise your order, <br>and book easily - all in one place.</p>
        </div>

        <div class="container-description2">
            <h3>Discover unique local services</h3>
            <p>From homemade cakes to yoga classes, <br>find autentic services right in your neighbourhood.</p>
        </div>
  </div>

</template>

<style scoped>

    .navbar{
        background-color: transparent; /* Set background color */
        width: 100%;
        position: fixed;
        top: 0;
        left: 0;
        padding: 20px 8%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 4;
    }

    .navbar img
    {
        width: 100px;
    }

    .navbar-brand
    {
        font-size: 50px;
        font-weight: bold;
        color: purple;
    }

    .navbar ul li 
    {
        list-style: none;
        display: inline-block;
        margin-left: 40px;
    }

    .navbar ul li a 
    {
        text-decoration: none;
        color: #fff;
        font-size: 17px;
    }

    .profile-icon
    {
        border: 3px solid black;
        border-radius: 50px;
    }

    .nav-item img
    {
        width: 50px;
    }

    button
    {
        background-color: transparent;
        border: 1px solid black;
    }

    .background-section
    {
        background-color: black;
        position: relative;
        padding: 0 10%;
        width: 100%;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .about-section {
        background-color: black;
        position: relative;
        padding: 0 10%;
        width: 100%;
        height: 100vh;
        display: flex;
        align-items: start;
        justify-content: center;
    }

    .about-section::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 30% 50%, rgba(128, 0, 128, 0.15) 0%, transparent 50%),
                    radial-gradient(circle at 70% 80%, rgba(0, 128, 0, 0.12) 0%, transparent 50%);
        pointer-events: none;
        z-index: 1;
    }
    .content h1{
        text-align: center;
        font-family: "Figtree", sans-serif;
        font-size: 70px;
        color: #fff;
    }
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

    @keyframes borderRotate {
        to { background-position: 200% center; }
    }
    .mission{
        position: absolute;
        left: 50%;
        bottom: 4vh;              /* adjust: 4–12vh to taste */
        transform: translateX(-50%);
        width: 100%;
        display: flex;
        justify-content: center;
    }
    .mission h3
    {
        text-align: center;
        font-family: "Figtree", sans-serif;
        font-size: 50px;
        color: #fff;
    }
    .mission h3 .green
    {
        color: green;
    }
    .video-background video{
        position: absolute;
        width: 100%;
        height: 100%;
        object-fit: cover;
        right: 0;
        bottom: 0;
        opacity: 0.35; 
    }

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

    .about-section .content{ position: relative; z-index: 3; }

    @keyframes fly-to-title{
        to{
            top: 45%; left: 50%;
            right: auto; bottom: auto;
            transform: translate(-50%, -50%) scale(.96);
            opacity: 1;
        }
    }

    @media (prefers-reduced-motion: reduce){
        .about-section.in-view img{ animation: none; opacity: 1; }
    }

    .floating-particles {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        z-index: 2;
        pointer-events: none;
    }

    .floating-particles span {
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        animation: float 15s infinite ease-in-out;
        animation-delay: calc(var(--i) * -2s);
    }

    .floating-particles span:nth-child(1) { left: 15%; top: 20%; }
    .floating-particles span:nth-child(2) { left: 85%; top: 30%; }
    .floating-particles span:nth-child(3) { left: 25%; top: 70%; }
    .floating-particles span:nth-child(4) { left: 75%; top: 60%; }
    .floating-particles span:nth-child(5) { left: 50%; top: 15%; }
    .floating-particles span:nth-child(6) { left: 60%; top: 85%; }

    @keyframes float {
        0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
        50% { transform: translateY(-30px) translateX(20px); opacity: 0.6; }
    }

    .description
    {
        background-color: black;
    }

    .container-description
    {
        background-color: white;
        border-radius: 25px;
        width: 40%;
        padding: 20px;
        margin-left: 5%;
        font-family: "Figtree", sans-serif;
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.8s ease-out, transform 0.8s ease-out;
    }

    .container-description2
    {
        background-color: white;
        border-radius: 25px;
        width: 40%;
        padding: 20px;
        margin-left: 55%;
        font-family: "Figtree", sans-serif;
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.8s ease-out, transform 0.8s ease-out;
    }

    .container-description.fade-in,
    .container-description2.fade-in {
        opacity: 1;
        transform: translateY(0);
    }

    .container-description:nth-of-type(1),
    .container-description2:nth-of-type(1) {
        transition-delay: 0s;
    }

    .container-description:nth-of-type(2),
    .container-description2:nth-of-type(2) {
        transition-delay: 0.15s;
    }

    .container-description:nth-of-type(3),
    .container-description2:nth-of-type(3) {
        transition-delay: 0.3s;
    }

    .container-description:nth-of-type(4),
    .container-description2:nth-of-type(4) {
        transition-delay: 0.45s;
    }

    @media (prefers-reduced-motion: reduce) {
        .container-description,
        .container-description2 {
            opacity: 1;
            transform: none;
            transition: none;
        }
    }

</style>
