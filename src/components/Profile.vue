<script>



</script>





<template>

<div class="container-fluid">
    <div class="profile-container d-flex justify-content-start mx-auto mt-5 mb-5 rounded">
        <img src="../assets/message_icon.png" class="w-25 m-5"></img>
        <div class="details my-auto fs-5">
                <p>Username:</p>
                <p>Email:</p>
                <p>Phone Number:</p>
        </div>
    </div>

        <div class="post-button mb-3">
            <button type="button" class="btn btn-primary">Post</button>
        </div>

        <div class="likes-button mb-3">
            <button type="button" class="btn btn-primary">Likes</button>
        </div>

        <div class="analytics-button mb-3">
            <button type="button" class="btn btn-primary">Analytics</button>
        </div>


</div>

</template>




<style scoped>

.profile-container
{
    background-color: rgb(250, 194, 250);
    font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
    width: 75%;

    
}

button
{
    width: 15%;
    padding: 20px;
}
</style>