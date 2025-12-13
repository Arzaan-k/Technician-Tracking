
import { useEffect, useState } from 'react';
import { Play, Pause, MapPin, Battery, Signal, Clock, AlertTriangle, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import UserMap from '@/components/UserMap';

export default function Dashboard() {
    const { user } = useAuth();
    const { isTracking, startTracking, stopTracking, currentLocation, error, initLocation, trackingStartTime, totalDistance } = useGeolocation();
    const [duration, setDuration] = useState('00:00:00');
    const [isExpanded, setIsExpanded] = useState(false);

    // Initial map location request
    useEffect(() => {
        initLocation();
    }, []);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isTracking && trackingStartTime) {

            interval = setInterval(() => {
                const diff = Date.now() - trackingStartTime;
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setDuration(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            }, 1000);
        } else {
            setDuration('00:00:00');
        }
        return () => clearInterval(interval);
    }, [isTracking, trackingStartTime]);

    const toggleTracking = () => {
        if (isTracking) {
            stopTracking();
        } else {
            startTracking();
        }
    };

    return (
        <div className="relative h-screen w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
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
            <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent text-white">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold drop-shadow-md">Hello, {user?.firstName || 'Tech'}</h1>
                        <p className="text-xs text-white/80 font-medium drop-shadow">{format(new Date(), 'EEEE, d MMM')}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono bg-black/40 px-2 py-1 rounded-full backdrop-blur-md border border-white/10">
                        <div className={cn("flex items-center gap-1", currentLocation?.accuracy ? "text-green-400" : "text-yellow-400")}>
                            <Signal className="w-3 h-3" />
                        </div>
                        <span className="text-white/20">|</span>
                        <div className={cn("flex items-center gap-1", (currentLocation?.batteryLevel || 0) < 20 ? "text-red-400" : "text-white")}>
                            <Battery className="w-3 h-3" />
                            <span className="font-semibold">{currentLocation?.batteryLevel ? `${currentLocation.batteryLevel}%` : '--'}</span>
                        </div>
                    </div>
                </div>
                {error && (
                    <div className="mt-2 bg-red-500/80 backdrop-blur-md text-white text-xs p-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle className="w-3 h-3" />
                        {error}
                    </div>
                )}
            </div>

            {/* Bottom Sheet Control Panel */}
            <div className={cn(
                "absolute bottom-0 left-0 right-0 z-20 bg-background rounded-t-[2rem] shadow-[0_-8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 ease-spring pb-20",
                isExpanded ? "h-[60vh]" : "h-auto"
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
                    <div className="flex items-center justify-between mb-8">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session Time</span>
                            <h2 className={cn("font-mono font-bold text-foreground", isExpanded ? "text-4xl" : "text-3xl")}>{duration}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={cn("w-2 h-2 rounded-full", isTracking ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
                                <span className="text-xs font-medium text-muted-foreground">{isTracking ? "Live Tracking" : "Offline"}</span>
                            </div>
                        </div>

                        <button
                            onClick={toggleTracking}
                            className={cn(
                                "relative flex items-center justify-center transition-all duration-300 shadow-lg group",
                                isExpanded ? "w-20 h-20 rounded-2xl" : "w-16 h-16 rounded-full",
                                isTracking
                                    ? "bg-red-500 hover:bg-red-600 text-white"
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                            )}
                        >
                            {isTracking ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </button>
                    </div>

                    {/* Stats Grid - Always visible mostly or expanded */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-secondary/50 p-4 rounded-2xl flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-medium">Speed</span>
                            </div>
                            <p className="text-xl font-bold text-foreground">
                                {currentLocation?.speed ? Math.round(currentLocation.speed * 3.6) : 0} <span className="text-sm font-normal text-muted-foreground">km/h</span>
                            </p>
                        </div>
                        <div className="bg-secondary/50 p-4 rounded-2xl flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span className="text-xs font-medium">Distance</span>
                            </div>
                            <p className="text-xl font-bold text-foreground">
                                {totalDistance.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">km</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
