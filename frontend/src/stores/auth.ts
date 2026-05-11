import { computed, ref } from "vue";
import { defineStore } from "pinia";
import api from "@/api/axios";
import type { User } from "@/types";

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);

  const isAuth = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value.role === 'admin');

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });

    user.value = data.user;
  }

  const logout = async () => {
    await api.post('/auth/logout');

    user.value = null;
  }

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me');

      user.value = data.user;
    } catch (err) {
      user.value == null;
    }
  }

  return { user, isAuth, isAdmin, login, logout, fetchMe };
})