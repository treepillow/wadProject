<script>

export default{

    name: 'Categories'
}

</script>




<template>
<div class="container-fluid">
  <nav class="navbar">

        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/food_drinks.jpg" alt="FoodandDrinks">
            <div class="category-text fs-2 text-center fs-4">Food & Drinks</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/beauty.jpg" alt="Beauty" >
            <div class="category-text fs-2 text-center fs-4">Beauty</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/fitness.jpg" alt="FitnessAndWellness" >
            <div class="category-text fs-2 text-center fs-4">Fitness</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/arts_craft.jpg" alt="ArtsAndCraft">
            <div class="category-text fs-2 text-center fs-4">Arts & Craft</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/education.jpg" alt="Education">
            <div class="category-text fs-2 text-center fs-4">Education</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/pets.jpg" alt="Pets">
            <div class="category-text fs-2 text-center fs-4">Pets</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/others.jpg" alt="Others">
            <div class="category-text fs-2 text-center fs-4">Others</div>
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