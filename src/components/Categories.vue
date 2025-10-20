<script>
export default {
  name: 'Categories',
  props: {
    /** Array of selected category names (multi-select) */
    selected: { type: Array, default: () => [] }
  },
  emits: ['toggle'],
  data() {
    // Resolve images safely so paths never break
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
      <button
        v-for="opt in options" :key="opt"
        type="button"
        class="navbar-brand category btn-reset"
        :class="{ active: isActive(opt) }"
        @click="toggle(opt)"
      >
        <img :src="images[opt]" :alt="opt" />
        <div class="category-text text-center fs-5">{{ opt }}</div>
      </button>
    </nav>
    <hr />
  </div>
</template>

<style scoped>
hr { border: 1; opacity: 0.25; }

/* make anchors behave like buttons but keep your look */
.btn-reset {
  background: none;
  border: 0;
  padding: 0;
}

/* circle thumbnails */
.category img {
  width: 150px;
  height: 150px;
  border: 1px solid var(--color-text-primary);
  object-fit: cover;
  border-radius: 100px;
  transition: all var(--transition-fast);
}

/* hover + active ring */
.category {
  transition: transform var(--transition-fast);
  text-decoration: none;
  cursor: pointer;
}
.category:hover {
  transform: translateY(-3px);
}
.category:hover img {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}
.category.active img {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

.category-text { color: var(--color-text-primary); }
</style>
