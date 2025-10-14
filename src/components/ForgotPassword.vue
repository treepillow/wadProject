<template>
  <AuthLayout :isSignup="false">
    <div class="form-container forgot-form">
      <h2>Forgot Password</h2>

      <!-- STEP 1: Enter Email -->
      <form v-if="step === 1" @submit.prevent="sendOTP">
        <input type="email" placeholder="Email" v-model="email" required />
        <button type="submit" :disabled="loading">
          {{ loading ? 'Sending...' : 'Send OTP' }}
        </button>
        <p class="info-text">
          If the email address is valid, a One Time Password will be sent to your email.
        </p>
        <p>
          <span class="toggle-link" @click="$router.push('/login')">
            Back to Login
          </span>
        </p>
      </form>

      <!-- STEP 2: OTP Verification -->
      <form v-else-if="step === 2" @submit.prevent="verifyOTP">
        <input type="text" placeholder="Enter OTP" v-model="otpInput" required />
        <button type="submit" :disabled="loading">
          {{ loading ? 'Verifying...' : 'Verify OTP' }}
        </button>
        <p class="info-text">
          Please enter the 6-digit code sent to your email.
        </p>
        <p>
          <span class="toggle-link" @click="retry">Didn’t receive it? Retry</span>
        </p>
        <p>
          <span class="toggle-link" @click="$router.push('/login')">
            Back to Login
          </span>
        
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
.containers {
  margin: 0;
  inset: 0;
  padding: 0;
  height: 100vh;
  background: rgba(165, 100, 179, 0.792);
  overflow: hidden;
  display: flex;
  transition: transform 1s ease-in-out;
}

.forms-wrapper {
  position: relative;
  width: 50%;
  height: 100%;
  overflow: hidden;
}

.form-container {
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  padding: 60px 40px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: all 0.8s ease-in-out;
}

.form-container h2 {
  text-align: center;
  margin-bottom: 30px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

input {
  padding: 10px;
  border: none;
  outline: none;
  border-bottom: 2px solid #fff;
  background: transparent;
  color: #fff;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.7);
  opacity: 1;
}

button {
  background: linear-gradient(0deg, #aa67d1, #442569);
  border: none;
  padding: 10px;
  border-radius: 20px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}
button:hover {
  transform: scale(1.05);
}

p {
  font-size: 0.9rem;
  text-align: center;
}

.toggle-link {
  cursor: pointer;
  text-decoration: underline;
  color: #fff;
}

.info-text {
  font-size: 0.85rem;
  text-align: center;
  opacity: 0.8;
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
  color: #fff;
  font-size: 1.1rem;
}

.toggle-password:hover {
  opacity: 0.8;
}

.success-message {
  text-align: center;
}
</style>
