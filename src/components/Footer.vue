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

/* Backdrop (semi-transparent overlay) */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);  /* Semi-transparent black */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

/* Modal content container */
.modal-content {
  max-width: 90%;
  width: 600px;  /* Default width */
  position: relative;
  padding: 2rem;
  border-radius: 1rem;
  background: white;  /* White background */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);  /* Light shadow */
}

/* Close button styling */
.btn-close {
  position: absolute;  /* Positioned inside modal-content */
  top: 1rem;  /* Space from the top */
  right: 1rem;  /* Space from the right */
  color: black;
  border: none;
  font-size: 1.5rem;  /* Font size for close button */
  cursor: pointer;
  z-index: 1060;  /* Ensure it's on top of modal content */
}

.btn-close:focus {
  outline: none;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .modal-content {
    width: 90%;    /* Use 90% of the screen width on tablets */
    padding: 1.5rem; /* Less padding on smaller screens */
  }

  .btn-close {
    font-size: 1.2rem; /* Slightly smaller button on smaller screens */
  }
}

@media (max-width: 480px) {
  .modal-content {
    width: 95%;    /* Further reduce modal width on small screens */
    padding: 1rem;  /* Less padding */
  }

  .btn-close {
    font-size: 1rem; /* Even smaller button on very small screens */
  }
}
</style>
