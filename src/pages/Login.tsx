
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export default function Login() {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(schema)
    });

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setError('');

        try {
            const res = await auth.login(data);
            login(res.data.token, res.data.user);
            navigate('/');
        } catch (err: any) {
            console.error('Login error:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Login failed. Please check your credentials and try again.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full flex bg-background">
            {/* Left Side - Brand & Marketing (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] text-white p-12 flex-col justify-between relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
                </div>

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">LocTrack Enterprise</span>
                </div>

                {/* Main Content */}
                <div className="relative z-10 max-w-lg">
                    <h1 className="text-5xl font-bold leading-tight mb-6">
                        Enterprise Field Force Management
                    </h1>
                    <p className="text-lg text-slate-300 leading-relaxed mb-8">
                        Streamline your logistics operations with our advanced tracking platform. 
                        Monitor fleets, manage service requests, and coordinate technicians in real-time with 
                        military-grade precision.
                    </p>
                    
                    {/* Feature List */}
                    <div className="flex gap-6 text-sm font-medium text-slate-400">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            Real-time GPS
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            Secure Data
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            24/7 Uptime
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 text-xs text-slate-500">
                    © {new Date().getFullYear()} Crystal Group. All rights reserved.
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 safe-top safe-bottom">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Logo (Visible only on Mobile) */}
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <div className="bg-primary p-2 rounded-lg">
                            <MapPin className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold text-foreground">LocTrack</span>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
                        <p className="text-muted-foreground">Please enter your credentials to access your account.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Error Alert */}
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email Address</label>
                                <input
                                    {...register('email')}
                                    type="email"
                                    autoComplete="email"
                                    className="flex h-11 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="name@company.com"
                                />
                                {errors.email && (
                                    <p className="text-xs text-destructive font-medium">{(errors as any).email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                                    <a href="#" className="text-sm font-medium text-primary hover:underline">
                                        Forgot password?
                                    </a>
                                </div>
                                <input
                                    {...register('password')}
                                    type="password"
                                    autoComplete="current-password"
                                    className="flex h-11 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Enter your password"
                                />
                                {errors.password && (
                                    <p className="text-xs text-destructive font-medium">{(errors as any).password.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="remember"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label
                                htmlFor="remember"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                            >
                                Remember me for 30 days
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full shadow-sm"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Security Badge */}
                    <div className="mt-8 rounded-lg border border-border bg-card p-4 flex items-start gap-4">
                        <div className="p-2 bg-secondary rounded-full">
                            <Shield className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Secure Authentication</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                All access is monitored and logged. Unauthorized access attempts will be reported to system administrators.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper component for the shield icon since it was missing in imports
function Shield(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
    )
}
