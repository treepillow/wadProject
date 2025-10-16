<template>
  <AuthLayout :isSignup="true">
    <div class="signup-wrapper">
      <div class="signup-card">
        <img src="@/assets/homes_logo.png" alt="Homes Logo" class="logo" />
        <h2>Sign Up</h2>
        <button type="button" @click="handleGoogleSignup" class="google-btn">
          <img src="@/assets/google-logo.png" alt="Google Logo" class="google-icon" />
          <span>Sign up with Google</span>
        </button>
        <form @submit.prevent="handleSignup">
          <!-- Username / Email -->
          <input type="text" placeholder="Username" v-model="signup.username" required />
          <input type="email" placeholder="Email" v-model="signup.email" required />

          <!-- Password with eye toggle -->
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

          <!-- Names -->
          <input type="text" placeholder="First Name" v-model="signup.firstName" required />
          <input type="text" placeholder="Last Name" v-model="signup.lastName" required />

          <!-- DOB -->
          <div class="dob-container">
            <label style="color: #000; font-weight: 500; margin-bottom: 5px;">Date of Birth:</label>
            <input type="date" v-model="signup.dateOfBirth" required />
          </div>

          <!-- Phone -->
          <input
            type="text"
            placeholder="Phone Number (include +65, e.g. +65XXXXXXXX)"
            v-model="signup.phone"
            required
          />

          <!-- Address -->
          <div class="address-container">
            <label class="address-label">Address:</label>

            <!-- Property Type Toggle -->
            <div class="property-type-toggle">
              <button
                type="button"
                class="toggle-btn"
                :class="{ active: !signup.isLanded }"
                @click="signup.isLanded = false"
              >
                HDB / Condo
              </button>
              <button
                type="button"
                class="toggle-btn"
                :class="{ active: signup.isLanded }"
                @click="togglePropertyType"
              >
                Landed Property
              </button>
            </div>

            <!-- BLK/House No. - Required for non-landed -->
            <input
              type="text"
              v-model="signup.blk"
              :placeholder="signup.isLanded ? 'House No. (optional)' : 'Block Number (required)'"
              :required="!signup.isLanded"
            />
            <input
              type="text"
              v-model="signup.street"
              placeholder="Street (e.g. Tampines Ave 9)"
              required
            />
            <input
              type="text"
              v-model="signup.postal"
              placeholder="Postal Code (e.g. 521485)"
              maxlength="6"
              required
            />
            <!-- Unit optional for landed -->
            <input
              type="text"
              v-model="signup.unit"
              :placeholder="signup.isLanded ? 'Unit Number (optional)' : 'Unit Number (e.g. #09-142, optional)'"
            />

            <div v-if="addrError" class="text-danger small mt-1">{{ addrError }}</div>
            <div v-if="addrWarning" class="text-warning small mt-1">{{ addrWarning }}</div>
          </div>

          <!-- Profile Picture -->
          <div class="profile-picture-container">
            <span class="profile-label">Set a profile picture:</span>
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

          <button type="submit" class="signup-btn google-btn">Sign Up</button>

          <div class="login-link">
            <p>
              <span class="toggle-link" @click="goToLogin">
                Already have an account? Login
              </span>
            </p>
          </div>
        </form>

        <!-- Image Modal -->
        <div v-if="showImageModal" class="image-modal" @click="showImageModal = false">
          <img :src="signup.profilePreview" alt="Full Image Preview" />
        </div>

        <!-- Scroll hint -->
        <div class="scroll-hint" v-show="showScrollHint">
          <i class="fa fa-chevron-down"></i>
          <span>Scroll for more</span>
        </div>
      </div>

      <!-- Bootstrap Toast Notification -->
      <div class="position-fixed top-0 end-0 p-3" style="z-index: 9999">
        <div
          v-if="notification.show"
          class="toast show"
          :class="`bg-${notification.type} text-white`"
          role="alert"
        >
          <div class="toast-body d-flex align-items-center justify-content-between">
            <span>{{ notification.message }}</span>
            <button
              type="button"
              class="btn-close btn-close-white ms-3"
              @click="notification.show = false"
            ></button>
          </div>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script>
import AuthLayout from "./AuthLayout.vue";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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
        dateOfBirth: "",
        phone: "",
        address: "",     // kept for compatibility (not used for validation)
        blk: "",
        street: "",
        postal: "",
        unit: "",
        profilePreview: null,
        isGoogle: false,
        isLanded: false, // New: tracks if user lives in landed property
      },
      showImageModal: false,
      months: [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ],
      years: Array.from({ length: 100 }, (_, i) => currentYear - i),
      showPassword: false,
      addrError: "",
      addrWarning: "",
      showScrollHint: false,
      notification: { show: false, message: "", type: "" }, // For Bootstrap toast notifications
    };
  },
  methods: {
    showNotification(message, type = "danger") {
      this.notification = { show: true, message, type };
      setTimeout(() => {
        this.notification.show = false;
      }, 5000);
    },
    togglePassword() {
      this.showPassword = !this.showPassword;
    },
    togglePropertyType() {
      this.signup.isLanded = !this.signup.isLanded;
      // Clear block field when switching to landed
      if (this.signup.isLanded) {
        this.signup.blk = "";
      }
    },
    handleProfilePicture(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.signup.profilePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    isValidSGPhone(phone) {
      const pattern = /^(?:\+65)?[89]\d{7}$/;
      return pattern.test(phone);
    },

    /* ---------- Local normalizers ---------- */
    normalizeStr(s) {
      return (s || "")
        .toString()
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ")
        .replace(/[.,']/g, "");
    },
    expandAbbrev(road) {
      const A = [
        [" AVE ", " AVENUE "],
        [" RD ", " ROAD "],
        [" ST ", " STREET "],
        [" DR ", " DRIVE "],
        [" CRES ", " CRESCENT "],
        [" CTRL ", " CENTRAL "],
        [" PK ", " PARK "],
        [" PKWY ", " PARKWAY "],
        [" TER ", " TERRACE "],
        [" HTS ", " HEIGHTS "],
        [" HWY ", " HIGHWAY "],
        [" GDN ", " GARDEN "],
        [" GDNS ", " GARDENS "],
        [" CTR ", " CENTRE "],
        [" PL ", " PLACE "],
        [" CL ", " CLOSE "]
      ];
      let out = ` ${this.normalizeStr(road)} `;
      A.forEach(([a, b]) => (out = out.replaceAll(a, b)));
      return out.trim();
    },
    levDist(a, b) {
      const m = a.length, n = b.length;
      if (!m) return n;
      if (!n) return m;
      const d = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) d[i][0] = i;
      for (let j = 0; j <= n; j++) d[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          const c = a[i - 1] === b[j - 1] ? 0 : 1;
          d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        }
      }
      return d[m][n];
    },
    similarity(a, b) {
      const A = this.expandAbbrev(a);
      const B = this.expandAbbrev(b);
      const dist = this.levDist(A, B);
      const L = Math.max(A.length, B.length) || 1;
      return 1 - dist / L;
    },

    /* ---------- OneMap API with fallback endpoints (matches NewBusiness.vue) ---------- */
    async fetchJSON(url, { timeoutMs = 6000 } = {}) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          signal: ctrl.signal,
          headers: { Accept: 'application/json' },
          mode: "cors",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        return await res.json();
      } finally {
        clearTimeout(t);
      }
    },

    // Try multiple OneMap endpoints with fallback (same as NewBusiness.vue)
    async oneMapSearchByPostal(postal) {
      const q = `searchVal=${encodeURIComponent(postal)}&returnGeom=N&getAddrDetails=Y&pageNum=1`;
      const urls = [
        `https://www.onemap.gov.sg/api/common/elastic/search?${q}`,
        `https://developers.onemap.sg/commonapi/search?${q}`,
      ];
      let lastErr;
      for (const u of urls) {
        try {
          return await this.fetchJSON(u);
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('All OneMap endpoints failed');
    },

    async validateAddressPreferOneMap({ blk, street, postal }, threshold = 0.8) {
      if (!/^[0-9]{6}$/.test(postal)) {
        return { ok: false, reason: "Postal Code must be 6 digits." };
      }
      const userBlk = this.normalizeStr(blk || "");
      const userStreet = this.expandAbbrev(street || "");

      // Try OneMap with fallback endpoints
      let json;
      try {
        json = await this.oneMapSearchByPostal(postal);
      } catch (err) {
        console.error('OneMap error:', err);
        // Strict error for signup - require valid address
        return {
          ok: false,
          reason: 'Address service not reachable. Please check your connection and try again.'
        };
      }

      const results = Array.isArray(json?.results) ? json.results : [];
      const exact = results.filter((r) => r.POSTAL === postal);
      const candidates = exact.length ? exact : results;
      if (!candidates.length) return { ok: false, reason: "Invalid address in Singapore." };

      let best = null, score = -1;
      for (const r of candidates) {
        const s = this.similarity(userStreet, r.ROAD_NAME || "");
        if (s > score) { best = r; score = s; }
      }

      const omBlk  = this.normalizeStr(best?.BLK_NO || "");
      const omRoad = this.expandAbbrev(best?.ROAD_NAME || "");
      const omBldg = this.normalizeStr(best?.BUILDING || "");
      const addrStr = (best?.ADDRESS || "").toUpperCase();
      const addressLabelHasBlk = /(^|[\s,])BLK[\s]/.test(addrStr);

      if (userBlk && omBlk && userBlk !== omBlk && score < 0.92) {
        return { ok:false, reason:`Block/House number mismatch (OneMap: ${omBlk || "—"}, You: ${userBlk}).` };
      }

      const streetOk   = score >= threshold;
      const buildingOk = omBldg && this.similarity(this.normalizeStr(street || ""), omBldg) >= threshold;
      if (!streetOk && !buildingOk) {
        return { ok:false, reason:`Street doesn’t match OneMap (score ${score.toFixed(2)}).` };
      }

      return {
        ok: true,
        data: {
          blk: omBlk || userBlk,
          street: omRoad || userStreet,
          postal,
          building: best?.BUILDING || "",
          confidence: Math.max(score, buildingOk ? 1 : 0),
          addressLabelHasBlk,
          source: "onemap",
        },
      };
    },

    /* ---------- Auth flows ---------- */
    async handleGoogleSignup() {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        await setDoc(doc(db, "users", user.uid), {
          username: user.displayName,
          email: user.email,
          profilePicture: user.photoURL,
          createdAt: serverTimestamp(),
        });
        this.showNotification(`Signed in as ${user.displayName}`, "success");
        setTimeout(() => this.$router.push("/home"), 1500);
      } catch (err) {
        this.showNotification(`Google sign-in failed: ${err.message}`, "danger");
      }
    },

    async handleSignup() {
      this.addrError = "";
      this.addrWarning = "";

      // 0) Check if block is required (non-landed properties)
      if (!this.signup.isLanded && !this.signup.blk.trim()) {
        this.addrError = "Block number is required for HDB/Condo. Toggle 'Landed Property' if you live in a landed house.";
        this.showNotification(this.addrError, "danger");
        return;
      }

      // 1) OneMap validation
      const addrCheck = await this.validateAddressPreferOneMap(
        { blk: this.signup.blk, street: this.signup.street, postal: this.signup.postal },
        0.8
      );
      if (!addrCheck.ok) {
        this.addrError = addrCheck.reason;
        this.showNotification(addrCheck.reason, "danger");
        return;
      }
      if (addrCheck.data?.warning) {
        this.addrWarning = addrCheck.data.warning;
      }

      const { blk, street, postal, building, addressLabelHasBlk, source } = addrCheck.data;
      const unitRaw = (this.signup.unit || "").trim();
      const unit = unitRaw ? (unitRaw.startsWith("#") ? unitRaw : `#${unitRaw}`) : "";

      const leadingNumber = blk ? (addressLabelHasBlk ? `BLK ${blk}` : blk) : "";
      const fullAddress = `${[leadingNumber, street, building].filter(Boolean).join(" ")} Singapore ${postal} ${unit}`.trim();

      // 2) Other validations
      const validEmailPattern = /^[\w.+-]+@([\w-]+\.)+[\w-]{2,}$/i;
      if (!validEmailPattern.test(this.signup.email)) {
        this.showNotification("Please use a valid email address.", "danger");
        return;
      }
      if (!this.isValidSGPhone(this.signup.phone)) {
        this.showNotification("Please enter a valid Singapore phone number (e.g. +6591234567 or 91234567).", "danger");
        return;
      }

      // 3) Create user + save profile
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, this.signup.email, this.signup.password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          username: this.signup.username,
          email: this.signup.email,
          firstName: this.signup.firstName,
          lastName: this.signup.lastName,
          dateOfBirth: this.signup.dateOfBirth || "",
          phone: this.signup.phone,
          address: fullAddress,
          addressComponents: { blk, street, postal, unit, building, verificationSource: source, isLanded: this.signup.isLanded },
          createdAt: serverTimestamp(),
          profilePicture: this.signup.profilePreview || null,
        });

        this.showNotification(`Account created for ${this.signup.username}!`, "success");
        setTimeout(() => this.$router.push("/login"), 1500);
      } catch (err) {
        this.showNotification(`Signup failed: ${err.message}`, "danger");
      }
    },

    goToLogin() {
      this.$router.push("/login");
    },
  },
};
</script>

<style scoped>
/* * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; } */
.signup-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  background: rgb(245, 239, 239);
  padding: 20px;
  overflow-y: auto;
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
  margin-top: 37px;
  max-height: 90vh;
  overflow-y: auto;
  padding-bottom: 40px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.signup-card::-webkit-scrollbar { display: none; }

.scroll-hint {
  position: sticky;
  bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #888;
  font-size: 0.85rem;
  opacity: 0.9;
  animation: fadeUp 2s ease-in-out infinite;
  pointer-events: none;
}
.scroll-hint i {
  font-size: 1rem;
  margin-bottom: 3px;
  animation: bounce 1.5s infinite;
}
@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }
@keyframes fadeUp { 0%,100%{opacity:.8} 50%{opacity:.4} }

.signup-card h2 { margin-bottom: 25px; color: black; }
.signup-card form { display: flex; flex-direction: column; gap: 15px; }

.signup-card input, .signup-card select {
  border: none; border-bottom: 2px solid black; border-radius: 0;
  background: transparent; color: black; padding: 10px;
}
.signup-card input::placeholder { color: gray; }

button.signup-btn {
  background: rgb(245, 239, 239);
  border: none; padding: 10px 20px; border-radius: 20px;
  color: black; font-weight: 600; cursor: pointer; transition: transform .2s;
  width: 100%;
}
button.signup-btn:hover { transform: scale(1.05); }

.google-btn { margin-bottom: 10px; background-color: rgb(245, 239, 239); }

.password-container { position: relative; width: 100%; }
.password-container input { width: 100%; padding-right: 40px; }
.toggle-password {
  position: absolute; right: 10px; top: 50%;
  transform: translateY(-50%); cursor: pointer; color: black; font-size: 1.1rem;
}
.toggle-password:hover { opacity: .8; }

.dob-container { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; }
.dob-container label { font-weight: 500; color: #333; }

.profile-picture-container { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.custom-file-upload {
  display: flex; align-items: center; justify-content: center;
  padding: 10px 15px; border: 1px solid #ccc; border-radius: 8px;
  cursor: pointer; background-color: rgb(245, 239, 239);
  color: black; transition: background .2s;
}
.preview-container img.profile-preview {
  width: 60px; height: 60px; border-radius: 50%; object-fit: cover;
  border: 2px solid #ccc; cursor: pointer;
}

.image-modal {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
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

.address-container input {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 10px;
  border-bottom: 2px solid black;
  background: transparent;
  color: black;
}

.address-label {
  font-weight: 500;
  color: #000;
  text-align: left; /* left-align the text */
  width: 100%;
  margin-bottom: 5px;
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
  transition: background 0.2s;
}

.google-btn:hover {
  background-color: #f7f7f7;
}

.google-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

/* Property Type Toggle */
.property-type-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  width: 100%;
}
.toggle-btn {
  flex: 1;
  padding: 10px 15px;
  border: none;
  background: rgb(245, 239, 239);
  color: black;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.4;
}
.toggle-btn:hover {
  transform: scale(1.02);
  opacity: 0.6;
}
.toggle-btn.active {
  opacity: 1;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Toast Notification */
.toast {
  min-width: 250px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
}
.toast-body {
  padding: 15px;
  font-weight: 500;
}
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
