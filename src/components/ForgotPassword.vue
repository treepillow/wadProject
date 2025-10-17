<template>
  <AuthLayout :isSignup="false">
    <div class="signup-wrapper">
      <div class="signup-card">
        <img src="@/assets/homes_logo.png" alt="Homes Logo" class="logo" />
        <h2>Forgot Password</h2>

        <!-- STEP 1: Enter Phone Number -->
        <form v-if="step === 1" @submit.prevent="sendOTP">
          <input
            type="text"
            class="phone-input"
            placeholder="Phone Number (include +65, e.g. +65XXXXXXXX)"
            v-model="phone"
            required
          />
          <button type="submit" class="signup-btn" :disabled="loading">
            {{ loading ? 'Sending...' : 'Send OTP' }}
          </button>
          <p class="info-text">
            Enter your registered phone number. We'll send a fake OTP via console for now.
          </p>
          <p>
            <span class="toggle-link" @click="$router.push('/login')">Back to Login</span>
          </p>
        </form>

        <!-- STEP 2: Verify OTP -->
        <form v-else-if="step === 2" @submit.prevent="verifyOTP">
          <div class="otp-verify-group">
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              v-model="enteredOTP"
              maxlength="6"
              class="otp-input"
              required
            />
            <button type="submit" class="btn-verify" :disabled="loading || enteredOTP.length !== 6">
              {{ loading ? 'Verifying...' : 'Verify' }}
            </button>
          </div>
          <button type="button" class="btn-resend" @click="resendOTP" :disabled="loading">
            Resend OTP
          </button>
          <p>
            <span class="toggle-link" @click="$router.push('/login')">Back to Login</span>
          </p>
        </form>

        <!-- STEP 3: Reset Password -->
        <form v-else-if="step === 3" @submit.prevent="resetPassword">
          <div class="password-container">
            <input
              :type="showPassword ? 'text' : 'password'"
              placeholder="New Password"
              v-model="password"
              required
            />
            <span class="toggle-password" @click="togglePassword">
              <i :class="showPassword ? 'fa fa-eye-slash' : 'fa fa-eye'"></i>
            </span>
          </div>

          <div class="password-container">
            <input
              :type="showPassword ? 'text' : 'password'"
              placeholder="Confirm New Password"
              v-model="passwordConfirm"
              required
            />
          </div>

          <p class="info-text">
            Password must be at least 8 characters, including letters and numbers.
          </p>

          <button type="submit" class="signup-btn" :disabled="loading">
            {{ loading ? 'Saving...' : 'Reset Password' }}
          </button>
        </form>

        <!-- STEP 4: Success -->
        <div v-else-if="step === 4" class="success-message">
          <h3>✅ Password Reset Successful</h3>
          <p>You can now log in with your new password.</p>
          <button class="signup-btn" @click="$router.push('/login')">Go to Login</button>
        </div>

        <!-- Toast Notification -->
        <div class="position-fixed top-0 end-0 p-3" style="z-index: 9999">
          <div
            v-if="notification.show"
            class="toast show"
            :class="`bg-${notification.type} text-white`"
            role="alert"
          >
            <div class="toast-body d-flex align-items-center justify-content-between">
              <span>{{ notification.message }}</span>
              <button
                type="button"
                class="btn-close btn-close-white ms-3"
                @click="notification.show = false"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script>
import AuthLayout from "./AuthLayout.vue";

export default {
  name: "ForgotPassword",
  components: { AuthLayout },
  data() {
    return {
      step: 1,
      phone: "",
      enteredOTP: "",
      generatedOTP: null,
      password: "",
      passwordConfirm: "",
      showPassword: false,
      loading: false,
      notification: { show: false, message: "", type: "" },
    };
  },
  methods: {
    showNotification(message, type = "danger") {
      this.notification = { show: true, message, type };
      setTimeout(() => (this.notification.show = false), 4000);
    },

    isValidSGPhone(phone) {
      const pattern = /^(?:\+65)?[89]\d{7}$/;
      return pattern.test(phone);
    },

    // STEP 1: Generate fake OTP
    async sendOTP() {
      if (!this.isValidSGPhone(this.phone)) {
        this.showNotification("Please enter a valid Singapore phone number.", "danger");
        return;
      }
      this.loading = true;
      try {
        this.generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`📲 [DEV] OTP for ${this.phone}: ${this.generatedOTP}`);
        this.showNotification("Fake OTP generated. Check console.", "success");
        this.step = 2;
      } finally {
        this.loading = false;
      }
    },

    // STEP 2: Verify fake OTP
    async verifyOTP() {
      if (!this.generatedOTP) {
        this.showNotification("OTP session expired. Please resend.", "danger");
        return;
      }
      this.loading = true;
      try {
        if (this.enteredOTP === this.generatedOTP) {
          this.showNotification("OTP verified!", "success");
          this.step = 3;
        } else {
          this.showNotification("Invalid OTP. Please try again.", "danger");
        }
      } finally {
        this.loading = false;
      }
    },

    async resendOTP() {
      this.enteredOTP = "";
      this.generatedOTP = null;
      await this.sendOTP();
    },

    // STEP 3: Fake password reset (simulate updating a "user" in localStorage)
    async resetPassword() {
      if (this.password !== this.passwordConfirm) {
        this.showNotification("Passwords do not match.", "danger");
        return;
      }
      if (this.password.length < 8 || !/\d/.test(this.password) || !/[A-Za-z]/.test(this.password)) {
        this.showNotification(
          "Password must be at least 8 characters long and include both letters and numbers.",
          "danger"
        );
        return;
      }

      this.loading = true;
      try {
        // 📝 Simulate a user database using localStorage
        const users = JSON.parse(localStorage.getItem("fake_users") || "{}");
        users[this.phone] = { password: this.password };
        localStorage.setItem("fake_users", JSON.stringify(users));

        console.log(`✅ [DEV] Updated password for ${this.phone}: ${this.password}`);
        this.showNotification("Password reset successfully!", "success");
        this.step = 4;
      } finally {
        this.loading = false;
      }
    },

    togglePassword() {
      this.showPassword = !this.showPassword;
    },
  },
};
</script>

<style scoped>
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
  scrollbar-width: none;
}
.signup-card::-webkit-scrollbar { display: none; }

.logo {
  width: 80px;
  margin-bottom: 20px;
}

input {
  padding: 10px;
  border: none;
  outline: none;
  border-bottom: 2px solid black;
  background: transparent;
  color: black;
}

input::placeholder {
  color: gray;
  opacity: 1;
}

button.signup-btn {
  background: rgb(245, 239, 239);
  border: none;
  margin-top: 5px;
  padding: 10px 20px;
  border-radius: 20px;
  color: black;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  width: 100%;
}
button.signup-btn:hover { transform: scale(1.05); }

.toggle-link {
  cursor: pointer;
  text-decoration: underline;
  color: black;
  font-size: 0.9rem;
}

.info-text {
  font-size: 0.85rem;
  text-align: center;
  opacity: 0.8;
  margin-top: 5px;
}

.password-container {
  position: relative;
  width: 100%;
}

.password-container input {
  width: 100%;
  padding-right: 40px;
}

.toggle-password {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: black;
  font-size: 1.1rem;
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

.btn-verify {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
}
.btn-verify:hover:not(:disabled) { background: #218838; transform: scale(1.02); }

.btn-resend {
  padding: 10px 20px;
  background: transparent;
  color: #4b2aa6;
  border: 1px solid #4b2aa6;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}
.btn-resend:hover {
  background: #4b2aa6;
  color: white;
  transform: scale(1.02);
}

.success-message {
  text-align: center;
}
.phone-input{
  margin-top: 10px;
  width:100%;
}
</style>
