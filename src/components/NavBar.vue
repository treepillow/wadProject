<script setup>


</script>

<template>
<div class="container-fluid">
    <nav class="navbar navbar-expand-lg">

    <a class="navbar-brand" href="#">Homes</a>


    <div class="d-flex ms-auto">
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item">
                    <a class="nav-link active" aria-current="page" href="#">
                    <img src="../assets/message_icon.png"></img>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link profile-icon" href="#">
                    <img src="../assets/user.png"></img>
                    </a>
                </li>
            </ul>
        </div>
    </div>

    </nav>
  <div class ="search mt-2">
    <form class="d-flex" role="search">
      <input class="home-business form-control me-3" type="search" placeholder="🔍 Search for a home business" aria-label="Search"/>
        <input class="location-search form-control me-3" type="search" placeholder="📍 All of Singapore" aria-label="Search"/>   
        <button class="btn btn-outline-success" type="submit">Search</button>
    </form>

  </div>
</div>

</template>



<style>
    .navbar{
        background-color: rgb(243, 233, 243); /* Set background color */

    }

    .navbar-brand
    {
        font-size: 50px;
        font-weight: bold;
        color: purple;
    }

    .profile-icon
    {
        border: 3px solid black;
        border-radius: 50px;
    }

    .nav-item img
    {
        width: 50px;
    }

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

    .category img
    {
        width: 200px;
        height: 200px;
        border: 1px solid black;
        border-radius: 100px;
    }


    
</style>