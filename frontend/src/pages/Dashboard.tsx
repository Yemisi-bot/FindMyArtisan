import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  List,
  Map as MapIcon,
  SlidersHorizontal,
  Search,
  RefreshCw,
  AlertCircle,
  Navigation,
  History,
  Star,
  Phone,
  CircleCheck,
} from 'lucide-react';
import L from 'leaflet';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../hooks/useAuth';
import { providersApi } from '../services/api';
import {
  APPROXIMATE_ACCURACY_M,
  formatDistance,
  isValidCoordinate,
  parseCoordinates,
  searchPlaces,
  shortLabel,
  type PlaceResult,
} from '../services/geocode';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  LOCATED_MAP_ZOOM,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  escapeHtml,
  userLocationIcon,
} from '../services/mapUtils';
import ProviderCard from '../components/ProviderCard';
import TradeIcon from '../components/TradeIcon';
import type { ServiceProvider, ServiceCategory, Geoposition } from '../types';

interface RecentSearch {
  id: string;
  category_slug?: string;
  search_term?: string;
  created_at: string;
}

interface ContactedArtisan {
  id: string;
  business_name: string;
  category_name: string;
  category_icon: string;
  average_rating: string | number;
  review_count: number;
  contacted_at: string;
  my_review_id: string | null;
}

const RADIUS_OPTIONS = [
  { value: 1, label: '1 km' },
  { value: 3, label: '3 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
];

// The location the user picked by searching / tapping the map is remembered in
// this browser, so a laptop whose GPS guess is wrong doesn't have to be
// corrected on every visit. "Use My Location" clears it.
const SAVED_LOCATION_KEY = 'fma.searchLocation';

function loadSavedLocation(): Geoposition | null {
  try {
    const raw = window.localStorage.getItem(SAVED_LOCATION_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Geoposition;
    return isValidCoordinate(Number(v.latitude), Number(v.longitude))
      ? { latitude: Number(v.latitude), longitude: Number(v.longitude), label: v.label }
      : null;
  } catch {
    return null;
  }
}

function saveLocation(pos: Geoposition | null) {
  try {
    if (pos) window.localStorage.setItem(SAVED_LOCATION_KEY, JSON.stringify(pos));
    else window.localStorage.removeItem(SAVED_LOCATION_KEY);
  } catch {
    // Storage unavailable (private mode etc.) — the choice just won't persist.
  }
}

export default function Dashboard() {
  const {
    position,
    error: geoError,
    isLoading: geoLoading,
    isRefining: geoRefining,
    isBlocked: geoBlocked,
    requestLocation,
  } = useGeolocation();
  const { isAuthenticated } = useAuth();

  // Provider data
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [radius, setRadius] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Free-text search (debounced) + personal history
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [contacted, setContacted] = useState<ContactedArtisan[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Fetch personal history (recent searches + contacted artisans)
  useEffect(() => {
    if (!isAuthenticated) return;
    providersApi.getRecentSearches()
      .then((res) => res.data.success && setRecentSearches((res.data.data as RecentSearch[]) || []))
      .catch(() => undefined);
    providersApi.getContacted()
      .then((res) => res.data.success && setContacted((res.data.data as ContactedArtisan[]) || []))
      .catch(() => undefined);
  }, [isAuthenticated]);

  // View state
  const [mapView, setMapView] = useState(true);

  // A location the user chose themselves (place search, map tap, pin drag).
  // It always wins over the browser's guess — the old code did the opposite,
  // so a wrong GPS/IP fix could never be corrected.
  const [manualPosition, setManualPosition] = useState<Geoposition | null>(() => loadSavedLocation());

  // Place search
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const placeAbortRef = useRef<AbortController | null>(null);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const providerLayerRef = useRef<L.LayerGroup | null>(null);

  const effectivePosition = manualPosition || position;
  const usingManual = !!manualPosition;

  // The browser's fix is a rough guess (IP / cell tower) — tell the user.
  const isApproximate =
    !usingManual && !!position && position.accuracy !== undefined && position.accuracy > APPROXIMATE_ACCURACY_M;

  // Derive location description for subtitle
  const locationStatus = usingManual
    ? manualPosition.label
      ? `Near ${shortLabel(manualPosition.label)}`
      : `Near your pin (${manualPosition.latitude.toFixed(4)}, ${manualPosition.longitude.toFixed(4)})`
    : geoLoading
      ? 'Detecting your location...'
      : position
        ? `Near ${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}` +
          (position.accuracy !== undefined ? ` (± ${formatDistance(position.accuracy)})` : '') +
          (geoRefining ? ' · improving…' : '')
        : geoBlocked
          ? 'Location blocked — search for your area below'
          : geoError
            ? 'Location unavailable — search for your area below'
            : 'Location not set';

  const setChosenLocation = useCallback((pos: Geoposition) => {
    setManualPosition(pos);
    saveLocation(pos);
    setPlaceResults([]);
    setPlaceError(null);
  }, []);

  // Keep a stable ref so Leaflet handlers always call the latest setter.
  const setChosenLocationRef = useRef(setChosenLocation);
  setChosenLocationRef.current = setChosenLocation;

  // ─── Fetch categories on mount ────────────────────────────────────────
  useEffect(() => {
    providersApi
      .getCategories()
      .then((res) => {
        if (res.data.success && res.data.data) {
          setCategories(res.data.data as ServiceCategory[]);
        }
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
      });
  }, []);

  // ─── Fetch nearby providers ───────────────────────────────────────────
  const fetchNearby = useCallback(() => {
    if (!effectivePosition) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    const params: { latitude: number; longitude: number; radius?: number; category?: string; q?: string } = {
      latitude: effectivePosition.latitude,
      longitude: effectivePosition.longitude,
      radius,
    };
    if (selectedCategory) params.category = selectedCategory;
    if (debouncedTerm) params.q = debouncedTerm;

    providersApi
      .getNearby(params)
      .then((res) => {
        if (res.data.success && res.data.data) {
          setProviders(res.data.data as ServiceProvider[]);
        } else {
          setProviders([]);
        }
      })
      .catch((err) => {
        const message =
          err.response?.data?.message || err.message || 'Failed to fetch nearby artisans.';
        setFetchError(message);
        setProviders([]);
      })
      .finally(() => setIsLoading(false));
    // Only re-query when the point actually moves, not on every new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePosition?.latitude, effectivePosition?.longitude, radius, selectedCategory, debouncedTerm]);

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);

  // ─── Create the Leaflet map (once per map view) ───────────────────────
  // The map is always shown — with no position it opens on Nigeria and the
  // user can tap to set their location. It used to be replaced by a dead
  // "Map unavailable" box whenever the browser couldn't locate the user.
  useEffect(() => {
    if (!mapView || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true,
    });
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    providerLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      setChosenLocationRef.current({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    });

    mapInstanceRef.current = map;
    const t = window.setTimeout(() => map.invalidateSize(), 200);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapInstanceRef.current = null;
      userLayerRef.current = null;
      providerLayerRef.current = null;
    };
  }, [mapView]);

  // ─── User marker + accuracy circle ────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = userLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!effectivePosition) return;

    const point: L.LatLngTuple = [effectivePosition.latitude, effectivePosition.longitude];
    const accuracy = !usingManual ? effectivePosition.accuracy : undefined;

    if (accuracy && accuracy > 30) {
      L.circle(point, {
        radius: accuracy,
        color: '#0e6570',
        weight: 1,
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(layer);
    }

    const marker = L.marker(point, { icon: userLocationIcon(), draggable: true, autoPan: true })
      .addTo(layer)
      .bindPopup(
        usingManual
          ? '<b>Searching from here</b><br/><span style="font-size:12px">Drag the dot or tap the map to move it.</span>'
          : accuracy && accuracy > APPROXIMATE_ACCURACY_M
            ? `<b>You might be here</b><br/><span style="font-size:12px">Your browser is only accurate to ± ${formatDistance(accuracy)}. Drag the dot to where you really are.</span>`
            : '<b>You are here</b>'
      );
    marker.on('dragend', () => {
      const ll = marker.getLatLng();
      setChosenLocationRef.current({ latitude: ll.lat, longitude: ll.lng });
    });
    marker.openPopup();

    map.setView(point, Math.max(map.getZoom(), LOCATED_MAP_ZOOM));
  }, [effectivePosition, usingManual, mapView]);

  // ─── Provider markers ─────────────────────────────────────────────────
  useEffect(() => {
    const layer = providerLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    providers.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;

      const popupHtml = `
        <div style="min-width: 140px;">
          <b style="font-size: 14px;">${escapeHtml(p.business_name)}</b><br/>
          <span style="font-size: 13px;">${escapeHtml(p.category_name)}</span><br/>
          <span style="color: #0e6570; font-size: 13px; font-weight: 700;">${Number(p.average_rating).toFixed(1)} rating</span>
          <span style="color: #6b7280; font-size: 12px;"> (${Number(p.review_count) || 0} reviews)</span><br/>
          ${p.distance_km != null ? `<span style="color: #6b7280; font-size: 12px;">${Number(p.distance_km).toFixed(1)} km away</span><br/>` : ''}
          <a href="/provider/${encodeURIComponent(p.id)}" style="display:inline-block;margin-top:6px;color:#0e6570;font-weight:700;font-size:12px;">View profile</a>
        </div>
      `;

      L.marker([Number(p.latitude), Number(p.longitude)]).addTo(layer).bindPopup(popupHtml);
    });
  }, [providers, mapView]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleUseMyLocation = useCallback(() => {
    setManualPosition(null);
    saveLocation(null);
    setPlaceResults([]);
    setPlaceError(null);
    requestLocation();
  }, [requestLocation]);

  const handlePlaceSearch = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const q = placeQuery.trim();
      if (!q) return;

      // Pasted coordinates skip the network round trip.
      const coords = parseCoordinates(q);
      if (coords) {
        setChosenLocation({ ...coords, label: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` });
        return;
      }

      placeAbortRef.current?.abort();
      const ctrl = new AbortController();
      placeAbortRef.current = ctrl;
      setPlaceSearching(true);
      setPlaceError(null);
      setPlaceResults([]);
      try {
        const results = await searchPlaces(q, ctrl.signal);
        if (results.length === 0) {
          setPlaceError('No matching place found. Try your town name, e.g. "Ilaro" or "Ikeja".');
        } else if (results.length === 1) {
          setChosenLocation(results[0]);
          setPlaceQuery(shortLabel(results[0].label));
        } else {
          setPlaceResults(results);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setPlaceError('Place search is unavailable right now. Tap the map to set your location instead.');
        }
      } finally {
        if (placeAbortRef.current === ctrl) setPlaceSearching(false);
      }
    },
    [placeQuery, setChosenLocation]
  );

  useEffect(() => () => placeAbortRef.current?.abort(), []);

  const handleRefresh = fetchNearby;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 border-b border-ink/10 pb-5">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-clay">Discover</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">Artisans near you</h1>
          <p className="flex items-center gap-2 text-sm text-charcoal/65">
            <MapPin size={16} className="text-brand" />
            {locationStatus}
          </p>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <section className="border border-ink/10 bg-[#fffefa] p-4 shadow-[0_8px_18px_rgba(21,50,58,0.05)] md:p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Free-text search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block font-mono text-[11px] font-medium text-charcoal/60 uppercase tracking-[0.12em] mb-1.5">
              <Search size={12} className="inline mr-1" aria-hidden="true" />
              What do you need?
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g. plumbing or wiring"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div className="flex-1 min-w-[160px]">
            <label className="block font-mono text-[11px] font-medium text-charcoal/60 uppercase tracking-[0.12em] mb-1.5">
              <SlidersHorizontal size={12} className="inline mr-1" aria-hidden="true" />
              Category
            </label>
            <select
              className="glass-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Radius filter */}
          <div className="w-[120px]">
            <label className="block font-mono text-[11px] font-medium text-charcoal/60 uppercase tracking-[0.12em] mb-1.5">
              Radius
            </label>
            <select
              className="glass-input"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            >
              {RADIUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Use My Location */}
          <div>
            <label className="block font-mono text-[11px] font-medium text-charcoal/60 uppercase tracking-[0.12em] mb-1.5 invisible">
              &nbsp;
            </label>
            <button
              type="button"
              className="btn-glass inline-flex items-center gap-2 text-sm py-2.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleUseMyLocation}
              disabled={geoBlocked}
              title={
                geoBlocked
                  ? "Location is blocked for this site. Allow it in your browser's site settings, then reload."
                  : undefined
              }
            >
              <Navigation size={16} />
              Use My Location
            </button>
          </div>

          {/* Refresh */}
          <div>
            <label className="block font-mono text-[11px] font-medium text-charcoal/60 uppercase tracking-[0.12em] mb-1.5 invisible">
              &nbsp;
            </label>
            <button
              type="button"
              className="btn-glass inline-flex items-center gap-2 text-sm py-2.5 px-4"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* View toggle */}
          <div className="ml-auto">
            <label className="block font-mono text-[11px] font-medium text-charcoal/60 uppercase tracking-[0.12em] mb-1.5 invisible">
              &nbsp;
            </label>
            <div className="flex overflow-hidden rounded-lg border border-ink/15">
              <button
                type="button"
                aria-label="Show map view"
                aria-pressed={mapView}
                title="Show map view"
                className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 transition-all ${
                  mapView
                    ? 'bg-brand text-white'
                    : 'bg-surface text-charcoal/70 hover:bg-surface-muted'
                }`}
                onClick={() => setMapView(true)}
              >
                <MapIcon size={16} />
                <span className="hidden sm:inline">Map</span>
              </button>
              <button
                type="button"
                aria-label="Show list view"
                aria-pressed={!mapView}
                title="Show list view"
                className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 transition-all ${
                  !mapView
                    ? 'bg-brand text-white'
                    : 'bg-surface text-charcoal/70 hover:bg-surface-muted'
                }`}
                onClick={() => setMapView(false)}
              >
                <List size={16} />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Location: search a place, or see why the automatic fix may be wrong */}
        <div className="mt-4 pt-4 border-t border-ink/10">
          {(isApproximate || (!effectivePosition && !geoLoading && geoError)) && (
            <div className="flex items-start gap-2 mb-3 animate-fade-in" role="status">
              <AlertCircle size={18} className="text-clay mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-ink">
                  {isApproximate
                    ? `Your location is only a rough guess (± ${formatDistance(position!.accuracy!)}).`
                    : geoError}
                </p>
                <p className="text-xs text-charcoal/55 mt-0.5">
                  {isApproximate
                    ? 'Computers without GPS often show the wrong town. Search for your area below, or drag the dot on the map to where you are.'
                    : 'Search for your town or street below, or tap the map to set where you are.'}
                </p>
              </div>
            </div>
          )}

          <form className="flex flex-wrap items-end gap-3" onSubmit={handlePlaceSearch}>
            <div className="flex-1 min-w-[220px]">
              <label
                htmlFor="place-search"
                className="block font-mono text-[11px] font-medium text-charcoal/60 uppercase tracking-[0.12em] mb-1.5"
              >
                <MapPin size={12} className="inline mr-1" aria-hidden="true" />
                {usingManual ? 'Searching near' : 'Wrong location? Search your area'}
              </label>
              <input
                id="place-search"
                type="text"
                className="glass-input py-2 text-sm"
                placeholder="e.g. Ilaro, Ogun State or 14 Taiwo Street, Lagos"
                value={placeQuery}
                onChange={(e) => setPlaceQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-2 text-sm py-2 px-5 disabled:opacity-50"
              disabled={!placeQuery.trim() || placeSearching}
            >
              {placeSearching ? <span className="spinner !w-4 !h-4 !border-2" /> : <Search size={16} />}
              Set location
            </button>
            {usingManual && (
              <button
                type="button"
                className="btn-glass inline-flex items-center gap-2 text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleUseMyLocation}
                disabled={geoBlocked}
              >
                <Navigation size={16} />
                Use my device location
              </button>
            )}
          </form>

          {placeError && <p className="mt-2 text-sm text-red-700">{placeError}</p>}

          {placeResults.length > 0 && (
            <ul className="mt-2 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-surface animate-fade-in">
              {placeResults.map((r) => (
                <li key={`${r.latitude},${r.longitude}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-charcoal/80 hover:bg-surface-muted"
                    onClick={() => {
                      setChosenLocation(r);
                      setPlaceQuery(shortLabel(r.label));
                    }}
                  >
                    <MapPin size={14} className="inline mr-1.5 text-brand" aria-hidden="true" />
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Recent searches ─────────────────────────────────────────────── */}
      {isAuthenticated && recentSearches.length > 0 && (
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-2 font-mono text-[11px] font-medium text-charcoal/60 uppercase tracking-[0.12em]">
            <History size={12} />
            Recent searches
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s) => {
              const cat = categories.find((c) => c.slug === s.category_slug);
              const label = [cat?.name || '', s.search_term ? `"${s.search_term}"` : '']
                .filter(Boolean)
                .join(' · ');
              if (!label) return null;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedCategory(s.category_slug || '');
                    setSearchTerm(s.search_term || '');
                  }}
                  className="rounded-full border border-ink/10 bg-surface px-3 py-1.5 text-sm font-semibold text-charcoal/70 transition-colors hover:border-brand/40 hover:text-brand"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Contacted artisans: come back and review ─────────────────────── */}
      {isAuthenticated && contacted.length > 0 && (
        <section className="glass p-4 md:p-5 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-3 font-mono text-[11px] font-medium text-charcoal/60 uppercase tracking-[0.12em]">
            <Phone size={12} />
            Artisans you contacted
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {contacted.map((c) => (
              <Link
                key={c.id}
                to={`/provider/${c.id}`}
                className="flex-shrink-0 min-w-[210px] rounded-lg border border-ink/10 bg-surface p-3 transition-colors hover:border-brand/40 hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2 font-bold text-ink text-sm">
                  <span className="flex h-7 w-7 items-center justify-center bg-brand/8 text-brand"><TradeIcon category={c.category_name} className="h-3.5 w-3.5" /></span>
                  <span className="truncate">{c.business_name}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-charcoal/55">
                  <Star size={12} className="text-clay fill-clay" />
                  {Number(c.average_rating).toFixed(1)} · {c.review_count} reviews
                </div>
                <div className={`mt-2 flex items-center gap-1 text-xs font-bold ${c.my_review_id ? 'text-leaf' : 'text-brand'}`}>
                  {c.my_review_id && <CircleCheck className="h-3.5 w-3.5" />}
                  {c.my_review_id ? 'Reviewed' : 'Leave a review'}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map Panel — always rendered; tap to set location when none is known */}
        {mapView && (
          <div className="lg:col-span-3 order-1 lg:order-1">
            <div className="relative">
              <div ref={mapContainerRef} className="map-container w-full h-[300px] md:h-[500px]" />
              {!effectivePosition && (
                <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex justify-center">
                  <div className="pointer-events-auto max-w-md rounded-lg border border-ink/10 bg-[#fffefa]/95 px-4 py-3 text-center shadow-md">
                    {geoLoading ? (
                      <p className="flex items-center justify-center gap-2 text-sm font-medium text-ink">
                        <span className="spinner !w-4 !h-4 !border-2" />
                        Detecting your location…
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-ink">Where are you?</p>
                        <p className="mt-1 text-xs text-charcoal/65">
                          {geoBlocked
                            ? "Location is blocked for this site. Tap the map where you are, search your area above, or allow Location in your browser's site settings."
                            : 'Tap the map where you are, or search your area above.'}
                        </p>
                        {!geoBlocked && (
                          <button
                            type="button"
                            className="btn-glass mt-2 inline-flex items-center gap-2 text-xs py-1.5 px-3"
                            onClick={handleUseMyLocation}
                          >
                            <Navigation size={14} />
                            Try my device location again
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Tap the map or drag the dot to change where you&apos;re searching from · Leaflet &amp; OpenStreetMap
            </p>
          </div>
        )}

        {/* List Panel */}
        <div
          className={
            mapView
              ? 'lg:col-span-2 order-2 lg:order-2'
              : 'lg:col-span-5 order-2'
          }
        >
          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            {!isLoading && effectivePosition ? (
              <p className="text-sm text-charcoal/65">
                <span className="font-bold text-ink">{providers.length}</span>{' '}
                {providers.length === 1 ? 'artisan' : 'artisans'} found within{' '}
                <span className="font-bold text-ink">{radius} km</span>
              </p>
            ) : (
              <span />
            )}
            {selectedCategory && (
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
                {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
              </span>
            )}
          </div>

          {/* Loading spinner */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
              <div className="spinner" />
              <p className="text-sm text-gray-600">Finding nearby artisans...</p>
            </div>
          )}

          {/* Error state (keeps results column from going blank) */}
          {!isLoading && fetchError && (
            <div className="border border-red-200 bg-red-50 p-10 flex flex-col items-center justify-center text-center animate-fade-in">
              <AlertCircle size={48} className="text-red-400 mb-4" />
              <h3 className="font-bold text-red-900 mb-2">Couldn&apos;t load artisans</h3>
              <p className="text-sm text-red-700/80 max-w-sm mb-4">{fetchError}</p>
              <button
                type="button"
                className="btn-glass inline-flex items-center gap-2 text-sm"
                onClick={handleRefresh}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !fetchError && providers.length === 0 && effectivePosition && (
            <div className="border border-dashed border-ink/20 bg-surface-muted p-10 flex flex-col items-center justify-center text-center animate-fade-in">
              <Search size={48} className="text-brand/45 mb-4" />
              <h3 className="font-bold text-ink mb-2">No artisans found</h3>
              <p className="text-sm text-charcoal/60 max-w-sm">
                No providers found in this area. Try expanding your search radius or selecting a
                different category.
              </p>
              {(isApproximate || !usingManual) && (
                <p className="text-sm text-charcoal/60 max-w-sm mt-2">
                  Is the dot on the map in the wrong place? Search for your area above or drag the
                  dot to where you are.
                </p>
              )}
            </div>
          )}

          {/* Waiting for location */}
          {!isLoading && !fetchError && !effectivePosition && (
            <div className="border border-dashed border-ink/20 bg-surface-muted p-10 flex flex-col items-center justify-center text-center animate-fade-in">
              <Navigation size={48} className="text-brand/45 mb-4" />
              <h3 className="font-bold text-ink mb-2">
                {geoLoading ? 'Detecting your location…' : 'Set your location'}
              </h3>
              <p className="text-sm text-charcoal/60 mb-4">
                {geoLoading
                  ? 'Allow location access if your browser asks.'
                  : 'Search for your area above or tap the map, and we\'ll show artisans near you.'}
              </p>
              {!geoLoading && !geoBlocked && (
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                  onClick={handleUseMyLocation}
                >
                  <Navigation size={16} />
                  Share My Location
                </button>
              )}
            </div>
          )}

          {/* Provider cards */}
          {!isLoading && providers.length > 0 && (
            <div className="flex flex-col gap-4 stagger">
              {providers.map((provider) => (
                <div key={provider.id}>
                  <ProviderCard provider={provider} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
