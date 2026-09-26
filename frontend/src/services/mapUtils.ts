import L from 'leaflet';

// Centre of Nigeria — used when we have no position yet so the map still shows
// something the user can tap, instead of a dead "Map unavailable" box.
export const DEFAULT_MAP_CENTER: L.LatLngTuple = [9.082, 8.6753];
export const DEFAULT_MAP_ZOOM = 6;
export const LOCATED_MAP_ZOOM = 14;

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function userLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'user-marker',
    html: '<span class="user-location-marker" aria-hidden="true"></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

/** Escape user-supplied text before it goes into a Leaflet popup (raw HTML). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
