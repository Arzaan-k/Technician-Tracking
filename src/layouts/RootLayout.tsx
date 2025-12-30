import { Outlet, NavLink } from 'react-router-dom';
import { MapPin, User, Clock, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function RootLayout() {
    const { user } = useAuth();
    const isAdmin = user?.role && ['admin', 'super_admin', 'coordinator'].includes(user.role);

    return (
        <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
            {/* Main content */}
            <main className="flex-1 overflow-y-auto relative">
                <Outlet />
            </main>

            {/* Bottom Navigation - Mobile Optimized */}
            <nav
                className="flex-shrink-0 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-2px_20px_rgba(0,0,0,0.06)] z-50 safe-bottom safe-left safe-right"
            >
                <div className="flex justify-around items-center px-2 py-2 gap-1">
                    {/* Track Tab */}
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) => cn(
                            "flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[56px] relative group",
                            isActive
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground active:scale-95 active:bg-secondary/50"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute inset-0 bg-primary/5 rounded-xl animate-pulse" />
                                )}
                                <MapPin className={cn("w-6 h-6 relative z-10", isActive && "drop-shadow-sm")} />
                                <span className="text-xs font-bold relative z-10">Track</span>
                            </>
                        )}
                    </NavLink>

                    {/* History Tab */}
                    <NavLink
                        to="/history"
                        className={({ isActive }) => cn(
                            "flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[56px] relative group",
                            isActive
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground active:scale-95 active:bg-secondary/50"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute inset-0 bg-primary/5 rounded-xl animate-pulse" />
                                )}
                                <Clock className={cn("w-6 h-6 relative z-10", isActive && "drop-shadow-sm")} />
                                <span className="text-xs font-bold relative z-10">History</span>
                            </>
                        )}
                    </NavLink>

                    {/* Admin Dashboard - Only for Admins */}
                    {isAdmin && (
                        <NavLink
                            to="/admin/dashboard"
                            className={({ isActive }) => cn(
                                "flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[56px] relative group",
                                isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground active:scale-95 active:bg-secondary/50"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div className="absolute inset-0 bg-primary/5 rounded-xl animate-pulse" />
                                    )}
                                    <BarChart3 className={cn("w-6 h-6 relative z-10", isActive && "drop-shadow-sm")} />
                                    <span className="text-xs font-bold relative z-10">Admin</span>
                                </>
                            )}
                        </NavLink>
                    )}

                    {/* Admin Map - Only for Admins */}
                    {isAdmin && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) => cn(
                                "flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[56px] relative group",
                                isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground active:scale-95 active:bg-secondary/50"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div className="absolute inset-0 bg-primary/5 rounded-xl animate-pulse" />
                                    )}
                                    <Users className={cn("w-6 h-6 relative z-10", isActive && "drop-shadow-sm")} />
                                    <span className="text-xs font-bold relative z-10">Fleet</span>
                                </>
                            )}
                        </NavLink>
                    )}

                    {/* Profile Tab */}
                    <NavLink
                        to="/profile"
                        className={({ isActive }) => cn(
                            "flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[56px] relative group",
                            isActive
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground active:scale-95 active:bg-secondary/50"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute inset-0 bg-primary/5 rounded-xl animate-pulse" />
                                )}
                                <User className={cn("w-6 h-6 relative z-10", isActive && "drop-shadow-sm")} />
                                <span className="text-xs font-bold relative z-10">Profile</span>
                            </>
                        )}
                    </NavLink>
                </div>
            </nav>
        </div>
    );
}
