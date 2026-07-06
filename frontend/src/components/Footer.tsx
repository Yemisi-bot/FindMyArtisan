import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="px-4 sm:px-6 lg:px-8 pb-4 mt-8">
      <div className="max-w-7xl mx-auto">
        <div className="glass rounded-2xl px-5 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group w-fit">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-charcoal">
              FindMy<span className="text-amber-600">Artisan</span>
            </span>
            <span className="hidden lg:inline text-xs text-charcoal/45 border-l border-charcoal/15 pl-2 ml-1">
              Trusted local artisans in Ilaro
            </span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            <Link to="/" className="text-charcoal/60 hover:text-amber-600 transition-colors">Home</Link>
            <Link to="/discover" className="text-charcoal/60 hover:text-amber-600 transition-colors">Find Services</Link>
            <Link to="/register-provider" className="text-charcoal/60 hover:text-amber-600 transition-colors">For Artisans</Link>
            <Link to="/login" className="text-charcoal/60 hover:text-amber-600 transition-colors">Login</Link>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-charcoal/45 md:text-right">
            &copy; {currentYear} FindMyArtisan · Federal Polytechnic Ilaro
          </p>
        </div>
      </div>
    </footer>
  );
}
