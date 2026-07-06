import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Phone, Shield, Clock, ArrowLeft, MessageSquare, Star, Share2, Images, ImagePlus, X, Check } from 'lucide-react';
import { providersApi, reviewsApi, assetUrl } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import StarRating from '../components/StarRating';
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
        className="inline-flex items-center gap-2 text-charcoal/60 hover:text-charcoal transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium">Back to Discover</span>
      </Link>

      {/* Provider Header Card */}
      <div className="glass-strong p-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex-1">
            {/* Category badge */}
            <div className="inline-flex items-center gap-2 glass-light px-3 py-1.5 rounded-full text-sm font-medium text-charcoal/70 mb-4">
              <span>{provider.category_icon}</span>
              <span>{provider.category_name}</span>
            </div>

            {/* Business name and verified badge */}
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h1 className="text-3xl sm:text-4xl font-bold text-charcoal">
                {provider.business_name}
              </h1>
              {provider.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Shield className="w-3.5 h-3.5" />
                  Verified
                </span>
              )}
            </div>

            {/* Star rating display */}
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={Math.round(Number(provider.average_rating))} size="md" />
              <span className="font-semibold text-charcoal">
                {Number(provider.average_rating).toFixed(1)}
              </span>
              <span className="text-charcoal/50 text-sm">
                ({provider.review_count} {provider.review_count === 1 ? 'review' : 'reviews'})
              </span>
              {provider.distance_km !== undefined && provider.distance_km !== null && (
                <span className="ml-2 glass-light px-2.5 py-1 rounded-full text-xs font-medium text-charcoal/60">
                  {provider.distance_km.toFixed(1)} km away
                </span>
              )}
            </div>

            {/* Description */}
            {provider.description && (
              <p className="text-charcoal/70 leading-relaxed mb-5 max-w-2xl">
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
                  className="inline-flex items-center gap-2 text-charcoal/60 hover:text-amber-600 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <span>{provider.address}</span>
                </a>
              )}
              {provider.phone && !contactRevealed && (
                <button
                  onClick={handleRevealContact}
                  disabled={revealing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 transition-all shadow-md"
                >
                  <Phone className="w-4 h-4" />
                  {revealing ? 'Revealing...' : isAuthenticated ? 'Reveal Phone Number' : 'Log in to see number'}
                </button>
              )}
              {provider.phone && contactRevealed && (
                <div className="space-y-2">
                  <a
                    href={`tel:${provider.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition-all shadow-md"
                  >
                    <Phone className="w-4 h-4" />
                    Call {provider.phone}
                  </a>
                  <a
                    href={`https://wa.me/${provider.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all shadow-md"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border-2 border-white/40 shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Meta info + share */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/20">
          <div className="flex items-center gap-2 text-xs text-charcoal/40">
            <Clock className="w-3.5 h-3.5" />
            <span>Member since {formatDate(provider.created_at)}</span>
          </div>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-charcoal/70 glass-light hover:bg-white/50 transition-all"
          >
            {shared ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
            {shared ? 'Link copied!' : 'Share'}
          </button>
        </div>
      </div>

      {/* Work Catalog / Gallery */}
      {provider.work_images && provider.work_images.length > 0 && (
        <div className="glass mt-6 p-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-6">
            <Images className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold text-charcoal">Work Catalog</h2>
            <span className="text-sm text-charcoal/50">({provider.work_images.length} photos)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {provider.work_images.map((img) => (
              <button
                key={img.id}
                onClick={() => setLightboxImage(assetUrl(img.image_url))}
                className="rounded-xl overflow-hidden aspect-[4/3] bg-gray-100 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-amber-400"
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
        </div>
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
          >
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxImage} alt="Work sample" className="max-w-full max-h-full rounded-xl shadow-2xl" />
        </div>
      )}

      {/* Reviews Section */}
      <div className="glass mt-6 p-6 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-bold text-charcoal">
            Community Reviews
          </h2>
          <span className="text-sm text-charcoal/50">
            ({provider.review_count})
          </span>
        </div>

        {/* Review requires prior contact */}
        {isAuthenticated && !hasReviewed && !contactRevealed && (
          <div className="mb-6 px-4 py-3 glass-light rounded-xl text-sm text-charcoal/60">
            Reviews are reserved for people who have contacted this artisan. Reveal their phone
            number above first — then come back anytime to share your experience.
          </div>
        )}

        {/* Review Form */}
        {isAuthenticated && !hasReviewed && contactRevealed && (
          <form onSubmit={handleReviewSubmit} className="mb-8 p-5 glass-light rounded-xl">
            <h3 className="font-semibold text-charcoal mb-3">Write a Review</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-charcoal/70 mb-2">
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
              <label htmlFor="reviewComment" className="block text-sm font-medium text-charcoal/70 mb-2">
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
              <label className="block text-sm font-medium text-charcoal/70 mb-2">
                Photo of the work (optional — great proof for others)
              </label>
              {reviewImage ? (
                <div className="flex items-center gap-3">
                  <img
                    src={URL.createObjectURL(reviewImage)}
                    alt="Preview"
                    className="w-20 h-20 rounded-lg object-cover"
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
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-charcoal/70 glass-light hover:bg-white/50 cursor-pointer transition-all">
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
                    ? 'bg-green-50 border border-green-200 text-green-700'
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
          <div className="mb-6 px-4 py-3 glass-light rounded-xl text-sm text-charcoal/60">
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
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="glass-light p-5 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-charcoal">
                    {review.reviewer_name}
                  </span>
                  <span className="text-xs text-charcoal/40">
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
                    className="mt-3 block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={assetUrl(review.image_url)}
                      alt="Proof of work"
                      className="max-h-40 rounded-lg object-cover"
                      loading="lazy"
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
