<script>
import { useDarkMode } from '@/composables/useDarkMode'
import { useRoute, useRouter } from 'vue-router'
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { db } from "@/firebase"

export default {
  setup() {
    useDarkMode()
    const route = useRoute()
    const router = useRouter()
    return { route, router }
  },

  data() {
    return {
      feedbackForm: {
        feedbackType: '',
        category: '',
        context: '',
        userRole: '',
        name: '',
        email: '',
        phone: '',
        description: '',
      },
      showFeedbackCategory: false,
      showIssueCategory: false,
      feedbackCategories: [
        { value: 'businessDiscovery', text: 'Business Discovery' },
        { value: 'listingExperience', text: 'Listing Experience' },
        { value: 'profileDashboard', text: 'Profile / Dashboard' },
        { value: 'designUsability', text: 'Design & Usability' },
        { value: 'featureSuggestions', text: 'Feature Suggestions' },
        { value: 'communityEngagement', text: 'Community / Engagement' },
        { value: 'other', text: 'Other' },
      ],
      issueCategories: [
        { value: 'brokenLinks', text: 'Broken Links / Buttons' },
        { value: 'listingProblems', text: 'Listing Problems' },
        { value: 'profileIssues', text: 'Profile Issues' },
        { value: 'searchFilterIssues', text: 'Search / Filter Issues' },
        { value: 'contentImageIssues', text: 'Content / Image Issues' },
        { value: 'accessibilityIssues', text: 'Accessibility Issues' },
        { value: 'inappropriateContent', text: 'Inappropriate or Misleading Content' },
        { value: 'other', text: 'Other' },
      ],
      contexts: [
        { value: 'homePage', text: 'Home Page' },
        { value: 'businessListingsPage', text: 'Business Listings Page' },
        { value: 'businessProfilePage', text: 'Business Profile Page' },
        { value: 'myAccountDashboard', text: 'My Account / Dashboard' },
        { value: 'mobileExperience', text: 'Mobile Experience' },
        { value: 'other', text: 'Other' },
      ],
    }
  },

  mounted() {
    this.prefillUserContact()
  },

  computed: {
    // Returns true if any of the user contact fields are auto-filled
    isUserDataPresent() {
      return !!(this.feedbackForm.name || this.feedbackForm.email || this.feedbackForm.phone)
    }
  },

  methods: {
    onTypeChange() {
      this.showFeedbackCategory = this.feedbackForm.feedbackType === 'feedback'
      this.showIssueCategory = this.feedbackForm.feedbackType === 'report issue'
      this.feedbackForm.category = ''
    },

    async prefillUserContact() {
      const auth = getAuth()

      onAuthStateChanged(auth, async (user) => {
        if (!user) return // Not logged in

        try {
          const userRef = doc(db, 'users', user.uid)
          const userSnap = await getDoc(userRef)

          if (userSnap.exists()) {
            const userData = userSnap.data()

            // Autofill name, email, phone
            this.feedbackForm.name = userData.username || user.displayName || ''
            this.feedbackForm.email = userData.email || user.email || ''
            this.feedbackForm.phone = userData.phone || ''
          }
        } catch (e) {
          console.error('Failed to prefill user contact info:', e)
        }
      })
    },

    async submitForm(e) {
      e.preventDefault();

      try {
        let targetCollection = '';
        if (this.feedbackForm.feedbackType === 'feedback') {
          targetCollection = 'feedback';
        } else if (this.feedbackForm.feedbackType === 'report issue') {
          targetCollection = 'issues';
        } else {
          throw new Error('Invalid feedback type');
        }

        const docData = {
          type: this.feedbackForm.feedbackType,
          category: this.feedbackForm.category,
          context: this.feedbackForm.context,
          userRole: this.feedbackForm.userRole,
          name: this.feedbackForm.name,
          email: this.feedbackForm.email || null,
          phone: this.feedbackForm.phone || null,
          description: this.feedbackForm.description,
          reviewed: false,
          createdAt: serverTimestamp(),
        };

        // Add new feedback or issue document to Firestore
        await addDoc(collection(db, targetCollection), docData);

        alert('Thank you for your submission!');

        // Reset form (except user data)
        this.feedbackForm.feedbackType = '';
        this.feedbackForm.category = '';
        this.feedbackForm.context = '';
        this.feedbackForm.userRole = '';
        this.feedbackForm.description = '';

        this.showFeedbackCategory = false;
        this.showIssueCategory = false;
      } catch (error) {
        console.error('Error saving submission:', error);
        alert('Something went wrong. Please try again.');
      }
    },
  },
}
</script>

<template>
  <div class="container my-5">
    <form @submit="submitForm" class="feedback-form border shadow-sm w-300 mx-auto p-4 bg-white">
      <h2 class="text-center fw-bold pt-3 px-4 rounded mb-0"
        style="color: rgb(75, 42, 166); font-size: 32px; line-height: 1.2; padding-top: 0.25rem; padding-bottom: 0.25rem;">
        Share Feedback or Report an Issue
      </h2>
      <div style="
        width: 100%;      
        height: 4px; 
        border-radius: 2px;
        background: linear-gradient(90deg, rgb(75, 42, 166), #9b6cff);
        margin-top: 4px;
        margin-bottom: 1rem; /* remove bottom margin */
      "></div>
      <!-- Type + Category -->
      <div class="row mb-3">
        <div class="col-md-6">
          <label class="form-label d-flex align-items-center" for="feedbackType">
            Type
            <Icon icon="mdi:clipboard-text-outline" class="ms-1" />
          </label>
          <select class="form-select" id="feedbackType" v-model="feedbackForm.feedbackType" @change="onTypeChange"
            required>
            <option disabled value="">Select type</option>
            <option value="feedback">Feedback</option>
            <option value="report issue">Report Issue</option>
          </select>
        </div>

        <div class="col-md-6" v-if="showFeedbackCategory || showIssueCategory">
          <label class="form-label d-flex align-items-center">
            Category
            <Icon icon="mdi:folder-outline" class="ms-1" />
          </label>
          <select class="form-select" v-model="feedbackForm.category" required>
            <option disabled value="">Select category</option>
            <template v-if="showFeedbackCategory">
              <option v-for="cat in feedbackCategories" :key="cat.value" :value="cat.value">
                {{ cat.text }}
              </option>
            </template>
            <template v-else>
              <option v-for="cat in issueCategories" :key="cat.value" :value="cat.value">
                {{ cat.text }}
              </option>
            </template>
          </select>
        </div>
      </div>

      <!-- Context -->
      <div class="mb-3">
        <label class="form-label d-flex align-items-center" for="context">
          Page or section this relates to
          <Icon icon="mdi:compass-outline" class="ms-1" />
        </label>
        <select class="form-select" id="context" v-model="feedbackForm.context" required>
          <option disabled value="">Select context</option>
          <option v-for="ctx in contexts" :key="ctx.value" :value="ctx.value">
            {{ ctx.text }}
          </option>
        </select>
      </div>

      <!-- Name + Role -->
      <div class="row mb-3">
        <div class="col-md-6">
          <label for="name" class="form-label d-flex align-items-center">
            Name
            <Icon icon="mdi:account-outline" class="ms-1" />
          </label>
          <input type="text" class="form-control" id="name" v-model="feedbackForm.name" :readonly="isUserDataPresent"
            :style="isUserDataPresent ? 'background-color: #e9ecef; cursor: not-allowed;' : ''" placeholder="Your name"
            required />
        </div>

        <div class="col-md-6">
          <label for="userRole" class="form-label d-flex align-items-center">
            I’m a
            <Icon icon="mdi:account-group-outline" class="ms-1" />
          </label>
          <select class="form-select" id="userRole" v-model="feedbackForm.userRole" required>
            <option disabled value="">Select role</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      <!-- Email + Phone -->
      <div class="row mb-3">
        <div class="col-md-6">
          <label for="email" class="form-label d-flex align-items-center">
            Email
            <Icon icon="mdi:email-outline" class="ms-1" />
          </label>
          <input type="email" class="form-control" id="email" v-model="feedbackForm.email" :readonly="isUserDataPresent"
            :style="isUserDataPresent ? 'background-color: #e9ecef; cursor: not-allowed;' : ''"
            placeholder="you@example.com" required />
        </div>

        <div class="col-md-6">
          <label for="phone" class="form-label d-flex align-items-center">
            Phone
            <Icon icon="mdi:phone-outline" class="ms-1" />
          </label>
          <input type="tel" class="form-control" id="phone" v-model="feedbackForm.phone" :readonly="isUserDataPresent"
            :style="isUserDataPresent ? 'background-color: #e9ecef; cursor: not-allowed;' : ''"
            placeholder="+65 9123 4567" required />
        </div>
      </div>

      <!-- Description -->
      <div class="mb-3">
        <label for="description" class="form-label d-flex align-items-center">
          Description
          <Icon icon="mdi:text-box-outline" class="ms-1" />
        </label>
        <textarea class="form-control" id="description" v-model="feedbackForm.description" rows="4"
          placeholder="Describe your feedback or issue..." required></textarea>
      </div>

      <div class="text-center">
        <button type="submit" class="btn btn-primary px-4">Submit</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.feedback-form {
  max-width: 800px;
  margin: 0 auto;
  background-color: #ffffff;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

form label {
  color: rgb(75, 42, 166);
  font-weight: 600;
  font-size: 16px;
}
</style>