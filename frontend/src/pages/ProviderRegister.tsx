import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Building2, Phone, Navigation, Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { providersApi } from '../services/api';
import type { ServiceCategory } from '../types';

export default function ProviderRegister() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [businessName, setBusinessName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Prefill phone from the signed-in user's account so they don't retype it
  useEffect(() => {
    if (user?.phone) {
      setPhone((prev) => prev || user.phone || '');
    }
  }, [user]);

  // Revoke object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (profilePreview) URL.revokeObjectURL(profilePreview);
    };
  }, [profilePreview]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Please choose a JPEG, PNG, WebP or GIF image.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Image must be 25 MB or smaller.');
      return;
    }

    setError('');
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfileImage(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfileImage(null);
    setProfilePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await providersApi.getCategories();
        if (res.data.success && res.data.data) {
          setCategories(res.data.data as ServiceCategory[]);
        }
      } catch {
        setError('Failed to load categories. Please try again.');
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Use current location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
        setGettingLocation(false);
      },
      (err) => {
        let message = 'Failed to get location.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Location access was denied. Please enable location services.';
            break;
          case err.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case err.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        setError(message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate required fields
    if (!businessName.trim()) {
      setError('Business Name is required.');
      return;
    }
    if (!categoryId) {
      setError('Please select a service category.');
      return;
    }
    if (categoryId === '__custom__' && !customCategory.trim()) {
      setError('Please enter your custom service category.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone Number is required.');
      return;
    }
    if (!address.trim()) {
      setError('Address is required.');
      return;
    }

    setSubmitting(true);
    try {
      const isCustom = categoryId === '__custom__';
      const res = await providersApi.create({
        businessName: businessName.trim(),
        ...(isCustom
          ? { customCategory: customCategory.trim() }
          : { categoryId }),
        description: description.trim(),
        phone: phone.trim(),
        address: address.trim(),
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        profileImage,
      });

      if (res.data.success) {
        setSuccess('Profile submitted! Next: upload at least 3 photos of your work...');
        setTimeout(() => navigate('/my-business'), 1200);
      } else {
        setError(res.data.message || 'Registration failed. Please try again.');
      }
    } catch (err: unknown) {
      // Prefer the API's message over axios's generic status text
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] relative overflow-hidden px-4 py-8">
      {/* Decorative blobs */}
      <div className="absolute top-20 right-10 w-72 h-72 glass-light rounded-full opacity-40 animate-float pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-80 h-80 glass-light rounded-full opacity-30 animate-float pointer-events-none" style={{ animationDelay: '1.5s' }} />

      <div className="max-w-2xl mx-auto mt-8 mb-16">
        <div className="glass-strong p-8 sm:p-10 animate-fade-in-up">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-3xl font-bold text-charcoal">Register as a Service Provider</h1>
            <p className="text-charcoal/60 mt-1 text-center">
              Fill in your details to get started. Your profile will be reviewed by an admin.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success message */}
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-charcoal mb-2">Profile Submitted!</h2>
              <p className="text-charcoal/60 mb-6">{success}</p>
              <Link to="/discover" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
                <MapPin className="w-4 h-4" />
                Browse Artisans
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Business Name */}
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-charcoal/80 mb-1.5">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="businessName"
                  type="text"
                  className="glass-input"
                  placeholder="Your business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>

              {/* Service Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-charcoal/80 mb-1.5">
                  Service Category <span className="text-red-500">*</span>
                </label>
                {loadingCategories ? (
                  <div className="glass-input flex items-center gap-2 text-charcoal/50">
                    <span className="spinner !w-4 !h-4 !border-2" />
                    Loading categories...
                  </div>
                ) : (
                  <select
                    id="category"
                    className="glass-input"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                    <option value="__custom__">➕ Other (add your own)</option>
                  </select>
                )}

                {/* Custom category name — shown when "Other" is selected */}
                {categoryId === '__custom__' && (
                  <div className="mt-3 animate-fade-in">
                    <input
                      id="customCategory"
                      type="text"
                      className="glass-input"
                      placeholder="e.g. Baker, Nail Technician, Hairdresser…"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      maxLength={50}
                      required
                    />
                    <p className="text-xs text-charcoal/50 mt-1.5">
                      Don&apos;t see your trade? Type it here and we&apos;ll add it.
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-charcoal/80 mb-1.5">
                  Description
                </label>
                <textarea
                  id="description"
                  className="glass-input min-h-[100px] resize-y"
                  placeholder="Tell potential customers about your services, experience, and expertise..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-charcoal/80 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                  <input
                    id="phone"
                    type="tel"
                    className="glass-input pl-10"
                    placeholder="+234 800 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-charcoal/80 mb-1.5">
                  Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-amber-500" />
                  <textarea
                    id="address"
                    className="glass-input pl-10 min-h-[60px] resize-y"
                    placeholder="Your business address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    required
                  />
                </div>
              </div>

              {/* Location Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="latitude" className="block text-sm font-medium text-charcoal/80 mb-1.5">
                    Latitude
                  </label>
                  <input
                    id="latitude"
                    type="number"
                    step="any"
                    className="glass-input"
                    placeholder="6.8475"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    readOnly={!!latitude && gettingLocation === false}
                  />
                </div>
                <div>
                  <label htmlFor="longitude" className="block text-sm font-medium text-charcoal/80 mb-1.5">
                    Longitude
                  </label>
                  <input
                    id="longitude"
                    type="number"
                    step="any"
                    className="glass-input"
                    placeholder="3.6518"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    readOnly={!!longitude && gettingLocation === false}
                  />
                </div>
              </div>

              {/* Use Current Location Button */}
              <button
                type="button"
                className="btn-glass inline-flex items-center gap-2 w-full justify-center"
                onClick={handleGetLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <>
                    <span className="spinner !w-4 !h-4 !border-2" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    Use My Current Location
                  </>
                )}
              </button>

              {/* Profile Photo */}
              <div>
                <label className="block text-sm font-medium text-charcoal/80 mb-1.5">
                  Profile Photo <span className="text-charcoal/40 font-normal">(optional)</span>
                </label>

                <input
                  ref={fileInputRef}
                  id="profileImage"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageChange}
                />

                {profilePreview ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={profilePreview}
                      alt="Profile preview"
                      className="w-20 h-20 rounded-full object-cover border border-amber-200"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        className="btn-glass inline-flex items-center gap-2 text-sm px-4 py-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4" />
                        Change photo
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600"
                        onClick={clearImage}
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-amber-200 rounded-xl py-8 text-charcoal/50 hover:border-amber-400 hover:text-charcoal/70 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 text-amber-500" />
                    <span className="text-sm font-medium">Click to upload a photo</span>
                    <span className="text-xs text-charcoal/40">JPEG, PNG, WebP or GIF — up to 25 MB</span>
                  </button>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner !w-5 !h-5 !border-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Building2 className="w-5 h-5" />
                    Submit for Verification
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
