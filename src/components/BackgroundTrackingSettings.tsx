import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MapPin, Battery, Wifi, WifiOff, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface BackgroundTrackingSettingsProps {
    backgroundTrackingEnabled: boolean;
    onEnableBackgroundTracking: () => Promise<boolean>;
    onDisableBackgroundTracking: () => Promise<void>;
    isTracking: boolean;
}

export default function BackgroundTrackingSettings({
    backgroundTrackingEnabled,
    onEnableBackgroundTracking,
    onDisableBackgroundTracking,
    isTracking
}: BackgroundTrackingSettingsProps) {
    const [isEnabling, setIsEnabling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Monitor battery level
    useEffect(() => {
        const updateBattery = async () => {
            try {
                // @ts-ignore
                const battery = await navigator.getBattery?.();
                if (battery) {
                    setBatteryLevel(Math.round(battery.level * 100));
                    battery.addEventListener('levelchange', () => {
                        setBatteryLevel(Math.round(battery.level * 100));
                    });
                }
            } catch {
                // Battery API not supported
            }
        };

        updateBattery();
    }, []);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleToggle = async (enabled: boolean) => {
        setError(null);
        setIsEnabling(true);

        try {
            if (enabled) {
                const success = await onEnableBackgroundTracking();
                if (!success) {
                    setError('Failed to enable background tracking. Please check your browser permissions.');
                }
            } else {
                await onDisableBackgroundTracking();
            }
        } catch (err) {
            setError('An error occurred while toggling background tracking.');
        } finally {
            setIsEnabling(false);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-primary" />
                                Background Tracking
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Continue tracking even when the app is closed or minimized
                            </CardDescription>
                        </div>
                        <Switch
                            checked={backgroundTrackingEnabled}
                            onCheckedChange={handleToggle}
                            disabled={isEnabling || !isTracking}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Status Indicators */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                            {isOnline ? (
                                <Wifi className="w-4 h-4 text-green-500" />
                            ) : (
                                <WifiOff className="w-4 h-4 text-red-500" />
                            )}
                            <div>
                                <p className="text-xs text-muted-foreground">Network</p>
                                <p className="text-sm font-medium">
                                    {isOnline ? 'Online' : 'Offline'}
                                </p>
                            </div>
                        </div>

                        {batteryLevel !== null && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                                <Battery className={`w-4 h-4 ${batteryLevel < 20 ? 'text-red-500' : 'text-green-500'
                                    }`} />
                                <div>
                                    <p className="text-xs text-muted-foreground">Battery</p>
                                    <p className="text-sm font-medium">{batteryLevel}%</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        {backgroundTrackingEnabled ? (
                            <Badge variant="default" className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Background Tracking Active
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Background Tracking Disabled
                            </Badge>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Info Alert */}
                    {!isTracking && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Start tracking first to enable background tracking
                            </AlertDescription>
                        </Alert>
                    )}

                    {backgroundTrackingEnabled && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Background tracking is active.</strong> Your location will continue to be tracked even when the app is closed or minimized. Location data will be synced when you're online.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Features List */}
                    <div className="space-y-2 text-sm">
                        <p className="font-medium text-foreground">Features:</p>
                        <ul className="space-y-1 text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Tracks location when app is minimized or closed</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Automatically syncs data when online</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Stores location data offline for later sync</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Battery-efficient location updates</span>
                            </li>
                        </ul>
                    </div>

                    {/* Battery Warning */}
                    {batteryLevel !== null && batteryLevel < 20 && backgroundTrackingEnabled && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Low battery detected.</strong> Background tracking may be limited to preserve battery life.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Technical Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">How it works</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                        Background tracking uses Service Workers and the Background Sync API to continue tracking your location even when the app is not actively open.
                    </p>
                    <p>
                        Location updates are stored locally and automatically synced to the server when you have an internet connection.
                    </p>
                    <p className="text-xs">
                        <strong>Note:</strong> This feature requires browser support for Service Workers and may not work on all devices or browsers.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
