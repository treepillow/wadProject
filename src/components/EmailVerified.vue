<template>
  <div class="email-verified-wrapper">
    <div class="verified-card">
      <div class="success-icon">✓</div>
      <h1>Email Verified Successfully!</h1>
      <p class="message">Your email has been verified. You can now close this tab and continue with the signup process.</p>
      <div class="instructions">
        <ol>
          <li>Close this tab</li>
          <li>Return to the signup page</li>
          <li>Complete your profile to finish registration</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script>
import { useDarkMode } from '@/composables/useDarkMode'

export default {
  name: 'EmailVerified',
  setup() {
    useDarkMode()
    return {}
  }
}
</script>

<style scoped>
.email-verified-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--color-bg-main);
  padding: 20px;
}

.verified-card {
  background: var(--color-bg-white);
  border-radius: 20px;
  padding: 60px 40px;
  max-width: 600px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
}

.success-icon {
  width: 100px;
  height: 100px;
  background: var(--color-success);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 30px;
  font-size: 60px;
  color: white;
  font-weight: bold;
  animation: scaleIn 0.5s ease;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

h1 {
  color: var(--color-text-primary);
  font-size: 2rem;
  margin-bottom: 20px;
  font-weight: 700;
}

.message {
  color: var(--color-text-primary);
  font-size: 1.125rem;
  line-height: 1.6;
  margin-bottom: 30px;
}

.instructions {
  background: var(--color-bg-purple-tint);
  border-radius: 12px;
  padding: 25px;
  border: 1px solid var(--color-border);
}

.instructions ol {
  text-align: left;
  margin: 0;
  padding-left: 20px;
}

.instructions li {
  color: var(--color-text-primary);
  font-size: 1rem;
  margin-bottom: 10px;
  line-height: 1.5;
}

.instructions li:last-child {
  margin-bottom: 0;
}

/* Mobile responsive */
@media (max-width: 767.98px) {
  .verified-card {
    padding: 40px 30px;
  }

  h1 {
    font-size: 1.5rem;
  }

  .message {
    font-size: 1rem;
  }

  .success-icon {
    width: 80px;
    height: 80px;
    font-size: 48px;
  }
}

@media (max-width: 575.98px) {
  .email-verified-wrapper {
    padding: 15px;
  }

  .verified-card {
    padding: 30px 20px;
  }

  h1 {
    font-size: 1.25rem;
  }

  .instructions {
    padding: 20px;
  }

  .instructions li {
    font-size: 0.938rem;
  }
}
</style>
