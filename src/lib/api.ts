// Updated: 2025-12-22 12:07 - Force browser reload
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ============================================
// TYPE DEFINITIONS - Exported at top for clarity
// ============================================

export interface LocationUpdate {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number | null;
    heading?: number | null;
    timestamp: number;
    batteryLevel?: number;
    networkStatus?: string;
}

export interface TrackingSession {
    session_id: string;
    start_time: string;
    end_time: string | null;
    status: string;
    total_distance: number;
    total_locations: number;
    duration_seconds: number;
    start_location: { latitude: string; longitude: string; timestamp: string } | null;
    end_location: { latitude: string; longitude: string; timestamp: string } | null;
    stationary_percent: number;
    moving_percent: number;
    avg_speed: number;
    max_speed: number;
}

export interface SessionDetails {
    session: {
        session_id: string;
        start_time: string;
        end_time: string | null;
        total_distance: number;
        total_locations: number;
    };
    route: Array<{ lat: number; lng: number; timestamp: string; speed: number }>;
    stops: Array<{
        latitude: number;
        longitude: number;
        start_time: string;
        end_time: string;
        duration_minutes: number;
    }>;
}

// ============================================
// AXIOS INSTANCE
// ============================================

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            if (error.response?.data?.error === 'Account is disabled') {
                localStorage.removeItem('token');
                window.location.href = '/login?error=disabled';
            }
        }
        return Promise.reject(error);
    }
);

// ============================================
// API ENDPOINTS
// ============================================

export const auth = {
    login: (credentials: { email: string; password: string }) => 
        api.post('/auth/login', credentials),
    register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => 
        api.post('/auth/register', data),
    verify: () => 
        api.get('/auth/verify'),
};

export const location = {
    startTracking: () => 
        api.post('/location/start'),
    stopTracking: (summary?: { distance: number }) => 
        api.post('/location/stop', summary),
    updateLocation: (locations: LocationUpdate[]) => 
        api.post('/location/update', { locations }),
    getHistory: (limit?: number) => 
        api.get('/location/history', { params: { limit } }),
    getSession: () => 
        api.get('/location/session'),
    getSessions: (limit?: number) => 
        api.get<TrackingSession[]>('/location/sessions', { params: { limit } }),
    getSessionDetails: (sessionId: string) => 
        api.get<SessionDetails>(`/location/sessions/${sessionId}`),
};

export default api;
