import { useState, useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MailCheck, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../services/api';

const OTP_LENGTH = 6;

export default function VerifyEmail() {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Email comes from the signup/login redirect; fall back to manual entry
  const stateEmail = (location.state as { email?: string; role?: string } | null)?.email || '';
  const role = (location.state as { role?: string } | null)?.role;

  const [email, setEmail] = useState(stateEmail);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [info, setInfo] = useState(
    stateEmail ? `We sent a 6-digit code to ${stateEmail}. It expires in 10 minutes.` : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((d, i) => (next[i] = d));
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    const otp = digits.join('');
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (otp.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const user = await verifyOtp(email, otp);
      // Artisans go straight to business profile setup; users go to discovery
      if ((role || user.role) === 'provider') {
        navigate('/register-provider', { replace: true });
      } else {
        navigate('/discover', { replace: true });
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Verification failed. Please try again.');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setResending(true);
    setError('');
    try {
      await authApi.resendOtp({ email });
      setInfo(`A new code has been sent to ${email}.`);
      setCooldown(60);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute top-10 left-10 w-72 h-72 glass-light rounded-full opacity-40 animate-float" />
      <div className="absolute bottom-20 right-10 w-80 h-80 glass-light rounded-full opacity-30 animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="w-full max-w-md mx-auto mt-16 mb-16">
        <div className="glass-strong p-10 animate-fade-in-up">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <MailCheck className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Verify Your Email</h1>
            <p className="text-gray-600 mt-1 text-center">Enter the code we emailed you to activate your account</p>
          </div>

          {info && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-6 text-sm animate-fade-in">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{info}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!stateEmail && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all bg-white/70"
              />
            </div>
          )}

          {/* OTP inputs */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-8">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all bg-white/70"
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold transition-all shadow-lg shadow-amber-200"
          >
            {submitting ? 'Verifying...' : 'Verify Email'}
          </button>

          <div className="mt-6 text-center text-sm text-gray-600">
            Didn't get the code?{' '}
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500">
            Wrong account? <Link to="/signup" className="text-amber-600 font-semibold hover:text-amber-700">Sign up again</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
