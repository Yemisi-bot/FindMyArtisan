import axios from 'axios';
import type { ApiResponse } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Resolve uploaded-image paths against the API origin (works in dev via the
// Vite proxy and in production when the API is on another domain).
const API_ORIGIN = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '');
export const assetUrl = (path?: string | null): string =>
  !path ? '' : path.startsWith('http') ? path : `${API_ORIGIN}${path}`;

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; fullName: string; phone?: string; role?: string }) =>
    api.post<ApiResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse>('/auth/login', data),

  verifyOtp: (data: { email: string; otp: string }) =>
    api.post<ApiResponse>('/auth/verify-otp', data),

  resendOtp: (data: { email: string }) =>
    api.post<ApiResponse>('/auth/resend-otp', data),

  getMe: () => api.get<ApiResponse>('/auth/me'),
};

// Providers API
export const providersApi = {
  getNearby: (params: { latitude: number; longitude: number; radius?: number; category?: string; q?: string; page?: number }) =>
    api.get<ApiResponse>('/providers/nearby', { params }),

  getMyProfile: () =>
    api.get<ApiResponse>('/providers/me'),

  uploadWorkImages: (files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return api.post<ApiResponse>('/providers/me/images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteWorkImage: (imageId: string) =>
    api.delete<ApiResponse>(`/providers/me/images/${imageId}`),

  recordContactClick: (providerId: string) =>
    api.post<ApiResponse>(`/providers/${providerId}/contact-click`),

  getContacted: () =>
    api.get<ApiResponse>('/providers/contacted/list'),

  getRecentSearches: () =>
    api.get<ApiResponse>('/providers/searches/recent'),

  getById: (id: string) =>
    api.get<ApiResponse>(`/providers/${id}`),

  create: (data: {
    businessName: string;
    categoryId?: string;
    customCategory?: string;
    description: string;
    phone: string;
    address: string;
    latitude: number;
    longitude: number;
    profileImage?: File | null;
  }) => {
    const form = new FormData();
    form.append('businessName', data.businessName);
    if (data.categoryId) form.append('categoryId', data.categoryId);
    if (data.customCategory) form.append('customCategory', data.customCategory);
    form.append('description', data.description);
    form.append('phone', data.phone);
    form.append('address', data.address);
    form.append('latitude', String(data.latitude));
    form.append('longitude', String(data.longitude));
    if (data.profileImage) form.append('profileImage', data.profileImage);
    return api.post<ApiResponse>('/providers', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getCategories: () =>
    api.get<ApiResponse>('/categories'),

  getAll: () =>
    api.get<ApiResponse>('/providers'),
};

// Reviews API
export const reviewsApi = {
  submit: (data: { providerId: string; rating: number; comment: string; image?: File | null }) => {
    const form = new FormData();
    form.append('providerId', data.providerId);
    form.append('rating', String(data.rating));
    form.append('comment', data.comment);
    if (data.image) form.append('image', data.image);
    return api.post<ApiResponse>('/reviews', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getByProvider: (providerId: string, page = 1) =>
    api.get<ApiResponse>(`/reviews/provider/${providerId}`, { params: { page } }),
};

// Admin API
export const adminApi = {
  getStats: () =>
    api.get<ApiResponse>('/admin/stats'),

  getAllProviders: () =>
    api.get<ApiResponse>('/admin/providers'),

  getUsers: () =>
    api.get<ApiResponse>('/admin/users'),

  suspendProvider: (id: string, suspended: boolean) =>
    api.patch<ApiResponse>(`/admin/providers/${id}/suspend`, { suspended }),

  deleteReview: (id: string) =>
    api.delete<ApiResponse>(`/admin/reviews/${id}`),

  getProviderDetails: (id: string) =>
    api.get<ApiResponse>(`/admin/providers/${id}/details`),

  getLogs: (limit = 50) =>
    api.get<ApiResponse>('/admin/logs', { params: { limit } }),
};

export default api;
