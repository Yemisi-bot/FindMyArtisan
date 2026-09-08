import { useState, useEffect } from 'react';
import type { Geoposition } from '../types';

interface UseGeolocationReturn {
  position: Geoposition | null;
  error: string | null;
  isLoading: boolean;
  /**
   * True once the browser has permanently blocked location for this site.
   * A blocked site gets no prompt at all, so retrying is pointless — the UI
   * should say how to unblock it rather than offer a button that does nothing.
   */
  isBlocked: boolean;
  requestLocation: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<Geoposition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  const requestLocation = () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setIsBlocked(false);
        setIsLoading(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setIsBlocked(true);
            setError(
              'Location is blocked for this site. Open your browser\'s site settings ' +
                '(the icon beside the address bar) and allow Location, or enter your ' +
                'coordinates below.'
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable. Please try again.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('An unknown error occurred while getting your location.');
        }
        setIsLoading(false);
      },
      {
        // Network positioning is accurate to ~100m, which is plenty for a search
        // measured in kilometres. GPS (enableHighAccuracy) is far slower to fix
        // and drains battery on phones for precision this screen never uses.
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 min cache
      }
    );
  };

  useEffect(() => {
    // Ask the Permissions API first where it exists: a site the user has already
    // blocked never raises a prompt, so we can show guidance immediately instead
    // of waiting for getCurrentPosition to fail.
    let cancelled = false;
    let permissionStatus: PermissionStatus | undefined;
    const start = async () => {
      try {
        const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
        if (cancelled) return;
        // Recover without a page reload: if the user follows our instructions and
        // allows location in site settings, re-run the request straight away.
        if (status) {
          permissionStatus = status;
          status.onchange = () => {
            if (cancelled) return;
            if (status.state === 'denied') {
              setIsBlocked(true);
            } else {
              setIsBlocked(false);
              requestLocation();
            }
          };
        }
        if (status?.state === 'denied') {
          setIsBlocked(true);
          setError(
            'Location is blocked for this site. Open your browser\'s site settings ' +
              '(the icon beside the address bar) and allow Location, or enter your ' +
              'coordinates below.'
          );
          setIsLoading(false);
          return;
        }
      } catch {
        // Permissions API unsupported (older Safari) — fall through and just ask.
      }
      if (!cancelled) requestLocation();
    };
    start();
    return () => {
      cancelled = true;
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, []);

  return { position, error, isLoading, isBlocked, requestLocation };
}
