import type { Geoposition } from '../types';

/**
 * One-shot "find me" for forms (artisan registration / location update).
 *
 * Listens with high accuracy for up to `windowMs` and resolves with the most
 * precise fix seen, or as soon as one is within `goodEnoughM`. Falls back to a
 * low-accuracy fix if high accuracy fails. Rejects with a user-facing message.
 */
export function getBestPosition({
  windowMs = 12000,
  goodEnoughM = 50,
}: { windowMs?: number; goodEnoughM?: number } = {}): Promise<Geoposition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser. Search your address or tap the map instead.'));
      return;
    }

    let best: Geoposition | null = null;
    let done = false;
    let watchId: number | null = null;

    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(timer);
      if (best) resolve(best);
      else reject(err ?? new Error('Could not get your location. Search your address or tap the map instead.'));
    };

    const toMessage = (e: GeolocationPositionError) =>
      e.code === e.PERMISSION_DENIED
        ? 'Location access was denied. Allow Location for this site in your browser settings, or search your address / tap the map instead.'
        : e.code === e.TIMEOUT
          ? 'Finding your location took too long. Search your address or tap the map instead.'
          : 'Your device could not work out where you are. Search your address or tap the map instead.';

    const timer = window.setTimeout(() => finish(), windowMs);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next: Geoposition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : undefined,
        };
        if (!best || (next.accuracy ?? Infinity) < (best.accuracy ?? Infinity)) best = next;
        if ((next.accuracy ?? Infinity) <= goodEnoughM) finish();
      },
      (err) => {
        if (best || err.code === err.PERMISSION_DENIED) {
          finish(new Error(toMessage(err)));
          return;
        }
        // High accuracy failed with nothing in hand — try a quick coarse fix.
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        watchId = null;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            best = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : undefined,
            };
            finish();
          },
          (e2) => finish(new Error(toMessage(e2))),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: windowMs }
    );
  });
}
