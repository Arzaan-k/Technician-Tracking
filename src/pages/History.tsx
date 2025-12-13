import { useEffect, useState } from 'react';
import { location } from '@/lib/api';
import { format } from 'date-fns';
import { MapPin, Clock, RefreshCw } from 'lucide-react';

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

            <div className="space-y-4">
                {Array.isArray(logs) && logs.map((log) => {
                    // Safe parsing
                    const lat = Number(log.latitude);
                    const long = Number(log.longitude);
                    const date = new Date(log.timestamp);
                    const isValidDate = !isNaN(date.getTime());

                    return (
                        <div key={log.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-start shadow-sm">
                            <div className="flex gap-3">
                                <div className="mt-1 bg-primary/10 p-2 rounded-full text-primary">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Location Update</p>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3" />
                                        {isValidDate ? format(date, 'PP p') : 'Invalid Date'}
                                    </div>
                                    {log.speed !== null && (
                                        <p className="text-xs mt-1 text-muted-foreground">
                                            Speed: {Math.round(Number(log.speed) * 3.6)} km/h
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-mono text-muted-foreground block">
                                    {!isNaN(lat) ? lat.toFixed(4) : '?'}, {!isNaN(long) ? long.toFixed(4) : '?'}
                                </span>
                                <span className="inline-block mt-2 px-2 py-0.5 bg-secondary text-[10px] rounded-full text-muted-foreground">
                                    {log.network_status || 'Synced'}
                                </span>
                            </div>
                        </div>
                    );
                })}

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
