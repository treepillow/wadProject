<script>
import { addDoc, collection, doc, setDoc } from 'firebase/firestore'
import { auth, db, storage } from '@/firebase'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import NavBar from './NavBar.vue'

export default {
  components: {NavBar},
  data() {
    return {
      // listing fields
      businessName: '',
      businessDesc: '',
      businessLocation: '',
      businessCategory: '',
      toggleBtn: false,

      // UI-only state
      photos: [],              // [{ file, url }]
      isDragging: false,

      // simple dynamic menu (name + price)
      menuItems: [{ name: '', price: '' }],
    }
  },

  methods: {
    // ---------- Photos ----------
    openFilePicker() { this.$refs.photoInput?.click() },
    onPhotoPicked(e) {
      const files = Array.from(e.target.files || [])
      this.appendPhotos(files)
      e.target.value = '' // allow picking same file again
    },
    onDrop(e) {
      e.preventDefault()
      this.isDragging = false
      const files = Array.from(e.dataTransfer.files || [])
      this.appendPhotos(files)
    },
    onDragOver(e) { e.preventDefault(); this.isDragging = true },
    onDragLeave() { this.isDragging = false },

    appendPhotos(files) {
      const ok = ['image/jpeg', 'image/png', 'image/webp']
      files.forEach(f => {
        if (!ok.includes(f.type)) return
        const url = URL.createObjectURL(f)
        this.photos.push({ file: f, url })
      })
    },
    removePhoto(i) {
      const p = this.photos[i]
      if (p?.url) URL.revokeObjectURL(p.url)
      this.photos.splice(i, 1)
    },

    // ---------- Menu ----------
    addMenuItem() { this.menuItems.push({ name: '', price: '' }) },
    removeMenuItem(i) {
      if (this.menuItems.length === 1) return
      this.menuItems.splice(i, 1)
    },

    // ---------- Storage uploads ----------
    async uploadAllPhotos(userUid, listingId) {
      // returns [{url, path}]
      const uploads = this.photos.map((p, idx) => {
        const file = p.file
        const ext =
          file.type === 'image/png' ? 'png' :
          file.type === 'image/webp' ? 'webp' :
          file.type === 'image/jpeg' ? 'jpg' : 'jpg'

        const path = `listings/${userUid}/${listingId}/${Date.now()}-${idx}.${ext}`
        const sref = storageRef(storage, path)

        return new Promise((resolve, reject) => {
          const task = uploadBytesResumable(sref, file, { contentType: file.type })
          task.on('state_changed', null, reject, async () => {
            try {
              const url = await getDownloadURL(task.snapshot.ref)
              resolve({ url, path })
            } catch (e) { reject(e) }
          })
        })
      })

      return Promise.all(uploads)
    },

    // ---------- Submit ----------
    async handleSubmit(e) {
      e.preventDefault()

      const user = auth.currentUser
      if (!user) { alert('You must be logged in to publish a listing.'); return }

      if (
        !this.businessName.trim() ||
        !this.businessDesc.trim() ||
        !this.businessLocation.trim() ||
        !this.businessCategory.trim()
      ) {
        alert('Please fill in all required fields.')
        return
      }

      try {
        // 1) Clean menu
        const menu = (this.menuItems || [])
          .filter(m => (m.name || '').trim())
          .map(m => ({ name: m.name.trim(), price: (m.price || '').trim() }))

        // 2) Pre-make an id for neat storage pathing
        const allListingsColl = collection(db, 'allListings')
        const allListingsDocRef = doc(allListingsColl) // no write yet
        const listingId = allListingsDocRef.id

        // 3) Upload images
        const photoObjs = await this.uploadAllPhotos(user.uid, listingId)
        const photoUrls = photoObjs.map(p => p.url)

        // 4) Create main listing (fixed id)
        await setDoc(allListingsDocRef, {
          businessName: this.businessName.trim(),
          businessDesc: this.businessDesc.trim(),
          businessLocation: this.businessLocation.trim(),
          businessCategory: this.businessCategory.trim(),
          isActive: this.toggleBtn,
          userId: user.uid,
          listingId,
          photos: photoObjs,       // [{ url, path }]
          photoUrls,               // convenience
          menu,
          createdAt: new Date()
        })

        // 5) Mirror in user's subcollection
        await addDoc(collection(doc(db, 'users', user.uid), 'myListings'), {
          businessName: this.businessName.trim(),
          businessDesc: this.businessDesc.trim(),
          businessLocation: this.businessLocation.trim(),
          businessCategory: this.businessCategory.trim(),
          isActive: this.toggleBtn,
          userId: user.uid,
          listingId,
          photos: photoObjs,
          photoUrls,
          menu,
          createdAt: new Date()
        })

        alert('Listing Added Successfully!')
        this.clearForm()
      } catch (error) {
        console.error('Failed to add listing: ', error)
        alert('Failed to add listing, please try again')
      }
    },

    // ---------- Reset ----------
    clearForm() {
      this.businessName = ''
      this.businessDesc = ''
      this.businessLocation = ''
      this.businessCategory = ''
      this.toggleBtn = false
      this.menuItems = [{ name: '', price: '' }]
      this.photos.forEach(p => p.url && URL.revokeObjectURL(p.url))
      this.photos = []
    }
  },

  beforeUnmount() {
    this.photos.forEach(p => p.url && URL.revokeObjectURL(p.url))
  }
}
</script>

<template>
  <NavBar/>
  <div class="container-lg py-5 d-flex justify-content-center">
    <div class="listing-card shadow-sm rounded-4 p-4 p-md-5">
      <form @submit="handleSubmit">
        <div class="row g-4">
          <!-- Left: Photos + basics -->
          <div class="col-lg-6">
            <!-- Upload zone -->
            <div
              class="upload-zone rounded-4 border-dashed mb-3 d-flex flex-column align-items-center justify-content-center"
              :class="{'dragging': isDragging}"
              @drop="onDrop"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @click="openFilePicker"
              role="button"
              tabindex="0"
            >
              <input
                ref="photoInput"
                type="file"
                accept="image/*"
                class="d-none"
                multiple
                @change="onPhotoPicked"
              />
              <div class="text-center">
                <div class="camera-icon mb-2">📷</div>
                <div class="upload-title">Upload Photos</div>
                <div class="upload-hint">Click or drag & drop (PNG, JPG, WEBP)</div>
              </div>
            </div>

            <!-- Thumbnails -->
            <div class="thumbs d-flex flex-wrap gap-2 mb-4">
              <div
                v-for="(p, i) in photos"
                :key="i"
                class="thumb rounded-3 overflow-hidden position-relative"
              >
                <img :src="p.url" alt="preview" />
                <button type="button" class="btn btn-sm btn-light remove-btn" @click.stop="removePhoto(i)">×</button>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold">Business Name</label>
              <input type="text" class="form-control form-control-lg" v-model="businessName" placeholder="Sweet Bakes by Anna" />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold">Location</label>
              <input type="text" class="form-control" v-model="businessLocation" placeholder="123 Maple St" />
            </div>

            <div class="d-flex align-items-center justify-content-between mt-3">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="chatToggle" disabled />
                <label class="form-check-label" for="chatToggle">Enable chat with customers</label>
              </div>
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="activeToggle" v-model="toggleBtn" />
                <label class="form-check-label" for="activeToggle">Active</label>
              </div>
            </div>
          </div>

          <!-- Right: Description, Category, Menu -->
          <div class="col-lg-6">
            <div class="mb-3">
              <label class="form-label fw-semibold">Description</label>
              <textarea class="form-control" rows="4" v-model="businessDesc"
                        placeholder="Delicious homemade cookies and cakes for any occasion 🍪🎂"></textarea>
            </div>

            <div class="mb-4">
              <label class="form-label fw-semibold">Category</label>
              <select class="form-select" v-model="businessCategory">
                <option disabled value="">-- select category --</option>
                <option>Bakery</option>
                <option>F&amp;B</option>
                <option>Retail</option>
                <option>Service</option>
              </select>
            </div>

            <div class="mb-3">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <label class="form-label fw-semibold m-0">Menu</label>
                <button type="button" class="btn btn-link p-0" @click="addMenuItem">Add Item</button>
              </div>

              <div class="menu-list d-flex flex-column gap-2">
                <div class="row g-2" v-for="(m, i) in menuItems" :key="i">
                  <div class="col-8">
                    <input class="form-control" placeholder="Item name" v-model="m.name" />
                  </div>
                  <div class="col-3">
                    <div class="input-group">
                      <span class="input-group-text">$</span>
                      <input class="form-control" placeholder="Price" v-model="m.price" />
                    </div>
                  </div>
                  <div class="col-1 d-flex align-items-center">
                    <button class="btn btn-outline-secondary btn-sm" type="button" @click="removeMenuItem(i)" :disabled="menuItems.length === 1">—</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="mt-4 d-flex justify-content-center gap-3">
          <button type="submit" class="btn btn-primary px-4 py-2">Publish Listing</button>
          <button type="button" class="btn btn-outline-secondary px-4 py-2" @click="clearForm">Clear Form</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Soft purple card */
.listing-card {
  max-width: 920px;
  width: 100%;
  background: #f6efff;
  border: 1px solid #e9ddff;
}

/* Upload zone */
.border-dashed {
  border: 2px dashed #c4a6ff;
  background: #fbf8ff;
  min-height: 180px;
  cursor: pointer;
}
.upload-zone.dragging {
  background: #f2e8ff;
  border-color: #9c7aff;
}
.camera-icon { font-size: 28px; }
.upload-title { font-weight: 600; color: #7b57d6; }
.upload-hint { font-size: 0.9rem; color: #7a7a7a; }

/* Thumbnails */
.thumbs .thumb {
  width: 88px; height: 88px; background: #fff; border: 1px solid #e5e3f0;
}
.thumbs .thumb img { width: 100%; height: 100%; object-fit: cover; }
.remove-btn {
  position: absolute; top: 6px; right: 6px;
  line-height: 1; padding: 2px 8px; border-radius: 999px;
}

/* Form look */
.form-label { color: #6b5aa6; }
.form-control, .form-select {
  background: #ffffff;
  border-color: #e0d6ff;
}
.form-control:focus, .form-select:focus {
  border-color: #a889ff; box-shadow: 0 0 0 .2rem rgba(168,137,255,.15);
}

/* Buttons */
.btn-primary { background: #7a5af8; border-color: #7a5af8; }
.btn-primary:hover { background: #6948f2; border-color: #6948f2; }
.btn-outline-secondary { color: #6f6f8b; border-color: #d5d1ea; }
.btn-outline-secondary:hover { background: #ece8ff; border-color: #c7c1ee; }
</style>
