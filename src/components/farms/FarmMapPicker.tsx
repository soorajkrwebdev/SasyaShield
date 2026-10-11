import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Crosshair } from 'lucide-react';

// Fix leaflet default marker icons in Vite/bundler environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface FarmMapPickerProps {
  latitude?: number;
  longitude?: number;
  onChange: (lat: number, lng: number) => void;
}

export const FarmMapPicker: React.FC<FarmMapPickerProps> = ({
  latitude,
  longitude,
  onChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [detecting, setDetecting] = useState(false);

  const initialLat = latitude ?? 13.6937;
  const initialLng = longitude ?? 75.2415;

  // Capture initial values in refs so the map init effect runs only once
  // (on mount) regardless of parent re-renders.
  const initialLatRef = useRef(initialLat);
  const initialLngRef = useRef(initialLng);
  const onChangeRef   = useRef(onChange);
  // Keep onChangeRef current without triggering a re-init
  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const lat = initialLatRef.current;
    const lng = initialLngRef.current;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng], {
      draggable: true,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onChangeRef.current(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onChangeRef.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update marker position if external lat/lng changes
  useEffect(() => {
    if (latitude && longitude && markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.panTo([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetecting(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onChange(lat, lng);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 14);
          markerRef.current.setLatLng([lat, lng]);
        }
      },
      (err) => {
        setDetecting(false);
        console.warn('Geolocation error:', err.message);
        alert('Could not retrieve location. Please click on the map to set coordinates.');
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
          Pinpoint Farm Location on Map
        </label>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={detecting}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>{detecting ? 'Detecting...' : 'Use My GPS Location'}</span>
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xs h-56 w-full">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
      <p className="text-[11px] text-slate-500 flex items-center gap-1">
        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>Click on the map or drag the pin to set the exact farm coordinates for weather intelligence.</span>
      </p>
    </div>
  );
};
