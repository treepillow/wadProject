<script>
import { Icon } from '@iconify/vue';

export default {
  name: 'Categories',
  props: {
    selected: { type: Array, default: () => [] }
  },
  emits: ['toggle'],
  data() {
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
      icons: {
        'Trending': 'fa-solid:fire',
        'Food and Drinks': 'fa-solid:utensils',
        'Beauty': 'fa-solid:paint-brush',
        'Fitness': 'fa-solid:dumbbell',
        'Arts & Craft': 'fa-solid:palette',
        'Education': 'fa-solid:book-open',
        'Pets': 'fa-solid:paw',
        'Others': 'fa-solid:ellipsis-h'
      }
    };
  },
  methods: {
    isActive(name) { return this.selected?.includes(name); },
    toggle(name) { this.$emit('toggle', name); }
  }
};
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
          <Icon :icon="icons[opt]" width="50" height="50" />
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

.category svg {
  width: 100%;
  height: 100%;
  display: block;
  transition: all var(--transition-fast);
}

:root.dark-mode .category svg {
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

:root.dark-mode .category:hover svg {
  filter: invert(1) brightness(1);
}

.category.active {
  border-color: var(--color-primary); 
  box-shadow: 0 0 5px var(--color-primary);
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
