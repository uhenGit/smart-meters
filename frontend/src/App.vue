<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import OnboardingModal from './components/OnboardingModal.vue'
import { useOnboardingStore } from './stores/onboarding'
import { useAuthStore } from './stores/auth'

const onboarding = useOnboardingStore()
const auth = useAuthStore()

watch(
  () => auth.isAuth,
  (auth) => {
    if (auth) {
      onboarding.checkStatus()
    }
  },
  { immediate: true },
)
</script>

<template>
  <router-view />
  <onboarding-modal />
</template>
