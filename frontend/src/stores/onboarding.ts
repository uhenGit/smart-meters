import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/axios'

export const useOnboardingStore = defineStore('onboarding', () => {
  const hasTaxes = ref<boolean | null>(null)
  const hasIndications = ref<boolean | null>(null)
  const isVisible = ref(false)
  const isLoaded = ref(false)

  const needsOnboarding = computed(() =>
    hasTaxes.value === false || hasIndications.value === false
  )

  const checkStatus = async (): Promise<void> => {
    try {
      const { data } = await api.get('/auth/onboarding-status')
      hasTaxes.value = data.hasTaxes
      hasIndications.value = data.hasIndications
      isLoaded.value = true

      if (needsOnboarding.value) {
        isVisible.value = true
      }
    } catch {
      // Silently fail — onboarding is non-critical
    }
  }

  const open = ():void =>  {
    isVisible.value = true
  }

  const close = ():void => {
    isVisible.value = false
  }

  return {
    hasTaxes,
    hasIndications,
    isVisible,
    isLoaded,
    needsOnboarding,
    checkStatus,
    open,
    close,
  }
})