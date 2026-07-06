import { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import L from 'leaflet';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../hooks/useAuth';
import { providersApi } from '../services/api';
import ProviderCard from '../components/ProviderCard';
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

export default function Dashboard() {
  const { position, error: geoError, isLoading: geoLoading, requestLocation } = useGeolocation();
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

  // Manual coordinates (fallback when geolocation fails)
  const [manualPosition, setManualPosition] = useState<Geoposition | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Map ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Effective position: geolocation takes priority, fall back to manual
  const effectivePosition = position || manualPosition;

  // Derive location description for subtitle
  const locationStatus = geoLoading
    ? 'Detecting your location...'
    : geoError
      ? 'Location unavailable — enter coordinates below'
      : effectivePosition
        ? `Near ${effectivePosition.latitude.toFixed(4)}, ${effectivePosition.longitude.toFixed(4)}`
        : 'Location not set';

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

  // ─── Fetch nearby providers when position, radius, or category change ──
  useEffect(() => {
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
    if (selectedCategory) {
      params.category = selectedCategory;
    }
    if (debouncedTerm) {
      params.q = debouncedTerm;
    }

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
  }, [effectivePosition, radius, selectedCategory, debouncedTerm]);

  // ─── Initialize Leaflet map and add markers ──────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !effectivePosition || !mapView) return;

    // Destroy previous map instance if it exists (providers change triggers re-init)
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [effectivePosition.latitude, effectivePosition.longitude],
      zoom: 14,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // User marker at current position
    L.marker([effectivePosition.latitude, effectivePosition.longitude], {
      icon: L.divIcon({
        className: 'user-marker',
        html: '<div style="font-size: 28px; line-height: 1;">📍</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    })
      .addTo(map)
      .bindPopup('<b>You are here</b>')
      .openPopup();

    // Provider markers
    providers.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;

      const popupHtml = `
        <div style="min-width: 140px;">
          <b style="font-size: 14px;">${p.business_name}</b><br/>
          <span style="font-size: 13px;">${p.category_icon} ${p.category_name}</span><br/>
          <span style="color: #f59e0b; font-size: 13px;">&#9733; ${Number(p.average_rating).toFixed(1)}</span>
          <span style="color: #6b7280; font-size: 12px;"> (${p.review_count} reviews)</span><br/>
          ${p.distance_km != null ? `<span style="color: #6b7280; font-size: 12px;">${p.distance_km.toFixed(1)} km away</span><br/>` : ''}
          <a href="/provider/${p.id}" style="display:inline-block;margin-top:6px;color:#d97706;font-weight:600;font-size:12px;">View profile →</a>
        </div>
      `;

      L.marker([p.latitude, p.longitude])
        .addTo(map)
        .bindPopup(popupHtml);
    });

    mapInstanceRef.current = map;

    // Fix map rendering after container becomes visible
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [effectivePosition, mapView, providers]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleUseMyLocation = useCallback(() => {
    setShowManualInput(false);
    requestLocation();
  }, [requestLocation]);

  const handleManualSubmit = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) return;
    setManualPosition({ latitude: lat, longitude: lng });
    setShowManualInput(false);
  }, [manualLat, manualLng]);

  const handleRefresh = useCallback(() => {
    if (effectivePosition) {
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
          setFetchError(err.response?.data?.message || err.message || 'Failed to fetch providers.');
          setProviders([]);
        })
        .finally(() => setIsLoading(false));
    }
  }, [effectivePosition, radius, selectedCategory, debouncedTerm]);

  // ─── Show manual input when geolocation fails ─────────────────────────
  useEffect(() => {
    if (geoError && !manualPosition) {
      setShowManualInput(true);
    }
  }, [geoError, manualPosition]);

  // ─── Loading state ────────────────────────────────────────────────────
  if (geoLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
          <div className="spinner" />
          <p className="text-lg text-gray-700 font-medium">Finding nearby artisans...</p>
          <p className="text-sm text-gray-500">Detecting your location</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 stagger">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Discover Artisans Near You
        </h1>
        <p className="mt-2 text-gray-600 flex items-center gap-2">
          <MapPin size={16} className="text-amber-500" />
          {locationStatus}
        </p>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="glass p-4 md:p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Free-text search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              <Search size={12} className="inline mr-1" />
              What do you need?
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g. plumber, furniture, wiring..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              <SlidersHorizontal size={12} className="inline mr-1" />
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
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Radius filter */}
          <div className="w-[120px]">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
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
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 invisible">
              &nbsp;
            </label>
            <button
              type="button"
              className="btn-glass inline-flex items-center gap-2 text-sm py-2.5 px-4"
              onClick={handleUseMyLocation}
            >
              <Navigation size={16} />
              Use My Location
            </button>
          </div>

          {/* Refresh */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 invisible">
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
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 invisible">
              &nbsp;
            </label>
            <div className="flex rounded-xl overflow-hidden border border-white/40">
              <button
                type="button"
                className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 transition-all ${
                  mapView
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white/20 text-gray-700 hover:bg-white/30'
                }`}
                onClick={() => setMapView(true)}
              >
                <MapIcon size={16} />
                <span className="hidden sm:inline">Map</span>
              </button>
              <button
                type="button"
                className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 transition-all ${
                  !mapView
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white/20 text-gray-700 hover:bg-white/30'
                }`}
                onClick={() => setMapView(false)}
              >
                <List size={16} />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Manual coordinate input (visible when geolocation errors) */}
        {showManualInput && (
          <div className="mt-4 pt-4 border-t border-white/30 animate-fade-in">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">{geoError}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enter your coordinates manually to find nearby artisans.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-[140px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="glass-input py-2 text-sm"
                  placeholder="e.g. 6.5244"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                />
              </div>
              <div className="w-[140px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="glass-input py-2 text-sm"
                  placeholder="e.g. 3.3792"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-2 text-sm py-2 px-5"
                onClick={handleManualSubmit}
                disabled={!manualLat || !manualLng}
              >
                <Search size={16} />
                Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Recent searches ─────────────────────────────────────────────── */}
      {isAuthenticated && recentSearches.length > 0 && (
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <History size={12} />
            Recent searches
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s) => {
              const cat = categories.find((c) => c.slug === s.category_slug);
              const label = [cat ? `${cat.icon} ${cat.name}` : '', s.search_term ? `"${s.search_term}"` : '']
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
                  className="px-3 py-1.5 rounded-full text-sm bg-white/40 hover:bg-white/60 border border-white/50 text-gray-700 transition-all"
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
        <div className="glass p-4 md:p-5 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <Phone size={12} />
            Artisans you contacted
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {contacted.map((c) => (
              <Link
                key={c.id}
                to={`/provider/${c.id}`}
                className="flex-shrink-0 min-w-[210px] rounded-xl bg-white/40 hover:bg-white/60 border border-white/50 p-3 transition-all"
              >
                <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
                  <span>{c.category_icon}</span>
                  <span className="truncate">{c.business_name}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  {Number(c.average_rating).toFixed(1)} · {c.review_count} reviews
                </div>
                <div className={`mt-2 text-xs font-semibold ${c.my_review_id ? 'text-green-600' : 'text-amber-600'}`}>
                  {c.my_review_id ? '✓ Reviewed' : 'Leave a review →'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map Panel */}
        {mapView && (
          <div className="lg:col-span-3 order-1 lg:order-1">
            {effectivePosition ? (
              <>
                <div
                  ref={mapContainerRef}
                  className="map-container w-full h-[300px] md:h-[500px]"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Interactive map powered by Leaflet &amp; OpenStreetMap
                </p>
              </>
            ) : (
              <div className="glass p-10 flex flex-col items-center justify-center text-center min-h-[300px] animate-fade-in">
                <MapPin size={48} className="text-gray-400 mb-4" />
                <h3 className="font-semibold text-gray-700 mb-2">Map Unavailable</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Enable location services or enter coordinates above to see the map.
                </p>
                <button
                  type="button"
                  className="btn-glass inline-flex items-center gap-2 text-sm"
                  onClick={handleUseMyLocation}
                >
                  <Navigation size={16} />
                  Use My Location
                </button>
              </div>
            )}
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
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{providers.length}</span>{' '}
                {providers.length === 1 ? 'artisan' : 'artisans'} found within{' '}
                <span className="font-semibold text-gray-800">{radius} km</span>
              </p>
            ) : (
              <span />
            )}
            {selectedCategory && (
              <span className="text-xs text-gray-500 bg-white/20 px-2.5 py-1 rounded-full">
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
            <div className="glass p-10 flex flex-col items-center justify-center text-center animate-fade-in">
              <AlertCircle size={48} className="text-red-400 mb-4" />
              <h3 className="font-semibold text-gray-700 mb-2">Couldn&apos;t load artisans</h3>
              <p className="text-sm text-gray-500 max-w-sm mb-4">{fetchError}</p>
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
            <div className="glass p-10 flex flex-col items-center justify-center text-center animate-fade-in">
              <Search size={48} className="text-gray-400 mb-4" />
              <h3 className="font-semibold text-gray-700 mb-2">No Artisans Found</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                No providers found in this area. Try expanding your search radius or selecting a
                different category.
              </p>
            </div>
          )}

          {/* Waiting for location */}
          {!isLoading && !fetchError && !effectivePosition && !showManualInput && (
            <div className="glass p-10 flex flex-col items-center justify-center text-center animate-fade-in">
              <Navigation size={48} className="text-gray-400 mb-4" />
              <h3 className="font-semibold text-gray-700 mb-2">Waiting for Location</h3>
              <p className="text-sm text-gray-500 mb-4">
                We need your location to find nearby artisans. Click below to share it.
              </p>
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-2 text-sm"
                onClick={handleUseMyLocation}
              >
                <Navigation size={16} />
                Share My Location
              </button>
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
