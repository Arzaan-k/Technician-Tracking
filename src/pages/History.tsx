import { useEffect, useState } from 'react';
import { location } from '@/lib/api';
import { format } from 'date-fns';
import { MapPin, Clock, RefreshCw, Navigation } from 'lucide-react';

export default function History() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchHistory = async () => {
        try {
            const { data } = await location.getHistory();
            setLogs(data);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const onRefresh = () => {
        setIsRefreshing(true);
        fetchHistory();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 pb-24">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">History</h1>
                    <p className="text-muted-foreground text-sm">Recent location updates</p>
                </div>
                <button
                    onClick={onRefresh}
                    className="p-2 rounded-full hover:bg-secondary transition-colors"
                    disabled={isRefreshing}
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </header>

            <div className="space-y-8">
                {Object.entries(
                    logs.reduce((groups: any, log) => {
                        const date = new Date(log.timestamp);
                        if (isNaN(date.getTime())) return groups;
                        const dateKey = format(date, 'EEEE, MMMM d, yyyy');
                        if (!groups[dateKey]) groups[dateKey] = [];
                        groups[dateKey].push(log);
                        return groups;
                    }, {})
                ).map(([date, dayLogs]: [string, any]) => (
                    <div key={date} className="relative">
                        <h3 className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10 font-bold text-lg text-foreground border-b mb-4">
                            {date}
                        </h3>
                        <div className="space-y-6 relative pl-4 border-l-2 border-muted ml-2">
                            {dayLogs.map((log: any) => {
                                const lat = Number(log.latitude);
                                const long = Number(log.longitude);
                                const date = new Date(log.timestamp);
                                const speedKm = log.speed ? Math.round(Number(log.speed) * 3.6) : 0;
                                const isMoving = speedKm > 1;

                                return (
                                    <div key={log.id} className="relative bg-card border border-border rounded-xl p-4 shadow-sm transition-all hover:shadow-md">
                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[25px] top-6 w-4 h-4 rounded-full border-2 border-background bg-primary"></div>

                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg ${isMoving ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                                <span className="font-mono font-medium text-lg">
                                                    {format(date, 'p')}
                                                </span>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${isMoving ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                {isMoving ? 'MOVING' : 'STATIONARY'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="space-y-1">
                                                <p className="text-muted-foreground text-xs uppercase tracking-wider">Coordinates</p>
                                                <div className="flex items-center gap-1.5 font-mono text-foreground">
                                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                                    {lat.toFixed(5)}, {long.toFixed(5)}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-muted-foreground text-xs uppercase tracking-wider">Speed</p>
                                                <div className="flex items-center gap-1.5 font-mono text-foreground">
                                                    <Navigation className="w-3.5 h-3.5 text-blue-500" />
                                                    {speedKm} km/h
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-muted-foreground text-xs uppercase tracking-wider">Accuracy</p>
                                                <div className="flex items-center gap-1.5 font-mono text-foreground">
                                                    <RefreshCw className="w-3.5 h-3.5 text-purple-500" /> {/* Reusing icon or import Crosshair */}
                                                    ± {Math.round(log.accuracy || 0)}m
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-muted-foreground text-xs uppercase tracking-wider">Device Status</p>
                                                <div className="flex items-center gap-3">
                                                    {log.battery_level !== null && (
                                                        <div className="flex items-center gap-1 font-mono text-foreground">
                                                            {/* Simple colored text for battery */}
                                                            <span className={Number(log.battery_level) < 20 ? "text-red-500" : "text-green-500"}>
                                                                {log.battery_level}%
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">BAT</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer Metadata */}
                                        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground uppercase font-medium">
                                            <span>Heading: {log.heading ? Math.round(log.heading) + '°' : 'N/A'}</span>
                                            <span>Sync: {log.network_status || 'OK'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {logs.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No location history found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
