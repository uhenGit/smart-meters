<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api/axios'

const router = useRouter()
const route = useRoute()

const token = route.query.token as string | undefined
const username = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')

const isLoading = shallowRef(false)
const isValidating = shallowRef(true)
const tokenError = shallowRef<string | null>(null)
const submitError = shallowRef<string | null>(null)
const success = shallowRef(false)


const handleSubmit = async () => {
  submitError.value = null

  if (password.value.length < 8) {
    submitError.value = 'Password must be at least 8 characters.'
    return
  }

  if (password.value !== confirm.value) {
    submitError.value = 'Passwords do not match.'
    return
  }

  isLoading.value = true

  try {
    await api.post('/auth/register', { token, password: password.value })
    success.value = true
    setTimeout(() => router.push({ name: 'login' }), 2500)
  } catch (err: any) {
    submitError.value = err.response?.data?.error ?? 'Something went wrong.'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!token) {
    tokenError.value = 'No invite token provided. Ask your admin for an invite link.'
    isValidating.value = false

    return
  }

  try {
    const { data } = await api.get('/auth/invite', { params: { token } })
    username.value = data.data.username
    email.value    = data.data.email
  } catch (err: any) {
    tokenError.value = err.response?.data?.error ?? 'Invalid or expired invite link.'
  } finally {
    isValidating.value = false
  }
})
</script>

<template>
  <div class="flex center register-wrapper">
    <div class="flex col w-100 register-form">

      <p v-if="isValidating" class="register-form__state">
        Validating invite link...
      </p>

      <template v-else-if="tokenError">
        <h1>Invalid invite</h1>
        <p class="register-form__error">{{ tokenError }}</p>
        <router-link :to="{ name: 'login' }">Back to login</router-link>
      </template>

      <template v-else-if="success">
        <h1>Account activated</h1>
        <p class="register-form__success">
          Your account is ready. Redirecting to login...
        </p>
      </template>

      <template v-else>
        <h1>Set your password</h1>
        <p class="register-form__meta">
          Account: <strong>{{ username }}</strong> · {{ email }}
        </p>

        <div class="flex col field">
          <label>
            <span>Password</span>
            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              placeholder="At least 8 characters"
              :disabled="isLoading"
            />
          </label>
        </div>

        <div class="flex col field">
          <label>
            <span>Confirm password</span>
            <input
              v-model="confirm"
              type="password"
              autocomplete="new-password"
              placeholder="Repeat your password"
              :disabled="isLoading"
            />
          </label>
        </div>

        <p v-if="submitError" class="register-form__error">{{ submitError }}</p>

        <button
          class="btn btn--sm btn--primary w-100"
          :disabled="isLoading || !password || !confirm"
          @click="handleSubmit"
        >
          {{ isLoading ? 'Activating...' : 'Activate account' }}
        </button>
      </template>

    </div>
  </div>
</template>

<style scoped lang="scss">
.register-wrapper {
  min-height: 100vh;
}

.register-form {
  gap: 1rem;
  max-width: 22rem;
  padding: 2rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;

  h1 {
    margin: 0;
    font-size: 1.375rem;
  }

  &__meta  {
    font-size: 0.875rem;
    color: #6b7280;
  }
  &__error {
    color: var(--danger);
    font-size: 0.875rem;
  }
  &__success {
    color: var(--green-5);
    font-size: 0.9375rem;
  }
  &__state {
    color: var(--text);
    text-align: center;
    margin: 2rem 0;
  }

  .field {
    gap: 0.375rem;

    label { font-size: 0.875rem; font-weight: 500; }

    input {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.9375rem;

      &:disabled { opacity: 0.6; }
    }
  }
}
</style>