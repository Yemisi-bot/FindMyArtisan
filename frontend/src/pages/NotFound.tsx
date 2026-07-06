import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center relative overflow-hidden px-4">
      {/* Decorative blobs */}
      <div className="absolute top-20 left-10 w-64 h-64 glass-light rounded-full opacity-40 animate-float" />
      <div className="absolute bottom-20 right-10 w-80 h-80 glass-light rounded-full opacity-30 animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="text-center animate-fade-in-up">
        <p className="text-8xl sm:text-9xl font-extrabold text-amber-500/80 select-none">
          404
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-charcoal mt-4">
          Page Not Found
        </h1>
        <p className="text-charcoal/60 text-lg mt-3 max-w-md mx-auto">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 mt-8"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
