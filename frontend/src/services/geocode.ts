// Place search (forward geocoding) via OpenStreetMap's Nominatim service.
//
// Browser geolocation on laptops/desktops has no GPS: it guesses from Wi-Fi or,
// failing that, the IP address — and Nigerian IP addresses routinely resolve to
// Ikeja, Lagos no matter where the user really is. Letting people type their
// town or street is the reliable fallback.
//
// Nominatim usage policy: max ~1 request/second and no autocomplete-on-keystroke.
// We only call it when the user presses Search, which keeps us well inside that.

import type { Geoposition } from '../types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Comma-separated ISO country codes to restrict results to (default: Nigeria).
// Set VITE_GEOCODE_COUNTRIES="" to search worldwide.
const COUNTRY_CODES = (import.meta.env.VITE_GEOCODE_COUNTRIES ?? 'ng').trim();

export interface PlaceResult extends Geoposition {
  label: string;
}

/** Parse "6.88, 3.01" style input so power users can still paste coordinates. */
export function parseCoordinates(input: string): Geoposition | null {
  const m = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  if (!isValidCoordinate(latitude, longitude)) return null;
  return { latitude, longitude };
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '5' });
  if (COUNTRY_CODES) params.set('countrycodes', COUNTRY_CODES);

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json', 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error(`Place search failed (${res.status}).`);

  const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  return rows
    .map((r) => ({
      latitude: Number(r.lat),
      longitude: Number(r.lon),
      label: r.display_name,
    }))
    .filter((r) => isValidCoordinate(r.latitude, r.longitude));
}

/** "Isale Trem, Ilaro, Ogun State, Nigeria" → "Isale Trem, Ilaro" */
export function shortLabel(label: string, parts = 2): string {
  return label.split(',').map((s) => s.trim()).filter(Boolean).slice(0, parts).join(', ');
}

/** 1234 → "1.2 km", 80 → "80 m" */
export function formatDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(metres >= 10000 ? 0 : 1)} km`;
  return `${Math.round(metres)} m`;
}

// Positions less precise than this are treated as a guess, not a fix: we warn
// the user and ask them to confirm by searching or moving the pin.
export const APPROXIMATE_ACCURACY_M = 1000;
