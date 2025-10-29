<script setup>
import { RouterLink, RouterView, useRoute } from "vue-router";
import { ref, onMounted, computed } from "vue";
import NavBar from "./components/NavBar.vue";
import Categories from "./components/Categories.vue";
import Login from './components/Login.vue';
import Toast from './components/Toast.vue';
import { setToastInstance } from './composables/useToast';

const toastRef = ref(null);
const route = useRoute();

// Pages that should NOT show the navbar
const noNavbarPages = ['login', 'signup', 'about', 'forgotpassword'];
const shouldShowNavbar = computed(() => !noNavbarPages.includes(route.name));

onMounted(() => {
  if (toastRef.value) {
    setToastInstance(toastRef.value);
  }
});
</script>

<template>
  <NavBar v-if="shouldShowNavbar" />
  <RouterView />
  <Toast ref="toastRef" />
</template>

<style>


</style>

