<script setup>
import { ref } from 'vue'
import { addDoc, collection } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

// Reactive form fields & binded to input
const businessName = ref('')
const businessDesc = ref('')
const businessLocation = ref('')
const businessCategory = ref('')
const toggleBtn = ref(false)

const handleSubmit = async (e) => {
  e.preventDefault()

  const user = auth.currentUser
  if (!user) {
    alert('You must be logged in to publish a listing.')
    return
  }

  // Validate required fields
  if (
    !businessName.value.trim() ||
    !businessDesc.value.trim() ||
    !businessLocation.value.trim() ||
    !businessCategory.value.trim()
  ) {
    alert('Please fill in all required fields.')
    return
  }

  try {
    await addDoc(collection(db, 'businessListing'), {
      businessName: businessName.value.trim(),
      businessDesc: businessDesc.value.trim(),
      businessLocation: businessLocation.value.trim(),
      businessCategory: businessCategory.value.trim(),
      isActive: toggleBtn.value,
      userId: user.uid,
      createdAt: new Date()
    })

    alert('Business listing published!')
    clearForm()
  } catch (error) {
    console.error('Error publishing listing:', error)
    alert('Failed to publish listing.')
  }
}


// clear inputs
const clearForm = () => {
  businessName.value = ''
  businessDesc.value = ''
  businessLocation.value = ''
  businessCategory.value = ''
  toggleBtn.value = false
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
