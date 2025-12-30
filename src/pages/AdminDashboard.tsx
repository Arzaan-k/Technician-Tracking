import { useEffect, useState, useMemo } from 'react';
import { admin } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Users, MapPin, Activity, TrendingUp, Clock,
    Search, X,
    BarChart3, RefreshCw, ArrowUpRight,
    Minus, Map
} from 'lucide-react';

interface Employee {
    id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    total_sessions: number;
    total_distance: string;
    distance_today: string;
    sessions_today: number;
    last_seen: string | null;
    status: 'online' | 'idle' | 'offline';
}

interface AnalyticsOverview {
    overview: {
        total_employees: number;
        online_now: number;
        sessions_today: number;
        distance_today: string;
        locations_today: number;
    };
    dailySessions: Array<{
        date: string;
        sessions: number;
        distance: string;
        active_employees: number;
    }>;
    topPerformers: Array<{
        id: string;
        name: string;
        email: string;
        sessions: number;
        distance: string;
    }>;
    hourlyActivity: Array<{
        hour: number;
        locations: number;
    }>;
}

interface EmployeeDetail {
    id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    stats: {
        total_sessions: number;
        total_distance: string;
        total_locations: number;
        avg_session_duration: number;
        first_session: string | null;
        last_session: string | null;
    };
    weeklyActivity: Array<{
        date: string;
        sessions: number;
        distance: string;
        locations: number;
    }>;
    currentLocation: {
        latitude: number;
        longitude: number;
        accuracy: number;
        speed: number;
        battery_level: number;
        timestamp: string;
    } | null;
}

type ViewMode = 'dashboard' | 'employees' | 'map' | 'analytics';
type Period = '1d' | '7d' | '30d' | '90d';

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
    const [period, setPeriod] = useState<Period>('7d');
    // Filters state - currently using inline filters

    // Check if user is admin
    useEffect(() => {
        if (user && user.role !== 'admin') {
            navigate('/');
        }
    }, [user, navigate]);

    // Fetch data
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [period, statusFilter, searchQuery]);

    const fetchData = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        setRefreshing(true);

        try {
            const [employeesRes, analyticsRes] = await Promise.all([
                admin.getEmployees({
                    status: statusFilter === 'all' ? undefined : statusFilter === 'online' ? 'active' : 'inactive',
                    search: searchQuery || undefined,
                }),
                admin.getAnalyticsOverview(),
            ]);

            setEmployees(employeesRes.data);
            setAnalytics(analyticsRes.data);
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchEmployeeDetail = async (id: string) => {
        try {
            const res = await admin.getEmployee(id);
            setSelectedEmployee(res.data);
        } catch (error) {
            console.error('Failed to fetch employee details:', error);
        }
    };

    // Filter employees
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            if (statusFilter === 'online' && emp.status !== 'online') return false;
            if (statusFilter === 'offline' && emp.status === 'online') return false;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return emp.name.toLowerCase().includes(query) ||
                    emp.email.toLowerCase().includes(query);
            }
            return true;
        });
    }, [employees, statusFilter, searchQuery]);

    // Stats cards
    const statsCards = useMemo(() => {
        if (!analytics) return [];

        const ov = analytics.overview;
        const onlinePercent = ov.total_employees > 0
            ? Math.round((ov.online_now / ov.total_employees) * 100)
            : 0;

        return [
            {
                title: 'Total Employees',
                value: ov.total_employees,
                subtitle: `${ov.online_now} online now`,
                icon: Users,
                color: 'blue',
                trend: onlinePercent,
                trendLabel: 'online rate'
            },
            {
                title: 'Sessions Today',
                value: ov.sessions_today,
                subtitle: `${ov.locations_today} location updates`,
                icon: Activity,
                color: 'green',
            },
            {
                title: 'Distance Today',
                value: `${ov.distance_today} km`,
                subtitle: 'Total tracked distance',
                icon: MapPin,
                color: 'purple',
            },
            {
                title: 'Online Now',
                value: ov.online_now,
                subtitle: 'Active employees',
                icon: TrendingUp,
                color: 'emerald',
            },
        ];
    }, [analytics]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 pt-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-background overflow-y-auto pb-6">
            {/* Top Bar with safe area */}
            <div className="bg-card/95 backdrop-blur-xl border-b border-border sticky top-0 z-30 safe-top">
                <div className="px-5 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
                        <p className="text-muted-foreground text-xs font-medium">Overview & Analytics</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchData(false)}
                            className={cn(
                                "p-2 rounded-full bg-secondary/50 text-foreground hover:bg-secondary transition-colors",
                                refreshing && "animate-spin"
                            )}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Horizontal Scrollable Tabs */}
                <div className="px-4 pb-2 overflow-x-auto no-scrollbar">
                    <div className="flex gap-2">
                        {(['dashboard', 'employees', 'map', 'analytics'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize whitespace-nowrap border",
                                    viewMode === mode
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-muted-foreground border-border hover:bg-secondary"
                                )}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="px-4 py-6 safe-left safe-right">
                {/* Stats Cards */}
                {viewMode === 'dashboard' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-2 gap-3">
                            {statsCards.map((stat, idx) => (
                                <div
                                    key={idx}
                                    className="bg-card rounded-2xl p-4 border border-border shadow-sm flex flex-col justify-between min-h-[140px]"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className={cn(
                                            "p-2.5 rounded-xl",
                                            stat.color === 'blue' && "bg-blue-500/10 text-blue-500",
                                            stat.color === 'green' && "bg-green-500/10 text-green-500",
                                            stat.color === 'purple' && "bg-purple-500/10 text-purple-500",
                                            stat.color === 'emerald' && "bg-emerald-500/10 text-emerald-500",
                                        )}>
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                        {stat.trend !== undefined && (
                                            <div className={cn(
                                                "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                                stat.trend >= 50 ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                                            )}>
                                                {stat.trend >= 50 ? <ArrowUpRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                                {stat.trend}%
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                        <p className="text-xs font-medium text-muted-foreground mt-0.5">{stat.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Top Performers */}
                        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                Top Performers <span className="text-muted-foreground text-xs font-normal ml-auto">This Week</span>
                            </h3>
                            <div className="space-y-3">
                                {analytics?.topPerformers.map((performer, idx) => (
                                    <div
                                        key={performer.id}
                                        onClick={() => fetchEmployeeDetail(performer.id)}
                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors active:scale-98 transform duration-100"
                                    >
                                        <div className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm",
                                            idx === 0 && "bg-yellow-500 text-white",
                                            idx === 1 && "bg-gray-400 text-white",
                                            idx === 2 && "bg-amber-600 text-white",
                                            idx > 2 && "bg-secondary text-muted-foreground"
                                        )}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{performer.name}</p>
                                            <p className="text-xs text-muted-foreground">{performer.sessions} sessions</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-foreground">{performer.distance} km</p>
                                        </div>
                                    </div>
                                ))}
                                {(!analytics?.topPerformers || analytics.topPerformers.length === 0) && (
                                    <p className="text-muted-foreground text-center text-sm py-4">No data available</p>
                                )}
                            </div>
                        </div>

                        {/* Daily Sessions Chart */}
                        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-primary" />
                                Daily Activity
                            </h3>
                            <div className="flex items-end gap-2 h-40 pt-4">
                                {analytics?.dailySessions.slice(-7).map((day) => {
                                    const maxSessions = Math.max(...(analytics?.dailySessions.map(d => d.sessions) || [1]));
                                    const height = (day.sessions / maxSessions) * 100;

                                    return (
                                        <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
                                            <div className="w-full flex flex-col items-center relative">
                                                <span className="text-[10px] text-foreground font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">
                                                    {day.sessions}
                                                </span>
                                                <div
                                                    className="w-full bg-primary/20 rounded-t-sm relative overflow-hidden group-hover:bg-primary/30 transition-colors"
                                                    style={{ height: '140px' }}
                                                >
                                                    <div
                                                        className="absolute bottom-0 left-0 right-0 bg-primary transition-all duration-500 ease-out rounded-t-sm"
                                                        style={{ height: `${Math.max(height, 5)}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                                {format(new Date(day.date), 'EEE')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Employees View */}
                {viewMode === 'employees' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        {/* Search and Filters */}
                        <div className="sticky top-28 z-20 space-y-3 bg-background/95 backdrop-blur py-2 -mx-4 px-4 border-b border-border/50">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-transparent focus:border-primary/20 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {(['all', 'online', 'offline'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize border flex-shrink-0",
                                            statusFilter === status
                                                ? "bg-foreground text-background border-foreground"
                                                : "bg-background text-muted-foreground border-border hover:bg-secondary"
                                        )}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Employee Cards List */}
                        <div className="grid grid-cols-1 gap-3 pt-2">
                            {filteredEmployees.map((emp) => (
                                <div
                                    key={emp.id}
                                    onClick={() => fetchEmployeeDetail(emp.id)}
                                    className="bg-card rounded-2xl p-4 border border-border shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{emp.name}</p>
                                                <p className="text-xs text-muted-foreground">{emp.role}</p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "w-2.5 h-2.5 rounded-full",
                                            emp.status === 'online' && "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]",
                                            emp.status === 'idle' && "bg-yellow-500",
                                            emp.status === 'offline' && "bg-secondary-foreground/20"
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="bg-secondary/30 rounded-xl p-2.5">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Today</p>
                                            <p className="text-sm font-bold text-foreground">{emp.distance_today} km</p>
                                        </div>
                                        <div className="bg-secondary/30 rounded-xl p-2.5">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total</p>
                                            <p className="text-sm font-bold text-foreground">{emp.total_distance} km</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                                        <span>
                                            {emp.total_sessions} sessions
                                        </span>
                                        <span>
                                            {emp.last_seen
                                                ? formatDistanceToNow(new Date(emp.last_seen), { addSuffix: true })
                                                : 'Never active'
                                            }
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Map View */}
                {viewMode === 'map' && (
                    <div className="h-[70vh] flex flex-col items-center justify-center text-center px-6 animate-in fade-in zoom-in-95">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <Map className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Live Fleet Map</h3>
                        <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
                            View real-time locations of all active employees on an interactive map.
                        </p>
                        <button
                            onClick={() => navigate('/admin')}
                            className="w-full max-w-xs py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Map className="w-5 h-5" />
                            Open Map View
                        </button>
                    </div>
                )}

                {/* Analytics View */}
                {viewMode === 'analytics' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        {/* Period Selector */}
                        <div className="bg-secondary/30 p-1.5 rounded-xl flex gap-1">
                            {(['1d', '7d', '30d', '90d'] as Period[]).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                                        period === p
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-background/50"
                                    )}
                                >
                                    {p === '1d' ? 'Today' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
                                </button>
                            ))}
                        </div>

                        <div className="bg-card rounded-2xl p-6 border border-border border-dashed flex flex-col items-center justify-center text-center py-12">
                            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-base font-semibold text-foreground mb-1">Detailed Analytics</h3>
                            <p className="text-sm text-muted-foreground">
                                Advanced reporting features coming in the next update.
                            </p>
                        </div>
                    </div>
                )}
            </main>

            {/* Employee Detail Modal - Mobile Sheet Style */}
            {selectedEmployee && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
                    <div
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedEmployee(null)}
                    />

                    <div className="relative w-full max-w-lg bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-full duration-300">
                        {/* Drag Handle */}
                        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-12 h-1.5 bg-muted rounded-full" />
                        </div>

                        <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-foreground leading-none">{selectedEmployee.name}</h2>
                                    <p className="text-xs text-muted-foreground mt-1">{selectedEmployee.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedEmployee(null)}
                                className="p-2 rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)] space-y-6 pb-10">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-secondary/30 rounded-xl p-3 flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-blue-500">
                                        <Activity className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase">Sessions</span>
                                    </div>
                                    <p className="text-xl font-bold text-foreground">{selectedEmployee.stats.total_sessions}</p>
                                </div>
                                <div className="bg-secondary/30 rounded-xl p-3 flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-green-500">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase">Distance</span>
                                    </div>
                                    <p className="text-xl font-bold text-foreground">{selectedEmployee.stats.total_distance} <span className="text-xs font-normal text-muted-foreground">km</span></p>
                                </div>
                                <div className="bg-secondary/30 rounded-xl p-3 flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-purple-500">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase">Avg Time</span>
                                    </div>
                                    <p className="text-xl font-bold text-foreground">{selectedEmployee.stats.avg_session_duration} <span className="text-xs font-normal text-muted-foreground">min</span></p>
                                </div>
                                <div className="bg-secondary/30 rounded-xl p-3 flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-orange-500">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase">Updates</span>
                                    </div>
                                    <p className="text-xl font-bold text-foreground">{selectedEmployee.stats.total_locations}</p>
                                </div>
                            </div>

                            {/* Current Location */}
                            {selectedEmployee.currentLocation ? (
                                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5" />
                                        Current Location
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Coordinates</span>
                                            <p className="font-mono text-xs font-medium text-foreground">
                                                {selectedEmployee.currentLocation.latitude.toFixed(5)}, {selectedEmployee.currentLocation.longitude.toFixed(5)}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Last Update</span>
                                            <p className="text-xs font-medium text-foreground">
                                                {formatDistanceToNow(new Date(selectedEmployee.currentLocation.timestamp), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {selectedEmployee.currentLocation.battery_level && (
                                            <div>
                                                <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Battery</span>
                                                <p className="text-xs font-medium text-foreground">{selectedEmployee.currentLocation.battery_level}%</p>
                                            </div>
                                        )}
                                        {selectedEmployee.currentLocation.speed && (
                                            <div>
                                                <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Speed</span>
                                                <p className="text-xs font-medium text-foreground">{Math.round(selectedEmployee.currentLocation.speed * 3.6)} km/h</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-secondary/30 rounded-xl p-4 text-center">
                                    <p className="text-sm text-muted-foreground">No location data available currently.</p>
                                </div>
                            )}

                            {/* Weekly Activity */}
                            <div>
                                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                                    Last 7 Days
                                </h3>
                                <div className="space-y-2">
                                    {selectedEmployee.weeklyActivity.map((day) => (
                                        <div key={day.date} className="flex items-center gap-3 p-2.5 bg-card border border-border/50 rounded-xl hover:bg-secondary/30 transition-colors">
                                            <span className="text-xs font-medium text-muted-foreground w-16">
                                                {format(new Date(day.date), 'EEE')}
                                            </span>
                                            <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="bg-primary h-full rounded-full"
                                                    style={{ width: `${Math.min((parseFloat(day.distance) / 20) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <div className="text-right w-20">
                                                <p className="text-xs font-bold text-foreground">{day.distance} km</p>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedEmployee.weeklyActivity.length === 0 && (
                                        <p className="text-muted-foreground text-center text-xs py-4 bg-secondary/20 rounded-xl">No activity recorded</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
