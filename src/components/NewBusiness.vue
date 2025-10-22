<script>
import { addDoc, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, storage } from '@/firebase'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import NavBar from './NavBar.vue'
import { Icon } from '@iconify/vue';
import { useDarkMode } from '@/composables/useDarkMode'

export default {
  name: 'CreateListing',
  components: { NavBar },

  setup() {
    // Initialize dark mode
    useDarkMode()
    return {}
  },

  data() {
    return {
      businessName: '',
      businessDesc: '',
      businessCategory: '',
      locationBlk: '',
      locationStreet: '',
      locationPostal: '',
      locationUnit: '',
      isLanded: false,

      photos: [],
      isDragging: false,
      photoError: '',
      menuItems: [{ name: '', price: '' }],

      // Weekly operating hours
      operatingHours: {
        monday: { enabled: true, start: '09:00', end: '17:00' },
        tuesday: { enabled: true, start: '09:00', end: '17:00' },
        wednesday: { enabled: true, start: '09:00', end: '17:00' },
        thursday: { enabled: true, start: '09:00', end: '17:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: true, start: '09:00', end: '17:00' },
        sunday: { enabled: true, start: '09:00', end: '17:00' }
      },

      addrError: '',
      addrWarning: '',
      validatingAddress: false,
      validationTimeout: null,

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

  watch: {
    locationBlk() { this.triggerValidation() },
    locationStreet() { this.triggerValidation() },
    isLanded() { this.triggerValidation() }
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
    addMenuItem() { this.menuItems.push({ name: '', price: '' }) },
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

    async validateAddressWithOneMap({ blk, street, postal, isLanded }, threshold=0.80) {
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
      if (!candidates.length) return { ok:false, reason:'Address not found. Please check your street name and postal code.' }

      const userStreet = this.expandAbbrev(street || '')
      let best=null,score=-1
      for(const r of candidates){ const s=this.similarity(userStreet,r.ROAD_NAME||''); if(s>score){best=r;score=s} }

      const omBlk=this.normalizeStr(best?.BLK_NO||''), omRoad=this.expandAbbrev(best?.ROAD_NAME||'')
      const omBldg=this.normalizeStr(best?.BUILDING||''), userBlk=this.normalizeStr(blk||'')

      // Only validate block for non-landed properties
      if (!isLanded && userBlk && omBlk && userBlk !== omBlk)
        return { ok:false, reason:'Address not found. Please check your block, street name, and postal code.' }

      // Extract and compare street numbers (must match exactly)
      const extractStreetNumber = (str) => {
        const match = str.match(/\b(\d+[A-Z]?)\b/)
        return match ? match[1] : null
      }

      const userNumber = extractStreetNumber(userStreet)
      const omNumber = extractStreetNumber(omRoad)

      if (userNumber && omNumber && userNumber !== omNumber)
        return { ok:false, reason:'Address not found. Please check your street name and postal code.' }

      const streetOk = score >= threshold
      const buildingOk = omBldg && this.similarity(this.normalizeStr(street||''), omBldg) >= threshold
      if (!streetOk && !buildingOk)
        return { ok:false, reason:'Address not found. Please check your street name and postal code.' }

      return { ok:true, data:{ blk: omBlk||userBlk, road: omRoad||userStreet, postal, building: best?.BUILDING||'', address: best?.ADDRESS||'', confidence: Math.max(score, buildingOk?1:0) } }
    },

    /* ---------- Real-time validation ---------- */
    async validateAddressRealtime() {
      this.addrError = ''
      this.addrWarning = ''

      const { locationPostal, locationStreet, locationBlk, isLanded } = this

      if (!locationPostal || locationPostal.length !== 6) {
        this.validatingAddress = false
        return
      }

      this.validatingAddress = true

      try {
        const check = await this.validateAddressWithOneMap({
          blk: locationBlk,
          street: locationStreet,
          postal: locationPostal,
          isLanded: isLanded
        }, 0.80)

        if (check.ok) {
          this.addrWarning = `✓ Valid address: ${check.data.address}`
        } else {
          this.addrError = check.reason
        }
      } catch (err) {
        this.addrError = 'Unable to verify address. Please check your internet connection and try again.'
      } finally {
        this.validatingAddress = false
      }
    },

    /* ---------- Input formatters ---------- */
    handlePostalInput(e){
      this.locationPostal = e.target.value.replace(/\D/g,'').slice(0,6)
      this.triggerValidation()
    },
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
    triggerValidation() {
      if (this.validationTimeout) clearTimeout(this.validationTimeout)
      this.validationTimeout = setTimeout(() => {
        this.validateAddressRealtime()
      }, 500)
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

      // Validate address fields
      if (!this.isLanded && !this.locationBlk.trim()) {
        alert('Block number is required for HDB/Condominium. Toggle "Landed Property" if applicable.')
        return
      }

      if(!this.locationStreet.trim() || !this.locationPostal.trim() || !this.locationUnit.trim()){
        alert('Please fill in Street Address, Postal Code, and Unit No.')
        return
      }
      if(!/^[0-9]{6}$/.test(this.locationPostal.trim())){
        alert('Postal Code must be a 6-digit number (Singapore).')
        return
      }
      if(!/^#?[0-9]{2}-[0-9]{3}$/.test(this.locationUnit.trim())){
        alert('Unit No must look like #09-142.')
        return
      }

      if (this.photos.length < 1) {
        this.photoError = 'Please upload at least 1 photo of your business.'
        this.$nextTick(() => this.$refs.uploadZone?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        return
      }

      // Validate address with OneMap
      this.addrError = ''
      const check = await this.validateAddressWithOneMap({
        blk: this.locationBlk,
        street: this.locationStreet,
        postal: this.locationPostal,
        isLanded: this.isLanded
      }, 0.80)

      if (!check.ok) {
        this.addrError = check.reason || 'Invalid address.'
        alert('Please provide a valid Singapore address.')
        return
      }

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
            price:(m.price||'').trim()
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
  operatingHours: this.operatingHours,
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
      this.menuItems=[{name:'',price:''}]
      this.operatingHours = {
        monday: { enabled: true, start: '09:00', end: '17:00' },
        tuesday: { enabled: true, start: '09:00', end: '17:00' },
        wednesday: { enabled: true, start: '09:00', end: '17:00' },
        thursday: { enabled: true, start: '09:00', end: '17:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: true, start: '09:00', end: '17:00' },
        sunday: { enabled: true, start: '09:00', end: '17:00' }
      }
      this.photos.forEach(p=>p.url && URL.revokeObjectURL(p.url)); this.photos=[]
      this.photoError=''
      this.addrError=''
      this.addrWarning=''
      this.isLanded = false
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
  <div class="bg-page">
    <NavBar />

    <!-- content zone (mirrors HomePage's container pb-5) -->
    <div class="container pb-5 mt-5">
      <div class="d-flex justify-content-center">
        <div class="listing-card shadow-soft rounded-4 p-4 p-md-5">
          <form @submit.prevent="handleSubmit" novalidate>
            <div class="d-flex flex-column">

              <!-- Name and Category (side by side) -->
              <div class="d-flex gap-3 mb-3">
                <div class="flex-grow-1">
                  <label class="form-label fw-semibold">
                    Service Name <Icon icon="mdi:briefcase" />
                  </label>
                  <input class="form-control form-control-lg" v-model="businessName" placeholder="Enter your business name here" />
                </div>
                <div class="flex-grow-1">
                  <label class="form-label fw-semibold">
                    Category <Icon icon="mdi:view-dashboard" />
                  </label>
                  <select class="form-select" v-model="businessCategory">
                    <option disabled value="">-- select category --</option>
                    <option>Food and Drinks</option>
                    <option>Beauty</option>
                    <option>Fitness</option>
                    <option>Arts & Craft</option>
                    <option>Education</option>
                    <option>Pets</option>
                    <option>Others</option>
                  </select>
                </div>
              </div>

              <!-- Description (full-width) -->
              <div class="mb-3">
                <label class="form-label fw-semibold">
                  Description <Icon icon="mdi:pencil" />
                </label>
                <textarea class="form-control" rows="4" v-model="businessDesc" placeholder="Describe your service"></textarea>
              </div>

              <!-- Property Type Toggle -->
              <div class="mb-4">
                <div class="custom-checkbox-wrapper mb-2">
                  <input class="custom-checkbox-input" type="checkbox" id="isLanded" v-model="isLanded">
                  <label class="custom-checkbox-label fw-semibold" for="isLanded">
                    <span class="custom-checkbox-box">
                      <Icon icon="mdi:check" class="custom-checkbox-icon" />
                    </span>
                    Landed Property
                  </label>
                </div>
                <div class="text-muted small" style="padding-left: 2rem;">
                  Check this if your property does not have a block number (e.g., Bungalow, Terrace, Semi-Detached)
                </div>
              </div>

              <!-- Block and Street Address (side by side) -->
              <div class="d-flex gap-3 mb-3">
                <div v-if="!isLanded" class="flex-grow-1">
                  <label class="form-label fw-semibold">
                    Block <Icon icon="mdi:home" />
                  </label>
                  <input class="form-control" v-model.trim="locationBlk" placeholder="e.g 485B" />
                </div>
                <div class="flex-grow-1">
                  <label class="form-label fw-semibold">
                    Street Address <Icon icon="mdi:map-marker" />
                  </label>
                  <input class="form-control" v-model.trim="locationStreet" placeholder="e.g Tampines Ave 9" />
                </div>
              </div>

              <!-- Postal and Unit No (side by side) -->
              <div class="d-flex gap-3 mb-3">
                <div class="flex-grow-1">
                  <label class="form-label fw-semibold">
                    Postal Code
                  </label>
                  <input class="form-control" v-model.trim="locationPostal"
                         inputmode="numeric" pattern="[0-9]{6}" maxlength="6"
                         placeholder="6-digit postal code" title="Enter a 6-digit Singapore postal code"
                         @input="handlePostalInput" />
                </div>
                <div class="flex-grow-1">
                  <label class="form-label fw-semibold">
                    Unit No
                  </label>
                  <input class="form-control" v-model.trim="locationUnit"
                         pattern="#?[0-9]{2}-[0-9]{3}" placeholder="#01-234"
                         title="Format like #09-142" @input="handleUnitInput" />
                </div>
              </div>

              <!-- Validation Messages -->
              <div v-if="validatingAddress" class="text-primary small mt-n2 mb-2">
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Validating address...
              </div>
              <div v-if="addrError" class="text-danger small mt-n2 mb-2">❌ {{ addrError }}</div>
              <div v-if="addrWarning" class="text-success small mt-n2 mb-2">{{ addrWarning }}</div>

              <!-- Operating Hours Section -->
              <div class="mb-4">
                <label class="form-label fw-semibold mb-3">
                  Operating Hours <Icon icon="mdi:clock-outline" />
                </label>

                <!-- Monday -->
                <div class="d-flex align-items-center gap-3 mb-2">
                  <div class="custom-checkbox-wrapper" style="min-width: 120px;">
                    <input class="custom-checkbox-input" type="checkbox" id="monEnabled" v-model="operatingHours.monday.enabled">
                    <label class="custom-checkbox-label" for="monEnabled">
                      <span class="custom-checkbox-box">
                        <Icon icon="mdi:check" class="custom-checkbox-icon" />
                      </span>
                      Monday
                    </label>
                  </div>
                  <div class="d-flex align-items-center gap-2 flex-grow-1" v-if="operatingHours.monday.enabled">
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.monday.start">
                    <span class="text-muted">to</span>
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.monday.end">
                  </div>
                  <span v-else class="text-muted small">Closed</span>
                </div>

                <!-- Tuesday -->
                <div class="d-flex align-items-center gap-3 mb-2">
                  <div class="custom-checkbox-wrapper" style="min-width: 120px;">
                    <input class="custom-checkbox-input" type="checkbox" id="tueEnabled" v-model="operatingHours.tuesday.enabled">
                    <label class="custom-checkbox-label" for="tueEnabled">
                      <span class="custom-checkbox-box">
                        <Icon icon="mdi:check" class="custom-checkbox-icon" />
                      </span>
                      Tuesday
                    </label>
                  </div>
                  <div class="d-flex align-items-center gap-2 flex-grow-1" v-if="operatingHours.tuesday.enabled">
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.tuesday.start">
                    <span class="text-muted">to</span>
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.tuesday.end">
                  </div>
                  <span v-else class="text-muted small">Closed</span>
                </div>

                <!-- Wednesday -->
                <div class="d-flex align-items-center gap-3 mb-2">
                  <div class="custom-checkbox-wrapper" style="min-width: 120px;">
                    <input class="custom-checkbox-input" type="checkbox" id="wedEnabled" v-model="operatingHours.wednesday.enabled">
                    <label class="custom-checkbox-label" for="wedEnabled">
                      <span class="custom-checkbox-box">
                        <Icon icon="mdi:check" class="custom-checkbox-icon" />
                      </span>
                      Wednesday
                    </label>
                  </div>
                  <div class="d-flex align-items-center gap-2 flex-grow-1" v-if="operatingHours.wednesday.enabled">
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.wednesday.start">
                    <span class="text-muted">to</span>
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.wednesday.end">
                  </div>
                  <span v-else class="text-muted small">Closed</span>
                </div>

                <!-- Thursday -->
                <div class="d-flex align-items-center gap-3 mb-2">
                  <div class="custom-checkbox-wrapper" style="min-width: 120px;">
                    <input class="custom-checkbox-input" type="checkbox" id="thuEnabled" v-model="operatingHours.thursday.enabled">
                    <label class="custom-checkbox-label" for="thuEnabled">
                      <span class="custom-checkbox-box">
                        <Icon icon="mdi:check" class="custom-checkbox-icon" />
                      </span>
                      Thursday
                    </label>
                  </div>
                  <div class="d-flex align-items-center gap-2 flex-grow-1" v-if="operatingHours.thursday.enabled">
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.thursday.start">
                    <span class="text-muted">to</span>
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.thursday.end">
                  </div>
                  <span v-else class="text-muted small">Closed</span>
                </div>

                <!-- Friday -->
                <div class="d-flex align-items-center gap-3 mb-2">
                  <div class="custom-checkbox-wrapper" style="min-width: 120px;">
                    <input class="custom-checkbox-input" type="checkbox" id="friEnabled" v-model="operatingHours.friday.enabled">
                    <label class="custom-checkbox-label" for="friEnabled">
                      <span class="custom-checkbox-box">
                        <Icon icon="mdi:check" class="custom-checkbox-icon" />
                      </span>
                      Friday
                    </label>
                  </div>
                  <div class="d-flex align-items-center gap-2 flex-grow-1" v-if="operatingHours.friday.enabled">
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.friday.start">
                    <span class="text-muted">to</span>
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.friday.end">
                  </div>
                  <span v-else class="text-muted small">Closed</span>
                </div>

                <!-- Saturday -->
                <div class="d-flex align-items-center gap-3 mb-2">
                  <div class="custom-checkbox-wrapper" style="min-width: 120px;">
                    <input class="custom-checkbox-input" type="checkbox" id="satEnabled" v-model="operatingHours.saturday.enabled">
                    <label class="custom-checkbox-label" for="satEnabled">
                      <span class="custom-checkbox-box">
                        <Icon icon="mdi:check" class="custom-checkbox-icon" />
                      </span>
                      Saturday
                    </label>
                  </div>
                  <div class="d-flex align-items-center gap-2 flex-grow-1" v-if="operatingHours.saturday.enabled">
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.saturday.start">
                    <span class="text-muted">to</span>
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.saturday.end">
                  </div>
                  <span v-else class="text-muted small">Closed</span>
                </div>

                <!-- Sunday -->
                <div class="d-flex align-items-center gap-3 mb-2">
                  <div class="custom-checkbox-wrapper" style="min-width: 120px;">
                    <input class="custom-checkbox-input" type="checkbox" id="sunEnabled" v-model="operatingHours.sunday.enabled">
                    <label class="custom-checkbox-label" for="sunEnabled">
                      <span class="custom-checkbox-box">
                        <Icon icon="mdi:check" class="custom-checkbox-icon" />
                      </span>
                      Sunday
                    </label>
                  </div>
                  <div class="d-flex align-items-center gap-2 flex-grow-1" v-if="operatingHours.sunday.enabled">
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.sunday.start">
                    <span class="text-muted">to</span>
                    <input type="time" class="form-control form-control-sm" v-model="operatingHours.sunday.end">
                  </div>
                  <span v-else class="text-muted small">Closed</span>
                </div>
              </div>

              <!-- Menu Items Section -->
              <div class="mb-3">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <label class="form-label fw-semibold m-0">
                    {{ listLabel }} <Icon icon="mdi:list-box" />
                  </label>
                  <button type="button" class="btn btn-primary px-4 py-2" @click="addMenuItem">{{ addItemBtnText }}</button>
                </div>
                <div class="menu-list d-flex flex-column gap-3">
                  <div class="menu-item-card card p-3" v-for="(m, i) in menuItems" :key="i">
                    <div class="mb-2">
                      <input class="form-control" :placeholder="itemNamePlaceholder" v-model.trim="m.name" />
                    </div>
                    <div class="mb-2">
                      <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input class="form-control" :placeholder="pricePlaceholder" v-model.trim="m.price" />
                      </div>
                    </div>
                    <div class="d-flex justify-content-end mb-2">
                      <button class="btn btn-outline-danger btn-sm" type="button" @click="removeMenuItem(i)" :disabled="menuItems.length === 1">×</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Photo Upload Section -->
              <div class="mb-3">
                <label class="form-label fw-semibold">
                  Photos <Icon icon="mdi:camera" />
                </label>

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

              <!-- Booking System Section -->
              <div class="mb-3">
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

              <!-- Submit & Clear Form Buttons -->
              <div class="mt-3 d-flex justify-content-center gap-3">
                <button type="submit" class="btn btn-primary px-4 py-2">Publish Listing</button>
                <button type="button" class="btn btn-outline-secondary px-4 py-2" @click="clearForm">Clear Form</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
:root {
  --font-family: 'Arial', sans-serif; /* Global font-family */
  --font-size-base: 1rem; /* Base font size (16px) */
  --font-size-large: 1.125rem; /* Large font size for headings/labels */
  --font-size-input: 1rem; /* Input text size */
  --font-size-placeholder: 0.875rem; /* Placeholder text size */
}

.bg-page {
  background: var(--color-bg-main);
}

.shadow-soft {
  box-shadow: var(--shadow-md);
}

.listing-card {
  max-width: 920px;
  width: 100%;
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
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
  color: var(--color-primary);
  font-weight: 600;
  padding-top: 12px;
}

/* Inputs and Textareas */
.form-control,
.form-select {
  font-size: var(--font-size-input);
  font-family: var(--font-family);
  background: var(--color-bg-white);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

/* Placeholder styling for form-control (input) and form-select (select) */
.form-control::placeholder,
.form-select::placeholder,
.form-select option:disabled {
  font-size: var(--font-size-placeholder);
  color: var(--color-text-secondary);
  opacity: 1; /* Override default opacity of placeholder */
}

/* The first option (which acts as a placeholder) for select elements */
.form-select option:first-child {
  color: var(--color-text-secondary);
}

/* Input focus state */
.form-control:focus,
.form-select:focus {
  border-color: var(--color-primary-lighter);
  box-shadow: var(--focus-ring);
}

/* Input group */
.input-group-text {
  font-size: var(--font-size-input);
  background: var(--color-bg-purple-tint);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

/* Button Styles */
.btn-primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-outline-secondary {
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.btn-outline-secondary:hover {
  background: var(--color-bg-purple-tint);
  border-color: var(--color-border-dark);
}

/* Upload Zone */
.upload-zone {
  border: 2px dashed var(--color-primary-pale);
  background: var(--color-bg-white);
  min-height: 180px;
  cursor: pointer;
  transition: background .2s, border-color .2s;
}

.upload-zone.dragging {
  background: var(--color-bg-purple-tint);
  border-color: var(--color-primary-light);
}

.camera-icon {
  font-size: 28px;
  color: var(--color-text-secondary);
}

.upload-title {
  font-weight: 600;
  color: var(--color-primary);
}

.upload-hint {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

/* Thumbnails */
.thumbs .thumb {
  width: 88px;
  height: 88px;
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
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
  border-color: var(--color-primary-lighter);
  box-shadow: var(--focus-ring);
}

/* Booking System Styles */
.booking-section {
  background: var(--color-bg-purple-tint);
  border: 2px solid var(--color-border);
}

.booking-section h5 {
  color: var(--color-primary);
  font-weight: 600;
}

.form-check-input:checked {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.form-switch .form-check-input {
  width: 3em;
  height: 1.5em;
}

.day-row {
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.day-row:hover {
  border-color: var(--color-primary-lighter);
  box-shadow: var(--shadow-sm);
}

.alert-info {
  background-color: var(--color-bg-purple-tint);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.menu-item-card {
  background: var(--color-bg-purple-tint);
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.menu-item-card:hover {
  border-color: var(--color-primary-lighter);
  box-shadow: var(--shadow-sm);
}

/* Mobile responsive styles */
@media (max-width: 767.98px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .card {
    padding: 1.25rem;
  }

  .upload-zone {
    min-height: 150px;
  }

  .thumbs .thumb {
    width: 72px;
    height: 72px;
  }

  .camera-icon {
    font-size: 24px;
  }

  .upload-title {
    font-size: 0.95rem;
  }

  .upload-hint {
    font-size: 0.813rem;
  }

  /* Stack booking time inputs on mobile */
  .day-row .row {
    flex-direction: column;
  }

  .day-row .col {
    width: 100%;
    max-width: 100%;
  }
}

@media (max-width: 575.98px) {
  .container {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }

  .listing-card {
    max-width: 100%;
    margin: 0;
  }

  .card {
    padding: 1rem 0.85rem;
    border-radius: 12px;
  }

  h2 {
    font-size: 1.35rem;
    margin-bottom: 1rem;
  }

  h5 {
    font-size: 0.95rem;
  }

  .form-label {
    font-size: 0.95rem;
    padding-top: 8px;
  }

  .btn {
    font-size: 0.85rem;
    padding: 0.6rem 1rem;
    border-radius: 10px;
  }

  .btn-primary {
    min-height: 44px;
  }

  .form-control,
  .form-select {
    font-size: 0.85rem;
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
  }

  .input-group-text {
    font-size: 0.85rem;
    padding: 0.6rem 0.75rem;
  }

  .upload-zone {
    min-height: 140px;
    padding: 1rem;
  }

  .camera-icon {
    font-size: 20px;
  }

  .upload-title {
    font-size: 0.9rem;
  }

  .upload-hint {
    font-size: 0.75rem;
  }

  .thumbs .thumb {
    width: 70px;
    height: 70px;
  }

  .remove-btn {
    font-size: 0.75rem;
    padding: 2px 6px;
  }

  .menu-item-card {
    padding: 0.85rem;
    margin-bottom: 0.75rem;
  }

  /* Better spacing for form groups */
  .mb-3 {
    margin-bottom: 0.85rem !important;
  }

  .mb-4 {
    margin-bottom: 1.25rem !important;
  }

  /* Booking section */
  .booking-section {
    padding: 1rem;
  }

  .day-row {
    padding: 0.75rem;
    margin-bottom: 0.65rem;
  }

  /* Row spacing for 2-column layout */
  .row.g-3 {
    --bs-gutter-x: 0.65rem;
    --bs-gutter-y: 0.75rem;
  }

  /* Operating hours mobile fix */
  .d-flex.align-items-center.gap-3 {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem !important;
  }

  .d-flex.align-items-center.gap-3 .form-check {
    width: 100%;
  }

  .d-flex.align-items-center.gap-3 .d-flex.align-items-center.gap-2 {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
  }

  .d-flex.align-items-center.gap-3 .form-control-sm {
    flex: 1;
    min-width: 0;
  }

  .d-flex.align-items-center.gap-3 .text-muted {
    flex-shrink: 0;
    padding: 0 0.25rem;
  }
}

/* Custom Checkbox Styles */
.custom-checkbox-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.custom-checkbox-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.custom-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  margin: 0;
  font-weight: 500;
  color: var(--color-text-primary);
}

.custom-checkbox-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border-dark);
  border-radius: 4px;
  background: var(--color-bg-white);
  transition: all 0.2s ease;
}

.custom-checkbox-icon {
  font-size: 14px;
  color: white;
  opacity: 0;
  transform: scale(0);
  transition: all 0.2s ease;
}

/* Checked state */
.custom-checkbox-input:checked + .custom-checkbox-label .custom-checkbox-box {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.custom-checkbox-input:checked + .custom-checkbox-label .custom-checkbox-icon {
  opacity: 1;
  transform: scale(1);
}

/* Hover state */
.custom-checkbox-label:hover .custom-checkbox-box {
  border-color: var(--color-primary);
}

/* Focus state */
.custom-checkbox-input:focus + .custom-checkbox-label .custom-checkbox-box {
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

</style>
