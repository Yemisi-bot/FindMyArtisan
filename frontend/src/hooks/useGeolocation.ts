import { useState, useEffect, useRef, useCallback } from 'react';
import type { Geoposition } from '../types';

interface UseGeolocationReturn {
  /** Best fix so far (lowest `accuracy`). Null until the first fix arrives. */
  position: Geoposition | null;
  error: string | null;
  /** True until the first fix (or a final error). */
  isLoading: boolean;
  /** True while we keep listening for a more precise fix after the first one. */
  isRefining: boolean;
  /**
   * True once the browser has permanently blocked location for this site.
   * A blocked site gets no prompt at all, so retrying is pointless — the UI
   * should say how to unblock it rather than offer a button that does nothing.
   */
  isBlocked: boolean;
  requestLocation: () => void;
}

// Stop refining once a fix is this precise (metres) …
const GOOD_ENOUGH_ACCURACY_M = 50;
// … or after this long, whichever comes first.
const REFINE_WINDOW_MS = 15000;
// How long to wait for the very first high-accuracy fix before falling back.
const FIRST_FIX_TIMEOUT_MS = 12000;

const BLOCKED_MESSAGE =
  'Location is blocked for this site. Open your browser\'s site settings ' +
  '(the icon beside the address bar) and allow Location, or search for your area below.';

/**
 * Why this is more involved than a single getCurrentPosition call:
 *
 * The first fix a browser hands back is often a coarse Wi-Fi/IP guess — on a
 * laptop in Ilaro that guess can land in Ikeja, 50 km away, which is outside
 * every search radius. The old hook asked for low accuracy and accepted a
 * 5-minute-old cached answer, so that wrong guess was all it ever used.
 *
 * Now we ask for high accuracy with no cache, keep listening for ~15 s and
 * keep whichever fix has the smallest error radius. We also expose `accuracy`
 * so the UI can tell the user when the position is only a rough guess.
 * If high accuracy fails outright (common on desktops with no GPS, or phones
 * with location services switched off) we retry once in low-accuracy mode
 * before giving up.
 */
export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<Geoposition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const bestRef = useRef<Geoposition | null>(null);
  // Bumped on every request so callbacks from an abandoned attempt are ignored.
  const attemptRef = useRef(0);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    setIsRefining(false);
  }, []);

  const requestLocation = useCallback(() => {
    stopWatching();
    const attempt = ++attemptRef.current;
    bestRef.current = null;

    setIsLoading(true);
    setError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Search for your area instead.');
      setIsLoading(false);
      return;
    }

    const isCurrent = () => attempt === attemptRef.current;

    const accept = (pos: GeolocationPosition) => {
      const next: Geoposition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : undefined,
      };
      const best = bestRef.current;
      const better =
        !best ||
        best.accuracy === undefined ||
        (next.accuracy !== undefined && next.accuracy < best.accuracy);
      if (better) {
        bestRef.current = next;
        setPosition(next);
      }
      setIsBlocked(false);
      setError(null);
      setIsLoading(false);
    };

    const fail = (err: GeolocationPositionError) => {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          setIsBlocked(true);
          setError(BLOCKED_MESSAGE);
          break;
        case err.POSITION_UNAVAILABLE:
          setError(
            'Your device could not work out where you are (location services may be off). ' +
              'Search for your area or tap the map instead.'
          );
          break;
        case err.TIMEOUT:
          setError('Finding your location took too long. Search for your area or tap the map instead.');
          break;
        default:
          setError('Could not get your location. Search for your area or tap the map instead.');
      }
      setIsLoading(false);
    };

    // Last resort: a quick low-accuracy fix (network/IP based, cache allowed).
    const fallbackLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => isCurrent() && accept(pos),
        (err) => isCurrent() && fail(err),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
      );
    };

    setIsRefining(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!isCurrent()) return;
        accept(pos);
        if (pos.coords.accuracy <= GOOD_ENOUGH_ACCURACY_M) stopWatching();
      },
      (err) => {
        if (!isCurrent()) return;
        if (err.code === err.PERMISSION_DENIED) {
          stopWatching();
          fail(err);
          return;
        }
        // Already have something usable — keep it and stop.
        if (bestRef.current) {
          stopWatching();
          return;
        }
        stopWatching();
        fallbackLowAccuracy();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: FIRST_FIX_TIMEOUT_MS }
    );

    // Hard stop for the refinement window.
    timersRef.current.push(
      window.setTimeout(() => {
        if (isCurrent()) stopWatching();
      }, REFINE_WINDOW_MS)
    );
  }, [stopWatching]);

  useEffect(() => {
    // Ask the Permissions API first where it exists: a site the user has already
    // blocked never raises a prompt, so we can show guidance immediately instead
    // of waiting for the geolocation call to fail.
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
          setError(BLOCKED_MESSAGE);
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
      attemptRef.current++;
      stopWatching();
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, [requestLocation, stopWatching]);

  return { position, error, isLoading, isRefining, isBlocked, requestLocation };
}
