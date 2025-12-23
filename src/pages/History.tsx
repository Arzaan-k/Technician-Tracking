import { useEffect, useState, useCallback } from 'react';
import { location } from '@/lib/api';
import { format } from 'date-fns';
import { 
    RefreshCw, ChevronDown, ChevronUp, 
    Play, Navigation, Timer, PauseCircle,
    Map as MapIcon, ExternalLink, Route
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Local type definitions (to avoid import issues)
interface TrackingSessionData {
    session_id: string;
    start_time: string;
    end_time: string | null;
    status: string;
    total_distance: number;
    total_locations: number;
    duration_seconds: number;
    start_location: { latitude: string; longitude: string; timestamp: string } | null;
    end_location: { latitude: string; longitude: string; timestamp: string } | null;
    stationary_percent: number;
    moving_percent: number;
    avg_speed: number;
    max_speed: number;
}

interface SessionRouteData {
    session: {
        session_id: string;
        start_time: string;
        end_time: string | null;
        total_distance: number;
        total_locations: number;
    };
    route: Array<{ lat: number; lng: number; timestamp: string; speed: number }>;
    stops: Array<{
        latitude: number;
        longitude: number;
        start_time: string;
        end_time: string;
        duration_minutes: number;
    }>;
}

// Address cache (persistent across renders)
const addressCache: Record<string, string> = {};

// Rate limiting queue for Nominatim (max 1 request per second)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds between requests

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Reverse geocode function with rate limiting
async function reverseGeocode(lat: number, lon: number): Promise<string> {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (addressCache[cacheKey]) return addressCache[cacheKey];

    try {
        // Rate limiting - wait if needed
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
        }
        lastRequestTime = Date.now();

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
            { 
                headers: { 
                    'Accept-Language': 'en', 
                    'User-Agent': 'TechnicianTrackingApp/1.0 (contact@example.com)' 
                } 
            }
        );
        
        // Handle rate limiting response
        if (response.status === 429) {
            console.warn('Rate limited by Nominatim, waiting...');
            await delay(2000);
            return reverseGeocode(lat, lon); // Retry
        }
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const addr = data.address || {};
        
        const parts: string[] = [];
        if (addr.building || addr.amenity || addr.shop) parts.push(addr.building || addr.amenity || addr.shop);
        if (addr.road) parts.push(addr.road);
        if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
        
        const address = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',') || 'Unknown location';
        addressCache[cacheKey] = address;
        return address;
    } catch (error) {
        console.warn('Geocoding failed:', error);
        // Return coordinates as fallback
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
}

// Custom markers
const createStartIcon = () => L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:32px;height:32px;background:#22c55e;border-radius:50%;border:4px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const createEndIcon = () => L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:32px;height:32px;background:#ef4444;border-radius:50%;border:4px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const createStopIcon = () => L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:24px;height:24px;background:#f59e0b;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Map bounds fitter
function FitBounds({ route }: { route: Array<{ lat: number; lng: number }> }) {
    const map = useMap();
    useEffect(() => {
        if (route.length > 0) {
            const bounds = L.latLngBounds(route.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [30, 30] });
        }
    }, [route, map]);
    return null;
}

// Session Card Component
function SessionCard({ session }: { session: TrackingSessionData }) {
    const [startAddress, setStartAddress] = useState<string>('Loading...');
    const [endAddress, setEndAddress] = useState<string>('Loading...');
    const [isExpanded, setIsExpanded] = useState(false);
    const [routeData, setRouteData] = useState<SessionRouteData | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [stopAddresses, setStopAddresses] = useState<string[]>([]);

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins} min`;
    };

    // Load addresses (only when card becomes visible)
    useEffect(() => {
        let isMounted = true;
        
        const loadAddresses = async () => {
            // Load start address first
            if (session.start_location && isMounted) {
                const startAddr = await reverseGeocode(
                    parseFloat(session.start_location.latitude),
                    parseFloat(session.start_location.longitude)
                );
                if (isMounted) setStartAddress(startAddr);
                
                // Then load end address (sequential, not parallel)
                if (session.end_location && isMounted) {
                    const endAddr = await reverseGeocode(
                        parseFloat(session.end_location.latitude),
                        parseFloat(session.end_location.longitude)
                    );
                    if (isMounted) setEndAddress(endAddr);
                } else if (isMounted) {
                    setEndAddress(startAddr); // Same as start if no end
                }
            }
        };
        
        loadAddresses();
        
        return () => { isMounted = false; };
    }, [session.session_id]); // Only depend on session_id to prevent re-fetching

    // Load route when expanded
    useEffect(() => {
        let isMounted = true;
        
        if (isExpanded && !routeData && !isLoadingRoute) {
            setIsLoadingRoute(true);
            
            location.getSessionDetails(session.session_id)
                .then(async (res: any) => {
                    if (!isMounted) return;
                    setRouteData(res.data);
                    
                    // Load stop addresses sequentially (max 3 to avoid rate limiting)
                    const addrs: string[] = [];
                    for (const stop of res.data.stops.slice(0, 3)) {
                        if (!isMounted) break;
                        const addr = await reverseGeocode(stop.latitude, stop.longitude);
                        addrs.push(addr);
                        if (isMounted) setStopAddresses([...addrs]); // Update incrementally
                    }
                })
                .catch(console.error)
                .finally(() => {
                    if (isMounted) setIsLoadingRoute(false);
                });
        }
        
        return () => { isMounted = false; };
    }, [isExpanded, session.session_id]);

    const isActive = session.status === 'active';
    const startTime = new Date(session.start_time);
    const endTime = session.end_time ? new Date(session.end_time) : null;

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
            {/* Header */}
            <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                {/* Time & Status */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                            <Route className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-blue-600'}`} />
                        </div>
                        <div>
                            <p className="font-semibold text-lg">
                                {format(startTime, 'h:mm a')}
                                {endTime && ` → ${format(endTime, 'h:mm a')}`}
                            </p>
                            <p className="text-xs text-muted-foreground">{format(startTime, 'EEE, MMM d, yyyy')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isActive ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {isActive ? 'Active' : 'Completed'}
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </div>

                {/* Start & End Locations with Names */}
                <div className="relative pl-6 space-y-4">
                    {/* Start */}
                    <div className="flex items-start gap-3">
                        <div className="absolute left-0 w-4 h-4 rounded-full bg-green-500 border-2 border-background shadow-md" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground font-medium uppercase">Start Location</p>
                            <p className="font-medium text-sm">{startAddress}</p>
                            <p className="text-xs text-muted-foreground">{format(startTime, 'p')}</p>
                        </div>
                    </div>

                    {/* Line */}
                    <div className="absolute left-[7px] top-6 bottom-8 w-0.5 bg-gradient-to-b from-green-500 via-blue-400 to-red-500" />

                    {/* End */}
                    <div className="flex items-start gap-3">
                        <div className="absolute left-0 w-4 h-4 rounded-full bg-red-500 border-2 border-background shadow-md" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground font-medium uppercase">{isActive ? 'Current' : 'End Location'}</p>
                            <p className="font-medium text-sm">{endAddress}</p>
                            {endTime && <p className="text-xs text-muted-foreground">{format(endTime, 'p')}</p>}
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                    <div className="bg-secondary/50 rounded-xl p-2 text-center">
                        <Timer className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                        <p className="text-xs font-bold">{formatDuration(session.duration_seconds || 0)}</p>
                        <p className="text-[10px] text-muted-foreground">Duration</p>
                    </div>
                    <div className="bg-secondary/50 rounded-xl p-2 text-center">
                        <Navigation className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                        <p className="text-xs font-bold">{(session.total_distance || 0).toFixed(2)} km</p>
                        <p className="text-[10px] text-muted-foreground">Distance</p>
                    </div>
                    <div className="bg-secondary/50 rounded-xl p-2 text-center">
                        <Play className="w-4 h-4 mx-auto text-green-500 mb-1" />
                        <p className="text-xs font-bold">{session.moving_percent || 0}%</p>
                        <p className="text-[10px] text-muted-foreground">Moving</p>
                    </div>
                    <div className="bg-secondary/50 rounded-xl p-2 text-center">
                        <PauseCircle className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                        <p className="text-xs font-bold">{session.stationary_percent || 0}%</p>
                        <p className="text-[10px] text-muted-foreground">Stopped</p>
                    </div>
                </div>
            </div>

            {/* Expanded - Route Map & Details */}
            {isExpanded && (
                <div className="border-t border-border">
                    {isLoadingRoute ? (
                        <div className="p-8 flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                            <p className="text-sm text-muted-foreground">Loading route...</p>
                        </div>
                    ) : routeData && routeData.route.length > 0 ? (
                        <>
                            {/* Map */}
                            <div className="h-64 relative">
                                <MapContainer
                                    center={[routeData.route[0].lat, routeData.route[0].lng]}
                                    zoom={14}
                                    scrollWheelZoom={true}
                                    zoomControl={false}
                                    className="h-full w-full"
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                        attribution='OpenStreetMap'
                                    />
                                    
                                    {/* Route Line */}
                                    <Polyline
                                        positions={routeData.route.map(p => [p.lat, p.lng])}
                                        color="#3b82f6"
                                        weight={4}
                                        opacity={0.8}
                                    />

                                    {/* Start Marker */}
                                    <Marker position={[routeData.route[0].lat, routeData.route[0].lng]} icon={createStartIcon()}>
                                        <Popup><strong className="text-green-600">Start:</strong> {startAddress}</Popup>
                                    </Marker>

                                    {/* End Marker */}
                                    <Marker 
                                        position={[routeData.route[routeData.route.length - 1].lat, routeData.route[routeData.route.length - 1].lng]} 
                                        icon={createEndIcon()}
                                    >
                                        <Popup><strong className="text-red-600">End:</strong> {endAddress}</Popup>
                                    </Marker>

                                    {/* Stop Markers */}
                                    {routeData.stops.map((stop, idx) => (
                                        <Marker key={idx} position={[stop.latitude, stop.longitude]} icon={createStopIcon()}>
                                            <Popup>
                                                <strong className="text-amber-600">Stop #{idx + 1}</strong><br/>
                                                {stopAddresses[idx] || 'Loading...'}<br/>
                                                <span className="text-xs">{stop.duration_minutes} min</span>
                                            </Popup>
                                        </Marker>
                                    ))}

                                    <FitBounds route={routeData.route} />
                                </MapContainer>

                                {/* Legend */}
                                <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs shadow-md z-[1000]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        <span>Start</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <span>End</span>
                                    </div>
                                    {routeData.stops.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                            <span>Stops ({routeData.stops.length})</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stops List */}
                            {routeData.stops.length > 0 && (
                                <div className="p-4 border-t border-border">
                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <PauseCircle className="w-4 h-4 text-amber-500" />
                                        Stops Along the Way
                                    </h4>
                                    <div className="space-y-2">
                                        {routeData.stops.slice(0, 5).map((stop, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                                                <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{stopAddresses[idx] || 'Loading...'}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(new Date(stop.start_time), 'h:mm a')} • {stop.duration_minutes} min stop
                                                    </p>
                                                </div>
                                                <a 
                                                    href={`https://www.google.com/maps?q=${stop.latitude},${stop.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-amber-200 rounded-lg"
                                                >
                                                    <ExternalLink className="w-4 h-4 text-amber-700" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="p-4 border-t border-border grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                                    <p className="text-xs text-muted-foreground">Avg Speed</p>
                                    <p className="text-lg font-bold">{(session.avg_speed || 0).toFixed(1)} km/h</p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl">
                                    <p className="text-xs text-muted-foreground">Max Speed</p>
                                    <p className="text-lg font-bold">{(session.max_speed || 0).toFixed(1)} km/h</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            <MapIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p>No route data available for this session</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Main History Page
export default function History() {
    const [sessions, setSessions] = useState<TrackingSessionData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchSessions = useCallback(async () => {
        try {
            const { data } = await location.getSessions(20);
            setSessions(data);
        } catch (error) {
            console.error('Failed to load sessions', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const onRefresh = () => {
        setIsRefreshing(true);
        fetchSessions();
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading your trips...</p>
            </div>
        );
    }

    return (
        <div className="p-4 pb-24 max-w-2xl mx-auto">
            <header className="mb-6 flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur-sm py-3 z-20">
                <div>
                    <h1 className="text-2xl font-bold">Trip History</h1>
                    <p className="text-muted-foreground text-sm">Your tracking sessions</p>
                </div>
                <button
                    onClick={onRefresh}
                    className="p-2.5 rounded-full hover:bg-secondary transition-colors border"
                    disabled={isRefreshing}
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </header>

            <div className="space-y-4">
                {sessions.map((session) => (
                    <SessionCard key={session.session_id} session={session} />
                ))}

                {sessions.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                            <Route className="w-10 h-10 opacity-30" />
                        </div>
                        <p className="font-medium">No trips yet</p>
                        <p className="text-sm mt-1">Start tracking to see your trip history here</p>
                        <p className="text-xs mt-4 text-muted-foreground">
                            Press the <span className="text-green-500 font-bold">Play</span> button on Dashboard to start a trip
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
