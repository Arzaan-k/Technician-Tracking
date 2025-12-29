import { Outlet, NavLink } from 'react-router-dom';
import { MapPin, User, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function RootLayout() {
    const { user } = useAuth();
    const isAdmin = user?.role && ['admin', 'super_admin', 'coordinator'].includes(user.role);

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            {/* Status bar spacer - respects safe area */}
            <div className="flex-shrink-0 bg-background" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />

            <main className="flex-1 overflow-y-auto relative">
                <Outlet />
            </main>

            {/* Bottom Navigation - respects safe area */}
            <nav
                className="flex-shrink-0 border-t border-border bg-card/95 backdrop-blur-xl px-4 pt-2 flex justify-around items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
            >
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) => cn(
                        "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200",
                        isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground active:scale-95"
                    )}
                >
                    <MapPin className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Track</span>
                </NavLink>

                <NavLink
                    to="/history"
                    className={({ isActive }) => cn(
                        "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200",
                        isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground active:scale-95"
                    )}
                >
                    <Clock className="w-5 h-5" />
                    <span className="text-[10px] font-medium">History</span>
                </NavLink>

                {/* Admin Map - Only visible to admins/coordinators */}
                {isAdmin && (
                    <NavLink
                        to="/admin"
                        className={({ isActive }) => cn(
                            "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200",
                            isActive
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground hover:text-foreground active:scale-95"
                        )}
                    >
                        <Users className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Fleet</span>
                    </NavLink>
                )}

                <NavLink
                    to="/profile"
                    className={({ isActive }) => cn(
                        "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200",
                        isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground active:scale-95"
                    )}
                >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Profile</span>
                </NavLink>
            </nav>
        </div>
    );
}
