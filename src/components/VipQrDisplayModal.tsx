import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { PulseChatLogo } from './PulseChatLogo';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Star, 
  Crown, 
  QrCode, 
  ShieldCheck, 
  Users,
  Sparkles
} from 'lucide-react';

interface VipQrDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: (tier: 'plus' | 'pro') => void;
}

export const VipQrDisplayModal: React.FC<VipQrDisplayModalProps> = ({
  isOpen,
  onClose,
  onOpenScanner,
}) => {
  if (!isOpen) return null;

  const [plusQrUrl, setPlusQrUrl] = useState<string>('');
  const [proQrUrl, setProQrUrl] = useState<string>('');
  const [copiedTier, setCopiedTier] = useState<string | null>(null);

  const PLUS_CODE = 'PULSECHAT_VIP_PLUS_PASS_2026_FREE';
  const PRO_CODE = 'PULSECHAT_VIP_PRO_PASS_2026_FREE';

  useEffect(() => {
    // Generate genuine high-resolution QR codes with custom styling
    QRCode.toDataURL(PLUS_CODE, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1D4ED8', // Royal Blue for Plus
        light: '#FFFFFF',
      },
    }).then(setPlusQrUrl).catch(console.error);

    QRCode.toDataURL(PRO_CODE, {
      width: 400,
      margin: 2,
      color: {
        dark: '#B45309', // Deep Amber / Gold for Pro
        light: '#FFFFFF',
      },
    }).then(setProQrUrl).catch(console.error);
  }, []);

  const handleCopy = (text: string, tier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTier(tier);
    setTimeout(() => setCopiedTier(null), 2000);
  };

  const handleDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  VIP Team Pass QR Codes
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 uppercase tracking-wider">
                  Admin / VIP Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Display or send these 2 exclusive QR codes to your team members for instant free upgrades.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Two Distinct QR Cards */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. PLUS VIP PASS CARD */}
            <div className="p-6 rounded-3xl border-2 border-blue-200 dark:border-blue-900/60 bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 shadow-md flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-blue-500" />
              
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1 mt-2">
                <Star className="w-4 h-4 fill-blue-500 text-blue-500" />
                <span>Plus Plan VIP Pass</span>
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Free Plus Upgrade Pass
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Unlocks HD Audio, 500MB storage & Blue Star Badge ($1/mo value, 100% free)
              </p>

              {/* QR Code Container */}
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-blue-100 dark:border-slate-700 mb-4">
                {plusQrUrl ? (
                  <img src={plusQrUrl} alt="Plus VIP QR Code" className="w-48 h-48 rounded-xl object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
              </div>

              <div className="w-full bg-blue-50/80 dark:bg-slate-800 p-2.5 rounded-xl border border-blue-100 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center justify-between mb-4">
                <span className="truncate text-[11px]">{PLUS_CODE}</span>
                <button
                  onClick={() => handleCopy(PLUS_CODE, 'plus')}
                  className="p-1 hover:text-blue-600 transition-colors ml-2 shrink-0"
                  title="Copy pass code"
                >
                  {copiedTier === 'plus' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => handleDownload(plusQrUrl, 'PulseChat_Plus_VIP_Pass.png')}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save QR</span>
                </button>

                {onOpenScanner && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenScanner('plus');
                    }}
                    className="py-2 px-3 rounded-xl border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Test Scanner</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. PRO VIP PASS CARD */}
            <div className="p-6 rounded-3xl border-2 border-amber-300 dark:border-amber-700/60 bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 shadow-md flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 to-amber-600" />
              
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs uppercase tracking-wider mb-1 mt-2">
                <Crown className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span>Pro Plan VIP Pass</span>
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Free Pro Executive Pass
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Unlocks unlimited Spaces, 10GB storage & Golden Star + Crown ($5/mo value, 100% free)
              </p>

              {/* QR Code Container */}
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-amber-100 dark:border-slate-700 mb-4">
                {proQrUrl ? (
                  <img src={proQrUrl} alt="Pro VIP QR Code" className="w-48 h-48 rounded-xl object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
              </div>

              <div className="w-full bg-amber-50/80 dark:bg-slate-800 p-2.5 rounded-xl border border-amber-100 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center justify-between mb-4">
                <span className="truncate text-[11px]">{PRO_CODE}</span>
                <button
                  onClick={() => handleCopy(PRO_CODE, 'pro')}
                  className="p-1 hover:text-amber-600 transition-colors ml-2 shrink-0"
                  title="Copy pass code"
                >
                  {copiedTier === 'pro' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => handleDownload(proQrUrl, 'PulseChat_Pro_VIP_Pass.png')}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save QR</span>
                </button>

                {onOpenScanner && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenScanner('pro');
                    }}
                    className="py-2 px-3 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Test Scanner</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                Strict Scanner Verification Enforced
              </span>
              The Plus Plan Scanner will strictly validate and accept only the Plus QR code. The Pro Plan Scanner will strictly validate and accept only the Pro QR code.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
