<template>
  <AuthLayout :isSignup="false">
    <div class="form-container login-form">
      <h2>Login</h2>
      <form @submit.prevent="handleLogin">
        <input type="email" placeholder="Email" v-model="login.email" required />
        <!-- <input type="password" placeholder="Password" v-model="login.password" required /> -->
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
        <button type="submit">Login</button>
        <p><span class="toggle-link" @click="$router.push('/forgotpassword')">Forgot password?</span></p>
        <p><span class="toggle-link" @click="goToSignup">Create an account</span></p>
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
  data() { return { login: { email: "", password: "" },
  showPassword: false, }; },
  methods: {
    togglePassword() {
      this.showPassword = !this.showPassword;
    },
    async handleLogin() {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, this.login.email, this.login.password);
        // alert(`✅ Logged in as ${userCredential.user.email}`);
        this.$router.replace("/home");
      } catch (err) { 
        alert(`❌ Login failed: ${err.message}`);
       }
    },
    goToSignup() { this.$router.push("/signup"); }
  }
};
</script>

<style scoped>

/* * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }

body {
  background: linear-gradient(135deg, #c65dd3, #7b4eff);
  display: flex; justify-content: center; align-items: center;
} */


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

.forms-wrapper { position: relative; width: 50%; height: 100%; overflow: hidden; }

.form-container {
  position: absolute; width: 100%; height: 100%;
  background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(15px);
  padding: 60px 40px; color: #fff; display: flex; flex-direction: column; justify-content: center;
  transition: all 0.8s ease-in-out;
}

.form-container h2 { text-align: center; margin-bottom: 30px; }

form { display: flex; flex-direction: column; gap: 20px; }

input {
  padding: 10px; border: none; outline: none; border-bottom: 2px solid #fff;
  background: transparent; color: #fff;
}
input::placeholder { color: rgba(255,255,255,0.7); opacity: 1; }

button {
  background: linear-gradient(0deg, #aa67d1, #442569); border: none;
  padding:  8px 200px; border-radius: 20px; color: #fff; font-weight: 600;
  cursor: pointer; transition: transform 0.2s; width: auto; align-self: center;
} 

button:hover { transform: scale(1.05); }

p { font-size: 0.9rem; text-align: center; }
a { color: #fff; text-decoration: underline; }
.toggle-link { cursor: pointer; text-decoration: underline; color: #fff; }

/* Image box */
.image-box {
  width: 50%; 

  background: linear-gradient(0deg, #55296e, #1a0d2a);
  display: flex;
  justify-content: center;
  align-items: center; 
  transition: all 1s ease-in-out;
}
.image-box img { width: auto; animation: float 4s ease-in-out infinite; }

@keyframes float { 0%,100%{transform:translateY(0px);}50%{transform:translateY(-10px);} }

/* Toggle animations */
.signup-form { transform: translateX(100%); opacity: 0; }
.containers.sign-up-mode .signup-form 
{ 
  left: 0;
  transform: translateX(0%); 
  opacity: 1; 
}
.containers.sign-up-mode .login-form { left: 0;transform: translateX(-100%); opacity: 0; }
.containers.sign-up-mode .image-box { order: 1; }

.password-container {
  position: relative;
  width: 100%;
}

.password-container input {
  width: 100%;
  padding-right: 40px; /* room for the eye icon */
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
</style>