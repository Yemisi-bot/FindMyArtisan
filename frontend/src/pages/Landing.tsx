import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  MapPin,
  Star,
  Zap,
  ShieldCheck,
  Navigation,
  Smartphone,
  ChevronRight,
  Search,
} from 'lucide-react';
import TradeIcon from '../components/TradeIcon';

const categories = [
  { name: 'Electrician', slug: 'electrician' },
  { name: 'Plumber', slug: 'plumber' },
  { name: 'Carpenter', slug: 'carpenter' },
  { name: 'Painter', slug: 'painter' },
  { name: 'Tiler', slug: 'tiler' },
  { name: 'Welder', slug: 'welder' },
  { name: 'Generator Tech', slug: 'generator-tech' },
  { name: 'AC Tech', slug: 'ac-tech' },
  { name: 'Solar Installer', slug: 'solar-installer' },
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
    icon: ShieldCheck,
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
    <div className="overflow-hidden">
      <section className="border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_25rem] items-center gap-10 lg:gap-16">
            <div className="max-w-3xl animate-fade-in-up">
              <p className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand">
                <MapPin className="w-3.5 h-3.5" />
                Ilaro service network
              </p>
              <h1 className="font-display mt-5 max-w-3xl text-5xl font-semibold leading-[0.98] text-ink sm:text-6xl lg:text-7xl">
                Reliable help is closer than it looks.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-charcoal/70 sm:text-lg">
                Find local electricians, plumbers, carpenters, and more. Review their work, compare distance, then call with confidence.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/discover" className="btn-primary gap-2 px-6 py-3.5">
                  Find an artisan
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link to="/register-provider" className="btn-glass gap-2 px-6 py-3.5">
                  List your service
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="mt-7 flex items-center gap-2 text-sm text-charcoal/65">
                <ShieldCheck className="h-4 w-4 shrink-0 text-leaf" />
                See work photos and community reviews before you make contact.
              </p>
            </div>

            <aside className="bg-brand p-5 text-white shadow-[0_18px_38px_rgba(8,72,82,0.2)] sm:p-7">
              <div className="flex items-center justify-between border-b border-white/20 pb-5">
                <div>
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-white/65">Start here</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">Find a nearby trade</h2>
                </div>
                <MapPin className="h-7 w-7 text-clay" />
              </div>
              <Link to="/discover" className="mt-5 flex items-center gap-3 border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/16">
                <Search className="h-4 w-4 text-white/70" />
                Search every service
                <ChevronRight className="ml-auto h-4 w-4" />
              </Link>
              <div className="mt-5 grid grid-cols-2 gap-px bg-white/20">
                {categories.slice(0, 4).map((category) => (
                  <Link
                    key={category.slug}
                    to={`/discover?category=${category.slug}`}
                    className="group flex items-center gap-2 bg-brand px-3 py-3 text-sm font-semibold transition-colors hover:bg-brand-deep"
                  >
                    <TradeIcon category={category.name} className="h-4 w-4 text-clay" />
                    <span className="truncate">{category.name}</span>
                  </Link>
                ))}
              </div>
              <p className="mt-5 border-t border-white/20 pt-4 text-sm leading-6 text-white/70">
                Browse by location, category, or the job you need done.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-white/45">
        <div className="max-w-7xl mx-auto grid grid-cols-3 divide-x divide-ink/10 px-4 sm:px-6 lg:px-8">
          <div className="py-6 text-center sm:py-8">
            <p className="font-display text-3xl font-semibold text-clay sm:text-4xl">30+</p>
            <p className="mt-1 text-xs font-semibold text-charcoal/60 sm:text-sm">Local artisans</p>
          </div>
          <div className="py-6 text-center sm:py-8">
            <p className="font-display text-3xl font-semibold text-clay sm:text-4xl">10</p>
            <p className="mt-1 text-xs font-semibold text-charcoal/60 sm:text-sm">Service categories</p>
          </div>
          <div className="py-6 text-center sm:py-8">
            <p className="font-display text-3xl font-semibold text-clay sm:text-4xl">5 km</p>
            <p className="mt-1 text-xs font-semibold text-charcoal/60 sm:text-sm">Coverage radius</p>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-clay">A direct route</p>
            <h2 className="font-display mt-3 text-3xl font-semibold text-ink sm:text-4xl">Get help without the guesswork.</h2>
          </div>
          <div className="mt-10 grid border-t border-ink/15 md:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="border-b border-ink/15 py-7 pr-6 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                  <div className="flex items-center justify-between">
                    <Icon className="h-6 w-6 text-brand" />
                    <span className="font-mono text-xs font-medium text-clay">{step.number}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal/65">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-ink/10 bg-white/50 py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-brand">Browse by trade</p>
              <h2 className="font-display mt-3 text-3xl font-semibold text-ink sm:text-4xl">The right hands for every job.</h2>
            </div>
            <Link to="/discover" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:text-brand-deep">
              View all services
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/discover?category=${category.slug}`}
                className="group flex items-center gap-4 bg-[#fffefa] px-5 py-4 transition-colors hover:bg-[#eaf2ef]"
              >
                <span className="flex h-10 w-10 items-center justify-center border border-brand/20 bg-brand/8 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                  <TradeIcon category={category.name} className="h-5 w-5" />
                </span>
                <span className="font-semibold text-ink">{category.name}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-charcoal/35 transition-transform group-hover:translate-x-1 group-hover:text-brand" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid border border-ink/15 bg-ink text-white lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="p-7 sm:p-10">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-clay">Built for the neighborhood</p>
              <h2 className="font-display mt-3 max-w-xl text-3xl font-semibold sm:text-4xl">Need a local expert today?</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/70 sm:text-base">Explore nearby artisans, see evidence of their work, and reach out when you are ready.</p>
            </div>
            <div className="border-t border-white/15 p-7 lg:border-l lg:border-t-0 lg:p-10">
              <Link to="/discover" className="inline-flex items-center gap-2 border border-white/25 bg-white px-5 py-3 text-sm font-bold text-ink transition-colors hover:bg-[#eaf2ef]">
                Start your search
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-ink/10 py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-leaf">Built for confidence</p>
            <h2 className="font-display mt-3 text-3xl font-semibold text-ink sm:text-4xl">Enough detail to choose well.</h2>
          </div>
          <div className="mt-10 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-[#f5f6f1] p-6">
                  <Icon className="h-6 w-6 text-leaf" />
                  <h3 className="mt-8 text-base font-bold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal/65">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
