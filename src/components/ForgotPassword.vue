<template>
  <AuthLayout :isSignup="false">
    <div class="login-wrapper">
      <div class="login-card">
        <img src="@/assets/homes_logo.png" alt="Homes Logo" class="logo" />
        <h2>Forgot Password</h2>

        <!-- STEP 1: Enter Email -->
        <form v-if="step === 1" @submit.prevent="sendOTP">
          <input type="email" placeholder="Email" v-model="email" required />
          <button type="submit" :disabled="loading">
            {{ loading ? 'Sending...' : 'Send OTP' }}
          </button>
          <!-- Optional info text can stay below the button -->
          <p class="info-text">
            If the email address is valid, a one-time password (OTP) will be sent to the email.
          </p>
          <p>
            <span class="toggle-link" @click="$router.push('/login')">Back to Login</span>
          </p>
        </form>

        <!-- STEP 2: OTP Verification -->
        <form v-else-if="step === 2" @submit.prevent="verifyOTP">
          <input type="text" placeholder="Enter OTP" v-model="otpInput" required />
          <button type="submit" :disabled="loading">
            {{ loading ? 'Verifying...' : 'Verify OTP' }}
          </button>
          <p class="info-text">Please enter the 6-digit code sent to your email.</p>
          <p>
            <span class="toggle-link" @click="retry">Didn’t receive it? Retry</span>
          </p>
          <p>
            <span class="toggle-link" @click="$router.push('/login')">Back to Login</span>
          </p>
        </form>

        <!-- STEP 3: New Password -->
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

          <button type="submit" :disabled="loading">
            {{ loading ? 'Saving...' : 'Reset Password' }}
          </button>
        </form>

        <!-- STEP 4: Success -->
        <div v-else-if="step === 4" class="success-message">
          <h3>✅ Password Reset Successful</h3>
          <p>You can now log in with your new password.</p>
          <button @click="$router.push('/login')">Go to Login</button>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script>
import AuthLayout from "./AuthLayout.vue";
import { db } from "../firebase";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

export default {
  name: "ForgotPassword",
  components: { AuthLayout },
  data() {
    return {
      email: "",
      otpId: "",
      otpInput: "",
      step: 1,
      password: "",
      passwordConfirm: "",
      showPassword: false,
      loading: false,
    };
  },
  methods: {
    togglePassword() {
      this.showPassword = !this.showPassword;
    },

    async sendOTP() {
      this.loading = true;
      try {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpId = uuidv4();
        this.otpId = otpId;

        await setDoc(doc(db, "password_otps", otpId), {
          email: this.email.toLowerCase(),
          code: otpCode,
          createdAt: serverTimestamp(),
          expiresIn: 5 * 60 * 1000,
        });

        // For now, just log the code — in real app you'd email it
        console.log(`📧 Sending OTP ${otpCode} to ${this.email}`);

        this.step = 2;
      } catch (err) {
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    async verifyOTP() {
      this.loading = true;
      try {
        const ref = doc(db, "password_otps", this.otpId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("OTP expired or invalid");

        const data = snap.data();
        if (data.code === this.otpInput) {
          await deleteDoc(ref);
          this.step = 3;
        } else {
          alert("❌ Incorrect OTP. Please try again.");
        }
      } catch (err) {
        alert(`❌ Verification failed: ${err.message}`);
      } finally {
        this.loading = false;
      }
    },

    retry() {
      this.step = 1;
      this.otpInput = "";
    },

    async resetPassword() {
      if (this.password !== this.passwordConfirm) {
        alert("❌ Passwords do not match.");
        return;
      }
      if (
        this.password.length < 8 ||
        !/\d/.test(this.password) ||
        !/[A-Za-z]/.test(this.password)
      ) {
        alert("❌ Password must be at least 8 characters and include letters and numbers.");
        return;
      }

      this.loading = true;
      try {
        // Normally, you'd use a Firebase Function to verify OTP and reset the password securely
        console.log(`✅ Would reset password for ${this.email} to: ${this.password}`);
        this.step = 4;
      } catch (err) {
        alert(`❌ Reset failed: ${err.message}`);
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
form {
  display: flex;
  flex-direction: column;
  gap: 10px; 
}

h2 {
  margin-bottom: 30px;
}
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: rgb(245, 239, 239);
}

.login-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  width: 500px;
  text-align: center;
}
/* 
.login-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.25);
  transition: all 0.3s ease;
} */

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

button {
  background-color: rgb(245, 239, 239);
  border: none;
  padding: 10px 0;
  border-radius: 20px;
  color: black;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

button:hover {
  transform: scale(1.05);
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

.toggle-password:hover {
  opacity: 0.8;
}

.toggle-link {
  cursor: pointer;
  text-decoration: underline;
  color: black;
}

.info-text {
  font-size: 0.85rem;
  text-align: center;
  opacity: 0.8;
  margin-top: 5px;
}

.success-message {
  text-align: center;
}
</style>