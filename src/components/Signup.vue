<template>
  <AuthLayout :isSignup="true">
    <div class="signup-wrapper">
      <div class="signup-card">
        <img src="@/assets/homes_logo.png" alt="Homes Logo" class="logo" />
        <h2>Sign Up</h2>
        <button type="button" @click="handleGoogleSignup" class="signup-btn google-btn">Sign up with Google?</button>
        <form @submit.prevent="handleSignup">
          
          <input type="text" placeholder="Username" v-model="signup.username" required />
          <input type="email" placeholder="Email" v-model="signup.email" required />

          <!-- Password input with eye toggle -->
          <div class="password-container" v-if="!signup.isGoogle">
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
            <label style="color: #000; font-weight: 500; margin-bottom: 5px;">Date of Birth:</label>
            <input type="date" v-model="signup.dateOfBirth" required />
            <!-- <div style="display: flex; gap: 10px;">

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
            </div> -->
          </div>

          <!-- Phone Number -->
          <input type="text" placeholder="Phone Number (include +65, e.g. +65 XXXXXXXX)" v-model="signup.phone" required />
          <!-- Address -->
          <input type="text" placeholder="Address" v-model="signup.address" required />

          <!-- Profile Picture -->
          <div class="profile-picture-container">
            <span class="profile-label">Set a profile picture:</span>
            <input type="file" id="profilePicture" accept="image" @change="handleProfilePicture" />
            <div v-if="signup.profilePreview" class="preview-container">
              <img 
                :src="signup.profilePreview" 
                alt="Profile Preview" 
                class="profile-preview" 
                @click="showImageModal = true"
              />
            </div>
          </div>

          <button type="submit" class="signup-btn google-btn">Sign Up</button>
          <div class="login-link">
            <p><span class="toggle-link" @click="goToLogin">
              Already have an account? Login
            </span></p>
          </div>
        </form>

        <!-- Image Modal -->
        <div v-if="showImageModal" class="image-modal" @click="showImageModal = false">
          <img :src="signup.profilePreview" alt="Full Image Preview"/>
        </div>

        <!-- Scroll indicator -->
        <!-- <div class="scroll-indicator">
          <i class="fa fa-chevron-down"></i>
          <span>Scroll for more</span>
        </div> -->
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
        isGoogle: false, // <-- Added flag for Google signup
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

        // Autofill form fields from Google account
        this.signup.email = user.email || "";
        this.signup.username = user.displayName || "";
        this.signup.profilePreview = user.photoURL || null;
        this.signup.isGoogle = true; // <-- flag to skip password creation

        alert("✅ Google account detected! Please fill in the remaining details below to complete signup.");

        // Do NOT redirect or create Firebase user yet
      } catch (err) {
        alert(`❌ Google sign-in failed: ${err.message}`);
      }
    },
    async handleSignup() {
      // const validEmailPattern = /^[\w.+-]+@(gmail|yahoo|hotmail|outlook)\.[a-z.]{2,}$/i;
      const validEmailPattern = /^[\w.+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;

      // don't allow spaces in username
      if (/\s/.test(this.signup.username)) {
          alert("❌ Username cannot contain spaces. Please choose a username without spaces.");
          return;
        }

      if (!validEmailPattern.test(this.signup.email)) {
        alert("❌ Please use a valid email (Gmail, Yahoo, Hotmail, or Outlook only).");
        return;
      }

      if (!this.isValidSGPhone(this.signup.phone)) {
        alert("❌ Please enter a valid Singapore phone number (e.g., +6591234567 or 91234567).");
        return;
      }

      try {
        let user;
        if (!this.signup.isGoogle) {
          // Normal email/password signup
          const userCredential = await createUserWithEmailAndPassword(auth, this.signup.email, this.signup.password);
          user = userCredential.user;
        } else {
          // Google signup: user is already signed in
          user = auth.currentUser;
        }

        await setDoc(doc(db, "users", user.uid), {
          username: this.signup.username,
          email: this.signup.email,
          firstName: this.signup.firstName,
          lastName: this.signup.lastName,
          // dateOfBirth: `${this.signup.day} ${this.signup.month} ${this.signup.year}`,
          // dateOfBirth: `${this.signup.year}-${String(this.months.indexOf(this.signup.month) + 1).padStart(2, '0')}-${String(this.signup.day).padStart(2, '0')}`,
          dateOfBirth: this.signup.dateOfBirth,
          phone: this.signup.phone,
          address: this.signup.address,
          profilePicture: this.signup.profilePreview || null,
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
.signup-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  background: rgb(245, 239, 239);
  padding: 20px;
  overflow-y: auto; /* allow scrolling */
}

.signup-card {
  background: #fff;
  border-radius: 20px;
  padding: 30px 40px;
  width: 500px;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  text-align: center;
  position: relative;
  margin-top: 50px;

  max-height: 90vh;
  overflow-y: auto;
  padding-bottom: 40px; 
  /* max-height: none;
  overflow: visible; */
}


.scroll-indicator {
  position: sticky;
  bottom: 10px; /* 10px from bottom of card */
  /* left: 50%; */
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #442569; /* visible */
  font-size: 0.8rem;
  text-align: center;
  pointer-events: none;
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



.signup-card h2 {
  margin-bottom: 25px;
  color: black;
}

.signup-card form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.signup-card input,
.signup-card select {
  border: none;
  border-bottom: 2px solid black;
  border-radius: 0;
  background: transparent;
  color: black;
  padding: 10px;
}


.signup-card input::placeholder {
  color: gray;
}

button.signup-btn {
  background: rgb(245, 239, 239);
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  color: black;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  width: 100%;
}

button.signup-btn:hover {
  transform: scale(1.05);
}

.google-btn {
  margin-bottom: 10px;
  background-color: rgb(245, 239, 239);;
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

.dob-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.dob-container label {
  font-weight: 500;
  color: #333;
}

.dob-container select {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #ccc;
  cursor: pointer;
}

.profile-picture-container {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.custom-file-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  cursor: pointer;
}

.preview-container img.profile-preview {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #ccc;
  cursor: pointer;
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
}

.image-modal img {
  max-width: 90%;
  max-height: 90%;
  border-radius: 10px;
}

.toggle-link {
  cursor: pointer;
  color: black;
  text-decoration: underline;
  font-size: 0.9rem;
}


input {
  padding: 10px; border: none; outline: none; border-bottom: 2px solid black;
  background: transparent; color: black;
}
input::placeholder { color: gray; opacity: 1; }

.login-link {
  /* position: sticky; */
  bottom: 10px;
  text-align: center;
}

.dob-container select {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #ccc;
  cursor: pointer;
  background-color: rgb(245, 239, 239);
  color: black;              /* text color */
}

.custom-file-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 15px;
  border: 1px solid #ccc;
  border-radius: 8px;
  cursor: pointer;
  background-color: rgb(245, 239, 239);
  color: black;       
  transition: background 0.2s;
}

.logo {
  width: 80px;
  margin-bottom: 20px;
}

</style>