<script>
import { onMounted, ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { getAuth } from 'firebase/auth'
import {
  getFirestore, doc, getDoc, updateDoc, serverTimestamp,
  collection, getDocs, query, orderBy, where
} from 'firebase/firestore'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import NavBar from './NavBar.vue'

const auth = getAuth()
const db = getFirestore()
const storage = getStorage()

export default {
  name: 'Profile',
  components: { NavBar, RouterLink },
  setup() {
    // ------------ UI state -------------
    const activeTab = ref('profile') // 'profile' | 'my' | 'liked'
    const loading = ref(true)
    const saving = ref(false)
    const err = ref('')
    const ok = ref('')

    // ------------ auth / user -------------
    const user = ref(null)

    // ------------ form model -------------
    const avatarUrl = ref('')
    const avatarFile = ref(null)
    const firstName = ref('')
    const lastName = ref('')
    const username = ref('')
    const email = ref('')
    const phone = ref('')
    const dateOfBirth = ref('')
    const address = ref('')

    const displayName = computed(() => {
      const f = (firstName.value || '').trim()
      const l = (lastName.value || '').trim()
      return (f || l) ? `${f} ${l}`.trim() : (username.value || '—')
    })

    // ------------ listings data -------------
    const myListings = ref([])        // [{listingId, businessName,...}]
    const myLoading = ref(false)
    const likedListings = ref([])     // fully resolved listing docs
    const likedLoading = ref(false)

    // ------------ helpers -------------
    function chunk(arr, size) {
      const out = []
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
      return out
    }
    function normPhone(v) {
      let s = (v || '').trim().replace(/\s+/g, '')
      if (/^\+65\d{8}$/.test(s)) return s
      if (/^\d{8}$/.test(s)) return `+65${s}`
      return s
    }

    // ------------ data loads -------------
    onMounted(async () => {
      try {
        const u = auth.currentUser
        if (!u) { err.value = 'You need to be logged in to view your profile.'; loading.value = false; return }
        user.value = u

        // profile
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (snap.exists()) {
          const d = snap.data()
          username.value = d.username || ''
          firstName.value = d.firstName || ''
          lastName.value = d.lastName || ''
          email.value = d.email || u.email || ''
          phone.value = d.phone || ''
          dateOfBirth.value = d.dateOfBirth || ''
          address.value = d.address || ''
          avatarUrl.value = d.photoURL || u.photoURL || ''
        } else {
          email.value = u.email || ''
          avatarUrl.value = u.photoURL || ''
        }

        // pre-load "My Listings" (fast, just your subcollection)
        loadMyListings()
        // pre-load "Liked" lazily once tab is opened to save reads
      } catch (e) {
        console.error(e); err.value = 'Failed to load profile.'
      } finally {
        loading.value = false
      }
    })

    async function loadMyListings() {
      if (!user.value) return
      try {
        myLoading.value = true
        const qRef = query(
          collection(db, 'users', user.value.uid, 'myListings'),
          orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(qRef)
        myListings.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      } finally { myLoading.value = false }
    }

    async function loadLikedListings() {
      if (!user.value || likedLoading.value) return
      try {
        likedLoading.value = true
        // Expecting docs in users/{uid}/likedListings with { listingId }
        const likesSnap = await getDocs(collection(db, 'users', user.value.uid, 'likedListings'))
        const ids = likesSnap.docs.map(d => d.data()?.listingId).filter(Boolean)

        // Resolve in batches of 10 (Firestore 'in' limit)
        const batches = chunk(ids, 10)
        const resolved = []
        for (const group of batches) {
          const qRef = query(collection(db, 'allListings'), where('listingId', 'in', group))
          const snap = await getDocs(qRef)
          snap.forEach(docSnap => resolved.push({ id: docSnap.id, ...docSnap.data() }))
        }
        // If some ids > 10*... left (or missing), fall back to per-doc fetch
        // (skipped here for simplicity; most cases covered by 'in' batching)
        likedListings.value = resolved.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      } finally { likedLoading.value = false }
    }

    // load liked when user clicks the tab first time
    function openTab(tab) {
      activeTab.value = tab
      if (tab === 'liked' && likedListings.value.length === 0) loadLikedListings()
    }

    // ------------ actions -------------
    function onPickAvatar(e) {
      const f = e.target.files?.[0]
      if (!f || !/^image\//.test(f.type)) return
      avatarFile.value = f
      avatarUrl.value = URL.createObjectURL(f)
    }

    async function saveProfile() {
      err.value = ''; ok.value = ''
      const f = firstName.value.trim()
      const l = lastName.value.trim()
      const u = username.value.trim()
      const ph = normPhone(phone.value)
      const dob = (dateOfBirth.value || '').trim()
      const addr = address.value.trim()

      if (!u) { err.value = 'Username is required.'; return }
      if (ph && !/^\+65\d{8}$/.test(ph)) { err.value = 'Phone must be +65 followed by 8 digits.'; return }

      saving.value = true
      try {
        let photoURL = avatarUrl.value
        if (avatarFile.value) {
          const path = `avatars/${user.value.uid}/${Date.now()}-${avatarFile.value.name}`
          const sref = storageRef(storage, path)
          await uploadBytes(sref, avatarFile.value, { contentType: avatarFile.value.type })
          photoURL = await getDownloadURL(sref)
        }
        await updateDoc(doc(db, 'users', user.value.uid), {
          username: u, firstName: f, lastName: l, phone: ph, dateOfBirth: dob,
          address: addr, email: email.value || user.value.email || '', photoURL,
          updatedAt: serverTimestamp()
        })
        ok.value = 'Profile saved!'
      } catch (e) {
        console.error(e); err.value = 'Failed to save. Please try again.'
      } finally { saving.value = false }
    }

    return {
      // tab
      activeTab, openTab,
      // profile
      loading, saving, err, ok,
      avatarUrl, onPickAvatar,
      firstName, lastName, username, email, phone, dateOfBirth, address,
      displayName, saveProfile,
      // listings tabs
      myListings, myLoading, likedListings, likedLoading
    }
  }
}
</script>

<template>
  <NavBar />

  <section class="bg-page">
    <div class="container-lg py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-xxl-10">
          <!-- Tabs -->
          <ul class="nav nav-tabs rounded-3 overflow-hidden shadow-soft mb-4">
            <li class="nav-item">
              <button class="nav-link" :class="{active: activeTab==='profile'}" @click="openTab('profile')">
                Profile
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link" :class="{active: activeTab==='my'}" @click="openTab('my')">
                My Listings
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link" :class="{active: activeTab==='liked'}" @click="openTab('liked')">
                Liked
              </button>
            </li>
          </ul>

          <!-- PROFILE TAB -->
          <div v-show="activeTab==='profile'" class="shadow-soft rounded-4 p-4 p-md-5 bg-white border">
            <div class="d-flex flex-column flex-md-row align-items-md-center gap-3 mb-4">
              <div class="position-relative">
                <img
                  :src="avatarUrl || 'https://ui-avatars.com/api/?name=H&background=ECE8FF&color=5A43C5&size=128'"
                  class="rounded-circle border object-fit-cover"
                  style="width: 96px; height: 96px;"
                  alt="Avatar"
                />
                <label class="btn btn-sm btn-light border position-absolute bottom-0 end-0 px-2 py-1">
                  Change
                  <input type="file" accept="image/*" class="d-none" @change="onPickAvatar" />
                </label>
              </div>
              <div class="flex-grow-1">
                <h3 class="m-0">{{ displayName }}</h3>
                <div class="text-muted">{{ email || '—' }}</div>
              </div>
              <div class="ms-md-auto">
                <button class="btn btn-primary" :disabled="saving" @click="saveProfile">
                  <span v-if="!saving">Save changes</span>
                  <span v-else class="spinner-border spinner-border-sm"></span>
                </button>
              </div>
            </div>

            <div v-if="err" class="alert alert-danger py-2">{{ err }}</div>
            <div v-if="ok" class="alert alert-success py-2">{{ ok }}</div>
            <div v-if="loading" class="text-center py-4"><div class="spinner-border"></div></div>

            <div v-if="!loading">
              <div class="row g-4">
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Username</label>
                  <input class="form-control" v-model="username" placeholder="aaron" />
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Email</label>
                  <input class="form-control" v-model="email" disabled />
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">First name</label>
                  <input class="form-control" v-model="firstName" placeholder="John" />
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Last name</label>
                  <input class="form-control" v-model="lastName" placeholder="Doe" />
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Phone</label>
                  <input class="form-control" v-model="phone" placeholder="+6591234567" />
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Date of birth</label>
                  <input class="form-control" v-model="dateOfBirth" placeholder="4 May 2000" />
                </div>
                <div class="col-12">
                  <label class="form-label fw-semibold">Address</label>
                  <input class="form-control" v-model="address" placeholder="BLK 555B Tampines Ave 11" />
                </div>
              </div>

              <div class="d-flex justify-content-end mt-4">
                <button class="btn btn-primary" :disabled="saving" @click="saveProfile">
                  <span v-if="!saving">Save changes</span>
                  <span v-else class="spinner-border spinner-border-sm"></span>
                </button>
              </div>
            </div>
          </div>

          <!-- MY LISTINGS TAB -->
          <div v-show="activeTab==='my'" class="shadow-soft rounded-4 p-4 p-md-5 bg-white border">
            <h4 class="mb-4">My Listings</h4>
            <div v-if="myLoading" class="text-center py-4"><div class="spinner-border"></div></div>
            <div v-else-if="!myListings.length" class="text-muted">You haven’t posted any listings yet.</div>
            <div v-else class="row g-3 g-md-4">
              <div v-for="l in myListings" :key="l.listingId" class="col-12 col-sm-6 col-lg-4">
                <div class="card h-100 shadow-sm">
                  <img
                    :src="(l.photoUrls && l.photoUrls[0]) || 'https://placehold.co/600x400?text=No+Photo'"
                    class="card-img-top" style="height:180px; object-fit:cover;"
                  />
                  <div class="card-body d-flex flex-column">
                    <h6 class="card-title mb-1">{{ l.businessName }}</h6>
                    <div class="text-muted small mb-2">{{ l.businessCategory || '—' }}</div>
                    <div class="mt-auto d-flex gap-2">
                      <RouterLink class="btn btn-outline-secondary btn-sm" :to="`/listing/${l.listingId}`">View</RouterLink>
                      <RouterLink class="btn btn-primary btn-sm" :to="`/edit/${l.listingId}`">Edit</RouterLink>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- LIKED TAB -->
          <div v-show="activeTab==='liked'" class="shadow-soft rounded-4 p-4 p-md-5 bg-white border">
            <h4 class="mb-4">Liked Listings</h4>
            <div v-if="likedLoading" class="text-center py-4"><div class="spinner-border"></div></div>
            <div v-else-if="!likedListings.length" class="text-muted">No liked listings yet.</div>
            <div v-else class="row g-3 g-md-4">
              <div v-for="l in likedListings" :key="l.listingId" class="col-12 col-sm-6 col-lg-4">
                <div class="card h-100 shadow-sm">
                  <img
                    :src="(l.photoUrls && l.photoUrls[0]) || 'https://placehold.co/600x400?text=No+Photo'"
                    class="card-img-top" style="height:180px; object-fit:cover;"
                  />
                  <div class="card-body d-flex flex-column">
                    <h6 class="card-title mb-1">{{ l.businessName }}</h6>
                    <div class="text-muted small mb-2">{{ l.businessCategory || '—' }}</div>
                    <RouterLink class="btn btn-outline-secondary btn-sm mt-auto" :to="`/listing/${l.listingId}`">Open</RouterLink>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>

.profile-container
{
    background-color: rgb(250, 194, 250);

    
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
