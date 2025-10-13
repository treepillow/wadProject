<script>
import { addDoc, collection, doc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

export default {
  data() {
    return {
      // initialize fields
      businessName: '',
      businessDesc: '',
      businessLocation: '',
      businessCategory: '',
      toggleBtn: false
    }
  },
  methods: {
    // triggers when user submit the form
    async handleSubmit(e) {
      console.log('Form submitted')
      e.preventDefault()
      // check if user is authenticated (check if user detail is in database)
      const user = auth.currentUser
      if (!user) {
        alert('You must be logged in to publish a listing.')
        return
      }
      // if any field is empty -> pop-up error
      if (
        !this.businessName.trim() ||
        !this.businessDesc.trim() ||
        !this.businessLocation.trim() ||
        !this.businessCategory.trim()
      ) {
        alert('Please fill in all required fields.')
        return
      }
      // add to allListings -> Use to display all listings
      // add to database collection: 'allListings'
      try{
        await addDoc(collection(db, 'allListings'), {
          businessName: this.businessName.trim(),
          businessDesc: this.businessDesc.trim(),
          businessLocation: this.businessLocation.trim(),
          businessCategory: this.businessCategory.trim(),
          isActive: this.toggleBtn,
          userId: user.uid,
          createdAt: new Date()
        })
      // add to myListing, a subcollection for users -> to view own listings
      await addDoc(collection(doc(db, 'users', user.uid), 'myListings'), {
          businessName: this.businessName.trim(),
          businessDesc: this.businessDesc.trim(),
          businessLocation: this.businessLocation.trim(),
          businessCategory: this.businessCategory.trim(),
          isActive: this.toggleBtn,
          userId: user.uid,
          createdAt: new Date()
        })
        console.log('Listing Successfully Added to database')
        alert('Listing Added Successfully!')
        this.clearForm()
      }
      catch(error){
        console.log('Failed to add listing: ', error)
        alert('Failed to add listing, please try again')
      }
    },
    // Clear form after successful submission
    clearForm() {
      this.businessName = ''
      this.businessDesc = ''
      this.businessLocation = ''
      this.businessCategory = ''
      this.toggleBtn = false
    }
  }
}
</script>

<template>
  <div class="container-fluid mt-4">
    <form v-on:submit="handleSubmit">
      <div class="row">
        <div class="col-md-2"></div>
        <div class="col-md-4">
          <div class="mb-3">
            <input type="file" id="photoUpload" accept="image/*" style="display: none;" />
            <label for="photoUpload" class="btn">Click to Upload Photo</label>
          </div>
          <div class="mb-3">
            <label for="businessName" class="form-label">Business Name</label>
            <input type="text" id="businessName" class="form-control" v-model="businessName" />
          </div>
          <div class="mb-3">
            <label for="businessLocation" class="form-label">Location</label>
            <input type="text" id="businessLocation" class="form-control" v-model="businessLocation" />
          </div>
          <div class="mb-3">
            <label class="form-check-label me-2" for="toggleBtn">Active</label>
            <input type="checkbox" id="toggleBtn" class="form-check-input" v-model="toggleBtn" />
          </div>
        </div>
        <div class="col-md-4">
          <div class="mb-3">
            <label for="businessDesc" class="form-label">Description</label>
            <input type="text" id="businessDesc" class="form-control" v-model="businessDesc" />
          </div>
          <div class="mb-3">
            <label for="businessCategory" class="form-label">Category</label>
            <select id="businessCategory" class="form-select" v-model="businessCategory">
              <option disabled value="">-- select category --</option>
              <option>F&B</option>
              <option>Retail</option>
              <option>Service</option>
            </select>
          </div>
          <div class="mb-3">
            <label>Menu</label>
            <br />
            <button id="addItem" type="button" class="btn">Add Item</button>
          </div>
        </div>
      </div>
      <div class="mt-4 last">
        <button id="publishBtn" type="submit" class="btn me-2">Publish Listing</button>
        <button id="clearFormBtn" type="button" class="btn" v-on:click="clearForm">Clear Form</button>
      </div>
      <br />
    </form>
  </div>
</template>

<style scoped>
.container-fluid {
  background-color: white;
  color: purple;
  border-radius: 5px;
}
.btn {
  border: 1px solid black;
  background-color: purple;
  color: white;
}
.last {
  display: flex;
  justify-content: center;
}
</style>