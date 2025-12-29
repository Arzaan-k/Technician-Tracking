import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Mail, Shield, Hash, ChevronRight, MapPin, Briefcase } from 'lucide-react';

export default function Profile() {
    const { user, logout } = useAuth();

    if (!user) return null;

    const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();

    return (
        <div className="min-h-[100dvh] bg-background pb-32">
            {/* Header / Banner with Professional Navy Theme */}
            <div
                className="bg-[#0f172a] relative overflow-hidden text-white"
                style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 2rem)' }}
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] -translate-x-1/2 translate-y-1/2"></div>
                </div>

                <div className="relative px-6 pb-16 pt-8 flex flex-col items-center text-center z-10">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-xl ring-4 ring-white/5 border border-white/10">
                        {initials || <User className="w-10 h-10" />}
                    </div>
                    {/* Name */}
                    <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
                        {user.firstName} {user.lastName}
                    </h1>
                    {/* Role Badge */}
                    <div className="inline-flex items-center gap-1.5 bg-blue-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-blue-400/20 mt-2">
                        <Briefcase className="w-3.5 h-3.5 text-blue-200" />
                        <span className="text-xs font-semibold text-blue-100 uppercase tracking-wide">
                            {user.role?.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 -mt-8 space-y-4 relative z-20">
                {/* Personal Information Card */}
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-border bg-muted/30">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Personal Information
                        </h2>
                    </div>

                    <div className="divide-y divide-border">
                        {/* Email */}
                        <div className="p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Email Address</p>
                                <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                            </div>
                        </div>

                        {/* Role */}
                        <div className="p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Account Role</p>
                                <p className="text-sm font-medium text-foreground capitalize">{user.role?.replace('_', ' ')}</p>
                            </div>
                        </div>

                        {/* Employee ID */}
                        <div className="p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Hash className="w-5 h-5" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Employee ID</p>
                                <p className="text-xs font-mono font-medium text-foreground truncate" title={user.id}>{user.id}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Actions Card */}
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-border bg-muted/30">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Account Settings
                        </h2>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full p-4 flex items-center gap-4 text-destructive hover:bg-destructive/5 active:bg-destructive/10 transition-colors text-left group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive group-active:scale-95 transition-transform">
                            <LogOut className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold mb-0.5">Sign Out</p>
                            <p className="text-[10px] text-muted-foreground">Log out of your account</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-active:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* App Info */}
                <div className="text-center space-y-2 py-6">
                    <div className="inline-flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                        <MapPin className="w-3 h-3" />
                        <span className="font-medium">LocTrack Technician App</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/50">
                        Version 1.0.0 • Crystal Group
                    </p>
                </div>
            </div>
        </div>
    );
}
