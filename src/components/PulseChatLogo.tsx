import React from 'react';

interface PulseChatLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  className?: string;
  textColor?: string;
}

export const PulseChatLogo: React.FC<PulseChatLogoProps> = ({
  size = 'md',
  withText = false,
  className = '',
  textColor = 'text-slate-900 dark:text-white',
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', svg: 28, text: 'text-base' },
    md: { box: 'w-9 h-9', svg: 36, text: 'text-lg' },
    lg: { box: 'w-12 h-12', svg: 48, text: 'text-2xl' },
    xl: { box: 'w-16 h-16', svg: 64, text: 'text-3xl' },
  };

  const { box, text } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Official PulseChat Logo: Rounded-square silhouette in soft light mint-green with white chat-bubble symbol */}
      <div
        className={`${box} relative flex items-center justify-center rounded-[24%] bg-[#6EE7B7] shadow-sm shrink-0 transition-transform duration-200 hover:scale-105`}
        style={{
          boxShadow: '0 2px 8px rgba(110, 231, 183, 0.35)',
        }}
        aria-label="PulseChat Logo"
      >
        <svg
          viewBox="0 0 40 40"
          className="w-[62%] h-[62%]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Exact white chat-bubble symbol with rounded speech tail */}
          <path
            d="M8 18.5C8 12.1487 13.3726 7 20 7C26.6274 7 32 12.1487 32 18.5C32 24.8513 26.6274 30 20 30C18.1523 30 16.4027 29.6054 14.8524 28.8953L8 31.5L9.95763 25.8778C8.7303 23.7386 8 21.2186 8 18.5Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {withText && (
        <span
          className={`font-bold tracking-tight ${text} ${textColor} flex items-center gap-1 select-none font-sans`}
        >
          <span>Pulse</span>
          <span className="text-emerald-600 dark:text-emerald-400">Chat</span>
        </span>
      )}
    </div>
  );
};
