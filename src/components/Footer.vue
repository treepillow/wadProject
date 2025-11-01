<template>
  <footer class="app-footer">
    <div class="container py-4">
      <div class="row g-4">
        <!-- About Section -->
        <div class="col-md-4">
          <h5 class="footer-title mb-3">Homes</h5>
          <p class="footer-text">
            Discover and list home-based businesses in your area. Connect with local entrepreneurs and support your community.
          </p>
        </div>

        <!-- Quick Links -->
        <div class="col-md-4">
          <h5 class="footer-title mb-3">Quick Links</h5>
          <ul class="footer-links">
            <li><router-link to="/home">Home</router-link></li>
            <li><router-link to="/about">About</router-link></li>
            <li><router-link to="/profile">Profile</router-link></li>
            <li><router-link to="/chat">Messages</router-link></li>
          </ul>
        </div>

        <!-- Contact & Social -->
        <div class="col-md-4">
          <h5 class="footer-title mb-3">Contact Us</h5>
          <p class="footer-text mb-2">
            <Icon icon="mdi:email" class="me-2" />
            support@homes.com
          </p>
          <p class="footer-text">
            <Icon icon="mdi:phone" class="me-2" />
            +65 1234 5678
          </p>
        </div>
      </div>

      <hr class="footer-divider my-4" />

      <!-- Copyright -->
      <div class="row">
        <div class="col-12 text-center">
          <p class="footer-copyright mb-0">
            &copy; {{ currentYear }} Homes. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.app-footer {
  background: #f8f9fa;
  color: #333;
  margin-top: auto;
  border-top: 1px solid #e0e0e0;
}

:root.dark-mode .app-footer {
  background: var(--color-bg-secondary, #1a1a2e);
  color: var(--color-text-primary, #e0e0e0);
  border-top: 1px solid #2a2a3e;
}

.footer-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-primary, #5A43C5);
  margin-bottom: 1rem;
}

:root.dark-mode .footer-title {
  color: var(--color-primary, #8B7DE8);
}

.footer-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #666;
  margin-bottom: 0.5rem;
}

:root.dark-mode .footer-text {
  color: #aaa;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links li {
  margin-bottom: 0.5rem;
}

.footer-links a {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.footer-links a:hover {
  color: var(--color-primary, #5A43C5);
}

:root.dark-mode .footer-links a {
  color: #aaa;
}

:root.dark-mode .footer-links a:hover {
  color: var(--color-primary, #8B7DE8);
}

.footer-divider {
  border-color: #e0e0e0;
  opacity: 0.5;
}

:root.dark-mode .footer-divider {
  border-color: #2a2a3e;
}

.footer-copyright {
  font-size: 0.85rem;
  color: #999;
}

:root.dark-mode .footer-copyright {
  color: #777;
}

@media (max-width: 767.98px) {
  .app-footer {
    text-align: center;
  }

  .footer-links {
    display: inline-block;
    text-align: left;
  }
}
</style>
