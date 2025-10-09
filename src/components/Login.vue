<template>
  <AuthLayout :isSignup="false">
    <div class="form-container login-form">
      <h2>Login</h2>
      <form @submit.prevent="handleLogin">
        <input type="email" placeholder="Email" v-model="login.email" required />
        <input type="password" placeholder="Password" v-model="login.password" required />
        <button type="submit">Login</button>
        <p><a href="#">Forgot password?</a></p>
        <p>
          <span class="toggle-link" @click="goToSignup">Create an account</span>
        </p>
      </form>
    </div>
  </AuthLayout>
</template>

<script>
import AuthLayout from "./AuthLayout.vue";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default {
  name: "Login",
  components: { AuthLayout },
  data() {
    return { login: { email: "", password: "" } };
  },
  methods: {
    async handleLogin() {
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          this.login.email,
          this.login.password
        );
        const user = userCredential.user;
        alert(`✅ Logged in as ${user.email}`);
        this.$router.replace("/home");
      } catch (err) {
        alert(`❌ Login failed: ${err.message}`);
      }
    },
    goToSignup() {
      this.$router.push("/signup");
    },
  },
};
</script>