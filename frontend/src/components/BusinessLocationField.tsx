import { useState } from 'react';
import { AlertCircle, MapPin, Navigation, Search } from 'lucide-react';
import LocationPickerMap from './LocationPickerMap';
import { getBestPosition } from '../services/locate';
import {
  APPROXIMATE_ACCURACY_M,
  formatDistance,
  isValidCoordinate,
  searchPlaces,
  type PlaceResult,
} from '../services/geocode';

interface BusinessLocationFieldProps {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
  /** The typed business address, used by "Find my address on the map". */
  address: string;
}

/**
 * Where an artisan's pin goes decides who finds them, so this gives three ways
 * to set it and a map to check the result:
 *   1. device location (with a warning when it's only a rough guess),
 *   2. look up the typed address,
 *   3. tap / drag the pin on the map.
 * The lat/lng inputs stay editable — they used to lock once filled, so a bad
 * GPS/IP fix could not be corrected.
 */
export default function BusinessLocationField({
  latitude,
  longitude,
  onChange,
  address,
}: BusinessLocationFieldProps) {
  const [locating, setLocating] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined);
  const [message, setMessage] = useState<{ tone: 'warn' | 'error' | 'ok'; text: string } | null>(null);
  const [matches, setMatches] = useState<PlaceResult[]>([]);

  const lat = latitude === '' ? NaN : Number(latitude);
  const lng = longitude === '' ? NaN : Number(longitude);
  const hasPoint = isValidCoordinate(lat, lng);

  const set = (la: number, ln: number, acc?: number) => {
    onChange(la.toFixed(6), ln.toFixed(6));
    setAccuracy(acc);
  };

  const handleDeviceLocation = async () => {
    setLocating(true);
    setMessage(null);
    setMatches([]);
    try {
      const pos = await getBestPosition();
      set(pos.latitude, pos.longitude, pos.accuracy);
      if (pos.accuracy !== undefined && pos.accuracy > APPROXIMATE_ACCURACY_M) {
        setMessage({
          tone: 'warn',
          text: `This is only a rough guess (± ${formatDistance(pos.accuracy)}) — computers without GPS often show the wrong town. Check the pin and drag it to your shop, or use "Find my address on the map".`,
        });
      } else {
        setMessage({ tone: 'ok', text: 'Location found. Check the pin is on your shop — drag it if not.' });
      }
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message });
    } finally {
      setLocating(false);
    }
  };

  const handleAddressLookup = async () => {
    if (!address.trim()) {
      setMessage({ tone: 'error', text: 'Type your business address first.' });
      return;
    }
    setLookingUp(true);
    setMessage(null);
    setMatches([]);
    try {
      // Full address first; if that's too specific for OpenStreetMap, retry with
      // just the last parts (town, state) so there's at least an area to refine.
      let results = await searchPlaces(address);
      if (results.length === 0) {
        const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
        if (parts.length > 1) results = await searchPlaces(parts.slice(-2).join(', '));
      }
      if (results.length === 0) {
        setMessage({ tone: 'error', text: "Couldn't find that address. Tap the map where your shop is instead." });
      } else if (results.length === 1) {
        set(results[0].latitude, results[0].longitude);
        setMessage({ tone: 'ok', text: `Found: ${results[0].label}. Drag the pin to your exact spot if needed.` });
      } else {
        setMatches(results);
      }
    } catch {
      setMessage({ tone: 'error', text: 'Address lookup is unavailable right now. Tap the map where your shop is instead.' });
    } finally {
      setLookingUp(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="block text-sm font-medium text-charcoal/80">
          Business location on the map <span className="text-red-500">*</span>
        </span>
        {hasPoint && (
          <span className="text-xs text-charcoal/55">
            {lat.toFixed(5)}, {lng.toFixed(5)}
            {accuracy !== undefined && ` (± ${formatDistance(accuracy)})`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          className="btn-glass inline-flex items-center gap-2 justify-center disabled:opacity-50"
          onClick={handleDeviceLocation}
          disabled={locating}
        >
          {locating ? <span className="spinner !w-4 !h-4 !border-2" /> : <Navigation className="w-4 h-4" />}
          {locating ? 'Getting location…' : 'Use my current location'}
        </button>
        <button
          type="button"
          className="btn-glass inline-flex items-center gap-2 justify-center disabled:opacity-50"
          onClick={handleAddressLookup}
          disabled={lookingUp}
        >
          {lookingUp ? <span className="spinner !w-4 !h-4 !border-2" /> : <Search className="w-4 h-4" />}
          Find my address on the map
        </button>
      </div>

      {message && (
        <p
          className={`flex items-start gap-2 text-sm ${
            message.tone === 'error' ? 'text-red-700' : message.tone === 'warn' ? 'text-clay' : 'text-leaf'
          }`}
          role="status"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {message.text}
        </p>
      )}

      {matches.length > 0 && (
        <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10 bg-surface">
          {matches.map((m) => (
            <li key={`${m.latitude},${m.longitude}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-charcoal/80 hover:bg-surface-muted"
                onClick={() => {
                  set(m.latitude, m.longitude);
                  setMatches([]);
                  setMessage({ tone: 'ok', text: 'Pin placed. Drag it to your exact spot if needed.' });
                }}
              >
                <MapPin className="inline w-3.5 h-3.5 mr-1.5 text-brand" aria-hidden="true" />
                {m.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <LocationPickerMap
        latitude={hasPoint ? lat : null}
        longitude={hasPoint ? lng : null}
        accuracy={accuracy}
        onChange={(la, ln) => set(la, ln)}
      />
      <p className="text-xs text-charcoal/55">
        Tap the map or drag the pin to your exact shop. Customers are matched to you by this pin, not by the address text.
      </p>

      <details className="text-sm">
        <summary className="cursor-pointer text-charcoal/60">Enter coordinates manually</summary>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="latitude" className="block text-xs font-medium text-charcoal/70 mb-1">Latitude</label>
            <input
              id="latitude"
              type="number"
              step="any"
              className="glass-input"
              placeholder="6.8875"
              value={latitude}
              onChange={(e) => { onChange(e.target.value, longitude); setAccuracy(undefined); }}
            />
          </div>
          <div>
            <label htmlFor="longitude" className="block text-xs font-medium text-charcoal/70 mb-1">Longitude</label>
            <input
              id="longitude"
              type="number"
              step="any"
              className="glass-input"
              placeholder="3.0120"
              value={longitude}
              onChange={(e) => { onChange(latitude, e.target.value); setAccuracy(undefined); }}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
