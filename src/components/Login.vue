<template>
  <AuthLayout :isSignup="false">
    <div class="login-wrapper">
      <div class="login-card">
        <img src="@/assets/homes_logo.png" alt="Homes Logo" class="logo" />
        <h2>Log in</h2>

        <!-- Google Sign-In Button -->
        <button type="button" @click="handleGoogleSignup" class="google-btn">
          <img src="@/assets/google-logo.png" alt="Google Logo" class="google-icon" />
          <span>Sign in with Google</span>
        </button>

        <div class="divider">
          <span>or</span>
        </div>
        
        <!-- Email / Username Login -->
        <form @submit.prevent="handleLogin">
          <input
            type="text"
            placeholder="Email or Username"
            v-model="login.email"
            required
          />

          <!-- Password input with eye toggle -->
          <div class="password-container">
            <input
              :type="showPassword ? 'text' : 'password'"
              placeholder="Password"
              v-model="login.password"
              required
            />
            <span class="toggle-password" @click="togglePassword">
              <i :class="showPassword ? 'fa fa-eye-slash' : 'fa fa-eye'"></i>
            </span>
          </div>

          <button type="submit">Log in</button>
          <p>
            <span class="toggle-link" @click="$router.push('/forgotpassword')">
              Forgot password?
            </span>
          </p>
          <p>
            <span class="toggle-link" @click="goToSignup">
              Create an account
            </span>
          </p>
        </form>
      </div>
    </div>
  </AuthLayout>
</template>

<script>
import AuthLayout from "./AuthLayout.vue";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
  collection,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { useDarkMode } from "@/composables/useDarkMode";

export default {
  name: "Login",
  components: { AuthLayout },
  setup() {
    // Initialize dark mode
    useDarkMode();
    return {};
  },
  data() {
    return {
      login: {
        email: "",
        password: "",
      },
      showPassword: false,
      googleLoading: false,
    };
  },

  methods: {
    togglePassword() {
      this.showPassword = !this.showPassword;
    },

    async handleLogin() {
      try {
        let identifier = this.login.email.trim();
        let foundEmail = null;

        // check if it's username or email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", identifier));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          foundEmail = userData.email;
        }

        if (!foundEmail) {
          const emailRegex = /^[\w.+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(identifier)) {
            alert("❌ No user found with that username or invalid email.");
            return;
          }
          foundEmail = identifier;
        }

        await signInWithEmailAndPassword(auth, foundEmail, this.login.password);
        this.$router.replace("/home");
      } catch (err) {
        alert(`❌ Login failed: ${err.message}`);
      }
    },

    async handleGoogleSignup() {
      if (this.googleLoading) return;
      this.googleLoading = true;

      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const usernameKey = (user.displayName || user.email.split("@")[0]).trim();

        await setDoc(
          doc(db, "users", user.uid),
          {
            username: usernameKey,
            email: user.email,
            profilePicture: user.photoURL,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        this.$router.replace("/home");
      } catch (err) {
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          this.googleLoading = false;
          return;
        }
        alert(`❌ Google sign-in failed: ${err.message}`);
        this.googleLoading = false;
      } finally {
        this.googleLoading = false;
      }
    },

    goToSignup() {
      this.$router.push("/signup");
    },
  },
};
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--color-bg-main);
  padding: 20px;
  overflow-y: auto;
}

.login-card {
  background: var(--color-bg-white);
  border-radius: 20px;
  padding: 40px;
  box-shadow: var(--shadow-lg);
  width: 500px;
  text-align: center;
}

.logo {
  width: 80px;
  margin-bottom: 20px;
}

h2 {
  margin-bottom: 25px;
  color: var(--color-text-primary);
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
  border-bottom: 2px solid var(--color-border-dark);
  background: transparent;
  color: var(--color-text-primary);
}

input::placeholder {
  color: var(--color-text-light);
  opacity: 1;
}

button {
  background-color: var(--color-bg-main);
  border: none;
  padding: 10px 0px;
  border-radius: 20px;
  color: var(--color-text-primary);
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  width: 100%;
  align-self: center;
}

button:hover {
  transform: scale(1.05);
}

.toggle-link {
  cursor: pointer;
  text-decoration: underline;
  color: var(--color-text-primary);
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
  color: var(--color-text-primary);
  font-size: 1.1rem;
}

.toggle-password:hover {
  opacity: 0.8;
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background-color: var(--color-bg-white);
  border: 1px solid var(--color-border);
  padding: 10px;
  border-radius: 20px;
  cursor: pointer;
  width: 100%;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--color-text-primary);
  /* transition: background 0.2s; */
}

.google-btn:hover {
  background-color: var(--color-bg-purple-tint);
}

.google-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-light);
  font-size: 14px;
  margin: 20px 0;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid var(--color-border);
  margin: 0 10px;
}

/* Mobile responsive styles */
@media (max-width: 767.98px) {
  .login-card {
    width: 90%;
    max-width: 400px;
    padding: 30px 25px;
  }

  .logo {
    width: 60px;
    margin-bottom: 15px;
  }

  h2 {
    font-size: 1.5rem;
    margin-bottom: 20px;
  }

  input {
    font-size: 0.875rem;
  }

  button {
    font-size: 0.875rem;
    padding: 8px 0;
  }

  .google-btn {
    font-size: 0.875rem;
  }
}

@media (max-width: 575.98px) {
  .login-card {
    width: 95%;
    padding: 25px 20px;
  }

  .logo {
    width: 50px;
  }

  h2 {
    font-size: 1.25rem;
  }

  form {
    gap: 15px;
  }

  .divider {
    font-size: 12px;
    margin: 15px 0;
  }
}

</style>
