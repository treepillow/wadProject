<template>
  <AuthLayout :isSignup="false">
    <div class="login-wrapper">
      <div class="login-card">
        <img src="@/assets/homes_logo.png" alt="Homes Logo" class="logo" />
      <!-- <div class="form-container login-form"> -->
        <h2>Log in</h2>
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
          <button type="submit">Log in</button>
          <p><span class="toggle-link" @click="$router.push('/forgotpassword')">Forgot password?</span></p>
          <p><span class="toggle-link" @click="goToSignup">Create an account</span></p>
        </form>
      </div>
    </div>
    <!-- </div> -->
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
  background-color: black;
  overflow: hidden; 
  display: flex;
  transition: transform 1s ease-in-out;
}

.forms-wrapper { position: relative; width: 50%; height: 100%; overflow: hidden; }

.form-container {
  position: absolute; width: 100%; height: 100%;
  background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(15px);
  padding: 60px 40px; color: black; display: flex; flex-direction: column; justify-content: center;
  transition: all 0.8s ease-in-out;
}

.form-container h2 { color:black; text-align: center; margin-bottom: 30px; }

form { display: flex; flex-direction: column; gap: 20px; }

input {
  padding: 10px; border: none; outline: none; border-bottom: 2px solid black;
  background: transparent; color: black;
}
input::placeholder { color: gray; opacity: 1; }

button {
  background-color: rgb(245, 239, 239);
  border: none;
  padding:  10px 0px; border-radius: 20px; color: black; font-weight: 600;
  cursor: pointer; transition: transform 0.2s; width: 100%; align-self: center;
  /* border: 1px solid black; */
} 

button:hover { transform: scale(1.05); }

p { font-size: 0.9rem; text-align: center; }
a { color: black; text-decoration: underline; }
.toggle-link { cursor: pointer; text-decoration: underline; color: black; }

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
  color: black;
  font-size: 1.1rem;
}

.toggle-password:hover {
  opacity: 0.8;
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

.logo {
  width: 80px;
  margin-bottom: 20px;
}

</style>