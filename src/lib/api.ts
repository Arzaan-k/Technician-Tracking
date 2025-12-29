
import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Production API URL (Render deployment)
const PRODUCTION_API_URL = 'https://loctrack-api.onrender.com/api';

// Local development IP (for testing on physical device with local backend)
const LOCAL_DEV_IP = '192.168.1.143';

// API URL Selection:
// - Production build (including native app release): Use production Render URL
// - Development on native device: Use local IP
// - Development in browser: Use localhost
const API_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD
        ? PRODUCTION_API_URL  // Production builds always use Render
        : (Capacitor.isNativePlatform()
            ? `http://${LOCAL_DEV_IP}:3000/api`  // Dev on physical device
            : 'http://localhost:3000/api'));     // Dev in browser

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
            console.error('Cannot connect to server. Make sure the backend server is running on http://localhost:3000');
            error.message = 'Cannot connect to server. Please ensure the backend is running.';
        }
        return Promise.reject(error);
    }
);

export const auth = {
    login: (credentials: any) => api.post('/auth/login', credentials),
    register: (data: any) => api.post('/auth/register', data),
    verify: () => api.get('/auth/verify'),
};

export const location = {
    startTracking: () => api.post('/location/start'),
    stopTracking: (summary?: { distance: number }) => api.post('/location/stop', summary),
    updateLocation: (locations: any[]) => api.post('/location/update', { locations }),
    getHistory: (limit?: number) => api.get('/location/history', { params: { limit } }),
    getSessions: (limit?: number) => api.get('/location/sessions', { params: { limit } }),
    getSessionDetails: (sessionId: string) => api.get(`/location/sessions/${sessionId}`),
};

export default api;
