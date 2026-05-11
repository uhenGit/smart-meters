<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const username = ref<string>('');
const password = ref<string>('');
const error = ref<string | null>(null);
const isLoading = ref(false);

// @todo improve validation
const isFormValid = computed(() =>
  username.value.trim().length > 0 &&
  password.value.trim().length > 0
);

const handleSubmit = async () => {
  error.value = null;
  isLoading.value = true;

  try {
    await auth.login(username.value, password.value);

    if (auth.isAuth) {
      await router.push({ name: 'form' });
    }
  } catch (err: any) {
    error.value = err.response?.data?.error ?? 'Something went wrong';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="login-wrapper">
    <form
      class="login-form"
      @submit.prevent="handleSubmit"
    >
      <h1>Sign in</h1>
      <div class="flex col field">
        <label class="flex col">
          Username
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="Enter your username"
            :disabled="isLoading"
          />
        </label>
      </div>

      <div class="flex col field">
        <label class="flex col">
          Password
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter your password"
            :disabled="isLoading"
          />
        </label>
      </div>

      <p
        v-if="error"
        class="error"
      >
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="isLoading || !isFormValid"
      >
        {{ isLoading ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 360px;
  padding: 32px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.field {
  gap: 6px;
}

label {
  font-size: 14px;
  font-weight: 500;
}

input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 15px;
}

input:disabled {
  opacity: 0.6;
}

button {
  padding: 10px;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  color: #dc2626;
  font-size: 14px;
  margin: 0;
}
</style>