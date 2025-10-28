<script>
import NavBar from './NavBar.vue'
import { useDarkMode } from '@/composables/useDarkMode'
import { useRoute, useRouter } from 'vue-router'
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase"

export default {
    components: { NavBar },

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

    methods: {
        onTypeChange() {
            this.showFeedbackCategory = this.feedbackForm.feedbackType === 'feedback'
            this.showIssueCategory = this.feedbackForm.feedbackType === 'report issue'
            this.feedbackForm.category = ''
        },

        async submitForm(e) {
            e.preventDefault();

            try {
                let targetCollection = "";

                // Decide which collection based on type
                if (this.feedbackForm.feedbackType === "feedback") {
                    targetCollection = "feedback";
                } else if (this.feedbackForm.feedbackType === "report issue") {
                    targetCollection = "issues";
                } else {
                    throw new Error("Invalid feedback type");
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
                    createdAt: serverTimestamp(),
                };

                await addDoc(collection(db, targetCollection), docData);

                alert("Thank you for your submission!");

                // Reset form
                this.feedbackForm = {
                    feedbackType: '',
                    category: '',
                    context: '',
                    userRole: '',
                    name: '',
                    email: '',
                    phone: '',
                    description: '',
                };

                this.showFeedbackCategory = false;
                this.showIssueCategory = false;

            } catch (error) {
                console.error("Error saving submission:", error);
                alert("Something went wrong. Please try again.");
            }
        },
    },
}
</script>

<template>
    <NavBar />

    <div class="container my-5">
        <h2 class="text-center mb-4">Share Feedback or Report an Issue</h2>

        <form @submit="submitForm" class="border rounded p-4 shadow-sm bg-light">
            <!-- Type + Category -->
            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label" for="feedbackType">Type</label>
                    <select class="form-select" id="feedbackType" v-model="feedbackForm.feedbackType"
                        @change="onTypeChange" required>
                        <option disabled value="">Select type</option>
                        <option value="feedback">Feedback</option>
                        <option value="report issue">Report Issue</option>
                    </select>
                </div>

                <div class="col-md-6" v-if="showFeedbackCategory || showIssueCategory">
                    <label class="form-label">Category</label>
                    <select class="form-select" v-model="feedbackForm.category" required>
                        <option disabled value="">Select category</option>
                        <template v-if="showFeedbackCategory">
                            <option v-for="cat in feedbackCategories" :key="cat.value" :value="cat.value">{{ cat.text }}
                            </option>
                        </template>
                        <template v-else>
                            <option v-for="cat in issueCategories" :key="cat.value" :value="cat.value">{{ cat.text }}
                            </option>
                        </template>
                    </select>
                </div>
            </div>

            <!-- Context -->
            <div class="mb-3">
                <label class="form-label" for="context">Page or section this relates to</label>
                <select class="form-select" id="context" v-model="feedbackForm.context" required>
                    <option disabled value="">Select context</option>
                    <option v-for="ctx in contexts" :key="ctx.value" :value="ctx.value">{{ ctx.text }}</option>
                </select>
            </div>

            <!-- Name + Role -->
            <div class="row mb-3">
                <div class="col-md-6">
                    <label for="name" class="form-label">Name</label>
                    <input type="text" class="form-control" id="name" v-model="feedbackForm.name"
                        placeholder="Your name" required />
                </div>

                <div class="col-md-6">
                    <label for="userRole" class="form-label">I’m a</label>
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
                    <label for="email" class="form-label">Email (optional)</label>
                    <input type="email" class="form-control" id="email" v-model="feedbackForm.email"
                        placeholder="you@example.com" />
                </div>

                <div class="col-md-6">
                    <label for="phone" class="form-label">Phone (optional)</label>
                    <input type="tel" class="form-control" id="phone" v-model="feedbackForm.phone"
                        placeholder="+65 9123 4567" />
                </div>
            </div>

            <!-- Description -->
            <div class="mb-3">
                <label for="description" class="form-label">Description</label>
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
form {
    max-width: 800px;
    margin: 0 auto;
}
</style>