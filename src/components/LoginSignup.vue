<template>
  <div class="container" :class="{ 'sign-up-mode': signUpMode }">
    <div class="forms-wrapper">

      <!-- Login Form -->
      <div class="form-container login-form">
        <h2>Login</h2>
        <form @submit.prevent="handleLogin">
          <input type="email" placeholder="Email" v-model="login.email" required />
          <input type="password" placeholder="Password" v-model="login.password" required />
          <button type="submit">Login</button>
          <p><a href="#">Forgot password?</a></p>
          <p><span class="toggle-link" @click="signUpMode = true">Create an account</span></p>
        </form>
      </div>

      <!-- Signup Form -->
      <div class="form-container signup-form">
        <h2>Sign Up</h2>
        <form @submit.prevent="handleSignup">
          <input type="text" placeholder="Username" v-model="signup.username" required />
          <input type="email" placeholder="Email" v-model="signup.email" required />
          <input type="password" placeholder="Password" v-model="signup.password" required />
          <button type="submit">Sign Up</button>
          <p><span class="toggle-link" @click="signUpMode = false">Already have an account? Login</span></p>
        </form>
      </div>

    </div>

    <div class="image-box">
      <img src="@/assets/planet_img.jpg" alt="Planet Image" />
    </div>
  </div>
</template>

<script>
export default {
  name: "LoginSignup",
  data() {
    return {
      signUpMode: false,
      login: { email: "", password: "" },
      signup: { username: "", email: "", password: "" }
    };
  },
  methods: {
    handleLogin() {
      alert(`Logging in as ${this.login.email}`);
    },
    handleSignup() {
      alert(`Creating account for ${this.signup.username}`);
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }

body {
  background: linear-gradient(135deg, #c65dd3, #7b4eff);
  display: flex; justify-content: center; align-items: center; height: 100vh;
}

.container {
  position: relative; width: 850px; height: 500px;
  background: rgba(210, 124, 225, 0.792); border-radius: 20px;
  overflow: hidden; display: flex;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3); transition: transform 1s ease-in-out;
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
  padding: 10px; border-radius: 20px; color: #fff; font-weight: 600;
  cursor: pointer; transition: transform 0.2s;
}
button:hover { transform: scale(1.05); }

p { font-size: 0.9rem; text-align: center; }
a { color: #fff; text-decoration: underline; }
.toggle-link { cursor: pointer; text-decoration: underline; color: #fff; }

/* Image box */
.image-box {
  width: 50%; background: linear-gradient(0deg, #55296e, #1a0d2a);
  display: flex; justify-content: center; align-items: center; transition: all 1s ease-in-out;
}
.image-box img { width: auto; animation: float 4s ease-in-out infinite; }

@keyframes float { 0%,100%{transform:translateY(0px);}50%{transform:translateY(-10px);} }

/* Toggle animations */
.signup-form { transform: translateX(100%); opacity: 0; }
.container.sign-up-mode .signup-form { transform: translateX(0%); opacity: 1; }
.container.sign-up-mode .login-form { transform: translateX(-100%); opacity: 0; }
.container.sign-up-mode .image-box { order: -1; }
</style>