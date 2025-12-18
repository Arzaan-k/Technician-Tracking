import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Mail, Shield, Hash, ChevronRight } from 'lucide-react';

export default function Profile() {
    const { user, logout } = useAuth();

    if (!user) return null;

    const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20">
            {/* Header / Banner */}
            <div className="bg-white dark:bg-gray-800 border-b pb-8 pt-10 px-6 flex flex-col items-center shadow-sm">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg ring-4 ring-white dark:ring-gray-700">
                    {initials || <User className="w-10 h-10" />}
                </div>
                <h1 className="text-2xl font-bold text-foreground">{user.firstName} {user.lastName}</h1>
                <p className="text-muted-foreground font-medium text-sm mt-1 uppercase tracking-wide bg-secondary/50 px-3 py-1 rounded-full">
                    {user.role}
                </p>
            </div>

            <div className="max-w-md mx-auto p-6 space-y-8">
                {/* Personal Information */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                        Personal Information
                    </h2>
                    <div className="bg-white dark:bg-card border rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                        <div className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs text-muted-foreground font-medium">Email Address</p>
                                <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
                            </div>
                        </div>

                        <div className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground font-medium">Account Role</p>
                                <p className="text-sm font-semibold text-foreground capitalize">{user.role}</p>
                            </div>
                        </div>

                        <div className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <Hash className="w-5 h-5" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs text-muted-foreground font-medium">Employee ID</p>
                                <p className="text-xs font-mono text-foreground truncate" title={user.id}>{user.id}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Actions */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                        Account
                    </h2>
                    <div className="bg-white dark:bg-card border rounded-2xl shadow-sm overflow-hidden">
                        <button
                            onClick={logout}
                            className="w-full p-4 flex items-center gap-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
                        >
                            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold">Sign Out</p>
                                <p className="text-xs text-muted-foreground">Log out of your account</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300" />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                        Location Tracker App v0.1.0
                    </p>
                </div>
            </div>
        </div>
    );
}
