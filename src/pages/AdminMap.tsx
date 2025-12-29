import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
    Activity, Battery, Clock, Users, Filter, X, Check,
    RefreshCw, MapPin, Wifi, WifiOff, AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Create a custom icon for technicians
const createTechIcon = (initials: string, status: 'online' | 'idle' | 'offline') => {
    const colors = {
        online: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-700' },
        idle: { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-700' },
        offline: { bg: 'bg-gray-400', border: 'border-gray-400', text: 'text-gray-600' }
    };
    const color = colors[status];

    return L.divIcon({
        className: 'custom-div-icon',
        html: `
            <div class="relative flex items-center justify-center w-10 h-10">
                <div class="absolute w-full h-full ${color.bg} opacity-20 rounded-full ${status === 'online' ? 'animate-ping' : ''}"></div>
                <div class="absolute w-full h-full bg-white rounded-full border-2 ${color.border} shadow-lg flex items-center justify-center font-bold text-xs ${color.text}">
                    ${initials}
                </div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
};

interface Technician {
    id: string;
    userId: string;
    name: string;
    email: string;
    position: [number, number];
    speed: number;
    battery: number | null;
    accuracy: number | null;
    address: string | null;
    lastSeen: string;
    status: 'online' | 'idle' | 'offline';
}

interface TechnicianOption {
    technician_id: string;
    user_id: string;
    name: string;
    email: string;
    is_active: boolean;
}

// Component to fit map bounds to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
    const map = useMap();

    useEffect(() => {
        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
    }, [positions, map]);

    return null;
}

export default function AdminMap() {
    const { user } = useAuth();
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [allTechnicianOptions, setAllTechnicianOptions] = useState<TechnicianOption[]>([]);
    const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]); // Empty = show all
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Check if user is admin/coordinator
    const isAdmin = user?.role && ['admin', 'super_admin', 'coordinator'].includes(user.role);

    // Fetch technician options for filter
    const fetchTechnicianOptions = async () => {
        try {
            const { data } = await api.get('/admin/technicians');
            setAllTechnicianOptions(data);
        } catch (error) {
            console.error('Failed to fetch technician options', error);
        }
    };

    // Fetch live technician locations
    const fetchTechnicians = async (showLoading = false) => {
        if (showLoading) setIsRefreshing(true);
        setError(null);

        try {
            const params = selectedTechIds.length > 0
                ? `?ids=${selectedTechIds.join(',')}`
                : '';
            const { data } = await api.get(`/admin/live-map${params}`);
            setTechnicians(data);
            setLastUpdate(new Date());
        } catch (error: any) {
            console.error('Failed to fetch technicians', error);
            setError(error.message || 'Failed to load fleet data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTechnicianOptions();
        fetchTechnicians();

        // Poll every 15 seconds
        const interval = setInterval(() => fetchTechnicians(), 15000);
        return () => clearInterval(interval);
    }, [selectedTechIds]);

    // Toggle technician selection
    const toggleTechnician = (id: string) => {
        setSelectedTechIds(prev =>
            prev.includes(id)
                ? prev.filter(t => t !== id)
                : [...prev, id]
        );
    };

    // Select/Deselect all
    const selectAll = () => {
        setSelectedTechIds([]); // Empty means show all
        setShowFilter(false);
    };

    // Stats
    const stats = useMemo(() => ({
        total: technicians.length,
        online: technicians.filter(t => t.status === 'online').length,
        idle: technicians.filter(t => t.status === 'idle').length,
        offline: technicians.filter(t => t.status === 'offline').length
    }), [technicians]);

    // Positions for map bounds
    const positions = useMemo(() =>
        technicians.map(t => t.position),
        [technicians]
    );

    // Redirect non-admins
    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    if (isLoading && technicians.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Loading Fleet Map...</p>
            </div>
        );
    }

    return (
        <div className="h-screen w-full relative bg-gray-100">
            {/* Map */}
            <MapContainer
                center={[20.5937, 78.9629]} // India center
                zoom={5}
                className="h-full w-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {positions.length > 0 && <FitBounds positions={positions} />}

                {technicians.map((tech) => {
                    const initials = tech.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                    return (
                        <Marker
                            key={tech.id}
                            position={tech.position}
                            icon={createTechIcon(initials, tech.status)}
                        >
                            <Popup className="tech-popup">
                                <div className="p-3 min-w-[220px]">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-3 pb-2 border-b">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                                            tech.status === 'online' ? 'bg-green-500' :
                                                tech.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-400'
                                        )}>
                                            {initials}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm">{tech.name}</h3>
                                            <p className="text-[10px] text-gray-500">{tech.email}</p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 flex items-center gap-1">
                                                <Activity className="w-3 h-3" /> Speed
                                            </span>
                                            <span className="font-medium">{tech.speed} km/h</span>
                                        </div>

                                        {tech.battery !== null && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 flex items-center gap-1">
                                                    <Battery className={cn(
                                                        "w-3 h-3",
                                                        tech.battery < 20 ? 'text-red-500' : 'text-green-500'
                                                    )} /> Battery
                                                </span>
                                                <span className="font-medium">{tech.battery}%</span>
                                            </div>
                                        )}

                                        {tech.accuracy && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> Accuracy
                                                </span>
                                                <span className="font-medium">±{tech.accuracy}m</span>
                                            </div>
                                        )}

                                        {tech.address && (
                                            <div className="pt-2 border-t mt-2">
                                                <p className="text-[10px] text-gray-500 mb-1">Location</p>
                                                <p className="text-xs font-medium leading-tight">{tech.address}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t text-[10px] text-gray-500">
                                        <span className={cn(
                                            "flex items-center gap-1 px-2 py-0.5 rounded-full",
                                            tech.status === 'online' ? 'bg-green-100 text-green-700' :
                                                tech.status === 'idle' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                                        )}>
                                            {tech.status === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                            {tech.status.charAt(0).toUpperCase() + tech.status.slice(1)}
                                        </span>
                                        <span>
                                            {formatDistanceToNow(new Date(tech.lastSeen))} ago
                                        </span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Top Stats Bar - with safe area */}
            <div
                className="absolute top-0 left-0 right-0 z-[1000] px-4 flex items-start justify-between gap-3"
                style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}
            >
                {/* Stats Card */}
                <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold">Fleet Overview</h3>
                    </div>
                    <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="font-medium text-green-700">Online: {stats.online}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                            <span className="font-medium text-yellow-700">Idle: {stats.idle}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            <span className="font-medium text-gray-600">Offline: {stats.offline}</span>
                        </div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated {formatDistanceToNow(lastUpdate)} ago
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchTechnicians(true)}
                        disabled={isRefreshing}
                        className={cn(
                            "p-3 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200",
                            "hover:bg-gray-50 transition-colors",
                            isRefreshing && "opacity-50"
                        )}
                    >
                        <RefreshCw className={cn("w-5 h-5 text-gray-600", isRefreshing && "animate-spin")} />
                    </button>

                    {/* Filter Button */}
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className={cn(
                            "p-3 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border transition-colors",
                            showFilter ? "border-primary bg-primary/10" : "border-gray-200 hover:bg-gray-50"
                        )}
                    >
                        <Filter className={cn("w-5 h-5", showFilter ? "text-primary" : "text-gray-600")} />
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilter && (
                <div className="absolute top-24 right-4 z-[1000] w-72 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in slide-in-from-top-2">
                    <div className="p-3 border-b bg-gray-50/50">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Filter Technicians</h3>
                            <button onClick={() => setShowFilter(false)}>
                                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                            {selectedTechIds.length === 0
                                ? 'Showing all technicians'
                                : `Showing ${selectedTechIds.length} selected`}
                        </p>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {allTechnicianOptions.map((tech) => (
                            <button
                                key={tech.technician_id}
                                onClick={() => toggleTechnician(tech.technician_id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left",
                                    selectedTechIds.includes(tech.technician_id) && "bg-primary/5"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center",
                                    selectedTechIds.includes(tech.technician_id) || selectedTechIds.length === 0
                                        ? "bg-primary border-primary text-white"
                                        : "border-gray-300"
                                )}>
                                    {(selectedTechIds.includes(tech.technician_id) || selectedTechIds.length === 0) && (
                                        <Check className="w-3 h-3" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{tech.name}</p>
                                    <p className="text-[10px] text-gray-500 truncate">{tech.email}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="p-3 border-t bg-gray-50/50">
                        <button
                            onClick={selectAll}
                            className="w-full py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                            Show All Technicians
                        </button>
                    </div>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="absolute bottom-24 left-4 right-4 z-[1000] bg-red-500/90 text-white p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm flex-1">{error}</span>
                    <button onClick={() => setError(null)}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && technicians.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
                    <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg text-center max-w-xs pointer-events-auto">
                        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-semibold text-gray-700 mb-1">No Technicians Found</h3>
                        <p className="text-sm text-gray-500">
                            {selectedTechIds.length > 0
                                ? 'Selected technicians have no location data. Try selecting others.'
                                : 'No technicians have shared their location yet.'}
                        </p>
                        {selectedTechIds.length > 0 && (
                            <button
                                onClick={selectAll}
                                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                            >
                                Show All
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
