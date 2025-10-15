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
      menuItems: [{ name: '', price: '' }],

      addrError: '' // shown under address fields
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
    },

    /* ---------- Menu/Services ---------- */
    addMenuItem() { this.menuItems.push({ name: '', price: '' }) },
    removeMenuItem(i) { if (this.menuItems.length > 1) this.menuItems.splice(i, 1) },

    /* ---------- Address utils & OneMap (strict) ---------- */
    normalizeStr(s){ return (s||'').toString().trim().toUpperCase().replace(/\s+/g,' ').replace(/[.,']/g,'') },  // <-- comma fixed here
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
      if (!candidates.length) return { ok:false, reason:'Postal Code not found in OneMap.' }

      // best match by street similarity
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
            try {
              const url = await getDownloadURL(task.snapshot.ref)
              resolve({ url, path })
            } catch (e) { reject(e) }
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

      this.addrError = ''
      const check = await this.validateAddressWithOneMap({
        blk: this.locationBlk, street: this.locationStreet, postal: this.locationPostal
      }, 0.80)

      if (!check.ok) {               // STRICT BLOCK
        this.addrError = check.reason || 'Invalid address.'
        return
      }

      // Validated, use canonical values
      const { blk, road: street, postal } = check.data
      for(const m of this.menuItems){ if(!m.name.trim() || !m.price.trim()){ alert(this.emptyLineAlertText); return } }

      const unit = this.locationUnit.trim()
      const unitFormatted = unit.startsWith('#') ? unit : `#${unit}`
      const locationFormatted = `BLK ${blk} ${street} Singapore ${postal} ${unitFormatted}`

      try{
        const menu = this.menuItems
          .filter(m=>(m.name||'').trim())
          .map(m=>({name:m.name.trim(), price:(m.price||'').trim()}))

        // Pre-create listing doc id
        const allListingsDocRef = doc(collection(db,'allListings'))
        const listingId = allListingsDocRef.id

        // Upload photos (if any)
        const photoObjs = await this.uploadAllPhotos(user.uid, listingId)
        const photoUrls = photoObjs.map(p=>p.url)

        const payload = {
          businessName:this.businessName.trim(),
          businessDesc:this.businessDesc.trim(),
          businessCategory:this.businessCategory.trim(),
          userId:user.uid,
          listingId,
          location:{ country:'Singapore', blk, street, postal, unit:unitFormatted },
          locationFormatted,
          photos:photoObjs,
          photoUrls,
          menu,
          createdAt: serverTimestamp()
        }

        await setDoc(allListingsDocRef, payload)

        await addDoc(collection(doc(db,'users',user.uid),'myListings'), payload)

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
      this.photos.forEach(p=>p.url && URL.revokeObjectURL(p.url)); this.photos=[]
      this.addrError=''
    }
  },

  beforeUnmount(){ this.photos.forEach(p=>p.url && URL.revokeObjectURL(p.url)) }
}
</script>

<template>
  <NavBar />
  <section class="page-section bg-page">
    <div class="container-lg py-5 d-flex justify-content-center">
      <div class="listing-card shadow-soft rounded-4 p-4 p-md-5">
        <form @submit.prevent="handleSubmit" novalidate>
          <div class="row g-4">
            <!-- Left -->
            <div class="col-lg-6">
              <div class="mb-3">
                <label class="form-label fw-semibold">Service Name</label>
                <input class="form-control form-control-lg" v-model="businessName" placeholder="Sweet Bakes by Anna" />
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
                <input class="form-control" v-model.trim="locationBlk" placeholder="485B" />
              </div>
              <div class="mb-1">
                <label class="form-label fw-semibold">Street Address</label>
                <input class="form-control" v-model.trim="locationStreet" placeholder="Tampines Ave 9" />
              </div>
              <div class="row">
                <div class="col-6 mb-3">
                  <label class="form-label fw-semibold">Postal Code</label>
                  <input class="form-control" v-model.trim="locationPostal"
                         inputmode="numeric" pattern="[0-9]{6}" maxlength="6"
                         placeholder="521485" title="Enter a 6-digit Singapore postal code"
                         @input="handlePostalInput" />
                </div>
                <div class="col-6 mb-3">
                  <label class="form-label fw-semibold">Unit No</label>
                  <input class="form-control" v-model.trim="locationUnit"
                         pattern="#?[0-9]{2}-[0-9]{3}" placeholder="#09-142"
                         title="Format like #09-142" @input="handleUnitInput" />
                </div>
              </div>

              <div v-if="addrError" class="text-danger small mt-n2 mb-2">{{ addrError }}</div>

              <div class="mb-3">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <label class="form-label fw-semibold m-0">{{ listLabel }}</label>
                  <button type="button" class="btn btn-link p-0" @click="addMenuItem">{{ addItemBtnText }}</button>
                </div>
                <div class="menu-list d-flex flex-column gap-2">
                  <div class="row g-2" v-for="(m, i) in menuItems" :key="i">
                    <div class="col-8">
                      <input class="form-control" :placeholder="itemNamePlaceholder" v-model.trim="m.name" />
                    </div>
                    <div class="col-3">
                      <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input class="form-control" :placeholder="pricePlaceholder" v-model.trim="m.price" />
                      </div>
                    </div>
                    <div class="col-1 d-flex align-items-center">
                      <button class="btn btn-outline-secondary btn-sm" type="button"
                              @click="removeMenuItem(i)" :disabled="menuItems.length === 1">—</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Photos -->
            <div class="col-12">
              <label class="form-label fw-semibold">Photos</label>
              <div class="upload-zone rounded-4 mb-3 d-flex flex-column align-items-center justify-content-center"
                   :class="{ dragging: isDragging }"
                   @drop="onDrop" @dragover="onDragOver" @dragleave="onDragLeave"
                   @click="openFilePicker" role="button" tabindex="0">
                <input ref="photoInput" type="file" accept="image/*" class="d-none" multiple @change="onPhotoPicked" />
                <div class="text-center">
                  <div class="camera-icon mb-2">📷</div>
                  <div class="upload-title">Add Photos</div>
                  <div class="upload-hint">Click or drag & drop (PNG, JPG, WEBP)</div>
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
          </div>

          <div class="mt-3 d-flex justify-content-center gap-3">
            <button type="submit" class="btn btn-primary px-4 py-2">Publish Listing</button>
            <button type="button" class="btn btn-outline-secondary px-4 py-2" @click="clearForm">Clear Form</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
:root { --brand:#4b2aa6; }
.bg-page { background: var(--page-bg, rgb(245,239,239)); }
.shadow-soft { box-shadow: 0 8px 28px rgba(0,0,0,.06); }
.listing-card { max-width: 920px; width: 100%; background:#fff; border:1px solid rgba(0,0,0,.05); }
.upload-zone { border:2px dashed #d7ccff; background:#fff; min-height:180px; cursor:pointer; transition:background .2s,border-color .2s; }
.upload-zone.dragging { background:#f7f3ff; border-color:#bda8ff; }
.camera-icon{font-size:28px}.upload-title{font-weight:600;color:var(--brand)}.upload-hint{font-size:.9rem;color:#7a7a7a}
.thumbs .thumb{width:88px;height:88px;background:#fff;border:1px solid #eee}
.thumbs .thumb img{width:100%;height:100%;object-fit:cover}
.remove-btn{position:absolute;top:6px;right:6px;line-height:1;padding:2px 8px;border-radius:999px}
.form-label{color:#4b3f7f}.form-control,.form-select{background:#fff;border-color:#e6e3f4}
.input-group-text{background:#f5f3ff;border-color:#e6e3f4}
.form-control:focus,.form-select:focus{border-color:#a889ff;box-shadow:0 0 0 .2rem rgba(168,137,255,.15)}
.btn-primary{background:#7a5af8;border-color:#7a5af8}.btn-primary:hover{background:#6948f2;border-color:#6948f2}
.btn-outline-secondary{color:#55596a;border-color:#dedbea}.btn-outline-secondary:hover{background:#f3f1ff;border-color:#cfc9ee}
</style>
