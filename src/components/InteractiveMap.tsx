import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in React-Leaflet
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  description?: string;
}

interface InteractiveMapProps {
  locations: Location[];
  onPinClick: (location: Location) => void;
  center?: [number, number];
  zoom?: number;
  darkMode?: boolean;
}

// Component to handle map center updates
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ 
  locations, 
  onPinClick, 
  center = [18.9712, -72.2852], // Center of Haiti
  zoom = 8,
  darkMode = false
}) => {
  return (
    <div className="w-full h-[600px] rounded-[2.5rem] overflow-hidden border border-border-primary shadow-xl relative z-0">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <ChangeView center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={darkMode 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          }
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={darkMode ? 0.2 : 0.3}
        />
        {locations.map((loc) => (
          <Marker 
            key={loc.id} 
            position={[loc.lat, loc.lng]}
            eventHandlers={{
              click: () => onPinClick(loc),
            }}
          >
            <Popup className="custom-popup">
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-lg mb-1 text-text-primary">{loc.name}</h3>
                <p className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-2">{loc.category}</p>
                {loc.description && <p className="text-sm text-text-secondary mb-3 leading-relaxed">{loc.description}</p>}
                <button 
                  onClick={() => onPinClick(loc)}
                  className="w-full py-3 bg-[#5A5A40] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-all shadow-md"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-popup-content-wrapper {
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          border-radius: 1.5rem;
          padding: 0.5rem;
          border: 1px solid var(--border-primary);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .leaflet-popup-tip {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-primary);
        }
        .leaflet-container {
          background-color: var(--bg-primary);
        }
      `}} />
    </div>
  );
};

export default InteractiveMap;
