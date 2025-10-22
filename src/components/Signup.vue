<template>
  <AuthLayout :isSignup="true">
    <!-- Custom Notification Toast -->
    <div v-if="notification.show" :class="['notification-toast', notification.type]">
      <div class="notification-content">
        <span class="notification-icon">{{ notification.type === 'danger' ? '⚠️' : '✓' }}</span>
        <span class="notification-message">{{ notification.message }}</span>
        <button class="notification-close" @click="closeNotification">✕</button>
      </div>
    </div>

    <div class="signup-wrapper">
      <div class="signup-card">
        <img src="@/assets/homes_logo.png" alt="Homes Logo" class="logo" />
        <h2>Sign Up</h2>

        <!-- Flow 2: Google Signup -->
        <button type="button" @click="handleGoogleSignup" class="google-btn">
          <img src="@/assets/google-logo.png" alt="Google Logo" class="google-icon" />
          <span>Sign up with Google</span>
        </button>

        <div class="divider"><span>or</span></div>

        <!-- Flow 1: Normal Signup -->
        <form @submit.prevent="handleBasicSignup">
          <input type="text" placeholder="Username" v-model="signup.username" required />
          <input type="email" placeholder="Email" v-model="signup.email" required />
          <input type="password" placeholder="Password" v-model="signup.password" required />
          <button type="submit" class="signup-btn">Sign Up</button>
        </form>

        <div class="login-link">
          <span class="toggle-link" @click="goToLogin">Already have an account? Login</span>
        </div>
      </div>

      <!-- Popup for additional info (same for both flows) -->
      <div v-if="showDetailsPopup" class="popup-overlay">
        <div class="popup-card">
          <h3>Complete Your Profile</h3>
          <form @submit.prevent="submitDetails">
            <!-- Show password only for normal signup -->
            <div v-if="!signup.isGoogle" class="password-container">
              <input :type="showPassword ? 'text' : 'password'" v-model="signup.password" placeholder="Password" required />
              <span class="toggle-password" @click="showPassword = !showPassword">
                <i :class="showPassword ? 'fa fa-eye-slash' : 'fa fa-eye'"></i>
              </span>
            </div>
            <!-- ask them to enter a password if they signup using google -->
            <div v-else-if="signup.isGoogle" class="password-container">
              <input :type="showPassword ? 'text' : 'password'" v-model="signup.password" placeholder="Password" required />
              <span class="toggle-password" @click="showPassword = !showPassword">
                <i :class="showPassword ? 'fa fa-eye-slash' : 'fa fa-eye'"></i>
              </span>
            </div>

            <!-- all additional info -->
            <!-- Names -->
          <input type="text" placeholder="First Name" v-model="signup.firstName" required />
            <input type="text" placeholder="Last Name" v-model="signup.lastName" required />

            <!-- DOB -->
            <div class="dob-container">
              <label style="color: #000; font-weight: 500; margin-bottom: 5px;">Date of Birth:</label>
              <input type="date" v-model="signup.dateOfBirth" required />
            </div>

            <!-- Phone -->
            <input
              type="text"
              placeholder="Phone Number (include +65, e.g. +65XXXXXXXX)"
              v-model="signup.phone"
              required
            />

            <!-- Email Verification Section -->
            <div class="verification-container">
              <div class="verification-info">
                <p class="info-text">
                  <strong>Email Verification Required</strong><br>
                  We'll send a verification link to <strong>{{ signup.email }}</strong>
                </p>
              </div>

              <!-- Send Verification Button -->
              <button
                v-if="!emailVerificationSent"
                type="button"
                class="btn-verify-email"
                @click="sendEmailVerification"
              >
                Send Verification Email
              </button>

              <!-- Waiting for Verification -->
              <div v-if="emailVerificationSent && !emailVerified" class="verification-pending">
                <div class="pending-message">
                  <span class="spinner">⏳</span>
                  <div>
                    <p><strong>Verification email sent!</strong></p>
                    <p class="small-text">Please check your inbox and click the verification link.</p>
                    <p class="small-text">This page will automatically update once verified.</p>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn-resend"
                  @click="resendEmailVerification"
                >
                  Resend Email
                </button>
              </div>

              <!-- Verification Status -->
              <div v-if="emailVerified" class="email-verified">
                <span class="checkmark">✓</span> Email verified successfully!
              </div>
            </div>

            <!-- Address -->
            <div class="address-container">
              <label class="address-label">Address:</label>

            <!-- Property Type Toggle -->
            <div class="property-type-toggle">
              <button
                type="button"
                class="toggle-btn"
                :class="{ active: !signup.isLanded }"
                @click="signup.isLanded = false"
              >
                HDB / Condominium
              </button>
              <button
                type="button"
                class="toggle-btn"
                :class="{ active: signup.isLanded }"
                @click="togglePropertyType"
              >
                Landed Property
              </button>
            </div>

            <!-- BLK/House No. - Required for non-landed -->
            <input
              type="text"
              v-model="signup.blk"
              :placeholder="signup.isLanded ? 'House No. (optional)' : 'Block Number (required)'"
              :required="!signup.isLanded"
            />
            <input
              type="text"
              v-model="signup.street"
              placeholder="Street (e.g. Tampines Ave 9)"
              required
            />
            <input
              type="text"
              v-model="signup.postal"
              placeholder="Postal Code (e.g. 521485)"
              maxlength="6"
              required
            />
            <!-- Unit optional for landed -->
            <input
              type="text"
              v-model="signup.unit"
              :placeholder="signup.isLanded ? 'Unit Number (optional)' : 'Unit Number (e.g. #09-142, optional)'"
            />

            <div v-if="validatingAddress" class="validation-loading">
              <span class="spinner-small">⏳</span> Validating address...
            </div>
            <div v-if="addrError" class="validation-error">
              <span>⚠️</span> {{ addrError }}
            </div>
            <div v-if="addrWarning && !addrError" class="validation-success">
              {{ addrWarning }}
            </div>
          </div>

          <!-- Profile Picture -->
          <div class="profile-picture-container">
            <span class="profile-label">Set a profile picture:</span>
            <input type="file" id="profilePicture" accept="image/*" @change="handleProfilePicture" />
            <div v-if="signup.profilePreview" class="preview-container">
              <img
                :src="signup.profilePreview"
                alt="Profile Preview"
                class="profile-preview"
                @click="showImageModal = true"
              />
            </div>
          </div>

          <!-- Image Modal -->
          <div v-if="showImageModal" class="image-modal" @click="showImageModal = false">
            <img :src="signup.profilePreview" alt="Full Image Preview" />
          </div>

            <button
              type="submit"
              class="popup-submit"
              :disabled="!emailVerified"
              :title="!emailVerified ? 'Please verify your email first' : ''"
            >
              {{ emailVerified ? 'Save & Continue' : 'Verify Email to Continue' }}
            </button>
            <button type="button" class="popup-cancel" @click="showDetailsPopup = false">Cancel</button>
          </form>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script>
import AuthLayout from "./AuthLayout.vue";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useDarkMode } from "@/composables/useDarkMode";

export default {
  name: "Signup",
  components: { AuthLayout },
  setup() {
    // Initialize dark mode
    useDarkMode();
    return {};
  },
  async mounted() {
    // Check if user is already logged in
    const user = auth.currentUser;
    if (user) {
      // Check if user has completed profile
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.phone && userData.address) {
          // User is already logged in and has complete profile
          this.$router.push("/home");
        }
      }
    }
  },
  beforeUnmount() {
    // Clean up verification check interval
    if (this.verificationCheckInterval) {
      clearInterval(this.verificationCheckInterval);
      this.verificationCheckInterval = null;
    }
  },
  watch: {
    // Watch for postal code changes and validate with OneMap API
    'signup.postal': {
      handler(newPostal) {
        // Clear previous timeout
        if (this.validationTimeout) {
          clearTimeout(this.validationTimeout);
        }

        if (newPostal && newPostal.length === 6) {
          // Debounce validation by 500ms
          this.validationTimeout = setTimeout(() => {
            this.validateAddress();
          }, 500);
        } else {
          this.addrError = "";
          this.addrWarning = "";
        }
      },
      immediate: false
    },
    // Watch for block number changes
    'signup.blk': {
      handler() {
        // Clear previous timeout
        if (this.validationTimeout) {
          clearTimeout(this.validationTimeout);
        }

        if (this.signup.postal && this.signup.postal.length === 6) {
          // Debounce validation by 500ms to avoid too many API calls while typing
          this.validationTimeout = setTimeout(() => {
            this.validateAddress();
          }, 500);
        }
      },
      immediate: false
    },
    // Watch for street name changes
    'signup.street': {
      handler() {
        // Clear previous timeout
        if (this.validationTimeout) {
          clearTimeout(this.validationTimeout);
        }

        if (this.signup.postal && this.signup.postal.length === 6) {
          // Debounce validation by 500ms
          this.validationTimeout = setTimeout(() => {
            this.validateAddress();
          }, 500);
        }
      },
      immediate: false
    }
  },
  data() {
    return {
      signup: {
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        phone: "",
        isGoogle: false,
        isLanded: false,
        blk: "",
        street: "",
        postal: "",
        unit: "",
        profilePreview: null,
        profileFile: null,
      },
      showDetailsPopup: false,
      showPassword: false,
      currentUserUid: null,
      googleLoading: false,

      // Email verification states
      emailVerificationSent: false,
      emailVerified: false,
      checkingVerification: false,
      verificationCheckInterval: null,

      // Address errors/warnings
      addrError: "",
      addrWarning: "",
      validatingAddress: false,
      validationTimeout: null,

      // Image modal
      showImageModal: false,

      // Custom notification
      notification: {
        show: false,
        message: '',
        type: 'danger'
      }
    };
  },
  methods: {
    showNotification(message, type = "danger") {
      this.notification = {
        show: true,
        message: message,
        type: type
      };

      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.notification.show = false;
      }, 5000);
    },

    closeNotification() {
      this.notification.show = false;
    },

    // Signup Methods
    async handleGoogleSignup() {
      // Prevent multiple popup attempts
      if (this.googleLoading) return;
      this.googleLoading = true;

      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user already has a complete profile
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Check if user has completed profile (has phone and address)
          if (userData.phone && userData.address) {
            this.showNotification("This account already exists. Redirecting to login...", "danger");
            // Sign out and redirect to login
            await auth.signOut();
            setTimeout(() => {
              this.$router.push("/login");
            }, 2000);
            return;
          }
        }

        // Store temporary data for profile completion - DO NOT create Firestore doc yet
        this.signup.username = user.displayName || "";
        this.signup.email = user.email || "";
        this.signup.profilePreview = user.photoURL || "";
        this.signup.isGoogle = true;
        this.currentUserUid = user.uid;

        // Google accounts are automatically verified by Firebase
        // But we still need to check manually in case
        await user.reload();
        this.emailVerified = user.emailVerified;
        this.emailVerificationSent = user.emailVerified; // If already verified, mark as sent

        this.showDetailsPopup = true;
      } catch (err) {
        // Ignore if user simply closed the popup or cancelled
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          this.googleLoading = false;
          return;
        }
        this.showNotification(`Google sign-in failed: ${err.message}`, "danger");
      } finally {
        this.googleLoading = false;
      }
    },

    async handleBasicSignup() {
      try {
        if (!this.signup.username || !this.signup.email || !this.signup.password) {
          return this.showNotification("Please fill in all fields.", "danger");
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          this.signup.email,
          this.signup.password
        );

        this.currentUserUid = userCredential.user.uid;
        this.signup.isGoogle = false;

        // Check actual verification status from Firebase
        await userCredential.user.reload();
        this.emailVerified = userCredential.user.emailVerified;
        this.emailVerificationSent = false;

        // Create initial user document
        await setDoc(doc(db, "users", userCredential.user.uid), {
          username: this.signup.username,
          email: this.signup.email,
          createdAt: serverTimestamp(),
        });

        this.showDetailsPopup = true;
      } catch (err) {
        // Handle specific error codes
        if (err.code === 'auth/email-already-in-use') {
          this.showNotification("This email is already registered. Please login instead.", "danger");
          // Redirect to login after a delay
          setTimeout(() => {
            this.$router.push("/login");
          }, 2500);
        } else if (err.code === 'auth/weak-password') {
          this.showNotification("Password is too weak. Please use at least 6 characters.", "danger");
        } else if (err.code === 'auth/invalid-email') {
          this.showNotification("Invalid email address. Please check and try again.", "danger");
        } else {
          this.showNotification(`Signup failed: ${err.message}`, "danger");
        }

        // Make sure popup doesn't show on error
        this.showDetailsPopup = false;
      }
    },

    async submitDetails() {
      try {
        const uid = this.currentUserUid || auth.currentUser?.uid;
        if (!uid) return this.showNotification("User not found.", "danger");

        // Validate address first before submitting
        if (!this.signup.isLanded) {
          // For HDB/Condo, block is required
          if (!this.signup.blk) {
            this.addrError = "Block number is required for HDB/Condominium.";
            return;
          }
        }

        if (!this.signup.street || !this.signup.postal) {
          this.addrError = "Street and postal code are required.";
          return;
        }

        // Validate address with OneMap API
        await this.validateAddress();

        // If there's an error, don't proceed
        if (this.addrError) {
          this.showNotification("Please provide a valid Singapore address.", "danger");
          return;
        }

        // Check if email is verified (skip for Google users as they're auto-verified)
        const user = auth.currentUser;
        if (user && !user.emailVerified && !this.signup.isGoogle) {
          this.showNotification("Please verify your email before completing your profile.", "danger");
          return;
        }

        // Check if user profile already exists and is complete
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          // If profile is already complete, redirect to home
          if (userData.phone && userData.address && userData.firstName) {
            this.showNotification("Profile already exists. Redirecting to home...", "success");
            this.showDetailsPopup = false;
            setTimeout(() => this.$router.push("/home"), 1500);
            return;
          }
        }

        await setDoc(
          userDocRef,
          {
            email: this.signup.email,
            username: this.signup.username,
            firstName: this.signup.firstName,
            lastName: this.signup.lastName,
            dateOfBirth: this.signup.dateOfBirth,
            phone: this.signup.phone,
            address: {
              isLanded: this.signup.isLanded,
              blk: this.signup.blk,
              street: this.signup.street,
              postal: this.signup.postal,
              unit: this.signup.unit,
            },
            profilePicture: this.signup.profilePreview || null,
            emailVerified: user.emailVerified,
            profileComplete: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        this.showNotification("Profile completed successfully!", "success");
        this.showDetailsPopup = false;
        setTimeout(() => this.$router.push("/home"), 1500);
      } catch (err) {
        this.showNotification(`Failed to save profile: ${err.message}`, "danger");
      }
    },

    goToLogin() {
      this.$router.push("/login");
    },

    // Email Verification Methods
    async sendEmailVerification() {
      try {
        const user = auth.currentUser;

        if (!user) {
          this.showNotification("No user logged in. Please sign up first.", "danger");
          return;
        }

        // Force reload user data to get latest emailVerified status
        await user.reload();

        if (user.emailVerified) {
          this.emailVerified = true;
          this.emailVerificationSent = true;
          this.showNotification("Email is already verified!", "success");
          return;
        }

        // Send verification email with custom action code settings
        const actionCodeSettings = {
          // URL you want to redirect back to after verification
          url: window.location.origin + '/email-verified',
          handleCodeInApp: false
        };

        await sendEmailVerification(user, actionCodeSettings);

        this.emailVerificationSent = true;
        this.emailVerified = false; // Explicitly set to false
        this.showNotification("Verification email sent! Please check your inbox (and spam folder) and click the link.", "success");

        // Start checking for verification
        this.startVerificationCheck();
      } catch (err) {
        if (err.code === 'auth/too-many-requests') {
          this.showNotification("Too many requests. Please wait a moment before trying again.", "danger");
        } else if (err.code === 'auth/missing-email') {
          this.showNotification("User email is missing. Please contact support.", "danger");
        } else {
          this.showNotification(`Failed to send verification email: ${err.message}`, "danger");
        }
      }
    },

    startVerificationCheck() {
      // Check every 3 seconds if email is verified
      this.verificationCheckInterval = setInterval(async () => {
        await this.checkEmailVerification();
      }, 3000);
    },

    async checkEmailVerification() {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Reload user to get latest emailVerified status
        await user.reload();

        if (user.emailVerified) {
          this.emailVerified = true;
          this.showNotification("Email verified successfully!", "success");

          // Stop checking
          if (this.verificationCheckInterval) {
            clearInterval(this.verificationCheckInterval);
            this.verificationCheckInterval = null;
          }
        }
      } catch (err) {
        // Silently handle errors in background check
      }
    },

    async resendEmailVerification() {
      this.emailVerificationSent = false;
      await this.sendEmailVerification();
    },

    // Misc Methods
    togglePropertyType() {
      this.signup.isLanded = !this.signup.isLanded;
    },

    handleProfilePicture(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.signup.profileFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.signup.profilePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    // OneMap API Address Validation
    async validateAddress() {
      this.addrError = "";
      this.addrWarning = "";
      this.validatingAddress = true;

      try {
        const { blk, street, postal, isLanded } = this.signup;

        // Validate required fields
        if (!postal || postal.length !== 6) {
          this.addrError = "Please enter a valid 6-digit postal code.";
          this.validatingAddress = false;
          return;
        }

        if (!street || street.trim().length === 0) {
          this.addrError = "Please enter a street name.";
          this.validatingAddress = false;
          return;
        }

        if (!isLanded && (!blk || blk.trim().length === 0)) {
          this.addrError = "Please enter a block number for HDB/Condominium.";
          this.validatingAddress = false;
          return;
        }

        // Search by postal code first to get the official address
        const postalResponse = await fetch(
          `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postal}&returnGeom=N&getAddrDetails=Y&pageNum=1`
        );

        if (!postalResponse.ok) {
          throw new Error('Failed to connect to address validation service');
        }

        const postalData = await postalResponse.json();

        if (postalData.found === 0 || !postalData.results || postalData.results.length === 0) {
          this.addrError = "Postal code not found in Singapore. Please check and try again.";
          this.validatingAddress = false;
          return;
        }

        // Get the first result (most accurate)
        const result = postalData.results[0];
        const officialAddress = result.ADDRESS.toUpperCase();
        const officialBlk = result.BLK_NO || '';
        const officialRoad = result.ROAD_NAME ? result.ROAD_NAME.toUpperCase() : '';

        // Validate block number if not landed
        if (!isLanded && blk) {
          const inputBlk = blk.trim().toUpperCase().replace(/BLK\s*/gi, '');
          const officialBlkClean = officialBlk.toUpperCase().replace(/BLK\s*/gi, '');

          if (officialBlk && inputBlk !== officialBlkClean) {
            this.addrError = "Address not found. Please check your block, street name, and postal code.";
            this.validatingAddress = false;
            return;
          }
        }

        // Validate street name - be very strict about matching
        const inputStreet = street.trim().toUpperCase();

        // Normalize street names for comparison (remove common variations)
        const normalizeStreet = (str) => {
          return str
            .replace(/\bAVE\b/g, 'AVENUE')
            .replace(/\bAV\b/g, 'AVENUE')
            .replace(/\bST\b/g, 'STREET')
            .replace(/\bRD\b/g, 'ROAD')
            .replace(/\bDR\b/g, 'DRIVE')
            .replace(/\bCL\b/g, 'CLOSE')
            .replace(/\bCRES\b/g, 'CRESCENT')
            .replace(/\bTER\b/g, 'TERRACE')
            .replace(/\s+/g, ' ')
            .trim();
        };

        const normalizedInput = normalizeStreet(inputStreet);
        const normalizedOfficial = normalizeStreet(officialRoad);

        // Extract street number if present (e.g., "AVENUE 9" -> 9)
        const extractStreetNumber = (str) => {
          const match = str.match(/\b(\d+[A-Z]?)\b/);
          return match ? match[1] : null;
        };

        const inputNumber = extractStreetNumber(normalizedInput);
        const officialNumber = extractStreetNumber(normalizedOfficial);

        // If both have numbers, they MUST match exactly
        if (inputNumber && officialNumber && inputNumber !== officialNumber) {
          this.addrError = "Address not found. Please check your block, street name, and postal code.";
          this.validatingAddress = false;
          return;
        }

        // Check for exact or very close match
        const isExactMatch = normalizedInput === normalizedOfficial;
        const similarity = this.calculateStreetSimilarity(normalizedInput, normalizedOfficial);

        // Must be at least 80% similar and contain the same street name base
        if (!isExactMatch && similarity < 0.8) {
          this.addrError = "Address not found. Please check your block, street name, and postal code.";
          this.validatingAddress = false;
          return;
        }

        // Success - show confirmation with official address
        this.addrWarning = `✓ Valid address: ${result.ADDRESS}`;
        this.validatingAddress = false;

      } catch (error) {
        this.addrError = "Unable to verify address. Please check your internet connection and try again.";
        this.validatingAddress = false;
      }
    },

    // Helper function to calculate string similarity
    calculateStreetSimilarity(str1, str2) {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;

      if (longer.length === 0) return 1.0;

      const editDistance = this.levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    },

    // Levenshtein distance algorithm
    levenshteinDistance(str1, str2) {
      const matrix = [];

      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }

      return matrix[str2.length][str1.length];
    },
  },
};
</script>



<style scoped>
/* * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; } */
.signup-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--color-bg-main);
  padding: 20px;
  overflow-y: auto;
}
.signup-card {
  background: var(--color-bg-white);
  border-radius: 20px;
  padding: 40px;
  width: 500px;
  max-width: 500px;
  box-shadow: var(--shadow-lg);
  text-align: center;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.signup-card::-webkit-scrollbar { display: none; }


@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }
@keyframes fadeUp { 0%,100%{opacity:.8} 50%{opacity:.4} }

.signup-card h2 { margin-bottom: 25px; color: var(--color-text-primary); }
.signup-card form { display: flex; flex-direction: column; gap: 15px; }

.signup-card input, .signup-card select {
  border: none; border-bottom: 2px solid var(--color-border-dark); border-radius: 0;
  background: transparent; color: var(--color-text-primary); padding: 10px;
}
.signup-card input::placeholder { color: var(--color-text-light); }

button.signup-btn {
  background: var(--color-bg-main);
  border: none; padding: 10px 20px; border-radius: 20px;
  color: var(--color-text-primary); font-weight: 600; cursor: pointer; transition: transform .2s;
  width: 100%;
}
button.signup-btn:hover { transform: scale(1.05); }

.google-btn { margin-bottom: 10px; background-color: var(--color-bg-white); border: 1px solid var(--color-border); color: var(--color-text-primary); }

.password-container { position: relative; width: 100%; }
.password-container input { width: 100%; padding-right: 40px; }
.toggle-password {
  position: absolute; right: 10px; top: 50%;
  transform: translateY(-50%); cursor: pointer; color: var(--color-text-primary); font-size: 1.1rem;
}
.toggle-password:hover { opacity: .8; }

.dob-container { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; }
.dob-container label { font-weight: 500; color: var(--color-text-primary); }

.profile-picture-container { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.custom-file-upload {
  display: flex; align-items: center; justify-content: center;
  padding: 10px 15px; border: 1px solid var(--color-border); border-radius: 8px;
  cursor: pointer; background-color: var(--color-bg-main);
  color: var(--color-text-primary); transition: background .2s;
}
.preview-container img.profile-preview {
  width: 60px; height: 60px; border-radius: 50%; object-fit: cover;
  border: 2px solid var(--color-border); cursor: pointer;
}

.image-modal {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: zoom-out;
  z-index: 1000;
}

.image-modal img {
  max-width: 90%;
  max-height: 90%;
  border-radius: 10px;
}

.toggle-link {
  cursor: pointer;
  color: var(--color-text-primary);
  text-decoration: underline;
  font-size: 0.9rem;
}


input {
  padding: 10px; border: none; outline: none; border-bottom: 2px solid var(--color-border-dark);
  background: transparent; color: var(--color-text-primary);
}
input::placeholder { color: var(--color-text-light); opacity: 1; }

.login-link {
  /* position: sticky; */
  bottom: 10px;
  text-align: center;
}

.dob-container select {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #ccc;
  cursor: pointer;
  background-color: rgb(245, 239, 239);
  color: black;              /* text color */
}

.custom-file-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 15px;
  border: 1px solid #ccc;
  border-radius: 8px;
  cursor: pointer;
  background-color: rgb(245, 239, 239);
  color: black;       
  transition: background 0.2s;
}

.logo {
  width: 80px;
  margin-bottom: 20px;
}

.address-container input {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 10px;
  border-bottom: 2px solid black;
  background: transparent;
  color: black;
}

.address-label {
  font-weight: 500;
  color: var(--color-text-primary);
  text-align: left;
  width: 100%;
  margin-bottom: 5px;
}

/* Address Validation Messages */
.validation-loading {
  padding: 8px 12px;
  background: var(--color-bg-purple-tint);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner-small {
  animation: pulse 1.5s ease-in-out infinite;
}

.validation-error {
  padding: 8px 12px;
  background: #fff5f5;
  border: 1px solid var(--color-error);
  border-left: 3px solid var(--color-error);
  border-radius: 8px;
  color: var(--color-error);
  font-size: 0.875rem;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.validation-success {
  padding: 8px 12px;
  background: #f0fff4;
  border: 1px solid var(--color-success);
  border-left: 3px solid var(--color-success);
  border-radius: 8px;
  color: var(--color-success);
  font-size: 0.875rem;
  margin-top: 8px;
  font-weight: 500;
}
.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background-color: white;
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 20px;
  cursor: pointer;
  width: 100%;
  font-weight: 600;
  margin-bottom: 15px;
  transition: all 0.2s; 
}

.google-btn:hover {
  background-color: #f7f7f7;
  transform: scale(1.05); 
}


.google-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

/* Property Type Toggle */
.property-type-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  width: 100%;
}
.toggle-btn {
  flex: 1;
  padding: 10px 15px;
  border: none;
  background: rgb(245, 239, 239);
  color: black;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.4;
}
.toggle-btn:hover {
  transform: scale(1.02);
  opacity: 0.6;
}
.toggle-btn.active {
  opacity: 1;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Custom Notification Toast */
.notification-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  min-width: 320px;
  max-width: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: slideInRight 0.3s ease-out;
  z-index: 10000;
  border-left: 4px solid;
}

.notification-toast.danger {
  border-left-color: var(--color-error);
  background: #fff5f5;
}

.notification-toast.success {
  border-left-color: var(--color-success);
  background: #f0fff4;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
}

.notification-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  color: var(--color-text-primary);
  font-weight: 500;
  font-size: 0.938rem;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.notification-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--color-text-primary);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Email Verification Styles */
.verification-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 15px;
  padding: 15px;
  background: var(--color-bg-purple-tint);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.verification-info {
  margin-bottom: 5px;
}

.info-text {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-primary);
  line-height: 1.6;
}

.info-text strong {
  color: var(--color-primary);
}

.btn-verify-email {
  padding: 12px 20px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  width: 100%;
}

.btn-verify-email:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.verification-pending {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pending-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  background: var(--color-bg-white);
  border-radius: 10px;
  border: 2px dashed var(--color-primary);
}

.pending-message p {
  margin: 0;
  color: var(--color-text-primary);
}

.small-text {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.spinner {
  font-size: 24px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.btn-resend {
  padding: 10px 20px;
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  width: 100%;
}

.btn-resend:hover {
  background: var(--color-primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.email-verified {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 15px;
  background: #d4edda;
  color: #155724;
  border-radius: 20px;
  font-weight: 600;
  animation: fadeIn 0.5s ease;
}

.checkmark {
  font-size: 20px;
  font-weight: bold;
  color: #28a745;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.popup-card {
  background: #fff;
  border-radius: 20px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh; /* fits screen height */
  overflow-y: auto; /* scroll only inside card */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

/* Hide scrollbar but keep scrollable for popup */
.popup-card {
  max-height: 85vh;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

/* Chrome, Safari, Opera */
.popup-card::-webkit-scrollbar {
  display: none;
}


.popup-card h3 {
  margin-bottom: 20px;
  color: #333;
}

.popup-card form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.popup-card input {
  padding: 10px;
  border: none;
  border-bottom: 2px solid #000;
  background: transparent;
}

.popup-submit {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: all var(--transition-normal);
}

.popup-submit:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.popup-submit:disabled {
  background: #ccc;
  color: #666;
  cursor: not-allowed;
  opacity: 0.6;
}

.popup-cancel {
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  padding: 10px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: all var(--transition-normal);
}

.popup-cancel:hover {
  background: var(--color-bg-purple-tint);
  transform: translateY(-1px);
}

.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999; 
  font-size: 14px;
  margin: 20px 0;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid #ccc;
  margin: 0 10px;
}

/* Mobile responsive styles */
@media (max-width: 767.98px) {
  .signup-card,
  .popup-card {
    width: 90%;
    max-width: 400px;
    padding: 30px 25px;
  }

  .logo {
    width: 60px;
    margin-bottom: 15px;
  }

  h2, h3 {
    font-size: 1.5rem;
  }

  button {
    font-size: 0.875rem;
  }

  .google-btn {
    font-size: 0.875rem;
  }

  .toggle-btn {
    font-size: 0.875rem;
    padding: 8px 12px;
  }
}

@media (max-width: 575.98px) {
  .signup-wrapper {
    padding: 10px;
  }

  .signup-card,
  .popup-card {
    width: 95%;
    padding: 25px 20px;
  }

  .logo {
    width: 50px;
  }

  h2, h3 {
    font-size: 1.25rem;
    margin-bottom: 15px;
  }

  form {
    gap: 12px;
  }

  input, select {
    font-size: 0.875rem;
  }

  .profile-picture-container {
    flex-direction: column;
  }

  .preview-container img.profile-preview {
    width: 50px;
    height: 50px;
  }

  .verification-container {
    padding: 12px;
  }

  .info-text {
    font-size: 0.85rem;
  }

  .pending-message {
    flex-direction: column;
    gap: 8px;
  }

  .spinner {
    font-size: 20px;
  }

  .notification-toast {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
  }

  .notification-content {
    padding: 12px 16px;
  }

  .notification-message {
    font-size: 0.875rem;
  }
}

</style>
