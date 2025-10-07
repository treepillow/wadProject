<script setup>



</script>




<template>
  <div class="background-section">

    <div class="video-background">
      <video autoplay loop muted playsinline>
        <source src="../assets/homes_video/homes_video.mp4" type="video/mp4">
      </video>
    </div>


    <nav class="navbar navbar-expand-lg">
      <a class="navbar-brand" href="#">
        <img src="../assets/homes_logo.png" />Homes
      </a>
      <div class="d-flex ms-auto">
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item">
              <a href="#">Login</a>
            </li>
            <li class="nav-item">
              <a href="#">Sign up</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <div class="content">
      <h1>Discover trusted <br>home businesses</h1>
    </div>

  </div>
</template>





<style scoped>

    .navbar{
        background-color: transparent; /* Set background color */
        width: 100%;
        position: absolute;
        top: 0;
        left: 0;
        padding: 20px 8%;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }


    .navbar img
    {
        width: 100px;
    }

    .navbar-brand
    {
        font-size: 50px;
        font-weight: bold;
        color: purple;
    }

    .navbar ul li 
    {
        list-style: none;
        display: inline-block;
        margin-left: 40px;
    }

    .navbar ul li a 
    {
        text-decoration: none;
        color: #fff;
        font-size: 17px;
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

    button
    {
        background-color: transparent;
        border: 1px solid black;
    }

    .background-section
    {
        background-color: black;
        position: relative;
        padding: 0 10%;
        width: 100%;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .content
    {
        text-align: center;
    }

    .content h1{
        font-family:'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
        font-size: 100px;
        color: #fff;
        font-weight: 600;
    }
    .video-background video{
        position: absolute;
        width: 100%;
        height: 100%;
        object-fit: cover;
        right: 0;
        bottom: 0;
        opacity: 0.35; 
    }

</style>