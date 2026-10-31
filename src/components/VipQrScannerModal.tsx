import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { api } from '../services/api';
import { 
  X, 
  Camera, 
  Upload, 
  Star, 
  Crown, 
  CheckCircle2, 
  AlertCircle, 
  QrCode
} from 'lucide-react';

interface VipQrScannerModalProps {
  scannerType: 'plus' | 'pro' | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tier: 'plus' | 'pro') => void;
}

export const VipQrScannerModal: React.FC<VipQrScannerModalProps> = ({
  scannerType,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // 1. ALL HOOKS UNCONDITIONALLY AT THE VERY TOP (React 19 Rule of Hooks)
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isPlus = scannerType === 'plus';

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    try {
      let stream: MediaStream;
      try {
        // First try ideal environment camera (for phones scanning a printed pass or screen)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch {
        // Fallback to standard webcam on laptops/desktops
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraActive(true);
            scanFrame();
          }).catch((e) => {
            console.warn('Video play error:', e);
          });
        };
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      const isPermissionDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const msg = isPermissionDenied
        ? 'Camera permission was denied in your browser. Please allow camera access in your URL bar, or upload a photo of the QR code.'
        : 'No working camera found. You can upload a photo of the QR code or enter the pass code.';
      setCameraError(msg);
      setScanMode('upload');
    }
  };

  // Continuous frame scanner using jsQR
  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        stopCamera();
        handleValidateAndRedeem(code.data);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Start or stop video stream when modal is opened/closed or scanMode changes
  useEffect(() => {
    if (isOpen && scannerType && scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, scannerType, scanMode]);

  // Handle uploaded QR image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            handleValidateAndRedeem(code.data);
          } else {
            setErrorMsg('No QR code detected in this image. Please upload a clear photo of the VIP pass.');
            setLoading(false);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Validate and Redeem Pass
  const handleValidateAndRedeem = async (rawCode: string) => {
    if (!scannerType) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    // Client-side quick validation to enforce strict scanner boundaries
    const isPlusCode = rawCode.includes('PLUS') || rawCode === 'PULSE-VIP-PLUS-TEAM-8942';
    const isProCode = rawCode.includes('PRO') || rawCode === 'PULSE-VIP-PRO-TEAM-7721';

    if (scannerType === 'plus' && isProCode) {
      setErrorMsg('Scanner Mismatch: You scanned the Pro Plan VIP QR pass inside the Plus Plan scanner. Please open the Pro scanner to activate Pro.');
      setLoading(false);
      return;
    }

    if (scannerType === 'pro' && isPlusCode) {
      setErrorMsg('Scanner Mismatch: You scanned the Plus Plan VIP QR pass inside the Pro Plan scanner. Please open the Plus scanner to activate Plus.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.redeemVipPass(rawCode, scannerType);
      setSuccessMsg(res.message);
      setTimeout(() => {
        onSuccess(scannerType);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation failed. Please verify your VIP pass code.');
    } finally {
      setLoading(false);
    }
  };

  // 2. CONDITIONAL RETURN PLACED AFTER ALL HOOKS
  if (!isOpen || !scannerType) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* Top Header */}
        <div className={`p-5 text-white flex items-center justify-between ${
          isPlus ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              {isPlus ? <Star className="w-5 h-5 fill-white" /> : <Crown className="w-5 h-5 fill-white" />}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isPlus ? 'Plus Plan VIP Scanner' : 'Pro Plan VIP Scanner'}
              </h3>
              <p className="text-xs text-white/80">
                {isPlus ? 'Scan your Plus VIP pass to unlock free' : 'Scan your Pro VIP pass to unlock free'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-6 space-y-4">
          
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3 animate-in zoom-in-95">
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="font-bold block text-sm">Pass Verified!</span>
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setErrorMsg(null);
                setScanMode('camera');
              }}
              className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg transition-all ${
                scanMode === 'camera' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>

            <button
              onClick={() => {
                setErrorMsg(null);
                setScanMode('upload');
              }}
              className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg transition-all ${
                scanMode === 'upload' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>

            <button
              onClick={() => {
                setErrorMsg(null);
                setScanMode('manual');
              }}
              className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg transition-all ${
                scanMode === 'manual' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Pass Code</span>
            </button>
          </div>

          {/* MODE 1: Camera Scanner View */}
          {scanMode === 'camera' && (
            <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Targeting Overlay Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className={`relative w-48 h-48 border-2 rounded-2xl ${
                  isPlus ? 'border-blue-400' : 'border-amber-400'
                } shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center`}>
                  {/* Corner notches */}
                  <div className={`absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 rounded-tl-lg ${isPlus ? 'border-blue-500' : 'border-amber-500'}`} />
                  <div className={`absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 rounded-tr-lg ${isPlus ? 'border-blue-500' : 'border-amber-500'}`} />
                  <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 rounded-bl-lg ${isPlus ? 'border-blue-500' : 'border-amber-500'}`} />
                  <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 rounded-br-lg ${isPlus ? 'border-blue-500' : 'border-amber-500'}`} />

                  {/* Scanning line animation */}
                  <div className={`w-full h-0.5 ${
                    isPlus ? 'bg-blue-400 shadow-[0_0_8px_#3b82f6]' : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                  } animate-pulse`} />
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 p-4 flex flex-col items-center justify-center text-center text-white text-xs z-20">
                  <AlertCircle className="w-6 h-6 text-amber-400 mb-2" />
                  <p className="mb-3 text-slate-300 max-w-xs">{cameraError}</p>
                  <button
                    onClick={() => setScanMode('upload')}
                    className="py-1.5 px-3 bg-white text-slate-900 rounded-lg font-bold"
                  >
                    Upload QR Image Instead
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: Upload QR Image */}
          {scanMode === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-56 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Click to browse or drop QR image
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Upload a photo or screenshot of your {isPlus ? 'Plus' : 'Pro'} VIP Pass QR code
              </span>
            </div>
          )}

          {/* MODE 3: Manual Code Entry */}
          {scanMode === 'manual' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCode.trim()) handleValidateAndRedeem(manualCode.trim());
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  VIP Pass Code
                </label>
                <input
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={isPlus ? 'Enter Plus VIP pass code' : 'Enter Pro VIP pass code'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 rounded-xl text-white font-semibold text-xs shadow-md transition-all cursor-pointer ${
                  isPlus ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                }`}
              >
                {loading ? 'Verifying VIP Pass...' : 'Redeem Free Plan'}
              </button>
            </form>
          )}

          {/* Strict Scanner Notice */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>
              Accepts: <strong className={isPlus ? 'text-blue-600 font-bold' : 'text-amber-600 font-bold'}>
                {isPlus ? 'PulseChat Plus VIP Pass Only' : 'PulseChat Pro VIP Pass Only'}
              </strong>
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
              Strict Isolation
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
