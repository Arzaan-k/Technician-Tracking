
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/lib/api';
import { Activity, Battery, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Create a custom icon for technicians
const createTechIcon = (initials: string, status: 'online' | 'offline') => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `
            <div class="relative flex items-center justify-center w-10 h-10">
                <div class="absolute w-full h-full ${status === 'online' ? 'bg-green-500' : 'bg-gray-500'} opacity-20 rounded-full ${status === 'online' ? 'animate-ping' : ''}"></div>
                <div class="absolute w-full h-full bg-white rounded-full border-2 ${status === 'online' ? 'border-green-500' : 'border-gray-400'} shadow-lg flex items-center justify-center font-bold text-xs text-gray-700">
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
    name: string;
    email: string;
    position: [number, number]; // [lat, lng]
    heading: number;
    speed: number;
    battery: number;
    lastSeen: string;
    status: 'online' | 'offline';
}

export default function AdminMap() {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTechnicians = async () => {
        try {
            const { data } = await api.get('/admin/live-map');
            setTechnicians(data);
        } catch (error) {
            console.error('Failed to fetch technicians', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTechnicians();
        const interval = setInterval(fetchTechnicians, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    if (isLoading && technicians.length === 0) {
        return <div className="flex items-center justify-center h-screen">Loading Map...</div>;
    }

    return (
        <div className="h-screen w-full relative">
            <MapContainer
                center={[20.5937, 78.9629]} // Default to India center, or adjust dynamically
                zoom={5}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {technicians.map((tech) => {
                    const initials = tech.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                    return (
                        <Marker
                            key={tech.id}
                            position={tech.position}
                            icon={createTechIcon(initials, tech.status)}
                        >
                            <Popup className="tech-popup">
                                <div className="p-2 min-w-[200px]">
                                    <div className="flex items-center gap-3 mb-2 border-b pb-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {initials}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm">{tech.name}</h3>
                                            <p className="text-[10px] text-muted-foreground">{tech.email}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Activity className="w-3 h-3 text-blue-500" />
                                            <span>{tech.speed} km/h</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Battery className={`w-3 h-3 ${tech.battery < 20 ? 'text-red-500' : 'text-green-500'}`} />
                                            <span>{tech.battery}%</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                                            <Navigation className="w-3 h-3" style={{ transform: `rotate(${tech.heading}deg)` }} />
                                            <span>Heading {Math.round(tech.heading)}°</span>
                                        </div>
                                    </div>

                                    <div className="text-[10px] text-right font-medium text-muted-foreground mt-1">
                                        Last seen {formatDistanceToNow(new Date(tech.lastSeen))} ago
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Overlay Stats */}
            <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-sm font-bold mb-2">Live Fleet Status</h3>
                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="font-medium text-green-700">Online: {technicians.filter(t => t.status === 'online').length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        <span className="font-medium text-gray-600">Offline: {technicians.filter(t => t.status === 'offline').length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
