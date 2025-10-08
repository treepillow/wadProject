<script setup>
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
</script>

<template>
  <div class="container-fluid mt-4">
    <form>
      <div class="row">
        <div class="col-md-2"></div>
        <div class="col-md-4">
          <div class="mb-3">
            <input type="file" id="photoUpload" accept="image/*" style="display: none;" />
            <label for="photoUpload" class="btn btn-outline-primary">Click to Upload Photo</label>
          </div>
          <div class="mb-3">
            <label for="businessName" class="form-label">Business Name</label>
            <input type="text" id="businessName" class="form-control" />
          </div>
          <div class="mb-3">
            <label for="businessLocation" class="form-label">Location</label>
            <input type="text" id="businessLocation" class="form-control" />
          </div>
          <div class="mb-3">
            <label class="form-check-label me-2" for="toggleBtn">Toggle</label>
            <input type="checkbox" id="toggleBtn" class="form-check-input" />
          </div>
        </div>
        <div class="col-md-4">
          <div class="mb-3">
            <label for="businessDesc" class="form-label">Description</label>
            <input type="text" id="businessDesc" class="form-control" />
          </div>
          <div class="mb-3">
            <label for="businessCategory" class="form-label">Category</label>
            <select id="businessCategory" class="form-select">
              <option>...</option>
            </select>
          </div>
          <div class="mb-3">
            <label>Menu</label>
            <br/>
            <button id="addItem" type="button" class="btn">Add Item</button>
          </div>
        </div>
      </div>
      <div class="mt-4 last">
        <button id="publishBtn" type="submit" class="btn me-2">Publish Listing</button>
        <button id="clearFormBtn" type="reset" class="btn">Clear Form</button>
      </div>
      <br/>
    </form>
  </div>
</template>
<style>
.container-fluid{
    background-color: white;
    color: purple;
    border-radius: 5px;
}
.btn{
    border: 1px solid black;
    background-color: purple;
    color: white;
}
.last{
    display: flex;
    justify-content: center;
}
</style>