<script setup lang="ts">
import { reactive, shallowRef, computed } from 'vue'
import { useRouter } from 'vue-router'
import MainHeader from '../components/MainHeader.vue'
import api from '../api/axios'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirm: '',
})

const isLoading = shallowRef(false)
const error = shallowRef<string | null>(null)
const success = shallowRef(false)

const isFormValid = computed(() =>
  form.currentPassword.length > 0 &&
  form.newPassword.length >= 8 &&
  form.newPassword === form.confirm
)

const passwordMismatch = computed(() =>
  form.confirm.length > 0 && form.newPassword !== form.confirm
)

const passwordTooShort = computed(() =>
  form.newPassword.length > 0 && form.newPassword.length < 8
)

const handleSubmit = async () => {
  error.value   = null
  success.value = false
  isLoading.value = true

  try {
    await api.patch('/auth/password', {
      currentPassword: form.currentPassword,
      newPassword:     form.newPassword,
    })

    success.value = true

    // Backend clears the cookie — log out locally and redirect after short delay
    setTimeout(async () => {
      auth.user = null
      router.push({ name: 'login' })
    }, 2000)

  } catch (err: any) {
    error.value = err.response?.data?.error ?? 'Something went wrong'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex col center settings-view">
    <main-header />
    <div class="settings-view__card">

      <div class="settings-view__header">
        <h1 class="settings-view__title">Account settings</h1>
        <p class="settings-view__meta">
          Signed in as <strong>{{ auth.user?.username }}</strong>
          <span v-if="auth.user?.email"> · {{ auth.user?.email }}</span>
        </p>
      </div>

      <hr class="settings-view__divider" />

      <section class="settings-view__section">
        <h2 class="settings-view__section-title">Change password</h2>

        <div v-if="success" class="settings-view__success">
          <span>✓</span>
          Password changed. Redirecting to login...
        </div>

        <template v-else>
          <label class="field">
            <span>Current password</span>
            <input
              v-model="form.currentPassword"
              type="password"
              autocomplete="current-password"
              :disabled="isLoading"
            />
          </label>

          <label class="field">
            <span>New password</span>
            <input
              v-model="form.newPassword"
              type="password"
              autocomplete="new-password"
              :disabled="isLoading"
              :class="{ 'input--error': passwordTooShort }"
            />
            <span v-if="passwordTooShort" class="field__hint field__hint--error">
              At least 8 characters required
            </span>
          </label>

          <label class="field">
            <span>Confirm new password</span>
            <input
              v-model="form.confirm"
              type="password"
              autocomplete="new-password"
              :disabled="isLoading"
              :class="{ 'input--error': passwordMismatch }"
            />
            <span v-if="passwordMismatch" class="field__hint field__hint--error">
              Passwords do not match
            </span>
          </label>

          <p
            v-if="error"
            class="settings-view__error"
          >
            {{ error }}
          </p>

          <div class="settings-view__actions flex">
            <button
              class="btn btn--xs btn--outline"
              :disabled="isLoading"
              @click="router.back()"
            >
              Cancel
            </button>
            <button
              class="btn btn--xs btn--primary"
              :disabled="!isFormValid || isLoading"
              @click="handleSubmit"
            >
              {{ isLoading ? 'Saving...' : 'Change password' }}
            </button>
          </div>
        </template>
      </section>

    </div>
  </div>
</template>

<style scoped lang="scss">
.settings-view {
  justify-content: center;
  max-width: 56rem;
  margin: 0 auto;
  padding: 2rem 1rem;
  // min-height: 100vh;

  &__card {
    width: 100%;
    max-width: 28rem;
  }

  &__header { margin-bottom: 1.5rem; }

  &__title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.375rem;
  }

  &__meta {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  &__divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 0 0 1.5rem;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__section-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }

  &__actions {
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  &__error {
    color: var(--danger);
    font-size: 0.875rem;
    margin: 0;
  }

  &__success {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: #f0fdf4;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    color: var(--green-5);
    font-weight: 500;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;

  input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    font-size: 0.9375rem;
    transition: border-color 0.15s;

    &:focus {
      outline: none;
      border-color: #2563eb;
    }

    &:disabled { opacity: 0.6; }

    &.input--error { border-color: var(--danger); }
  }

  &__hint {
    font-size: 0.8125rem;

    &--error {
      color: var(--danger);
      font-size: 0.75rem;
    }
  }
}
</style>