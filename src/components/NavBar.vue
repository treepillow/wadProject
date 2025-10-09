<script setup>
</script>

<template>
<div class="container-fluid">
    <nav class="navbar navbar-expand-lg">

    <a class="navbar-brand" href="#">
        <img src="../assets/homes_logo.png"></img>Homes</a>


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
</div>


</template>



<style scoped>
    .navbar{
        background-color: transparent;

    }

    .navbar img
    {
        width: 100px;
    }

    .navbar-brand
    {
        font-size: 50px;
        font-weight: bold;
        color: white;
    }

    .profile-icon
    {
        border: 3px solid black;
        border-radius: 50px;
        background-color: white;
    }

    .nav-item img
    {
        width: 50px;
    }    
</style>