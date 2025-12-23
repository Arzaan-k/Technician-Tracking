import { useEffect, useState, useCallback } from 'react';
import { Play, Pause, MapPin, Battery, Signal, Clock, AlertTriangle, Navigation, Building, Map, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocationWithBackground';
import UserMap from '@/components/UserMap';
import BackgroundTrackingSettings from '@/components/BackgroundTrackingSettings';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// Reverse geocode using OpenStreetMap Nominatim
async function reverseGeocode(lat: number, lon: number): Promise<{ short: string; full: string }> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'Accept-Language': 'en',
                    'User-Agent': 'TechnicianTrackingApp/1.0'
                }
            }
        );

        if (!response.ok) throw new Error('Geocoding failed');

        const data = await response.json();
        const addr = data.address || {};

        // Short address (area/neighborhood)
        const shortParts: string[] = [];
        if (addr.road) shortParts.push(addr.road);
        if (addr.neighbourhood || addr.suburb) {
            shortParts.push(addr.neighbourhood || addr.suburb);
        }
        const short = shortParts.length > 0 ? shortParts.join(', ') : 'Current Location';

        // Full detailed address
        const fullParts: string[] = [];
        if (addr.building || addr.amenity) fullParts.push(addr.building || addr.amenity);
        if (addr.house_number && addr.road) {
            fullParts.push(`${addr.house_number} ${addr.road}`);
        } else if (addr.road) {
            fullParts.push(addr.road);
        }
        if (addr.neighbourhood || addr.suburb || addr.quarter) {
            fullParts.push(addr.neighbourhood || addr.suburb || addr.quarter);
        }
        if (addr.city || addr.town || addr.village) {
            fullParts.push(addr.city || addr.town || addr.village);
        }
        if (addr.state_district || addr.state) {
            fullParts.push(addr.state_district || addr.state);
        }
        if (addr.postcode) {
            fullParts.push(addr.postcode);
        }

        const full = fullParts.length > 0 ? fullParts.join(', ') : data.display_name || 'Unknown location';

        return { short, full };
    } catch (error) {
        return { short: 'Location unavailable', full: 'Unable to determine address' };
    }
}

export default function Dashboard() {
    const { user } = useAuth();
    const {
        isTracking,
        startTracking,
        stopTracking,
        currentLocation,
        error,
        initLocation,
        trackingStartTime,
        totalDistance,
        backgroundTrackingEnabled,
        enableBackgroundTracking,
        disableBackgroundTracking
    } = useGeolocation();

    const [duration, setDuration] = useState('00:00:00');
    const [isExpanded, setIsExpanded] = useState(false);
    const [address, setAddress] = useState<{ short: string; full: string } | null>(null);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Get initial location for map display
    useEffect(() => {
        initLocation();
    }, [initLocation]);

    // Fetch address when location changes
    const fetchAddress = useCallback(async () => {
        if (!currentLocation) return;

        setIsLoadingAddress(true);
        const result = await reverseGeocode(currentLocation.latitude, currentLocation.longitude);
        setAddress(result);
        setIsLoadingAddress(false);
    }, [currentLocation?.latitude, currentLocation?.longitude]);

    useEffect(() => {
        // Debounce address fetching - only fetch when location changes significantly
        const timer = setTimeout(() => {
            if (currentLocation) {
                fetchAddress();
            }
        }, 2000); // Wait 2 seconds after location change

        return () => clearTimeout(timer);
    }, [currentLocation?.latitude?.toFixed(4), currentLocation?.longitude?.toFixed(4)]);

    // Update duration timer
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (isTracking && trackingStartTime) {
            const updateDuration = () => {
                const diff = Date.now() - trackingStartTime;
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setDuration(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            };

            updateDuration();
            interval = setInterval(updateDuration, 1000);
        } else {
            setDuration('00:00:00');
        }

        return () => clearInterval(interval);
    }, [isTracking, trackingStartTime]);

    const toggleTracking = async () => {
        if (isTracking) {
            await stopTracking();
        } else {
            await startTracking();
        }
    };

    return (
        <div className="relative h-full w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
            {/* Full Screen Map */}
            <div className="absolute inset-0 z-0">
                {currentLocation ? (
                    <UserMap
                        latitude={currentLocation.latitude}
                        longitude={currentLocation.longitude}
                        heading={currentLocation.heading}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-slate-200 dark:bg-slate-800 text-muted-foreground">
                        <Navigation className="w-12 h-12 mb-4 animate-bounce text-primary/50" />
                        <p>Locating you...</p>
                    </div>
                )}
            </div>

            {/* Top Bar Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-6 bg-gradient-to-b from-black/70 to-transparent text-white">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold drop-shadow-md">
                            Hello, {user?.firstName || 'Tech'}
                        </h1>
                        <p className="text-xs text-white/80 font-medium drop-shadow">
                            {format(new Date(), 'EEEE, d MMM')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-mono bg-black/40 px-2 py-1 rounded-full backdrop-blur-md border border-white/10">
                            <div className={cn(
                                "flex items-center gap-1",
                                currentLocation?.accuracy && currentLocation.accuracy < 30
                                    ? "text-green-400"
                                    : "text-yellow-400"
                            )}>
                                <Signal className="w-3 h-3" />
                            </div>
                            <span className="text-white/20">|</span>
                            <div className={cn(
                                "flex items-center gap-1",
                                (currentLocation?.batteryLevel || 100) < 20
                                    ? "text-red-400"
                                    : "text-white"
                            )}>
                                <Battery className="w-3 h-3" />
                                <span className="font-semibold">
                                    {currentLocation?.batteryLevel ? `${currentLocation.batteryLevel}%` : '--'}
                                </span>
                            </div>
                        </div>

                        {/* Settings Button */}
                        <Dialog open={showSettings} onOpenChange={setShowSettings}>
                            <DialogTrigger asChild>
                                <button className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 transition-colors">
                                    <Settings className="w-4 h-4 text-white" />
                                </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Tracking Settings</DialogTitle>
                                    <DialogDescription>
                                        Configure background tracking and other options
                                    </DialogDescription>
                                </DialogHeader>
                                <BackgroundTrackingSettings
                                    backgroundTrackingEnabled={backgroundTrackingEnabled}
                                    onEnableBackgroundTracking={enableBackgroundTracking}
                                    onDisableBackgroundTracking={disableBackgroundTracking}
                                    isTracking={isTracking}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Current Location Address Card */}
                {currentLocation && (
                    <div className="mt-3 bg-black/40 backdrop-blur-md rounded-xl p-3 border border-white/10">
                        <div className="flex items-start gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/20">
                                <Building className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Current Location</p>
                                {isLoadingAddress ? (
                                    <div className="animate-pulse bg-white/20 h-4 w-32 rounded mt-1"></div>
                                ) : (
                                    <p className="text-sm font-medium text-white truncate">
                                        {address?.short || 'Determining location...'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="mt-2 bg-red-500/80 backdrop-blur-md text-white text-xs p-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{error}</span>
                    </div>
                )}

                {/* Background Tracking Indicator */}
                {backgroundTrackingEnabled && (
                    <div className="mt-2 bg-green-500/80 backdrop-blur-md text-white text-xs p-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <MapPin className="w-3 h-3 flex-shrink-0 animate-pulse" />
                        <span className="truncate">Background tracking active</span>
                    </div>
                )}
            </div>

            {/* Bottom Sheet Control Panel */}
            <div className={cn(
                "absolute bottom-0 left-0 right-0 z-20 bg-background rounded-t-[2rem] shadow-[0_-8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 ease-spring pb-20",
                isExpanded ? "h-[70vh]" : "h-auto"
            )}>
                {/* Drag Handle */}
                <div
                    className="w-full h-8 flex items-center justify-center cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="w-12 h-1.5 bg-muted rounded-full" />
                </div>

                <div className="px-6 pb-6">
                    {/* Primary Action Area */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Session Time
                            </span>
                            <h2 className={cn(
                                "font-mono font-bold text-foreground",
                                isExpanded ? "text-4xl" : "text-3xl"
                            )}>
                                {duration}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={cn(
                                    "w-2 h-2 rounded-full transition-colors",
                                    isTracking
                                        ? "bg-green-500 animate-pulse"
                                        : "bg-gray-300 dark:bg-gray-600"
                                )} />
                                <span className="text-xs font-medium text-muted-foreground">
                                    {isTracking ? "Live Tracking" : "Offline"}
                                </span>
                            </div>
                        </div>

                        {/* Track Button */}
                        <button
                            onClick={toggleTracking}
                            className={cn(
                                "relative flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95",
                                isExpanded ? "w-20 h-20 rounded-2xl" : "w-16 h-16 rounded-full",
                                isTracking
                                    ? "bg-red-500 hover:bg-red-600 text-white"
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                            )}
                        >
                            {isTracking
                                ? <Pause className="w-8 h-8 fill-current" />
                                : <Play className="w-8 h-8 fill-current ml-1" />
                            }
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-secondary/50 p-4 rounded-2xl flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-medium">Speed</span>
                            </div>
                            <p className="text-xl font-bold text-foreground">
                                {currentLocation?.speed
                                    ? Math.round(currentLocation.speed * 3.6)
                                    : 0
                                }
                                <span className="text-sm font-normal text-muted-foreground"> km/h</span>
                            </p>
                        </div>
                        <div className="bg-secondary/50 p-4 rounded-2xl flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span className="text-xs font-medium">Distance</span>
                            </div>
                            <p className="text-xl font-bold text-foreground">
                                {totalDistance.toFixed(2)}
                                <span className="text-sm font-normal text-muted-foreground"> km</span>
                            </p>
                        </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && currentLocation && (
                        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 overflow-auto max-h-[40vh]">
                            {/* Full Address Card */}
                            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-2xl border border-primary/20">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-xl bg-primary/20">
                                        <Building className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Full Address</h3>
                                        {isLoadingAddress ? (
                                            <div className="space-y-2">
                                                <div className="animate-pulse bg-muted h-4 w-full rounded"></div>
                                                <div className="animate-pulse bg-muted h-4 w-3/4 rounded"></div>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-medium text-foreground leading-relaxed">
                                                {address?.full || 'Determining address...'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Coordinates Card */}
                            <div className="bg-secondary/30 p-4 rounded-2xl">
                                <div className="flex items-center gap-2 mb-3">
                                    <Map className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold">GPS Coordinates</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-background/50 p-3 rounded-xl">
                                        <span className="text-muted-foreground text-xs block mb-1">Latitude</span>
                                        <p className="font-mono font-medium">{currentLocation.latitude.toFixed(6)}°</p>
                                    </div>
                                    <div className="bg-background/50 p-3 rounded-xl">
                                        <span className="text-muted-foreground text-xs block mb-1">Longitude</span>
                                        <p className="font-mono font-medium">{currentLocation.longitude.toFixed(6)}°</p>
                                    </div>
                                    <div className="bg-background/50 p-3 rounded-xl">
                                        <span className="text-muted-foreground text-xs block mb-1">Accuracy</span>
                                        <p className="font-mono font-medium">±{Math.round(currentLocation.accuracy)}m</p>
                                    </div>
                                    <div className="bg-background/50 p-3 rounded-xl">
                                        <span className="text-muted-foreground text-xs block mb-1">Heading</span>
                                        <p className="font-mono font-medium">
                                            {currentLocation.heading ? `${Math.round(currentLocation.heading)}°` : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Open in Maps Button */}
                                <a
                                    href={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
                                >
                                    <Map className="w-4 h-4" />
                                    Open in Google Maps
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
