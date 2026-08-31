import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Phone, ShieldCheck, Clock, ArrowLeft, MessageSquare, MessageCircle, Star, Share2, Images, ImagePlus, X, Check } from 'lucide-react';
import { providersApi, reviewsApi, assetUrl } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import StarRating from '../components/StarRating';
import TradeIcon from '../components/TradeIcon';
import type { ServiceProvider, Review } from '../types';

interface WorkImage {
  id: string;
  image_url: string;
  caption?: string;
}

type ProviderDetail = ServiceProvider & {
  work_images?: WorkImage[];
  viewer?: { has_contacted: boolean; has_reviewed: boolean };
};

type ReviewWithImage = Review & { image_url?: string };

export default function ProviderProfile() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Contact reveal + share state
  const [contactRevealed, setContactRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [shared, setShared] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      setError(false);

      try {
        const [providerRes, reviewsRes] = await Promise.all([
          providersApi.getById(id),
          reviewsApi.getByProvider(id),
        ]);

        if (providerRes.data.success && providerRes.data.data) {
          const data = providerRes.data.data as ProviderDetail;
          setProvider(data);
          setContactRevealed(Boolean(data.viewer?.has_contacted));
          setHasReviewed(Boolean(data.viewer?.has_reviewed));
        } else {
          setError(true);
        }

        if (reviewsRes.data.success && reviewsRes.data.data) {
          setReviews(reviewsRes.data.data as ReviewWithImage[]);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Reveal the artisan's number — records the contact so the user can review later
  const handleRevealContact = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!id) return;
    setRevealing(true);
    try {
      await providersApi.recordContactClick(id);
      setContactRevealed(true);
    } catch {
      // Still reveal locally if recording failed — don't block the user
      setContactRevealed(true);
    } finally {
      setRevealing(false);
    }
  };

  // Share this artisan's profile
  const handleShare = async () => {
    if (!provider) return;
    const url = window.location.href;
    const shareData = {
      title: `${provider.business_name} — FindMyArtisan`,
      text: `Check out ${provider.business_name} (${provider.category_name}) on FindMyArtisan`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* user cancelled */
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reviewComment.trim()) return;

    setSubmittingReview(true);
    setReviewMessage(null);

    try {
      const res = await reviewsApi.submit({
        providerId: id,
        rating: reviewRating,
        comment: reviewComment.trim(),
        image: reviewImage,
      });

      if (res.data.success) {
        setReviewMessage({ type: 'success', text: 'Review submitted successfully!' });
        setReviewComment('');
        setReviewRating(5);
        setReviewImage(null);
        setHasReviewed(true);

        // Refresh reviews
        const reviewsRes = await reviewsApi.getByProvider(id);
        if (reviewsRes.data.success && reviewsRes.data.data) {
          setReviews(reviewsRes.data.data as ReviewWithImage[]);
        }
      } else {
        setReviewMessage({ type: 'error', text: res.data.message || 'Failed to submit review.' });
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit review. Please try again.';
      setReviewMessage({ type: 'error', text: message });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  // Error state
  if (error || !provider) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-4">
        <div className="text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal mb-2">Provider not found</h1>
          <p className="text-charcoal/60 mb-6">
            This provider doesn't exist or has been removed.
          </p>
          <Link to="/discover" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
            <ArrowLeft className="w-4 h-4" />
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        to="/discover"
        className="inline-flex items-center gap-2 text-charcoal/65 hover:text-brand transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium">Back to Discover</span>
      </Link>

      {/* Provider Header Card */}
      <section className="glass-strong p-5 sm:p-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex-1">
            {/* Category badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/8 px-3 py-1.5 text-sm font-bold text-brand mb-4">
              <TradeIcon category={provider.category_name} className="h-4 w-4" />
              <span>{provider.category_name}</span>
            </div>

            {/* Business name and verified badge */}
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">
                {provider.business_name}
              </h1>
              {provider.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-bold text-leaf">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified
                </span>
              )}
            </div>

            {/* Star rating display */}
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={Number(provider.average_rating)} size="md" />
              <span className="font-bold text-ink">
                {Number(provider.average_rating).toFixed(1)}
              </span>
              <span className="text-charcoal/50 text-sm">
                ({provider.review_count} {provider.review_count === 1 ? 'review' : 'reviews'})
              </span>
              {provider.distance_km !== undefined && provider.distance_km !== null && (
                <span className="ml-2 rounded-full bg-brand/8 px-2.5 py-1 text-xs font-bold text-brand">
                  {provider.distance_km.toFixed(1)} km away
                </span>
              )}
            </div>

            {/* Description */}
            {provider.description && (
              <p className="text-charcoal/70 leading-7 mb-5 max-w-2xl">
                {provider.description}
              </p>
            )}

            {/* Address and Phone */}
            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              {provider.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(provider.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-charcoal/65 hover:text-brand transition-colors"
                >
                  <MapPin className="w-4 h-4 text-brand" />
                  <span>{provider.address}</span>
                </a>
              )}
              {provider.phone && !contactRevealed && (
                <button
                  onClick={handleRevealContact}
                  disabled={revealing}
                  className="btn-primary gap-2 px-4 py-2 text-sm disabled:pointer-events-none disabled:opacity-60"
                >
                  <Phone className="w-4 h-4" />
                  {revealing ? 'Revealing...' : isAuthenticated ? 'Reveal Phone Number' : 'Log in to see number'}
                </button>
              )}
              {provider.phone && contactRevealed && (
                <div className="space-y-2">
                  <a
                    href={`tel:${provider.phone}`}
                    className="btn-primary gap-2 px-4 py-2 text-sm"
                  >
                    <Phone className="w-4 h-4" />
                    Call {provider.phone}
                  </a>
                  <a
                    href={`https://wa.me/${provider.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-leaf bg-leaf px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_#235943] transition-colors hover:bg-[#28684f]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Profile image */}
          {provider.profile_image && (
            <div className="flex-shrink-0">
              <img
                src={provider.profile_image}
                alt={provider.business_name}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg object-cover border border-ink/10 shadow-[0_10px_22px_rgba(21,50,58,0.12)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Meta info + share */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-ink/10">
          <div className="flex items-center gap-2 text-xs text-charcoal/40">
            <Clock className="w-3.5 h-3.5" />
            <span>Member since {formatDate(provider.created_at)}</span>
          </div>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-lg border border-ink/10 bg-surface px-4 py-2 text-sm font-bold text-charcoal/70 hover:border-brand/40 hover:text-brand transition-colors"
          >
            {shared ? <Check className="w-4 h-4 text-leaf" /> : <Share2 className="w-4 h-4" />}
            {shared ? 'Link copied!' : 'Share'}
          </button>
        </div>
      </section>

      {/* Work Catalog / Gallery */}
      {provider.work_images && provider.work_images.length > 0 && (
        <section className="glass mt-6 p-5 sm:p-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-6">
            <Images className="w-5 h-5 text-brand" />
            <h2 className="font-display text-2xl font-semibold text-ink">Work catalog</h2>
            <span className="text-sm text-charcoal/50">({provider.work_images.length} photos)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {provider.work_images.map((img) => (
              <button
                key={img.id}
                onClick={() => setLightboxImage(assetUrl(img.image_url))}
                className="overflow-hidden rounded-lg border border-ink/10 aspect-[4/3] bg-surface-muted transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <img
                  src={assetUrl(img.image_url)}
                  alt={img.caption || `Work by ${provider.business_name}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
            onClick={() => setLightboxImage(null)}
            aria-label="Close image preview"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxImage} alt="Work sample" className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      )}

      {/* Reviews Section */}
      <section className="glass mt-6 p-5 sm:p-6 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-brand" />
          <h2 className="font-display text-2xl font-semibold text-ink">
            Community reviews
          </h2>
          <span className="text-sm text-charcoal/50">
            ({provider.review_count})
          </span>
        </div>

        {/* Review requires prior contact */}
        {isAuthenticated && !hasReviewed && !contactRevealed && (
          <div className="mb-6 border-l-4 border-clay bg-amber-50 px-4 py-3 text-sm leading-6 text-charcoal/65">
            Reviews are reserved for people who have contacted this artisan. Reveal their phone
            number above first, then come back anytime to share your experience.
          </div>
        )}

        {/* Review Form */}
        {isAuthenticated && !hasReviewed && contactRevealed && (
          <form onSubmit={handleReviewSubmit} className="mb-8 border border-ink/10 bg-surface-muted p-5 rounded-lg">
            <h3 className="font-display text-xl font-semibold text-ink mb-3">Write a review</h3>

            <div className="mb-4">
              <label className="block text-sm font-bold text-charcoal/70 mb-2">
                Your Rating
              </label>
              <StarRating
                rating={reviewRating}
                interactive
                onRate={setReviewRating}
                size="lg"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="reviewComment" className="block text-sm font-bold text-charcoal/70 mb-2">
                Your Comment
              </label>
              <textarea
                id="reviewComment"
                className="glass-input w-full min-h-[100px] resize-y"
                placeholder="Share your experience with this provider..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                required
              />
            </div>

            {/* Optional proof-of-work photo */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-charcoal/70 mb-2">
                Photo of the work (optional, useful proof for others)
              </label>
              {reviewImage ? (
                <div className="flex items-center gap-3">
                  <img
                    src={URL.createObjectURL(reviewImage)}
                    alt="Preview"
                    className="w-20 h-20 rounded-lg border border-ink/10 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setReviewImage(null)}
                    className="text-sm text-red-500 hover:text-red-600 font-medium inline-flex items-center gap-1"
                  >
                    <X className="w-4 h-4" /> Remove
                  </button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 rounded-lg border border-ink/10 bg-surface px-4 py-2.5 text-sm font-bold text-charcoal/70 hover:border-brand/40 hover:text-brand cursor-pointer transition-colors">
                  <ImagePlus className="w-4 h-4" />
                  Add a photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => setReviewImage(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>

            {reviewMessage && (
              <div
                className={`mb-4 px-4 py-3 rounded-lg text-sm animate-fade-in ${
                  reviewMessage.type === 'success'
                    ? 'bg-teal-50 border border-teal-100 text-leaf'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {reviewMessage.text}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-2"
              disabled={submittingReview || !reviewComment.trim()}
            >
              {submittingReview ? (
                <>
                  <span className="spinner !w-4 !h-4 !border-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  Submit Review
                </>
              )}
            </button>
          </form>
        )}

        {/* Already reviewed notice */}
        {isAuthenticated && hasReviewed && (
          <div className="mb-6 border-l-4 border-leaf bg-teal-50 px-4 py-3 text-sm text-charcoal/65">
            You have already reviewed this provider.
          </div>
        )}

        {/* Review List */}
        {reviews.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="w-12 h-12 text-charcoal/20 mx-auto mb-3" />
            <p className="text-charcoal/50 font-medium">
              No reviews yet. Be the first to review!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ink/10">
            {reviews.map((review) => (
              <article key={review.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-ink">
                    {review.reviewer_name}
                  </span>
                  <span className="font-mono text-[11px] text-charcoal/40">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                <div className="mb-2">
                  <StarRating rating={review.rating} size="sm" />
                </div>
                {review.comment && (
                  <p className="text-charcoal/70 text-sm leading-relaxed">
                    {review.comment}
                  </p>
                )}
                {review.image_url && (
                  <button
                    onClick={() => setLightboxImage(assetUrl(review.image_url))}
                    className="mt-3 block overflow-hidden rounded-lg border border-ink/10 hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={assetUrl(review.image_url)}
                      alt="Proof of work"
                      className="max-h-40 rounded-lg object-cover"
                      loading="lazy"
                    />
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
