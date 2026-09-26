import { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from '../services/mapUtils';
import { isValidCoordinate } from '../services/geocode';

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  /** Error radius in metres; drawn as a circle so users can see a rough fix. */
  accuracy?: number;
  onChange: (latitude: number, longitude: number) => void;
  className?: string;
}

/**
 * Small map with a draggable pin. Tap anywhere to drop the pin there, or drag
 * it. Used wherever an artisan's business location is set so a bad GPS/IP
 * guess can be corrected by eye instead of by typing coordinates.
 */
export default function LocationPickerMap({
  latitude,
  longitude,
  accuracy,
  onChange,
  className = 'h-[260px]',
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      scrollWheelZoom: false,
    });
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => onChangeRef.current(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    const t = window.setTimeout(() => map.invalidateSize(), 200);
    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  // Keep the pin (and accuracy circle) in sync with the props.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const hasPoint =
      latitude !== null && longitude !== null && isValidCoordinate(latitude, longitude);

    if (!hasPoint) {
      markerRef.current?.remove();
      markerRef.current = null;
      circleRef.current?.remove();
      circleRef.current = null;
      return;
    }

    const point: L.LatLngTuple = [latitude, longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(point);
    } else {
      const marker = L.marker(point, { draggable: true, autoPan: true }).addTo(map);
      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        onChangeRef.current(ll.lat, ll.lng);
      });
      markerRef.current = marker;
    }

    circleRef.current?.remove();
    circleRef.current = null;
    if (accuracy && accuracy > 30) {
      circleRef.current = L.circle(point, {
        radius: accuracy,
        color: '#0e6570',
        weight: 1,
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(map);
    }

    map.setView(point, Math.max(map.getZoom(), 15));
  }, [latitude, longitude, accuracy]);

  return <div ref={containerRef} className={`map-container w-full ${className}`} />;
}
