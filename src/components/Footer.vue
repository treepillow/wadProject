<template>
  <footer class="app-footer">
    <div class="container py-4">
      <!-- Single centered column for minimalistic design -->
      <div class="text-center">
        <h5 class="footer-title mb-3">Homes</h5>
        <p class="footer-text mb-3">
          Discover and list home-based businesses in your area.
        </p>

        <!-- Quick Links (horizontal) -->
        <div class="footer-links-horizontal mb-3">
          <router-link to="/home">Home</router-link>
          <span class="link-divider">•</span>
          <router-link to="/profile">Profile</router-link>
          <span class="link-divider">•</span>
          <router-link to="/chat">Messages</router-link>
          <span class="link-divider">•</span>
          <router-link to="/feedback">Feedback</router-link>
          <span class="link-divider">•</span>
          <router-link to="/report">Report Issue</router-link>
        </div>

        <hr class="footer-divider my-3" />

        <!-- Copyright -->
        <p class="footer-copyright mb-0">
          &copy; {{ currentYear }} Homes. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'

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

.footer-links-horizontal {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.footer-links-horizontal a {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.footer-links-horizontal a:hover {
  color: var(--color-primary, #5A43C5);
}

:root.dark-mode .footer-links-horizontal a {
  color: #aaa;
}

:root.dark-mode .footer-links-horizontal a:hover {
  color: var(--color-primary, #8B7DE8);
}

.link-divider {
  color: #ccc;
  font-size: 0.8rem;
  user-select: none;
}

:root.dark-mode .link-divider {
  color: #555;
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
  .footer-text {
    font-size: 0.85rem;
  }

  .footer-links-horizontal a {
    font-size: 0.85rem;
  }

  .footer-copyright {
    font-size: 0.8rem;
  }
}
</style>
