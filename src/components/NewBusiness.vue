<script>
import { addDoc, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, storage } from '@/firebase'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import NavBar from './NavBar.vue'

export default {
  name: 'CreateListing',
  components: { NavBar },

  data() {
    return {
      businessName: '',
      businessDesc: '',
      businessCategory: '',
      locationBlk: '',
      locationStreet: '',
      locationPostal: '',
      locationUnit: '',

      photos: [],
      isDragging: false,
      photoError: '',
      menuItems: [{ name: '', price: '', operatingHours: { start: '09:00', end: '17:00' } }],

      addrError: '',

      // Booking system
      acceptsBookings: false,
      bookingDuration: 60, // default 1 hour in minutes
      availableSlots: {
        mon: { enabled: false, start: '09:00', end: '17:00' },
        tue: { enabled: false, start: '09:00', end: '17:00' },
        wed: { enabled: false, start: '09:00', end: '17:00' },
        thu: { enabled: false, start: '09:00', end: '17:00' },
        fri: { enabled: false, start: '09:00', end: '17:00' },
        sat: { enabled: false, start: '09:00', end: '17:00' },
        sun: { enabled: false, start: '09:00', end: '17:00' }
      }
    }
  },

  computed: {
    isFoodCategory() { return this.businessCategory === 'Food and Drinks' },
    listLabel() { return this.isFoodCategory ? 'Menu' : 'Services' },
    addItemBtnText() { return this.isFoodCategory ? 'Add Item' : 'Add Service' },
    itemNamePlaceholder() { return this.isFoodCategory ? 'Item name' : 'Service name' },
    pricePlaceholder() { return this.isFoodCategory ? 'Price' : 'Price / Rate' },
    emptyLineAlertText() {
      return this.isFoodCategory
        ? 'Please ensure each menu item has a name and price.'
        : 'Please ensure each service has a name and price.'
    }
  },

  methods: {
    /* ---------- Photos ---------- */
    openFilePicker() { this.$refs.photoInput?.click() },
    onPhotoPicked(e) {
      const files = Array.from(e.target.files || [])
      const ok = ['image/jpeg', 'image/png', 'image/webp']
      files.forEach(f => {
        if (!ok.includes(f.type)) return
        this.photos.push({ file: f, url: URL.createObjectURL(f) })
      })
      e.target.value = ''
      if (this.photos.length > 0) this.photoError = ''
    },
    onDrop(e) {
      e.preventDefault()
      this.isDragging = false
      this.onPhotoPicked({ target: { files: e.dataTransfer.files } })
    },
    onDragOver(e) { e.preventDefault(); this.isDragging = true },
    onDragLeave() { this.isDragging = false },
    removePhoto(i) {
      const p = this.photos[i]; if (p?.url) URL.revokeObjectURL(p.url)
      this.photos.splice(i, 1)
      if (this.photos.length === 0) this.photoError = 'Please upload at least 1 photo.'
    },

    /* ---------- Menu/Services ---------- */
    addMenuItem() { this.menuItems.push({ name: '', price: '', operatingHours: { start: '09:00', end: '17:00' } }) },
    removeMenuItem(i) { if (this.menuItems.length > 1) this.menuItems.splice(i, 1) },

    /* ---------- Address utils & OneMap (strict) ---------- */
    normalizeStr(s){ return (s||'').toString().trim().toUpperCase().replace(/\s+/g,' ').replace(/[.,']/g,'') },
    expandAbbrev(road){
      const A=[[' AVE ',' AVENUE '],[' RD ',' ROAD '],[' ST ',' STREET '],[' DR ',' DRIVE '],
               [' CRES ',' CRESCENT '],[' CTRL ',' CENTRAL '],[' PK ',' PARK '],[' PKWY ',' PARKWAY '],
               [' TER ',' TERRACE '],[' HTS ',' HEIGHTS '],[' HWY ',' HIGHWAY '],
               [' GDN ',' GARDEN '],[' GDNS ',' GARDENS '],[' CTR ',' CENTRE '],[' PL ',' PLACE '],[' CL ',' CLOSE ']]
      let out=` ${this.normalizeStr(road)} `; A.forEach(([a,b])=>out=out.replaceAll(a,b)); return out.trim()
    },
    levDist(a,b){
      const m=a.length,n=b.length;if(!m)return n;if(!n)return m;const d=Array.from({length:m+1},()=>Array(n+1).fill(0))
      for(let i=0;i<=m;i++)d[i][0]=i;for(let j=0;j<=n;j++)d[0][j]=j
      for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){const c=a[i-1]===b[j-1]?0:1;d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c)}
      return d[m][n]
    },
    similarity(a,b){
      const A=this.expandAbbrev(a),B=this.expandAbbrev(b);const dist=this.levDist(A,B);const L=Math.max(A.length,B.length)||1;return 1-dist/L
    },

    async fetchJSON(url,{timeoutMs=6000}={}) {
      const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),timeoutMs)
      try{
        const res=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'},mode:'cors'})
        if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
        return await res.json()
      } finally { clearTimeout(t) }
    },
    async oneMapSearchByPostal(postal){
      const q=`searchVal=${encodeURIComponent(postal)}&returnGeom=N&getAddrDetails=Y&pageNum=1`
      const urls=[
        `https://www.onemap.gov.sg/api/common/elastic/search?${q}`,
        `https://developers.onemap.sg/commonapi/search?${q}`,
      ]
      let lastErr
      for(const u of urls){ try{ return await this.fetchJSON(u) } catch(e){ lastErr=e } }
      throw lastErr||new Error('All OneMap endpoints failed')
    },

    async validateAddressWithOneMap({ blk, street, postal }, threshold=0.80) {
      if(!/^[0-9]{6}$/.test(postal)) return { ok:false, reason:'Postal Code must be 6 digits.' }

      let json
      try { json = await this.oneMapSearchByPostal(postal) }
      catch (err) {
        console.error('OneMap error:', err)
        return { ok:false, reason:'Address service not reachable. (Check network/DNS or try again.)' }
      }

      const results = Array.isArray(json?.results) ? json.results : []
      const exact = results.filter(r => r.POSTAL === postal)
      const candidates = exact.length ? exact : results
      if (!candidates.length) return { ok:false, reason:'Invalid address in Singapore.' }

      const userStreet = this.expandAbbrev(street || '')
      let best=null,score=-1
      for(const r of candidates){ const s=this.similarity(userStreet,r.ROAD_NAME||''); if(s>score){best=r;score=s} }

      const omBlk=this.normalizeStr(best?.BLK_NO||''), omRoad=this.expandAbbrev(best?.ROAD_NAME||'')
      const omBldg=this.normalizeStr(best?.BUILDING||''), userBlk=this.normalizeStr(blk||'')

      if (userBlk && omBlk && userBlk !== omBlk && score < 0.92)
        return { ok:false, reason:`Block mismatch (OneMap: ${omBlk||'—'}, You: ${userBlk}).` }

      const streetOk = score >= threshold
      const buildingOk = omBldg && this.similarity(this.normalizeStr(street||''), omBldg) >= threshold
      if (!streetOk && !buildingOk)
        return { ok:false, reason:`Street doesn’t match OneMap (score ${score.toFixed(2)}).` }

      return { ok:true, data:{ blk: omBlk||userBlk, road: omRoad||userStreet, postal, building: best?.BUILDING||'', confidence: Math.max(score, buildingOk?1:0) } }
    },

    /* ---------- Input formatters ---------- */
    handlePostalInput(e){ this.locationPostal = e.target.value.replace(/\D/g,'').slice(0,6) },
    handleUnitInput(e){
      let v=e.target.value.toUpperCase().replace(/\s+/g,'')
      const m=v.match(/^#?(\d{0,2})(-)?(\d{0,3})$/)
      if(m){
        const a=m[1]||'', b=m[3]||''
        if(a.length>=2&&b.length>0)v=`#${a.slice(0,2)}-${b.slice(0,3)}`
        else if(a.length>=2)v=`#${a.slice(0,2)}-`
        else v=`#${a}`
      }
      this.locationUnit=v
    },

    /* ---------- Upload ---------- */
    async uploadAllPhotos(uid, listingId){
      if (!this.photos.length) return []
      const uploads = this.photos.map((p,idx)=>{
        const file=p.file
        const ext = file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
        const path = `listings/${uid}/${listingId}/${Date.now()}-${idx}.${ext}`
        const sref = storageRef(storage, path)
        return new Promise((resolve,reject)=>{
          const task=uploadBytesResumable(sref,file,{contentType:file.type})
          task.on('state_changed', null, reject, async ()=>{
            try { const url = await getDownloadURL(task.snapshot.ref); resolve({ url, path }) }
            catch (e) { reject(e) }
          })
        })
      })
      return Promise.all(uploads)
    },

    /* ---------- Submit (STRICT) ---------- */
    async handleSubmit(){
      const user = auth.currentUser
      if(!user){ alert('You must be logged in to publish a listing.'); return }

      if(!this.businessName.trim() || !this.businessDesc.trim() || !this.businessCategory.trim()){
        alert('Please fill in Service Name, Description, and Category.'); return
      }

      if(!this.locationBlk.trim() || !this.locationStreet.trim() || !this.locationPostal.trim() || !this.locationUnit.trim()){
        alert('Please fill in BLK, Street Address, Postal Code, and Unit No.'); return
      }
      if(!/^[0-9]{6}$/.test(this.locationPostal.trim())){ alert('Postal Code must be a 6-digit number (Singapore).'); return }
      if(!/^#?[0-9]{2}-[0-9]{3}$/.test(this.locationUnit.trim())){ alert('Unit No must look like #09-142.'); return }

      if (this.photos.length < 1) {
        this.photoError = 'Please upload at least 1 photo of your business.'
        this.$nextTick(() => this.$refs.uploadZone?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        return
      }

      this.addrError = ''
      const check = await this.validateAddressWithOneMap({
        blk: this.locationBlk, street: this.locationStreet, postal: this.locationPostal
      }, 0.80)
      if (!check.ok) { this.addrError = check.reason || 'Invalid address.'; return }

      const { blk, road: street, postal } = check.data
      for(const m of this.menuItems){ if(!m.name.trim() || !m.price.trim()){ alert(this.emptyLineAlertText); return } }

      const unit = this.locationUnit.trim()
      const unitFormatted = unit.startsWith('#') ? unit : `#${unit}`
      const locationFormatted = `BLK ${blk} ${street} Singapore ${postal} ${unitFormatted}`

      try{
        const menu = this.menuItems
          .filter(m=>(m.name||'').trim())
          .map(m=>({
            name:m.name.trim(),
            price:(m.price||'').trim(),
            operatingHours: m.operatingHours || { start: '09:00', end: '17:00' }
          }))

        // Add document to 'allListings' and get reference
const allListingsDocRef = await addDoc(collection(db, 'allListings'), {
  businessName: this.businessName.trim(),
  businessDesc: this.businessDesc.trim(),
  businessCategory: this.businessCategory.trim(),
  userId: user.uid,
  location: {
    country: 'Singapore',
    blk, 
    street,
    postal,
    unit: unitFormatted
  },
  locationFormatted,
  menu,
  createdAt: serverTimestamp(),
  viewCount: 0
});

// Get the listing ID
const listingId = allListingsDocRef.id;

// Upload the photos and get the URLs
const photoObjs = await this.uploadAllPhotos(user.uid, listingId);
const photoUrls = photoObjs.map(p => p.url);

// Prepare the final payload with photos and booking settings
const payload = {
  businessName: this.businessName.trim(),
  businessDesc: this.businessDesc.trim(),
  businessCategory: this.businessCategory.trim(),
  userId: user.uid,
  listingId,
  location: {
    country: 'Singapore',
    blk,
    street,
    postal,
    unit: unitFormatted
  },
  locationFormatted,
  photos: photoObjs,
  photoUrls,
  menu,
  createdAt: serverTimestamp(),
  viewCount: 0,
  // Booking settings
  acceptsBookings: this.acceptsBookings,
  bookingDuration: this.bookingDuration,
  availableSlots: this.availableSlots
};

// Now you can save the payload to the correct collections
await setDoc(allListingsDocRef, payload);
await addDoc(collection(doc(db, 'users', user.uid), 'myListings'), payload);


        alert('Listing Added Successfully!')
        this.clearForm()
      }catch(e){
        console.error(e)
        alert('Failed to add listing, please try again')
      }
    },

    clearForm(){
      this.businessName=''
      this.businessDesc=''
      this.businessCategory=''
      this.locationBlk=''
      this.locationStreet=''
      this.locationPostal=''
      this.locationUnit=''
      this.menuItems=[{name:'',price:'', operatingHours: { start: '09:00', end: '17:00' }}]
      this.photos.forEach(p=>p.url && URL.revokeObjectURL(p.url)); this.photos=[]
      this.photoError=''
      this.addrError=''
      this.acceptsBookings = false
      this.bookingDuration = 60
      this.availableSlots = {
        mon: { enabled: false, start: '09:00', end: '17:00' },
        tue: { enabled: false, start: '09:00', end: '17:00' },
        wed: { enabled: false, start: '09:00', end: '17:00' },
        thu: { enabled: false, start: '09:00', end: '17:00' },
        fri: { enabled: false, start: '09:00', end: '17:00' },
        sat: { enabled: false, start: '09:00', end: '17:00' },
        sun: { enabled: false, start: '09:00', end: '17:00' }
      }
    }
  },

  beforeUnmount(){ this.photos.forEach(p=>p.url && URL.revokeObjectURL(p.url)) }
}
</script>

<template>
  <!-- ⬇️ Same scaffold as HomePage.vue -->
  <div class="container-fluid bg-page">
    <NavBar />


    <!-- content zone (mirrors HomePage’s container pb-5) -->
    <div class="container pb-5 mt-5">
      <div class="d-flex justify-content-center">
        <div class="listing-card shadow-soft rounded-4 p-4 p-md-5">
          <form @submit.prevent="handleSubmit" novalidate>
            <div class="row g-4">
              <!-- Left -->
              <div class="col-lg-6">
                <div class="mb-3">
                  <label class="form-label fw-semibold">Service Name</label>
                  <input class="form-control form-control-lg" v-model="businessName" placeholder="Enter your business name here" />
                </div>
                <div class="mb-3">
                  <label class="form-label fw-semibold">Description</label>
                  <textarea class="form-control" rows="4" v-model="businessDesc" placeholder="Describe your service"></textarea>
                </div>
                <div class="mb-4">
                  <label class="form-label fw-semibold">Category</label>
                  <select class="form-select" v-model="businessCategory">
                    <option disabled value="">-- select category --</option>
                    <option>Food and Drinks</option><option>Beauty</option><option>Fitness</option>
                    <option>Arts & Craft</option><option>Education</option><option>Pets</option><option>Others</option>
                  </select>
                </div>
              </div>

              <!-- Right -->
              <div class="col-lg-6">
                <div class="mb-3">
                  <label class="form-label fw-semibold">Block</label>
                  <input class="form-control" v-model.trim="locationBlk" placeholder="e.g 485B" />
                </div>
                <div class="mb-1">
                  <label class="form-label fw-semibold">Street Address</label>
                  <input class="form-control" v-model.trim="locationStreet" placeholder="e.g Tampines Ave 9" />
                </div>
                <div class="row">
                  <div class="col-6 mb-3">
                    <label class="form-label fw-semibold">Postal Code</label>
                    <input class="form-control" v-model.trim="locationPostal"
                           inputmode="numeric" pattern="[0-9]{6}" maxlength="6"
                           placeholder="6-digit postal code" title="Enter a 6-digit Singapore postal code"
                           @input="handlePostalInput" />
                  </div>
                  <div class="col-6 mb-3">
                    <label class="form-label fw-semibold">Unit No</label>
                    <input class="form-control" v-model.trim="locationUnit"
                           pattern="#?[0-9]{2}-[0-9]{3}" placeholder="#01-234"
                           title="Format like #09-142" @input="handleUnitInput" />
                  </div>
                </div>

                <div v-if="addrError" class="text-danger small mt-n2 mb-2">{{ addrError }}</div>

                <div class="mb-3">
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <label class="form-label fw-semibold m-0">{{ listLabel }}</label>
                    <button type="button" class="btn btn-primary px-4 py-2" @click="addMenuItem">{{ addItemBtnText }}</button>
                  </div>
                  <div class="menu-list d-flex flex-column gap-3">
                    <div class="menu-item-card card p-3" v-for="(m, i) in menuItems" :key="i">
                      <div class="row g-2 mb-2">
                        <div class="col-6">
                          <input class="form-control" :placeholder="itemNamePlaceholder" v-model.trim="m.name" />
                        </div>
                        <div class="col">
                          <div class="input-group">
                            <span class="input-group-text">$</span>
                            <input class="form-control" :placeholder="pricePlaceholder" v-model.trim="m.price" />
                          </div>
                        </div>
                        <div class="col-auto d-flex align-items-center">
                          <button class="btn btn-outline-danger btn-sm" type="button"
                                  @click="removeMenuItem(i)" :disabled="menuItems.length === 1">×</button>
                        </div>
                      </div>
                      <div class="row g-2 align-items-center">
                        <div class="col-auto">
                          <label class="form-label mb-0 small text-muted">Operating Hours:</label>
                        </div>
                        <div class="col">
                          <div class="d-flex align-items-center gap-2">
                            <input type="time" class="form-control form-control-sm" v-model="m.operatingHours.start">
                            <span class="text-muted">to</span>
                            <input type="time" class="form-control form-control-sm" v-model="m.operatingHours.end">
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Photos -->
              <div class="col-12">
                <label class="form-label fw-semibold">Photos</label>

                <div v-if="photoError" class="text-danger small mb-2">{{ photoError }}</div>

                <div
                  ref="uploadZone"
                  class="upload-zone rounded-4 mb-3 d-flex flex-column align-items-center justify-content-center"
                  :class="{ dragging: isDragging }"
                  @drop="onDrop" @dragover="onDragOver" @dragleave="onDragLeave"
                  @click="openFilePicker" role="button" tabindex="0">
                  <input ref="photoInput" type="file" accept="image/*" class="d-none" multiple @change="onPhotoPicked" />
                  <div class="text-center">
                    <div class="camera-icon mb-2">📷</div>
                    <div class="upload-title">Add Photos</div>
                    <div class="upload-hint">Minimum 1 photo (PNG, JPG, WEBP). We recommend 3+.</div>
                  </div>
                </div>

                <div class="thumbs d-flex flex-wrap gap-2 mb-1">
                  <div v-for="(p, i) in photos" :key="i" class="thumb rounded-3 overflow-hidden position-relative">
                    <img :src="p.url" alt="preview" />
                    <button type="button" class="btn btn-sm btn-light remove-btn" @click.stop="removePhoto(i)">×</button>
                  </div>
                </div>
                <div class="text-muted small mb-3">Tip: upload at least 3 photos for a better listing.</div>
              </div>

              <!-- BOOKING SYSTEM -->
              <div class="col-12">
                <div class="booking-section card p-4 mb-3">
                  <h5 class="mb-3">📅 Booking System (Optional)</h5>

                  <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" id="acceptsBookings" v-model="acceptsBookings">
                    <label class="form-check-label fw-semibold" for="acceptsBookings">
                      Enable Booking System for this Service
                    </label>
                    <div class="text-muted small">Allow customers to book appointments in advance</div>
                  </div>

                  <div v-if="acceptsBookings" class="booking-settings">
                    <!-- Booking Duration -->
                    <div class="mb-3">
                      <label class="form-label fw-semibold">Typical Session Duration</label>
                      <select class="form-select" v-model.number="bookingDuration">
                        <option :value="30">30 minutes</option>
                        <option :value="60">1 hour</option>
                        <option :value="90">1.5 hours</option>
                        <option :value="120">2 hours</option>
                        <option :value="180">3 hours</option>
                      </select>
                    </div>

                    <!-- Available Days & Times -->
                    <div class="mb-3">
                      <label class="form-label fw-semibold">Available Days & Hours</label>
                      <div class="days-grid">
                        <div v-for="(day, key) in availableSlots" :key="key" class="day-row card p-3 mb-2">
                          <div class="d-flex align-items-center gap-3">
                            <div class="form-check">
                              <input class="form-check-input" type="checkbox" :id="`day-${key}`" v-model="day.enabled">
                              <label class="form-check-label fw-semibold text-capitalize" :for="`day-${key}`">
                                {{ key === 'mon' ? 'Monday' : key === 'tue' ? 'Tuesday' : key === 'wed' ? 'Wednesday' : key === 'thu' ? 'Thursday' : key === 'fri' ? 'Friday' : key === 'sat' ? 'Saturday' : 'Sunday' }}
                              </label>
                            </div>

                            <div v-if="day.enabled" class="flex-grow-1 d-flex align-items-center gap-2">
                              <input type="time" class="form-control form-control-sm" v-model="day.start">
                              <span>to</span>
                              <input type="time" class="form-control form-control-sm" v-model="day.end">
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="alert alert-info small">
                      💡 Customers will be able to request bookings during these times. You can accept or reject each request.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-3 d-flex justify-content-center gap-3">
              <button type="submit" class="btn btn-primary px-4 py-2">Publish Listing</button>
              <button type="button" class="btn btn-outline-secondary px-4 py-2" @click="clearForm">Clear Form</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:root {
  --brand: #4b2aa6;
  --font-family: 'Arial', sans-serif; /* Global font-family */
  --font-size-base: 1rem; /* Base font size (16px) */
  --font-size-large: 1.125rem; /* Large font size for headings/labels */
  --font-size-input: 1rem; /* Input text size */
  --font-size-placeholder: 0.875rem; /* Placeholder text size */
}

.bg-page {
  background: var(--page-bg, rgb(245, 239, 239));
}

.shadow-soft {
  box-shadow: 0 8px 28px rgba(0, 0, 0, .06);
}

.listing-card {
  max-width: 920px;
  width: 100%;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, .05);
}

/* Global font styles */
* {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
}

.container.py-3 h2 {
  line-height: 1.2;
}

/* Labels */
.form-label {
  font-size: var(--font-size-large);
  color: #4b3f7f;
  font-weight: 600;
}

/* Inputs and Textareas */
.form-control,
.form-select {
  font-size: var(--font-size-input);
  font-family: var(--font-family);
  background: #fff;
  border-color: #e6e3f4;
  color: #55596a;
}

/* Placeholder styling for form-control (input) and form-select (select) */
.form-control::placeholder,
.form-select::placeholder,
.form-select option:disabled {
  font-size: var(--font-size-placeholder);
  color: #a8a8a8; /* Lighter placeholder color */
  opacity: 1; /* Override default opacity of placeholder */
}

/* The first option (which acts as a placeholder) for select elements */
.form-select option:first-child {
  color: #a8a8a8; /* Lighter placeholder color */
}

/* Input focus state */
.form-control:focus,
.form-select:focus {
  border-color: #a889ff;
  box-shadow: 0 0 0 .2rem rgba(168, 137, 255, .15);
}

/* Input group */
.input-group-text {
  font-size: var(--font-size-input);
  background: #f5f3ff;
  border-color: #e6e3f4;
}

/* Button Styles */
.btn-primary {
  background: #7a5af8;
  border-color: #7a5af8;
  font-size: var(--font-size-base);
}

.btn-primary:hover {
  background: #6948f2;
  border-color: #6948f2;
}

.btn-outline-secondary {
  color: #55596a;
  border-color: #dedbea;
}

.btn-outline-secondary:hover {
  background: #f3f1ff;
  border-color: #cfc9ee;
}

/* Upload Zone */
.upload-zone {
  border: 2px dashed #d7ccff;
  background: #fff;
  min-height: 180px;
  cursor: pointer;
  transition: background .2s, border-color .2s;
}

.upload-zone.dragging {
  background: #f7f3ff;
  border-color: #bda8ff;
}

.camera-icon {
  font-size: 28px;
}

.upload-title {
  font-weight: 600;
  color: var(--brand);
}

.upload-hint {
  font-size: 0.875rem;
  color: #7a7a7a;
}

/* Thumbnails */
.thumbs .thumb {
  width: 88px;
  height: 88px;
  background: #fff;
  border: 1px solid #eee;
}

.thumbs .thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  line-height: 1;
  padding: 2px 8px;
  border-radius: 999px;
}

/* Form styling */
.form-control:focus,
.form-select:focus {
  border-color: #a889ff;
  box-shadow: 0 0 0 .2rem rgba(168, 137, 255, .15);
}

/* Booking System Styles */
.booking-section {
  background: #f8f9fa;
  border: 2px solid #e6e3f4;
}

.booking-section h5 {
  color: #4b2aa6;
  font-weight: 600;
}

.form-check-input:checked {
  background-color: #7a5af8;
  border-color: #7a5af8;
}

.form-switch .form-check-input {
  width: 3em;
  height: 1.5em;
}

.day-row {
  background: white;
  border: 1px solid #e6e3f4;
  transition: all 0.2s ease;
}

.day-row:hover {
  border-color: #a889ff;
  box-shadow: 0 2px 8px rgba(122, 90, 248, 0.1);
}

.alert-info {
  background-color: #e7f3ff;
  border-color: #b3d9ff;
  color: #004085;
}

.menu-item-card {
  background: #fafafa;
  border: 1px solid #e6e3f4;
  transition: all 0.2s ease;
}

.menu-item-card:hover {
  border-color: #a889ff;
  box-shadow: 0 2px 8px rgba(122, 90, 248, 0.1);
}

</style>
