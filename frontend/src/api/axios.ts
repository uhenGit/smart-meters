import axios from "axios";

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login';
    }

    return Promise.reject(err);
  }
)

export default api;