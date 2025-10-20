<script>
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
        'Trending': src(),
        'Food and Drinks': src('food_drinks.png'),
        'Beauty':          src('beauty.png'),
        'Fitness':         src('fitness.png'),
        'Arts & Craft':    src('arts_craft.png'),
        'Education':       src('education.png'),
        'Pets':            src('pets.png'),
        'Others':          src('others.png')
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
    <nav class="navbar">
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
          <img :src="images[opt]" :alt="opt" />
        </button>
        <div class="category-text text-center fs-5">{{ opt }}</div>
      </div>
    </nav>
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

.category.active img {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

.category-text {
  color: var(--color-text-primary);
  margin-top: 8px;
}

@media (max-width: 767.98px) {
  .category {
    width: 90px;
    height: 90px;
    padding: 15px;
  }

  .category-text {
    font-size: 0.875rem;
    margin-top: 6px;
  }
}

@media (max-width: 575.98px) {
  .category {
    width: 80px;
    height: 80px;
    padding: 12px;
  }

  .category-text {
    font-size: 0.813rem;
    margin-top: 4px;
  }
}
</style>
