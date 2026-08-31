import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store, MapPin, Phone, Star, ImagePlus, Trash2, CheckCircle2, XCircle,
  Eye, EyeOff, AlertCircle, Loader2, MessageSquare,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { providersApi, assetUrl } from '../services/api';
import StarRating from '../components/StarRating';
import TradeIcon from '../components/TradeIcon';

interface WorkImage {
  id: string;
  image_url: string;
  caption?: string;
  created_at: string;
}

interface MyReview {
  id: string;
  rating: number;
  comment?: string;
  image_url?: string;
  created_at: string;
  reviewer_name: string;
}

interface MyProfile {
  id: string;
  business_name: string;
  description?: string;
  phone: string;
  address: string;
  average_rating: string | number;
  review_count: number;
  category_name: string;
  category_icon: string;
  profile_image?: string;
  work_images: WorkImage[];
  reviews: MyReview[];
  visibility: {
    images_uploaded: number;
    images_required: number;
    is_suspended: boolean;
    is_visible: boolean;
  };
}

export default function ArtisanDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await providersApi.getMyProfile();
      if (res.data.success && res.data.data) {
        setProfile(res.data.data as MyProfile);
        setNoProfile(false);
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) setNoProfile(true);
      else setError('Failed to load your business profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user) fetchProfile();
  }, [authLoading, user, navigate, fetchProfile]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const count = Math.min(files.length, 6);
    setUploading(true);
    setError('');
    setUploadNotice('');
    try {
      await providersApi.uploadWorkImages(Array.from(files).slice(0, 6));
      await fetchProfile();
      setUploadNotice(`${count} photo${count > 1 ? 's' : ''} uploaded and saved.`);
      setTimeout(() => setUploadNotice(''), 4000);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Upload failed. Images must be JPEG/PNG/WebP under 25 MB.';
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (imageId: string) => {
    setDeleting(imageId);
    setError('');
    setUploadNotice('');
    try {
      await providersApi.deleteWorkImage(imageId);
      await fetchProfile();
      setConfirmDelete(null);
      setUploadNotice('Photo removed.');
      setTimeout(() => setUploadNotice(''), 4000);
    } catch {
      setError('Failed to remove image.');
    } finally {
      setDeleting(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <div className="glass-strong p-10 text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your business...</p>
        </div>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)] px-4">
        <div className="glass-strong p-10 text-center max-w-md animate-fade-in-up">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Business Profile Yet</h2>
          <p className="text-gray-600 mb-6">Set up your artisan profile so customers nearby can find you.</p>
          <Link
            to="/register-provider"
            className="inline-block px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all shadow-lg shadow-amber-200"
          >
            Create My Business Profile
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const v = profile.visibility;
  const remaining = Math.max(0, v.images_required - v.images_uploaded);

  const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-leaf flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      )}
      <span className={ok ? 'text-charcoal/75' : 'text-charcoal/55'}>{label}</span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16 animate-fade-in-up">
      {/* Header */}
      <div className="mb-6 border-b border-ink/10 pb-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand/15 bg-brand/8 text-brand">
                <TradeIcon category={profile.category_name} className="h-6 w-6" />
              </span>
              <div>
                <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-clay">Business workspace</p>
                <h1 className="font-display mt-1 text-3xl font-semibold leading-tight text-ink sm:text-4xl">{profile.business_name}</h1>
              </div>
            </div>
            <p className="mt-3 text-sm font-bold text-charcoal/60">{profile.category_name}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-charcoal/65">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-brand" />{profile.address}</span>
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-brand" />{profile.phone}</span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-clay fill-clay" />
                {Number(profile.average_rating).toFixed(1)} ({profile.review_count} reviews)
              </span>
            </div>
          </div>

          {/* Visibility status */}
          <div
            className={`border-l-4 p-4 lg:min-w-[270px] ${
              v.is_suspended
                ? 'border-red-500 bg-red-50'
                : v.is_visible
                ? 'border-leaf bg-teal-50'
                : 'border-clay bg-amber-50'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-2">
              {v.is_suspended ? (
                <><EyeOff className="w-5 h-5 text-red-600" /><span className="text-red-700">Suspended by admin</span></>
              ) : v.is_visible ? (
                <><Eye className="w-5 h-5 text-leaf" /><span className="text-leaf">Visible to customers</span></>
              ) : (
                <><EyeOff className="w-5 h-5 text-clay" /><span className="text-amber-700">Almost there</span></>
              )}
            </div>
            {v.is_suspended ? (
              <p className="text-sm text-red-600/80">
                Your profile is hidden from search. Please contact an administrator.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <CheckItem
                    ok={v.images_uploaded >= v.images_required}
                    label={`Work photos (${v.images_uploaded}/${v.images_required} minimum)`}
                  />
                </div>
                {!v.is_visible && (
                  <p className="text-xs text-amber-700/70 mt-2">
                    You go live automatically once these are done — no admin approval needed.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {uploadNotice && (
        <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 text-leaf rounded-lg px-4 py-3 mb-6 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{uploadNotice}</span>
        </div>
      )}

      {/* Work catalog */}
      <section className="glass-strong p-5 sm:p-8 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-2">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-clay">Portfolio</p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-ink">Work catalog</h2>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary w-full gap-2 px-4 py-2.5 text-sm disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload Photos'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
        <p className="text-sm leading-6 text-charcoal/60 mb-6">
          {remaining > 0
            ? `Upload at least ${remaining} more photo${remaining > 1 ? 's' : ''} of your work to become visible in search — photos prove you do what you say you do.`
            : 'These photos are shown to customers as proof of your work.'}
        </p>

        {profile.work_images.length === 0 ? (
          <div className="border border-dashed border-ink/20 bg-surface-muted p-10 text-center text-charcoal/50">
            <ImagePlus className="w-10 h-10 mx-auto mb-3 text-brand" />
            <p>No work photos yet. Upload at least {v.images_required} to go live.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {profile.work_images.map((img) => (
              <div key={img.id} className="relative group overflow-hidden rounded-lg border border-ink/10 aspect-[4/3] bg-surface-muted">
                <img
                  src={assetUrl(img.image_url)}
                  alt={img.caption || 'Work sample'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {confirmDelete === img.id ? (
                  <div className="absolute inset-0 bg-ink/80 flex flex-col items-center justify-center gap-2 p-2 animate-fade-in">
                    <p className="text-white text-xs font-medium text-center">Delete this photo?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(img.id)}
                        disabled={deleting === img.id}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-60"
                      >
                        {deleting === img.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        {deleting === img.id ? 'Deleting…' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-2 rounded-md bg-white hover:bg-surface-muted text-charcoal text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(img.id)}
                    title="Remove photo"
                    aria-label="Remove photo"
                    className="absolute top-2 right-2 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-red-600 opacity-100 shadow-sm transition-opacity md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviews received */}
      <section className="glass-strong p-5 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-brand" />
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-clay">Reputation</p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-ink">Customer reviews</h2>
          </div>
        </div>

        {profile.reviews.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No reviews yet. Reviews appear here automatically when customers rate your work.</p>
        ) : (
          <div className="divide-y divide-ink/10">
            {profile.reviews.map((r) => (
              <article key={r.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-ink">{r.reviewer_name}</span>
                  <span className="font-mono text-[11px] text-charcoal/45">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <StarRating rating={r.rating} size="sm" />
                {r.comment && <p className="text-charcoal/70 text-sm leading-6 mt-2">{r.comment}</p>}
                {r.image_url && (
                  <img
                    src={assetUrl(r.image_url)}
                    alt="Customer proof of work"
                    className="mt-3 rounded-lg border border-ink/10 max-h-48 object-cover"
                    loading="lazy"
                  />
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
