<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const isActive = (name: string): boolean => {
  return router.currentRoute.value.name === name
}

const handleLogout = async () => {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>
<template>
  <header class="header flex w-100">
    <h1 class="header__title">Meter readings</h1>
    <nav class="flex w-100">
      <ul class="header__nav flex">
        <li
          class="header__nav-item"
          :class="{ 'header__nav-item--active': isActive('form') }"
        >
          <router-link to="/">Home</router-link>
        </li>
        <li
          class="header__nav-item"
          :class="{ 'header__nav-item--active': isActive('history') }"
        >
          <router-link to="/history">History</router-link>
        </li>
        <li
          class="header__nav-item"
          :class="{ 'header__nav-item--active': isActive('admin') }"
        >
          <router-link to="/admin">Admin</router-link>
        </li>
        <li
          class="header__nav-item"
          :class="{ 'header__nav-item--active': isActive('statistics') }"
        >
          <router-link to="/statistics">Statistics</router-link>
        </li>
      </ul>
    </nav>
    <button
      class="btn btn--outline"
      @click="handleLogout"
    >
      Logout
    </button>
  </header>
</template>
<style lang="scss" scoped>
.header {
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: .5rem;
  border-bottom: 1px solid var(--border);

  &__title {
    line-height: 100%;
  }

  &__nav {
    gap: 1rem;
    justify-content: start;
    margin-left: 1rem;
  }

  &__nav-item {
    list-style: none;
    border: 1px solid transparent;
    border-radius: .25rem;
    transition-duration: .3s;
    padding: .25rem .5rem;

    &:hover {
      background: var(--gray-12);
    }

    &--active {
      border:1px solid var(--border);
    }
  }
}
</style>