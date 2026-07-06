import { Link } from 'react-router-dom';
import {
  MapPin,
  Star,
  Zap,
  Wrench,
  Shield,
  Navigation,
  Smartphone,
  ChevronRight,
} from 'lucide-react';

const categories = [
  { name: 'Electrician', icon: '⚡' },
  { name: 'Plumber', icon: '🔧' },
  { name: 'Carpenter', icon: '🪚' },
  { name: 'Painter', icon: '🎨' },
  { name: 'Tiler', icon: '📐' },
  { name: 'Welder', icon: '🔥' },
  { name: 'Generator Tech', icon: '⚙️' },
  { name: 'AC Tech', icon: '❄️' },
  { name: 'Solar Installer', icon: '☀️' },
];

const steps = [
  {
    number: '01',
    icon: MapPin,
    title: 'Find Nearby Artisans',
    description:
      'Use GPS to discover trusted artisans within your neighborhood.',
  },
  {
    number: '02',
    icon: Star,
    title: 'Read Community Reviews',
    description:
      'Make informed decisions with honest reviews from your community.',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Connect & Get It Done',
    description:
      'Contact providers directly and get your job done fast.',
  },
];

const features = [
  {
    icon: Shield,
    title: 'Proof of Real Work',
    description:
      'Every artisan shows real photos of their work before they go live.',
  },
  {
    icon: Navigation,
    title: 'Real-Time Location',
    description:
      'Find the closest artisans to you with live GPS tracking.',
  },
  {
    icon: Star,
    title: 'Community Reviews',
    description:
      'Real feedback from real people in your neighborhood.',
  },
  {
    icon: Smartphone,
    title: 'PWA - No Install Needed',
    description:
      'Works like an app without taking up space on your phone.',
  },
];

export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      {/* ===== HERO SECTION ===== */}
      <section className="relative flex flex-col items-center justify-center pt-6 md:pt-10 pb-16 md:pb-20">
        {/* Decorative Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-amber-300/20 to-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-gradient-to-tr from-teal-300/15 to-amber-200/10 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-amber-200/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-72 h-72 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        {/* Floating Icons (decorative) */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none">
          <MapPin className="absolute top-32 left-[12%] w-8 h-8 text-amber-500/40 animate-float" style={{ animationDelay: '0s' }} />
          <Wrench className="absolute top-48 right-[15%] w-7 h-7 text-amber-600/30 animate-float" style={{ animationDelay: '0.8s' }} />
          <Star className="absolute bottom-40 left-[18%] w-6 h-6 text-amber-400/50 animate-float" style={{ animationDelay: '1.6s' }} />
          <Zap className="absolute bottom-52 right-[12%] w-7 h-7 text-amber-500/40 animate-float" style={{ animationDelay: '2.4s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Hero Text */}
            <div className="flex-1 text-center lg:text-left stagger">
              <div className="inline-flex items-center gap-2 glass-light px-4 py-2 rounded-full text-sm font-medium text-charcoal/70 mb-6 animate-fade-in-up">
                <MapPin className="w-4 h-4 text-amber-600" />
                Serving Ilaro & Surrounding Communities
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 animate-fade-in-up">
                <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 bg-clip-text text-transparent">
                  Find Trusted Artisans,
                </span>
                <br />
                <span className="text-charcoal">
                  Right in Your Neighborhood
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-charcoal/60 max-w-2xl mx-auto lg:mx-0 mb-8 animate-fade-in-up leading-relaxed">
                Connect with verified electricians, plumbers, carpenters, and
                more in Ilaro &mdash; instantly.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start animate-fade-in-up">
                <Link
                  to="/discover"
                  className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base shadow-lg shadow-amber-500/30 hover:shadow-amber-500/45"
                >
                  Find an Artisan
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/register-provider"
                  className="btn-glass inline-flex items-center gap-2 px-8 py-3.5 text-base"
                >
                  Join as an Artisan
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start animate-fade-in-up">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white/60 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs text-white font-bold shadow-sm"
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-charcoal/50">
                  Trusted by <span className="font-semibold text-charcoal/70">100+</span> locals
                </p>
              </div>
            </div>

            {/* Hero Visual - Decorative Glass Cards Stack */}
            <div className="flex flex-1 justify-center relative mt-8 lg:mt-0">
              <div className="relative w-72 sm:w-80 h-80 sm:h-96">
                {/* Back card */}
                <div className="glass-light absolute top-4 left-4 w-56 sm:w-64 h-64 sm:h-72 rounded-2xl rotate-6 border border-white/20" />
                {/* Middle card */}
                <div className="glass absolute top-2 left-2 w-64 sm:w-72 h-72 sm:h-80 rounded-2xl -rotate-3 border border-white/25" />
                {/* Front card */}
                <div className="glass-strong relative z-10 w-full h-full rounded-2xl flex flex-col items-center justify-center gap-4 p-8 border border-white/40">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-charcoal font-semibold text-lg text-center">
                    Trusted Artisans
                  </p>
                  <p className="text-charcoal/50 text-sm text-center">
                    Just a tap away
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="w-4 h-4 text-amber-500 fill-amber-500"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ===== STATS BAR (overlaps hero) ===== */}
      <section className="relative z-20 -mt-8 md:-mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-strong rounded-3xl p-2 grid grid-cols-3 divide-x divide-white/40">
            <div className="px-3 py-5 sm:py-6 text-center">
              <p className="text-2xl sm:text-4xl font-extrabold text-amber-600">30+</p>
              <p className="text-xs sm:text-sm text-charcoal/60 mt-1">Local Artisans</p>
            </div>
            <div className="px-3 py-5 sm:py-6 text-center">
              <p className="text-2xl sm:text-4xl font-extrabold text-amber-600">10</p>
              <p className="text-xs sm:text-sm text-charcoal/60 mt-1">Service Categories</p>
            </div>
            <div className="px-3 py-5 sm:py-6 text-center">
              <p className="text-2xl sm:text-4xl font-extrabold text-amber-600">5km</p>
              <p className="text-xs sm:text-sm text-charcoal/60 mt-1">Coverage Radius</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 stagger">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest">
              Simple Process
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal mt-3">
              How It Works
            </h2>
            <p className="text-charcoal/60 mt-3 max-w-xl mx-auto">
              Finding the right artisan has never been easier. Just three simple
              steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="glass rounded-2xl p-8 relative transition-all duration-300 hover:translate-y-[-4px] hover:shadow-xl"
                >
                  {/* Step Number */}
                  <span className="absolute top-4 right-6 text-5xl font-black text-amber-500/10 select-none">
                    {step.number}
                  </span>

                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center mb-5">
                    <Icon className="w-7 h-7 text-amber-600" />
                  </div>

                  <h3 className="text-xl font-bold text-charcoal mb-3">
                    {step.title}
                  </h3>
                  <p className="text-charcoal/60 text-sm leading-relaxed">
                    {step.description}
                  </p>

                  {/* Connector line (desktop) */}
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-amber-400/40 to-transparent" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 stagger">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest">
              Why Choose Us
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal mt-3">
              Everything You Need
            </h2>
            <p className="text-charcoal/60 mt-3 max-w-xl mx-auto">
              Built from the ground up to make finding help effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="glass rounded-2xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-xl"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-bold text-charcoal mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-charcoal/60 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CATEGORIES SHOWCASE ===== */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 stagger">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest">
              Browse by Trade
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal mt-3">
              Service Categories
            </h2>
            <p className="text-charcoal/60 mt-3 max-w-xl mx-auto">
              From electrical work to solar installations &mdash; find the right
              expert for every job.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 stagger">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={`/discover?category=${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="glass rounded-2xl p-5 sm:p-6 flex flex-col items-center gap-3 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-xl group"
              >
                <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300">
                  {cat.icon}
                </span>
                <span className="text-sm sm:text-base font-semibold text-charcoal text-center">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass rounded-3xl p-10 sm:p-14 md:p-20 text-center relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-amber-400/10 blur-2xl" />
            <div className="absolute -bottom-20 -left-20 w-52 h-52 rounded-full bg-teal-400/10 blur-2xl" />

            <div className="relative z-10 stagger">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal mb-4">
                Ready to find your artisan?
              </h2>
              <p className="text-charcoal/60 text-lg mb-8 max-w-lg mx-auto">
                Join hundreds of people in Ilaro who have found their perfect
                service provider.
              </p>
              <Link
                to="/discover"
                className="btn-primary inline-flex items-center gap-2 px-10 py-4 text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/45"
              >
                Get Started Now
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom spacer for the fixed navbar */}
      <div className="h-4" />
    </div>
  );
}
