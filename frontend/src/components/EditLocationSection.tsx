import { useState } from 'react';
import { CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import BusinessLocationField from './BusinessLocationField';
import { providersApi } from '../services/api';
import { isValidCoordinate } from '../services/geocode';

interface EditLocationSectionProps {
  address: string;
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
  onSaved: () => void | Promise<void>;
}

/** Lets an artisan move their map pin after registration. */
export default function EditLocationSection({ address, latitude, longitude, onSaved }: EditLocationSectionProps) {
  const [open, setOpen] = useState(false);
  const [addr, setAddr] = useState(address);
  const [lat, setLat] = useState(latitude != null ? String(latitude) : '');
  const [lng, setLng] = useState(longitude != null ? String(longitude) : '');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const startEditing = () => {
    setAddr(address);
    setLat(latitude != null ? String(latitude) : '');
    setLng(longitude != null ? String(longitude) : '');
    setNotice(null);
    setOpen(true);
  };

  const save = async () => {
    const la = Number(lat);
    const ln = Number(lng);
    if (lat === '' || lng === '' || !isValidCoordinate(la, ln)) {
      setNotice({ ok: false, text: 'Set your location on the map first.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await providersApi.updateMyLocation({ latitude: la, longitude: ln, address: addr.trim() || undefined });
      await onSaved();
      setNotice({ ok: true, text: 'Location saved. Customers near this pin can now find you.' });
      setOpen(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save your location.';
      setNotice({ ok: false, text: message });
    } finally {
      setSaving(false);
    }
  };

  const hasPin = latitude != null && longitude != null && isValidCoordinate(Number(latitude), Number(longitude));

  return (
    <section className="glass-strong p-5 sm:p-8 mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-clay">Location</p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-ink">Where customers find you</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Search matches customers to your map pin. If the pin is in the wrong town, nearby customers won&apos;t see you.
          </p>
          {hasPin && (
            <a
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-brand"
              href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin className="w-4 h-4" /> View my current pin
            </a>
          )}
        </div>
        {!open && (
          <button type="button" className="btn-glass text-sm" onClick={startEditing}>
            Edit map location
          </button>
        )}
      </div>

      {notice && (
        <p className={`mt-4 flex items-center gap-2 text-sm ${notice.ok ? 'text-leaf' : 'text-red-700'}`}>
          {notice.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notice.text}
        </p>
      )}

      {open && (
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="edit-address" className="block text-sm font-medium text-charcoal/80 mb-1.5">Address</label>
            <textarea
              id="edit-address"
              className="glass-input min-h-[60px] resize-y"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              rows={2}
            />
          </div>
          <BusinessLocationField
            latitude={lat}
            longitude={lng}
            address={addr}
            onChange={(la, ln) => {
              setLat(la);
              setLng(ln);
            }}
          />
          <div className="flex gap-3">
            <button type="button" className="btn-primary text-sm disabled:opacity-50" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save location'}
            </button>
            <button type="button" className="btn-glass text-sm" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
