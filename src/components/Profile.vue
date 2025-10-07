<script setup>
import NavBar from './NavBar.vue';


</script>



<template>
<div class="container-fluid">
    <NavBar/>
    <div class="row d-flex justify-content-center">

        <div class="profile-container d-flex rounded mb-5 col-lg-10">
            <img src="../assets/message_icon.png" class="w-25 m-5"></img>
            <div class="details my-auto fs-5">
                <p>Username:</p>
                <p>Email:</p>
                <p>Phone Number:</p>
            </div>
        </div>
        <div class="post-button d-flex mb-4 px-0 col-lg-10">
            <button type="button" class="btn">Post</button>
        </div>

        <div class="likes-button mb-4 px-0 col-lg-10">
            <button type="button" class="btn">Likes</button>
        </div>

        <div class="analytics-button mb-4 px-0 col-lg-10">
            <button type="button" class="btn ">Analytics</button>
        </div>


    </div>




</div>

</template>




<style scoped>

.profile-container
{
    background-color: rgb(250, 194, 250);
    font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;

    
}

button
{
    width: 15%;
    padding: 20px;
    background-color: rgb(250, 194, 250);
}
</style>