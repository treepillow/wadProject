<script>
import { Icon } from '@iconify/vue';

export default {
  name: 'Categories',
  props: {
    selected: { type: Array, default: () => [] }
  },
  emits: ['toggle'],
  data() {
    const src = (file) => new URL(`../assets/category_images/${file}`, import.meta.url).href
    return {
      options: [
        'Trending',
        'Food and Drinks',
        'Beauty',
        'Fitness',
        'Arts & Craft',
        'Education',
        'Pets',
        'Others'
      ],
      images: {
        'Food and Drinks': src('food_drinks.png'),
        'Beauty':          src('beauty.png'),
        'Fitness':         src('fitness.png'),
        'Arts & Craft':    src('arts_craft.png'),
        'Education':       src('education.png'),
        'Pets':            src('pets.png'),
        'Others':          src('others.png')
      },
      icons:{
        'Trending': 'fa-solid:fire'
      }
    }
  },
  methods: {
    isActive(name) { return this.selected?.includes(name) },
    toggle(name) { this.$emit('toggle', name) }
  }
}
</script>

<template>
  <div class="container-fluid">
    <!-- Desktop: horizontal scrolling navbar -->
    <nav class="navbar d-none d-lg-flex">
      <div
        v-for="opt in options" :key="opt"
        class="category-wrapper"
      >
        <button
          type="button"
          class="navbar-brand category btn-reset"
          :class="{ active: isActive(opt) }"
          @click="toggle(opt)"
        >
          <img v-if="images[opt]" :src="images[opt]" alt="category image" width="50" height="50" />
          <Icon v-else :icon="icons[opt]" width="50" height="50" />
        </button>
        <div class="category-text text-center fs-5">{{ opt }}</div>
      </div>
    </nav>

    <!-- Mobile: Bootstrap grid with 2 rows of 4 -->
    <div class="d-lg-none">
      <div class="row g-3 justify-content-center categories-mobile-grid">
        <div
          v-for="opt in options" :key="opt"
          class="col-3"
        >
          <div class="category-wrapper-grid">
            <button
              type="button"
              class="category btn-reset"
              :class="{ active: isActive(opt) }"
              @click="toggle(opt)"
            >
              <img v-if="images[opt]" :src="images[opt]" alt="category image" width="50" height="50" />
              <Icon v-else :icon="icons[opt]" width="50" height="50" />
            </button>
            <div class="category-text text-center">{{ opt }}</div>
          </div>
        </div>
      </div>
    </div>

    <hr />
  </div>
</template>

<style scoped>
hr { border: 1; opacity: 0.25; }

.btn-reset {
  background: none;
  border: 0;
  padding: 0;
}

.category-wrapper {
  display: inline-block;
  text-align: center;
}

.category-wrapper-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.category {
  transition: transform var(--transition-fast);
  text-decoration: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 20px;
  border: 1px solid var(--color-border-dark);
  width: 120px;
  height: 120px;
  margin: 0 auto;
  background-color: var(--color-bg-primary);
}

.category img {
  width: 60%;
  height: 60%;
  border: none;
  object-fit: contain;
  transition: all var(--transition-fast);
  display: block;
}

:root.dark-mode .category img {
  filter: invert(1) brightness(1.2);
}

:root.dark-mode .category {
  border-color: #e5e5e5;
}

.category:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

:root.dark-mode .category:hover img {
  filter: invert(1) brightness(1);
}

.category.active {
  box-shadow: 0 0 0 4px var(--color-primary); /* This replaces the outline */
}

.category-text {
  color: var(--color-text-primary);
  margin-top: 8px;
}

/* Mobile grid specific styles */
.categories-mobile-grid {
  max-width: 100%;
}

.categories-mobile-grid .col-3 {
  padding: 0.5rem;
}

@media (max-width: 767.98px) {
  .category {
    width: 85px;
    height: 85px;
    padding: 12px;
  }

  .category-text {
    font-size: 0.75rem;
    margin-top: 6px;
    line-height: 1.2;
  }

  .categories-mobile-grid .col-3 {
    padding: 0.4rem;
  }
}

@media (max-width: 575.98px) {
  .category {
    width: 70px;
    height: 70px;
    padding: 10px;
  }

  .category-text {
    font-size: 0.65rem;
    margin-top: 4px;
    line-height: 1.1;
  }

  .categories-mobile-grid .col-3 {
    padding: 0.3rem;
  }

  .categories-mobile-grid {
    gap: 0.5rem !important;
  }
}

@media (max-width: 380px) {
  .category {
    width: 60px;
    height: 60px;
    padding: 8px;
  }

  .category-text {
    font-size: 0.6rem;
    margin-top: 3px;
  }

  .categories-mobile-grid .col-3 {
    padding: 0.25rem;
  }
}
:root.dark-mode .category .iconify {
  color: #ffffff; /* Set icon color to white in dark mode */
}

/* If you are using font-awesome icons (fa-solid:fire), ensure the color changes accordingly */
:root.dark-mode .category .iconify[data-icon='fa-solid:fire'] {
  color: #ffffff; /* Set the fire icon to white in dark mode */
}

:root.dark-mode .category:hover .iconify {
  color: var(--color-primary); /* Optionally, add hover effect color */
}
</style>
