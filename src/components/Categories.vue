<script>

export default{

    name: 'Categories'
}

</script>




<template>
<div class="container-fluid">
  <nav class="navbar">

        <a class="navbar-brand category" href="#">
            <img src="../assets/fooddrinks.jpg" alt="FoodandDrinks">
            <div class="category-text fs-2 text-center fw-normal">Food & Drinks</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/beauty.png" alt="Beauty" >
            <div class="category-text fs-2 text-center fw-normal">Beauty</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/fitness.jpg" alt="FitnessAndWellness" >
            <div class="category-text fs-2 text-center fw-normal">Fitness</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/arts.jpg" alt="ArtsAndCraft">
            <div class="category-text fs-2 text-center fw-normal">Arts & Craft</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/education.jpg" alt="Education">
            <div class="category-text fs-2 text-center fw-normal">Education</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/pets.png" alt="Pets">
            <div class="category-text fs-2 text-center fw-normal">Pets</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/others.png" alt="Others">
            <div class="category-text fs-2 text-center fw-normal">Others</div>
        </a>
</nav>

<hr></hr>

</div>



</template>

<style scoped>
    hr {
        border: 1;
        opacity: 0.25;
    }

    .category img
    {
        width: 150px;
        height: 150px;
        border: 1px solid black;
        border-radius: 100px;
    }
    .category-text
    {
        color: white;
    }

</style>