import { Outlet, NavLink } from 'react-router-dom';
import { MapPin, User, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function RootLayout() {
    const { user } = useAuth();
    const isAdmin = user?.role && ['admin', 'super_admin', 'coordinator'].includes(user.role);

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            <main className="flex-1 overflow-y-auto relative">
                <Outlet />
            </main>

            <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-xl px-6 py-3 pb-6 flex justify-around items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) => cn(
                        "flex flex-col items-center gap-1.5 transition-all duration-300 transform",
                        isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground active:scale-95"
                    )}
                >
                    <MapPin className="w-6 h-6" />
                    <span className="text-[10px] font-medium tracking-wide">Track</span>
                </NavLink>

                <NavLink
                    to="/history"
                    className={({ isActive }) => cn(
                        "flex flex-col items-center gap-1.5 transition-all duration-300 transform",
                        isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground active:scale-95"
                    )}
                >
                    <Clock className="w-6 h-6" />
                    <span className="text-[10px] font-medium tracking-wide">History</span>
                </NavLink>

                {/* Admin Map - Only visible to admins/coordinators */}
                {isAdmin && (
                    <NavLink
                        to="/admin"
                        className={({ isActive }) => cn(
                            "flex flex-col items-center gap-1.5 transition-all duration-300 transform",
                            isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground active:scale-95"
                        )}
                    >
                        <Users className="w-6 h-6" />
                        <span className="text-[10px] font-medium tracking-wide">Fleet</span>
                    </NavLink>
                )}

                <NavLink
                    to="/profile"
                    className={({ isActive }) => cn(
                        "flex flex-col items-center gap-1.5 transition-all duration-300 transform",
                        isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground active:scale-95"
                    )}
                >
                    <User className="w-6 h-6" />
                    <span className="text-[10px] font-medium tracking-wide">Profile</span>
                </NavLink>
            </nav>
        </div>
    );
}
