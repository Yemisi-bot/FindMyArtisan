import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, User, Mail, Lock, Phone, AlertCircle, CheckCircle, Wrench, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type SignupRole = 'user' | 'provider';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<SignupRole>('user');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!fullName || !email || !password || !confirmPassword) {
      return 'Please fill in all required fields';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const user = await register(email, password, fullName, phone || undefined, role);
      setSuccess('Account created! Taking you in...');
      // Artisans go straight to business profile setup; users go to discovery.
      const destination = (role || user.role) === 'provider' ? '/register-provider' : '/discover';
      setTimeout(() => navigate(destination, { replace: true }), 600);
    } catch (err: unknown) {
      // Prefer the API's message (e.g. "email already exists") over axios's generic status text
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center relative overflow-hidden px-4">
      {/* Decorative blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 glass-light rounded-full opacity-40 animate-float" />
      <div className="absolute bottom-20 right-10 w-80 h-80 glass-light rounded-full opacity-30 animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/3 w-48 h-48 glass-light rounded-full opacity-25 animate-float" style={{ animationDelay: '0.8s' }} />

      <div className="w-full max-w-md mx-auto mt-16 mb-16">
        <div className="glass-strong p-10 animate-fade-in-up">
          {/* Logo / Icon */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Create Your Account</h1>
            <p className="text-gray-600 mt-1">Join the FindMyArtisan community</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-6 text-sm animate-fade-in">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* ── ROLE SELECTOR ──────────────────────────── */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I want to...
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  role === 'user'
                    ? 'border-amber-500 bg-amber-50 shadow-md'
                    : 'border-gray-200 bg-white/40 hover:border-gray-300'
                }`}
              >
                <Search className={`w-6 h-6 mb-2 ${role === 'user' ? 'text-amber-600' : 'text-gray-400'}`} />
                <div className={`text-sm font-semibold ${role === 'user' ? 'text-amber-700' : 'text-gray-700'}`}>
                  Find Artisans
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Search &amp; hire service providers
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole('provider')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  role === 'provider'
                    ? 'border-amber-500 bg-amber-50 shadow-md'
                    : 'border-gray-200 bg-white/40 hover:border-gray-300'
                }`}
              >
                <Wrench className={`w-6 h-6 mb-2 ${role === 'provider' ? 'text-amber-600' : 'text-gray-400'}`} />
                <div className={`text-sm font-semibold ${role === 'provider' ? 'text-amber-700' : 'text-gray-700'}`}>
                  Work as an Artisan
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Get hired &amp; grow your business
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                {role === 'provider' ? 'Full Name / Business Name' : 'Full Name'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                <input
                  id="fullName"
                  type="text"
                  className="glass-input pl-10"
                  placeholder={role === 'provider' ? 'John Doe or Bright Spark Electricals' : 'John Doe'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                <input
                  id="email"
                  type="email"
                  className="glass-input pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                <input
                  id="password"
                  type="password"
                  className="glass-input pl-10"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              {password.length > 0 && password.length < 6 && (
                <p className="text-xs text-red-500 mt-1">
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                <input
                  id="confirmPassword"
                  type="password"
                  className="glass-input pl-10"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number {role === 'provider' && <span className="text-red-500">*</span>}
                {role === 'user' && <span className="text-gray-400 font-normal">(optional)</span>}
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
                  autoComplete="tel"
                  required={role === 'provider'}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner !w-5 !h-5 !border-2" />
                  Creating Account...
                </>
              ) : role === 'provider' ? (
                'Create Artisan Account'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-gray-600 mt-8 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-600 hover:text-amber-700 font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
