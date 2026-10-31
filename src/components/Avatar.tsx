import React from 'react';
import { Camera } from 'lucide-react';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  showOnlineStatus?: boolean;
  statusRing?: 'none' | 'unviewed' | 'viewed';
  showCameraHover?: boolean;
  onCameraClick?: (e?: React.MouseEvent) => void;
  className?: string;
}

const colorMap: Record<string, { bg: string; text: string }> = {
  mint: { bg: 'bg-[#D1FAE5] dark:bg-emerald-950/80', text: 'text-emerald-800 dark:text-emerald-200' },
  green: { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-700 dark:text-emerald-200' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-200' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-700 dark:text-pink-200' },
  orange: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-200' },
  slate: { bg: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-200' },
  'dark grey': { bg: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-200' },
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarUrl,
  avatarColor = 'mint',
  size = 'md',
  isOnline = false,
  showOnlineStatus = false,
  statusRing = 'none',
  showCameraHover = false,
  onCameraClick,
  className = '',
}) => {
  const sizeMap = {
    xs: { box: 'w-6 h-6 text-xs', indicator: 'w-2 h-2', camera: 'w-3 h-3' },
    sm: { box: 'w-8 h-8 text-xs font-semibold', indicator: 'w-2.5 h-2.5', camera: 'w-3.5 h-3.5' },
    md: { box: 'w-10 h-10 text-sm font-semibold', indicator: 'w-3 h-3', camera: 'w-4 h-4' },
    lg: { box: 'w-12 h-12 text-base font-semibold', indicator: 'w-3.5 h-3.5', camera: 'w-5 h-5' },
    xl: { box: 'w-16 h-16 text-xl font-bold', indicator: 'w-4 h-4', camera: 'w-6 h-6' },
    '2xl': { box: 'w-24 h-24 text-3xl font-bold', indicator: 'w-5 h-5', camera: 'w-8 h-8' },
  };

  const { box, indicator, camera } = sizeMap[size];
  const color = colorMap[avatarColor?.toLowerCase()] || colorMap.mint;
  const initial = (name || 'P').trim().charAt(0).toUpperCase();

  const ringClass =
    statusRing === 'unviewed'
      ? 'p-0.5 rounded-full ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
      : statusRing === 'viewed'
      ? 'p-0.5 rounded-full ring-2 ring-slate-300 dark:ring-slate-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
      : '';

  return (
    <div className={`relative inline-block shrink-0 ${ringClass} ${className}`}>
      <div
        className={`relative ${box} rounded-full overflow-hidden flex items-center justify-center select-none shadow-xs transition-transform duration-150 ${
          showCameraHover ? 'group cursor-pointer' : ''
        }`}
        onClick={showCameraHover ? onCameraClick : undefined}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback to initial if image fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${color.bg} ${color.text}`}>
            {initial}
          </div>
        )}

        {/* Camera Overlay for changing DP */}
        {showCameraHover && (
          <div
            title="Change Profile Picture (DP)"
            className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-white"
          >
            <Camera className={camera} />
          </div>
        )}
      </div>

      {/* Online/Offline indicator dot */}
      {showOnlineStatus && (
        <span
          className={`absolute bottom-0 right-0 ${indicator} rounded-full ring-2 ring-white dark:ring-slate-900 ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
