<script>

export default{

    name: 'Categories'
}

</script>




<template>
<div class="container-fluid">
  <nav class="navbar">

        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/food_drinks.png" alt="FoodandDrinks">
            <div class="category-text text-center fs-5">Food & Drinks</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/beauty.png" alt="Beauty" >
            <div class="category-text text-center fs-5">Beauty</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/fitness.png" alt="FitnessAndWellness" >
            <div class="category-text text-center fs-5">Fitness</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/arts_craft.png" alt="ArtsAndCraft">
            <div class="category-text text-center fs-5">Arts & Craft</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/education.png" alt="Education">
            <div class="category-text  text-center fs-5">Education</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/pets.png" alt="Pets">
            <div class="category-text  text-center fs-5">Pets</div>
        </a>
        <a class="navbar-brand category" href="#">
            <img src="../assets/category_images/others.png" alt="Others">
            <div class="category-text text-center fs-5">Others</div>
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
        object-fit: cover;
        border-radius: 100px;
        
    }

    .category-text
    {
        color: black;
    }
    .category {
        transition: transform 0.2s ease;
    }
    .category:hover {
        transform: translateY(-3px);
    }

</style>