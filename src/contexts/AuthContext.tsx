
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
            if (token) {
                try {
                    // Verify token implementation needed in backend or just trust storage + 401 interceptor
                    // For now, simpler verification
                    const { data } = await auth.verify();
                    // Requires transforming payload to User object if needed, or storing User in LS
                    // Let's assume verify returns the decoded token payload which contains user info
                    // Ideally we'd fetch profile
                    setUser({
                        id: data.employeeId,
                        email: data.email,
                        role: data.role,
                        firstName: "", // Profile fetch needed
                        lastName: ""
                    });
                } catch (error) {
                    console.error("Auth verify failed", error);
                    localStorage.removeItem('token');
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
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
