<template>
  <AuthLayout :isSignup="true">
    <div class="form-container signup-form">
      <h2>Sign Up</h2>
      <form @submit.prevent="handleSignup">
        <button type="button" @click="handleGoogleSignup" class="signup-btn google-btn">Sign up with Google?</button>
        <input type="text" placeholder="Username" v-model="signup.username" required />
        <input type="email" placeholder="Email" v-model="signup.email" required />

        <!-- Password input with eye toggle -->
        <div class="password-container">
          <input
            :type="showPassword ? 'text' : 'password'"
            placeholder="Password"
            v-model="signup.password"
            required
          />
          <span class="toggle-password" @click="togglePassword">
            <i :class="showPassword ? 'fa fa-eye-slash' : 'fa fa-eye'"></i>
          </span>
        </div>

        <!-- First and Last Name -->
        <input type="text" placeholder="First Name" v-model="signup.firstName" required />
        <input type="text" placeholder="Last Name" v-model="signup.lastName" required />

        <!-- Date of Birth Dropdowns -->
        <div class="dob-container">
          <label style="color: #fff; font-weight: 500; margin-bottom: 5px;">Date of Birth:</label>
          <div style="display: flex; gap: 10px;">
            <select v-model="signup.day" required>
              <option disabled value="">Day</option>
              <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
            </select>

            <select v-model="signup.month" required>
              <option disabled value="">Month</option>
              <option v-for="(m, i) in months" :key="i" :value="m">{{ m }}</option>
            </select>

            <select v-model="signup.year" required>
              <option disabled value="">Year</option>
              <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
        </div>

        <!-- Phone Number -->
        <input type="text" placeholder="Phone Number (+65 XXXXXXXX)" v-model="signup.phone" required />
        <!-- Address -->
        <input type="text" placeholder="Address" v-model="signup.address" required />

        <!-- Profile Picture -->
        <div class="profile-picture-container">
          <span class="profile-label">Set a profile picture:</span>
          <label class="custom-file-upload" for="profilePicture">
            Choose File
          </label>
          <input type="file" id="profilePicture" accept="image/*" @change="handleProfilePicture" />
          <div v-if="signup.profilePreview" class="preview-container">
            <img 
              :src="signup.profilePreview" 
              alt="Profile Preview" 
              class="profile-preview" 
              @click="showImageModal = true"
            />
          </div>
        </div>

        <button type="submit">Sign Up</button>
        <p><span class="toggle-link" @click="goToLogin">Already have an account? Login</span></p>
      </form>

      <!-- Image Modal -->
      <div v-if="showImageModal" class="image-modal" @click="showImageModal = false">
        <img :src="signup.profilePreview" alt="Full Image Preview"/>
      </div>

      <!-- Scroll indicator -->
      <div class="scroll-indicator">
        <i class="fa fa-chevron-down"></i>
        <span>Scroll for more</span>
      </div>

    </div>
  </AuthLayout>
</template>

<script>
import AuthLayout from "./AuthLayout.vue";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
// import { auth } from "../firebase"; 


export default {
  name: "Signup",
  components: { AuthLayout },
  data() { 
    const currentYear = new Date().getFullYear();
    return { 
      signup: { 
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        day: "",
        month: "",
        year: "",
        phone: "",
        address: "",
        profilePreview: null,   // preview image URL
       },
        showImageModal: false, // <-- modal toggle
        months: [
          "January","February","March","April","May","June",
          "July","August","September","October","November","December"
        ],
        years: Array.from({ length: 100 }, (_, i) => currentYear - i), // last 100 years
        showPassword: false,
    }; 
  },
  methods: {
    togglePassword() {
      this.showPassword = !this.showPassword;
    },
    handleProfilePicture(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.signup.profilePreview = e.target.result; // now inside signup
      };
      reader.readAsDataURL(file);
    },
    // validate Singapore number (8 digits starting with 8 or 9, optional +65)
    isValidSGPhone(phone) {
      const pattern = /^(?:\+65)?[89]\d{7}$/;
      return pattern.test(phone);
    },
    async handleGoogleSignup() {
      const provider = new GoogleAuthProvider();

      try {
        const result = await signInWithPopup(auth, provider);

        const user = result.user;

        // Optional: Save extra user info to Firestore if signing up for the first time
        await setDoc(doc(db, "users", user.uid), {
          username: user.displayName,
          email: user.email,
          profilePicture: user.photoURL,
          createdAt: serverTimestamp(),
        });

        alert(`✅ Signed in as ${user.displayName}`);
        this.$router.push("/home");
      } catch (err) {
        alert(`❌ Google sign-in failed: ${err.message}`);
      }
    },
    async handleSignup() {
      const validEmailPattern = /^[\w.+-]+@(gmail|yahoo|hotmail|outlook)\.[a-z.]{2,}$/i;

      if (!validEmailPattern.test(this.signup.email)) {
        alert("❌ Please use a valid email (Gmail, Yahoo, Hotmail, or Outlook only).");
        return;
      }

      if (!this.isValidSGPhone(this.signup.phone)) {
        alert("❌ Please enter a valid Singapore phone number (e.g., +6591234567 or 91234567).");
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, this.signup.email, this.signup.password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
          username: this.signup.username,
          email: this.signup.email,
          firstName: this.signup.firstName,
          lastName: this.signup.lastName,
          dateOfBirth: `${this.signup.day} ${this.signup.month} ${this.signup.year}`,
          phone: this.signup.phone,
          address: this.signup.address,
          createdAt: serverTimestamp(),
        });
        alert(`✅ Account created for ${this.signup.username}`);
        this.$router.push("/login");
      } catch (err) { alert(`❌ Signup failed: ${err.message}`); }
    },
    goToLogin() { this.$router.push("/login"); }
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

.form-container::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px; /* height of fade */
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 100%);
}

.form-container::-webkit-scrollbar {
  width: 6px;
}
.form-container::-webkit-scrollbar-thumb {
  background-color: rgba(255,255,255,0.4);
  border-radius: 10px;
}

.form-container h2 { text-align: center; margin-bottom: 30px; }
form { 
  display: flex; 
  flex-direction: column; 
  gap: 15px;
  width: 100%;
  max-height: 100%; 
  overflow-y: scroll;

  /* hide scrollbar for all browsers */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

form::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
}

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

input {
  padding: 10px; 
  border: none; 
  outline: none; 
  border-bottom: 2px solid #fff;
  background: transparent; 
  color: #fff;
}

.dob-container select {
  padding: 5px;
  text-align: center;
  border: 2px solid #fff;
  border-radius: 5px;
  background-color: rgba(255, 255, 255, 0.2); 
  color: #fff; 
  outline: none;
  cursor: pointer;
}

.dob-container select option {
  background-color: #55296e; /* dropdown menu background */
  color: #fff; /* option text color */
}

.scroll-indicator {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;
  font-size: 0.8rem;
  text-align: center;
  pointer-events: none; /* doesn’t block clicks */
}

.scroll-indicator i {
  font-size: 1.2rem;
  margin-bottom: 3px;
  animation: bounce 1.5s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(5px); }
}




.profile-picture-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.profile-picture-container input[type="file"] {
  display: none; /* hide native input */
}

.profile-label {
  color: #fff;
  font-weight: 500;
}

.custom-file-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 10px;
  border: 2px solid #fff;
  border-radius: 5px;
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  cursor: pointer;
  min-width: 120px;
  height: 40px;
}

.custom-file-upload:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.profile-button-preview {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

.profile-preview {
  width: 60px;      /* smaller width */
  height: 60px;     /* smaller height */
  border-radius: 50%; /* makes it circular */
  object-fit: cover;  /* ensures it fits without distortion */
  border: 2px solid #fff; /* optional: adds a border */
}

.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: zoom-out;
  z-index: 1000;
  animation: fadeIn 0.3s ease-in-out;
}

.image-modal img {
  max-width: 90%;
  max-height: 90%;
  border-radius: 10px;
  transform: scale(0.8);   /* start smaller */
  animation: zoomIn 0.3s forwards;  /* scale to full size */
}

@keyframes fadeIn {
  from { background-color: rgba(0,0,0,0); }
  to { background-color: rgba(0,0,0,0.8); }
}

@keyframes zoomIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.signup-btn {
  background: linear-gradient(0deg, #aa67d1, #442569);
  border: none;
  padding: 8px 20px;      
  border-radius: 20px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  width: 100%;          
  max-width: 400px;         
  text-align: center;
  white-space: nowrap;  
  display: inline-block;
}

.signup-btn:hover {
  transform: scale(1.05);
}

.google-btn {
  margin-bottom: 10px;     
}
</style>