
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Creating a custom pulse icon for the user location
const createUserIcon = (heading: number | null) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `
            <div class="relative flex items-center justify-center w-8 h-8">
                <div class="absolute w-full h-full bg-blue-500/30 rounded-full animate-ping"></div>
                <div class="absolute w-full h-full bg-white rounded-full border-2 border-blue-500 shadow-lg flex items-center justify-center">
                    <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
                ${heading !== null ? `
                <div class="absolute w-full h-full flex items-center justify-center" style="transform: rotate(${heading}deg);">
                     <div class="w-0 h-0 border-l-[4px] border-l-transparent border-b-[8px] border-b-blue-600 border-r-[4px] border-r-transparent -mt-5"></div>
                </div>
                ` : ''}
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
};

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 16, {
            duration: 1.5
        });
    }, [center, map]);
    return null;
}

interface MapProps {
    latitude: number;
    longitude: number;
    heading?: number | null;
}

export default function UserMap({ latitude, longitude, heading = null }: MapProps) {
    // Default to some location/user loc logic if 0,0 provided, but usually we pass valid coords

    return (
        <MapContainer
            center={[latitude, longitude]}
            zoom={15}
            scrollWheelZoom={true}
            zoomControl={false}
            className="w-full h-full relative z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <Marker position={[latitude, longitude]} icon={createUserIcon(heading)}>
                <Popup>
                    You are here
                </Popup>
            </Marker>
            <MapUpdater center={[latitude, longitude]} />
        </MapContainer>
    );
}
