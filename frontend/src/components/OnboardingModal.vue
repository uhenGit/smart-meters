<script setup lang="ts">
import { useOnboardingStore } from '../stores/onboarding'
import { useRouter } from 'vue-router'

const onboarding = useOnboardingStore()
const router = useRouter()

function goToAdmin() {
  onboarding.close()
  router.push({ name: 'admin' })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="onboarding.isVisible"
        class="ob-overlay"
        @click.self="onboarding.close"
      >
        <div
          class="ob-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ob-title"
        >

          <div class="ob-modal__header">
            <h2
              id="ob-title"
              class="ob-modal__title"
            >
              Getting started
            </h2>
            <button
              class="ob-modal__close"
              aria-label="Close"
              @click="onboarding.close"
            >
              ✕
            </button>
          </div>

          <p class="ob-modal__intro">
            Complete the following steps before submitting your first meter reading.
          </p>

          <ol class="ob-steps">
            <li
              class="ob-step"
              :class="{ 'ob-step--done': onboarding.hasTaxes }"
            >
              <span class="ob-step__icon">{{ onboarding.hasTaxes ? '✓' : '1' }}</span>
              <div class="ob-step__body">
                <strong>Create your tariffs</strong>
                <p>Go to the Admin panel and add your current utility rates (gas, water, electricity, etc.).</p>
              </div>
            </li>

            <li
              class="ob-step"
              :class="{ 'ob-step--done': onboarding.hasIndications }"
            >
              <span class="ob-step__icon">{{ onboarding.hasIndications ? '✓' : '2' }}</span>
              <div class="ob-step__body">
                <strong>Submit your first reading</strong>
                <p>Once tariffs are set, use the Form page to enter your current meter values.</p>
              </div>
            </li>
          </ol>

          <div class="ob-modal__footer flex">
            <button
              class="btn btn--outline"
              @click="onboarding.close"
            >
              Close
            </button>
            <button
              v-if="!onboarding.hasTaxes"
              class="btn btn--primary"
              @click="goToAdmin"
            >
              Go to Admin
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.ob-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.ob-modal {
  background: var(--text-light);
  border-radius: 0.75rem;
  padding: 2rem;
  width: 90%;
  max-width: 28rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  &__title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
  }

  &__close {
    background: none;
    border: none;
    font-size: 1.125rem;
    cursor: pointer;
    color: var(--text);
    padding: 0.25rem;
    line-height: 1;

    &:hover { color: var(--text-h); }
  }

  &__intro {
    color: #6b7280;
    font-size: 0.9375rem;
    margin-bottom: 1.5rem;
  }

  &__footer {
    margin-top: 1.75rem;
    justify-content: flex-end;
    gap: 0.75rem;
  }
}

.ob-steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ob-step {
  display: flex;
  gap: 1rem;
  align-items: flex-start;

  &__icon {
    width: 2rem;
    height: 2rem;
    min-width: 2rem;
    border-radius: 50%;
    background: #e5e7eb;
    color: #374151;
    font-weight: 700;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, color 0.2s;
  }

  &__body {
    strong { display: block; margin-bottom: 0.25rem; }
    p { margin: 0; font-size: 0.875rem; color: #6b7280; }
  }

  &--done &__icon {
    background: var(--green-5);
    color: var(--text-light);
  }

  &--done strong { text-decoration: line-through; color: #9ca3af; }
}

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }
</style>