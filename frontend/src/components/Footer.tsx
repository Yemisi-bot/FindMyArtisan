import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-ink/10 bg-white/55">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group w-fit">
            <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center shadow-[0_2px_0_#084852]">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-base font-semibold text-charcoal">
              FindMy<span className="text-clay">Artisan</span>
            </span>
            <span className="hidden lg:inline text-xs text-charcoal/45 border-l border-charcoal/15 pl-2 ml-1">
              Trusted local artisans in Ilaro
            </span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            <Link to="/" className="font-semibold text-charcoal/60 hover:text-brand transition-colors">Home</Link>
            <Link to="/discover" className="font-semibold text-charcoal/60 hover:text-brand transition-colors">Find Services</Link>
            <Link to="/register-provider" className="font-semibold text-charcoal/60 hover:text-brand transition-colors">For Artisans</Link>
            <Link to="/login" className="font-semibold text-charcoal/60 hover:text-brand transition-colors">Login</Link>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-charcoal/45 md:text-right">
            &copy; {currentYear} FindMyArtisan · Federal Polytechnic Ilaro
          </p>
      </div>
    </footer>
  );
}
