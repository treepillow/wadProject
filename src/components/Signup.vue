<template>
  <AuthLayout :isSignup="true">
    <div class="form-container signup-form">
      <h2>Sign Up</h2>
      <form @submit.prevent="handleSignup">
        <input type="text" placeholder="Username" v-model="signup.username" required />
        <input type="email" placeholder="Email" v-model="signup.email" required />
        <input type="password" placeholder="Password" v-model="signup.password" required />
        <button type="submit">Sign Up</button>
        <p>ed
          <span class="toggle-link" @click="goToLogin">
            Already have an account? Login
          </span>
        </p>
      </form>
    </div>
  </AuthLayout>
</template>

<script>
import AuthLayout from "./AuthLayout.vue";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default {
  name: "Signup",
  components: { AuthLayout },
  data() {
    return { signup: { username: "", email: "", password: "" } };
  },
  methods: {
    async handleSignup() {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          this.signup.email,
          this.signup.password
        );
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          username: this.signup.username,
          email: this.signup.email,
          createdAt: serverTimestamp(),
        });

        alert(`✅ Account created for ${this.signup.username}`);
        this.$router.push("/login");
      } catch (err) {
        alert(`❌ Signup failed: ${err.message}`);
      }
    },
    goToLogin() {
      this.$router.push("/login");
    },
  },
};
</script>