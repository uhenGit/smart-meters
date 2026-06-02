<script setup lang="ts">
import { useOnboardingStore } from '../stores/onboarding'

const onboarding = useOnboardingStore()
</script>

<template>
  <button
    class="help-btn"
    aria-label="Help / Getting started"
    @click="onboarding.open"
  >
    ?
  </button>
</template>

<style scoped lang="scss">
.help-btn {
  flex-shrink: 0;
  margin-inline-end: .5rem;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: 2px solid currentColor;
  background: transparent;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  color: var(--text);
  line-height: 1;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: var(--info);
    border-color: var(--info);
  }
}
</style>