import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/api';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const { data } = await auth.verify();
                setUser({
                    id: data.employeeId,
                    email: data.email,
                    role: data.role,
                    firstName: data.firstName,
                    lastName: data.lastName
                });
            } catch (error: any) {
                // Clear invalid or expired token
                localStorage.removeItem('token');
                
                // Check if account was disabled
                if (error.response?.status === 403) {
                    // Could redirect to login with message
                    console.warn('Account disabled or token invalid');
                }
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        setUser(userData);
    };

    const logout = () => {
        // Clear all tracking state on logout
        localStorage.removeItem('token');
        localStorage.removeItem('isTracking');
        localStorage.removeItem('trackingStartTime');
        localStorage.removeItem('totalDistance');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            isAuthenticated: !!user, 
            isLoading, 
            login, 
            logout 
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
