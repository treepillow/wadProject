<template>
  <div class="review-unlock-page">
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-8 col-lg-6">
          <div class="unlock-card shadow-lg">
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary mb-3"></div>
              <p class="text-muted">Verifying your review code...</p>
            </div>

            <!-- Success State -->
            <div v-else-if="verified" class="text-center py-4">
              <div class="success-icon mb-4">
                <Icon icon="mdi:check-circle" style="font-size: 64px; color: #28a745;" />
              </div>
              <h3 class="mb-3">Review Unlocked!</h3>
              <p class="text-muted mb-4">
                You can now leave a review for <strong>{{ listingName }}</strong>
              </p>
              <button class="btn btn-primary btn-lg" @click="goToListing">
                View Listing & Leave Review
              </button>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="text-center py-4">
              <div class="error-icon mb-4">
                <Icon icon="mdi:alert-circle" style="font-size: 64px; color: #dc3545;" />
              </div>
              <h3 class="mb-3">Unable to Unlock</h3>
              <p class="text-danger mb-4">{{ errorMessage }}</p>
              <button class="btn btn-secondary" @click="goToHome">
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { auth, db } from '@/firebase'
import { verifyReviewCode, markReviewCodeAsUsed } from '@/utils/reviewCode'
import { doc, getDoc } from 'firebase/firestore'
import { useToast } from '@/composables/useToast'

export default {
  name: 'ReviewUnlock',
  components: { Icon },

  setup() {
    const route = useRoute()
    const router = useRouter()
    const toast = useToast()

    const loading = ref(true)
    const verified = ref(false)
    const error = ref(false)
    const errorMessage = ref('')
    const listingName = ref('')
    const listingId = ref('')

    onMounted(async () => {
      const code = route.query.code
      listingId.value = route.params.listingId

      if (!listingId.value || !code) {
        error.value = true
        errorMessage.value = 'Invalid review link. Missing listing ID or code.'
        loading.value = false
        return
      }

      const user = auth.currentUser

      if (!user) {
        // User not logged in - redirect to login with return URL
        toast.info('Please log in to unlock this review')
        router.push({
          name: 'login',
          query: { redirect: `/review/${listingId.value}?code=${code}` }
        })
        return
      }

      try {
        // Fetch listing details
        const listingDoc = await getDoc(doc(db, 'allListings', listingId.value))
        if (listingDoc.exists()) {
          listingName.value = listingDoc.data().businessName || 'this listing'
        }

        // Verify the code
        const result = await verifyReviewCode(code, listingId.value, user.uid, db)

        if (result.valid) {
          // Mark the code as used
          await markReviewCodeAsUsed(listingId.value, user.uid, db)
          verified.value = true
        } else {
          error.value = true
          errorMessage.value = result.message
        }
      } catch (err) {
        console.error('Error verifying review code:', err)
        error.value = true
        errorMessage.value = 'An error occurred while verifying your code. Please try again.'
      } finally {
        loading.value = false
      }
    })

    function goToListing() {
      // Navigate to home with listing drawer open
      router.push({ path: '/home', query: { listing: listingId.value } })
    }

    function goToHome() {
      router.push('/home')
    }

    return {
      loading,
      verified,
      error,
      errorMessage,
      listingName,
      goToListing,
      goToHome
    }
  }
}
</script>

<style scoped>
.review-unlock-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.unlock-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
}

.success-icon, .error-icon {
  animation: scaleIn 0.3s ease-out;
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

@media (max-width: 575.98px) {
  .unlock-card {
    padding: 30px 20px;
  }
}
</style>
