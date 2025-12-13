
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

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

export const auth = {
    login: (credentials: any) => api.post('/auth/login', credentials),
    register: (data: any) => api.post('/auth/register', data),
    verify: () => api.get('/auth/verify'),
};

export const location = {
    startTracking: () => api.post('/location/start'),
    stopTracking: (summary?: { distance: number }) => api.post('/location/stop', summary),
    updateLocation: (locations: any[]) => api.post('/location/update', { locations }),
    getHistory: () => api.get('/location/history'),
};

export default api;
