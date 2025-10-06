<script>
    export default {
        name: 'SearchBar'
    }

</script>



<template>
  <div class ="search mt-2">
    <form class="d-flex" role="search">
      <input class="home-business form-control me-3" type="search" placeholder="🔍 Search for a home business" aria-label="Search"/>
        <input class="location-search form-control me-3" type="search" placeholder="📍 All of Singapore" aria-label="Search"/>   
        <button class="btn btn-outline-success" type="submit">Search</button>
    </form>

  </div>
</template>



<style scoped>

    .home-business
    {
        width: 70%;
        padding: 15px;
    }
    .location-search
    {
        width: 20%;
    }
    .btn
    {
        width: 10%;
    }
</style>