<script>
import NavBar from "./NavBar.vue";
import { auth, db } from "@/firebase";
import { doc, getDoc /* or onSnapshot for live updates */ } from "firebase/firestore";
import { storage } from "@/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth"; // to update auth photoURL
import { setDoc } from "firebase/firestore";   // to save photoURL in users/{uid}

export default {
  name: "Profile",
  components: {NavBar},
  methods: {
  // Opens the hidden <input type="file" ref="fileInput">
  openPicker() {
    this.$refs.fileInput?.click();
  },

  // Handle file pick, validate, preview, then upload immediately
  onFilePicked(e) {
    this.error = "";
    const f = e.target.files?.[0];
    if (!f) return;

    const ok = ["image/jpeg", "image/png", "image/webp"];
    if (!ok.includes(f.type)) {
      this.error = "Please choose a JPG, PNG, or WEBP image.";
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      this.error = "Max size is 2MB.";
      return;
    }

    this.file = f;
    this.photoURL = URL.createObjectURL(f); // optional preview
    this.uploadProfileImage();               // auto-upload after pick
  },

  // Uploads to Storage, updates Auth photoURL and Firestore users/{uid}.photoURL
  async uploadProfileImage() {
    if (!this.file) {
      this.error = "Select an image first.";
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      this.error = "Not signed in.";
      return;
    }

    this.uploading = true;
    this.progress = 0;
    this.error = "";

    const ext =
      this.file.type === "image/png" ? "png" :
      this.file.type === "image/webp" ? "webp" : "jpg";
    const path = `avatars/${user.uid}.${ext}`;
    const sref = storageRef(storage, path);

    const task = uploadBytesResumable(sref, this.file, { contentType: this.file.type });

    task.on(
      "state_changed",
      (snap) => {
        this.progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      },
      (err) => {
        this.error = err?.message || "Upload failed.";
        this.uploading = false;
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);

          // Update Firebase Auth profile photo
          await updateProfile(user, { photoURL: url });

          // Save in Firestore (merge so other fields stay intact)
          await setDoc(
            doc(db, "users", user.uid),
            { photoURL: url, email: user.email || "" },
            { merge: true }
          );

          this.photoURL = url;
          this.file = null;
        } catch (e) {
          this.error = e?.message || "Failed to save profile image.";
        } finally {
          this.uploading = false;
          this.progress = 0;
        }
      }
    );
    }
  },

  data() {
    return { 
        loading: true, 
        userEmail: "", 
        username: "",
        file: null,
        uploading: false,
        progress: 0,
        error: "",
        photoURL: "",
     };

  },
  async mounted() {
    // Because your router guard + main.js listener protect the page,
    // auth.currentUser should be available here.
    const user = auth.currentUser;

    // Extra safety (should rarely happen if your guard is correct)
    if (!user) {
      this.$router.replace({ name: "loginsignup", query: { redirect: "/profile" } });
      return;
    }

    // Email from Firebase Auth
    this.userEmail = user.email || "";

    // Username from Firestore (users/{uid})
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      this.username = snap.exists() ? (snap.data().username || "") : "";
    } catch (e) {
      console.error("Failed to fetch profile:", e);
      this.username = "";
    } finally {
      this.loading = false;
    }
    if (user) {
  // Prefer Firestore photo if you stored it; fall back to Auth
    try {
        const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists() && snap.data().photoURL) {
      this.photoURL = snap.data().photoURL;
    } else if (user.photoURL) {
      this.photoURL = user.photoURL;
    }
  } catch {}
}
  },
};
</script>




<template>
<div class="container-fluid">
    <NavBar/>
    <div class="row d-flex justify-content-center">

        <div class="profile-container d-flex rounded mb-5 col-lg-10">
            <img v-if="photoURL" :src="photoURL" alt="Profile" class="w-25 m-5 rounded-circle" />
            <div class="details my-auto fs-3">
                <p>Username: {{ username }}</p>
                <p>Email: {{ userEmail }}</p>
            <button type="button" class="btn container-button" @click="openPicker">
            Upload Profile Image
            </button>


            <!-- hidden file input right below the button -->
            <input
            ref="fileInput"
            type="file"
            class="d-none"
            accept="image/png,image/jpeg,image/webp"
            @change="onFilePicked"
            />
              <p v-if="uploading" class="mt-2">Uploading… {{ progress }}%</p>
              <p v-if="error" class="text-danger mt-2">{{ error }}</p>
            </div>

        </div>
        <div class="post-button d-flex mb-4 px-0 col-lg-10">
            <button type="button" class="btn">Post</button>
        </div>

        <div class="likes-button mb-4 px-0 col-lg-10">
            <button type="button" class="btn">Likes</button>
        </div>

        <div class="analytics-button mb-4 px-0 col-lg-10">
            <button type="button" class="btn ">Analytics</button>
        </div>


    </div>




</div>

</template>




<style scoped>

.profile-container
{
    background-color: rgb(250, 194, 250);
    font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;

    
}

button
{
    width: 15%;
    padding: 20px;
    background-color: rgb(250, 194, 250);
    border: 1px solid black;
    transition: transform 0.2s ease;
}

.container-button
{
    width: 50%;
}

.btn:hover {
  background-color: rgb(211, 116, 211);
  border: 1px solid black;
  transform: translateY(-3px);
}
</style>