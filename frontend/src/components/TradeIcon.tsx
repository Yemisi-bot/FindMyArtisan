import {
  AirVent,
  Bolt,
  Flame,
  Hammer,
  Paintbrush,
  Ruler,
  Settings2,
  SunMedium,
  Wrench,
  type LucideProps,
} from 'lucide-react';

interface TradeIconProps extends LucideProps {
  category: string;
}

const iconForCategory = (category: string) => {
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory.includes('electric')) return Bolt;
  if (normalizedCategory.includes('plumb')) return Wrench;
  if (normalizedCategory.includes('carpent')) return Hammer;
  if (normalizedCategory.includes('paint')) return Paintbrush;
  if (normalizedCategory.includes('tile')) return Ruler;
  if (normalizedCategory.includes('weld')) return Flame;
  if (normalizedCategory.includes('generator')) return Settings2;
  if (normalizedCategory.includes('ac') || normalizedCategory.includes('air')) return AirVent;
  if (normalizedCategory.includes('solar')) return SunMedium;

  return Wrench;
};

export default function TradeIcon({ category, ...props }: TradeIconProps) {
  const Icon = iconForCategory(category);
  return <Icon aria-hidden="true" {...props} />;
}