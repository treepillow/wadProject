<template>
  <AuthLayout :isSignup="true">
    <div class="signup-wrapper">
      <div class="signup-card">
        <img src="@/assets/homes_logo.png" alt="Homes Logo" class="logo" />
        <h2>Sign Up</h2>

        <!-- Flow 2: Google Signup -->
        <button type="button" @click="handleGoogleSignup" class="google-btn">
          <img src="@/assets/google-logo.png" alt="Google Logo" class="google-icon" />
          Sign up with Google
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

            <!-- OTP Verification Section -->
            <div class="otp-container">
              <!-- Send OTP Button -->
              <button
                v-if="!otpSent"
                type="button"
                class="btn-otp"
                @click="sendOTP"
                :disabled="sendingOTP || !signup.phone"
              >
                {{ sendingOTP ? 'Sending...' : 'Send OTP' }}
              </button>

              <!-- OTP Input and Verify Button -->
              <div v-if="otpSent && !otpVerified" class="otp-verify-group">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  v-model="enteredOTP"
                  maxlength="6"
                  class="otp-input"
                />
                <button
                  type="button"
                  class="btn-verify"
                  @click="verifyOTP"
                  :disabled="enteredOTP.length !== 6"
                >
                  Verify
                </button>
                <button
                  type="button"
                  class="btn-resend"
                  @click="resendOTP"
                >
                  Resend OTP
                </button>
              </div>

              <!-- Verification Status -->
              <div v-if="otpVerified" class="otp-verified">
                <span class="checkmark">✓</span> Phone verified
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

            <div v-if="addrError" class="text-danger small mt-1">{{ addrError }}</div>
            <div v-if="addrWarning" class="text-warning small mt-1">{{ addrWarning }}</div>
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

            <button type="submit" class="popup-submit">Save & Continue</button>
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
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default {
  name: "Signup",
  components: { AuthLayout },
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

      // OTP states
      otpSent: false,
      otpVerified: false,
      enteredOTP: "",
      sendingOTP: false,

      // Address errors/warnings
      addrError: "",
      addrWarning: "",

      // Image modal
      showImageModal: false,
    };
  },
  methods: {
    showNotification(message, type = "danger") {
      alert(`${type.toUpperCase()}: ${message}`);
    },

    // Signup Methods
    async handleGoogleSignup() {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        await setDoc(doc(db, "users", user.uid), {
          username: user.displayName,
          email: user.email,
          profilePicture: user.photoURL,
          createdAt: serverTimestamp(),
        });

        this.signup.username = user.displayName || "";
        this.signup.email = user.email || "";
        this.signup.isGoogle = true;
        this.currentUserUid = user.uid;

        this.showDetailsPopup = true;
      } catch (err) {
        this.showNotification(`Google sign-in failed: ${err.message}`);
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

        this.showDetailsPopup = true;
      } catch (err) {
        this.showNotification(`Signup failed: ${err.message}`);
      }
    },

    async submitDetails() {
      try {
        const uid = this.currentUserUid || auth.currentUser?.uid;
        if (!uid) return this.showNotification("User not found.", "danger");

        await setDoc(
          doc(db, "users", uid),
          {
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
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // this.showNotification("Profile completed successfully!", "success");
        this.showDetailsPopup = false;
        setTimeout(() => this.$router.push("/home"), 1200);
      } catch (err) {
        this.showNotification(`Failed to save profile: ${err.message}`, "danger");
      }
    },

    goToLogin() {
      this.$router.push("/login");
    },

    // OTP Methods
    async sendOTP() {
      if (!this.signup.phone) return this.showNotification("Enter your phone number first.", "danger");
      this.sendingOTP = true;

      try {
        // Mock OTP sending
        await new Promise((resolve) => setTimeout(resolve, 1000));
        this.otpSent = true;
        this.showNotification("OTP sent to your phone.", "success");
      } catch (err) {
        this.showNotification("Failed to send OTP.", "danger");
      } finally {
        this.sendingOTP = false;
      }
    },

    async verifyOTP() {
      if (this.enteredOTP.length !== 6) return this.showNotification("Enter 6-digit OTP.", "danger");

      try {
        // Mock OTP verification
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.otpVerified = true;
        this.showNotification("Phone verified successfully!", "success");
      } catch (err) {
        this.showNotification("OTP verification failed.", "danger");
      }
    },

    async resendOTP() {
      this.otpSent = false;
      this.enteredOTP = "";
      await this.sendOTP();
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
  },
};
</script>



<style scoped>
/* * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; } */
.signup-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  background: rgb(245, 239, 239);
  padding: 20px;
  overflow-y: auto;
}
.signup-card {
  background: #fff;
  border-radius: 20px;
  padding: 30px 40px;
  width: 500px;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  text-align: center;
  position: relative;
  margin-top: 37px;
  max-height: 90vh;
  overflow-y: auto;
  padding-bottom: 40px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.signup-card::-webkit-scrollbar { display: none; }


@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }
@keyframes fadeUp { 0%,100%{opacity:.8} 50%{opacity:.4} }

.signup-card h2 { margin-bottom: 25px; color: black; }
.signup-card form { display: flex; flex-direction: column; gap: 15px; }

.signup-card input, .signup-card select {
  border: none; border-bottom: 2px solid black; border-radius: 0;
  background: transparent; color: black; padding: 10px;
}
.signup-card input::placeholder { color: gray; }

button.signup-btn {
  background: rgb(245, 239, 239);
  border: none; padding: 10px 20px; border-radius: 20px;
  color: black; font-weight: 600; cursor: pointer; transition: transform .2s;
  width: 100%;
}
button.signup-btn:hover { transform: scale(1.05); }

.google-btn { margin-bottom: 10px; background-color: rgb(245, 239, 239); }

.password-container { position: relative; width: 100%; }
.password-container input { width: 100%; padding-right: 40px; }
.toggle-password {
  position: absolute; right: 10px; top: 50%;
  transform: translateY(-50%); cursor: pointer; color: black; font-size: 1.1rem;
}
.toggle-password:hover { opacity: .8; }

.dob-container { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; }
.dob-container label { font-weight: 500; color: #333; }

.profile-picture-container { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.custom-file-upload {
  display: flex; align-items: center; justify-content: center;
  padding: 10px 15px; border: 1px solid #ccc; border-radius: 8px;
  cursor: pointer; background-color: rgb(245, 239, 239);
  color: black; transition: background .2s;
}
.preview-container img.profile-preview {
  width: 60px; height: 60px; border-radius: 50%; object-fit: cover;
  border: 2px solid #ccc; cursor: pointer;
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
  color: black;
  text-decoration: underline;
  font-size: 0.9rem;
}


input {
  padding: 10px; border: none; outline: none; border-bottom: 2px solid black;
  background: transparent; color: black;
}
input::placeholder { color: gray; opacity: 1; }

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
  color: #000;
  text-align: left; /* left-align the text */
  width: 100%;
  margin-bottom: 5px;
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

/* Toast Notification */
.toast {
  min-width: 250px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
}
.toast-body {
  padding: 15px;
  font-weight: 500;
}
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* OTP Verification Styles */
.otp-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.btn-otp {
  padding: 12px 20px;
  background: #4b2aa6;
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-otp:hover:not(:disabled) {
  background: #3d2287;
  transform: scale(1.02);
}

.btn-otp:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.otp-verify-group {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.otp-input {
  flex: 1;
  min-width: 150px;
  padding: 10px;
  border: none;
  border-bottom: 2px solid #4b2aa6 !important;
  background: transparent;
  color: black;
  font-size: 16px;
  letter-spacing: 2px;
  text-align: center;
}

.otp-input:focus {
  outline: none;
  border-bottom-color: #3d2287 !important;
}

.btn-verify {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-verify:hover:not(:disabled) {
  background: #218838;
  transform: scale(1.02);
}

.btn-verify:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-resend {
  padding: 10px 20px;
  background: transparent;
  color: #4b2aa6;
  border: 1px solid #4b2aa6;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-resend:hover {
  background: #4b2aa6;
  color: white;
  transform: scale(1.02);
}

.otp-verified {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
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
  background: black;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 20px;
  cursor: pointer;
}

.popup-cancel {
  background: #ddd;
  border: none;
  padding: 10px;
  border-radius: 20px;
  cursor: pointer;
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

</style>
