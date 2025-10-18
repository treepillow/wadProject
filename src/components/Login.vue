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

export default {
  name: "Login",
  components: { AuthLayout },
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

        // 🟣 1. Try username first (search 'users' collection)
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", identifier));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          foundEmail = userData.email;
        }

        // 🟡 2. If not found, check if it's a valid email
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

        // ✅ Store user info in /users/{uid}
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
        // Ignore if user simply closed the popup
        if (err.code === 'auth/popup-closed-by-user') {
          this.googleLoading = false;
          return;
        }
        alert(`❌ Google sign-in failed: ${err.message}`);
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
  height: 100vh;
  background-color: rgb(245, 239, 239);
}

.login-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  width: 500px;
  text-align: center;
}

.logo {
  width: 80px;
  margin-bottom: 20px;
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
  padding: 10px 0px;
  border-radius: 20px;
  color: black;
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
  color: black;
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
  /* transition: background 0.2s; */
}

.google-btn:hover {
  background-color: #f7f7f7;
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
  color: #999; /* subtle gray */
  font-size: 14px;
  margin: 20px 0;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid #ccc; /* subtle line */
  margin: 0 10px;
}

</style>
