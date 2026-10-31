import React from 'react';
import { Star, Crown } from 'lucide-react';
import { UserPlan } from '../types';

interface SubscriptionBadgeProps {
  plan?: UserPlan | null;
  size?: 'sm' | 'md' | 'lg';
  showCrownForPro?: boolean;
  className?: string;
}

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  plan = 'free',
  size = 'sm',
  showCrownForPro = true,
  className = '',
}) => {
  if (!plan || plan === 'free') {
    return null;
  }

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (plan === 'plus') {
    return (
      <span
        title="PulseChat Plus Member"
        className={`inline-flex items-center text-blue-500 hover:text-blue-600 transition-colors shrink-0 ${className}`}
      >
        <Star className={`${iconSizes[size]} fill-blue-500 stroke-blue-500 drop-shadow-[0_1px_2px_rgba(59,130,246,0.3)]`} />
      </span>
    );
  }

  if (plan === 'pro') {
    return (
      <span
        title="PulseChat Pro Member"
        className={`inline-flex items-center gap-1 shrink-0 ${className}`}
      >
        <Star className={`${iconSizes[size]} text-amber-500 fill-amber-400 drop-shadow-[0_1px_2px_rgba(245,158,11,0.3)]`} />
        {showCrownForPro && (
          <Crown className={`${iconSizes[size]} text-amber-500 fill-amber-300 drop-shadow-[0_1px_2px_rgba(245,158,11,0.3)]`} />
        )}
      </span>
    );
  }

  return null;
};
