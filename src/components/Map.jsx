import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Map.css';

/**
 * Calculate bearing between two points in degrees.
 */
function getBearing(from, to) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Create a directional arrow DivIcon.
 */
function createArrowIcon(bearing) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="sender-arrow-wrap" style="transform:rotate(${bearing}deg)">
      <svg viewBox="0 0 40 40" width="40" height="40">
        <circle cx="20" cy="20" r="19" fill="rgba(77,166,255,0.15)" />
        <path d="M20 6 L28 30 L20 25 L12 30 Z" fill="#4da6ff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

/**
 * Create a destination pin DivIcon.
 */
function createDestIcon() {
  return L.divIcon({
    className: 'custom-marker',
    html: '<div style="font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))">📍</div>',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

/**
 * Map component using Leaflet + OpenStreetMap (FREE).
 * Shows: sender arrow marker, destination pin, blue route line.
 */
export default function MapView({ senderPos, destinationPos }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const senderRef = useRef(null);
  const destRef = useRef(null);
  const routeRef = useRef(null);
  const glowRef = useRef(null);
  const lastRouteKey = useRef('');
  const hasFitBounds = useRef(false);

  // 1. Initialize map once
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const center = senderPos || destinationPos || { lat: 28.6139, lng: 77.209 };
    const map = L.map(mapElRef.current, {
      center: [center.lat, center.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Immediately draw a straight dashed line as a placeholder
  const drawStraightLine = useCallback(() => {
    const map = mapRef.current;
    if (!map || !senderPos || !destinationPos) return;

    const coords = [
      [senderPos.lat, senderPos.lng],
      [destinationPos.lat, destinationPos.lng],
    ];

    // Only draw if no real route exists
    if (!routeRef.current) {
      if (glowRef.current) map.removeLayer(glowRef.current);
      glowRef.current = L.polyline(coords, {
        color: '#4da6ff',
        weight: 8,
        opacity: 0.1,
        lineJoin: 'round',
      }).addTo(map);

      routeRef.current = L.polyline(coords, {
        color: '#4da6ff',
        weight: 3,
        opacity: 0.6,
        dashArray: '10, 14',
        lineJoin: 'round',
      }).addTo(map);
    }
  }, [senderPos, destinationPos]);

  // 3. Update sender arrow marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !senderPos) return;

    const bearing = destinationPos ? getBearing(senderPos, destinationPos) : 0;
    const icon = createArrowIcon(bearing);
    const latLng = [senderPos.lat, senderPos.lng];

    if (!senderRef.current) {
      senderRef.current = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(map);
    } else {
      senderRef.current.setLatLng(latLng);
      senderRef.current.setIcon(icon);
    }

  }, [senderPos, destinationPos, drawStraightLine]);

  // 4. Update destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !destinationPos) return;

    const latLng = [destinationPos.lat, destinationPos.lng];

    if (!destRef.current) {
      destRef.current = L.marker(latLng, { icon: createDestIcon(), zIndexOffset: 500 }).addTo(map);
    } else {
      destRef.current.setLatLng(latLng);
    }
  }, [destinationPos]);

  // 5. Fetch and draw actual driving route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !senderPos || !destinationPos) return;

    const key = `${senderPos.lat.toFixed(3)},${senderPos.lng.toFixed(3)}-${destinationPos.lat.toFixed(3)},${destinationPos.lng.toFixed(3)}`;
    if (key === lastRouteKey.current) return;
    lastRouteKey.current = key;

    const controller = new AbortController();

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${senderPos.lng},${senderPos.lat};${destinationPos.lng},${destinationPos.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();

        if (data.code === 'Ok' && data.routes?.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);

          // Remove old lines
          if (glowRef.current) { map.removeLayer(glowRef.current); glowRef.current = null; }
          if (routeRef.current) { map.removeLayer(routeRef.current); routeRef.current = null; }

          // Draw glow
          glowRef.current = L.polyline(coords, {
            color: '#4da6ff',
            weight: 10,
            opacity: 0.15,
            lineJoin: 'round',
          }).addTo(map);

          // Draw main route
          routeRef.current = L.polyline(coords, {
            color: '#4da6ff',
            weight: 4,
            opacity: 0.85,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(map);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Route fetch failed:', err);
        }
      }
    };

    // Small delay to avoid spamming
    const timer = setTimeout(fetchRoute, 800);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [senderPos, destinationPos]);

  return (
    <div className="map-container">
      <div ref={mapElRef} className="map-canvas" />
    </div>
  );
}
