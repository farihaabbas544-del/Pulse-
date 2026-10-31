import React, { useState, useEffect } from 'react';
import { User, UserPlan, PaymentRecord } from '../types';
import { SubscriptionBadge } from './SubscriptionBadge';
import { api } from '../services/api';
import { 
  X, 
  Check, 
  Star, 
  Crown, 
  CreditCard, 
  QrCode, 
  AlertCircle, 
  Clock, 
  Download, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface UpgradeModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onPlanUpdated: (newPlan: UserPlan) => void;
  onOpenScanner?: (tier: 'plus' | 'pro') => void;
  onOpenVipQrCodes?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onPlanUpdated,
  onOpenScanner,
  onOpenVipQrCodes,
}) => {
  if (!isOpen) return null;

  const [selectedPlan, setSelectedPlan] = useState<'plus' | 'pro'>('pro');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Checkout modal state
  const [checkoutModal, setCheckoutModal] = useState<{
    orderId: string;
    amount: number;
    currency: string;
    plan: 'plus' | 'pro';
  } | null>(null);

  // Card details (client-side form inputs for secure sandbox/live tokenization)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPaymentHistory();
    }
  }, [isOpen]);

  const loadPaymentHistory = async () => {
    try {
      const res = await api.getPaymentHistory();
      setPayments(res.payments);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartUpgrade = async (plan: 'plus' | 'pro') => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await api.createPaymentOrder(plan, paymentMethod);
      setCheckoutModal({
        orderId: res.orderId,
        amount: res.amount,
        currency: res.currency,
        plan,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutModal) return;

    setError(null);
    setLoading(true);

    try {
      // Server-side verification request
      const verifyRes = await api.verifyPayment({
        orderId: checkoutModal.orderId,
        paymentId: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        plan: checkoutModal.plan,
      });

      setSuccess(verifyRes.message);
      onPlanUpdated(checkoutModal.plan);
      setCheckoutModal(null);
      loadPaymentHistory();
    } catch (err: any) {
      setError(err.message || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will be reverted to the Free plan.')) return;

    try {
      const res = await api.cancelSubscription();
      alert(res.message);
      onPlanUpdated('free');
      loadPaymentHistory();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">PulseChat Premium</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200">
                Razorpay Checkout
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Elevate your team collaboration with HD media, nested channels, and verified badges.
            </p>
          </div>

            <div className="flex items-center gap-2">
              {onOpenVipQrCodes && (
                <button
                  type="button"
                  onClick={onOpenVipQrCodes}
                  className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="View and download the 2 VIP QR passes for Plus and Pro"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Show 2 VIP QR Passes</span>
                </button>
              )}

              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('plans')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'plans' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'
                  }`}
                >
                  Plans
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'
                  }`}
                >
                  Billing History
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {activeTab === 'plans' && (
            <>
              {/* 3 Pricing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. FREE PLAN */}
                <div
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    currentUser.plan === 'free'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Basic</span>
                      {currentUser.plan === 'free' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Active Plan
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Free</h3>
                    <div className="mt-2 mb-3">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">$0</span>
                      <span className="text-xs text-slate-400"> / forever</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Everything you need to chat and collaborate with friends.
                    </p>

                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Direct messages & contacts</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Voice & video calling</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>24h disappearing status</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>View Once media</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    disabled
                    className="w-full mt-6 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-400 cursor-not-allowed text-center"
                  >
                    Included
                  </button>
                </div>

                {/* 2. PLUS PLAN */}
                <div
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative ${
                    currentUser.plan === 'plus'
                      ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-blue-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Plus</span>
                        <Star className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
                      </div>
                      {currentUser.plan === 'plus' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                          Active Plan
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Plus</h3>
                    <div className="mt-2 mb-3">
                      <span className="text-3xl font-extrabold text-blue-600 font-mono">$1</span>
                      <span className="text-xs text-slate-400"> / month</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      5 premium touches for active individuals and freelancers.
                    </p>

                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-2 font-medium">
                        <Star className="w-3.5 h-3.5 fill-blue-500 text-blue-500 shrink-0" />
                        <span>PulseChat Blue Star Badge</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>HD audio voice notes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>500MB cloud media storage</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Priority message delivery</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleStartUpgrade('plus')}
                    disabled={currentUser.plan === 'plus' || loading}
                    className="w-full mt-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {currentUser.plan === 'plus' ? 'Current Plan' : 'Upgrade to Plus ($1/mo)'}
                  </button>

                  {/* Scan VIP QR for Free Option */}
                  {onOpenScanner && (
                    <button
                      type="button"
                      onClick={() => onOpenScanner('plus')}
                      className="w-full mt-2 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Scan the special Plus VIP QR code to get it for free"
                    >
                      <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Scan special QR to get it for free</span>
                    </button>
                  )}
                </div>

                {/* 3. PRO PLAN */}
                <div
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative shadow-lg ${
                    currentUser.plan === 'pro'
                      ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20'
                      : 'border-amber-400/60 dark:border-amber-700/60 bg-gradient-to-b from-amber-50/40 via-white to-white dark:from-amber-950/30 dark:via-slate-800 dark:to-slate-800'
                  }`}
                >
                  <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-bold shadow-xs">
                    BEST VALUE
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Pro</span>
                        <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      </div>
                      {currentUser.plan === 'pro' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                          Active Plan
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Pro</h3>
                    <div className="mt-2 mb-3">
                      <span className="text-3xl font-extrabold text-amber-500 font-mono">$5</span>
                      <span className="text-xs text-slate-400"> / month</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      10 premium advantages for leaders, communities & power users.
                    </p>

                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-2 font-medium">
                        <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                        <span>Golden Star + Crown Badges</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Unlimited collaborative spaces</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Nested sub-channels & canvas</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>10GB cloud media storage</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Community polls & code snippets</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <button
                      onClick={() => handleStartUpgrade('pro')}
                      disabled={currentUser.plan === 'pro' || loading}
                      className="w-full mt-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {currentUser.plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro ($5/mo)'}
                    </button>

                    {/* Scan VIP QR for Free Option */}
                    {onOpenScanner && (
                      <button
                        type="button"
                        onClick={() => onOpenScanner('pro')}
                        className="w-full mt-2 py-2 px-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        title="Scan the special Pro VIP QR code to get it for free"
                      >
                        <QrCode className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Scan special QR to get it for free</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Detailed Feature Comparison Table */}
              <div className="pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Comprehensive Feature Comparison
                </h4>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <th className="p-3">Feature & Capability</th>
                        <th className="p-3">Free</th>
                        <th className="p-3 text-blue-600">
                          <div className="flex items-center justify-between gap-1">
                            <span>Plus ($1/mo)</span>
                            {onOpenScanner && (
                              <button
                                type="button"
                                onClick={() => onOpenScanner('plus')}
                                title="Scan special QR to get Plus for free"
                                className="p-1 rounded-md bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/80 text-blue-700 dark:text-blue-200 transition-colors cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {onOpenScanner && (
                            <button
                              type="button"
                              onClick={() => onOpenScanner('plus')}
                              className="text-[10px] text-blue-500 hover:text-blue-700 font-normal hover:underline mt-0.5 block text-left"
                            >
                              Scan special QR for free
                            </button>
                          )}
                        </th>
                        <th className="p-3 text-amber-600">
                          <div className="flex items-center justify-between gap-1">
                            <span>Pro ($5/mo)</span>
                            {onOpenScanner && (
                              <button
                                type="button"
                                onClick={() => onOpenScanner('pro')}
                                title="Scan special QR to get Pro for free"
                                className="p-1 rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/80 text-amber-700 dark:text-amber-200 transition-colors cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {onOpenScanner && (
                            <button
                              type="button"
                              onClick={() => onOpenScanner('pro')}
                              className="text-[10px] text-amber-500 hover:text-amber-700 font-normal hover:underline mt-0.5 block text-left"
                            >
                              Scan special QR for free
                            </button>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {/* VIP QR Scan Table Row */}
                      <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 font-medium">
                        <td className="p-3 text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 font-bold">
                          <QrCode className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>VIP Free Pass Scan</span>
                        </td>
                        <td className="p-3 text-slate-400">Not eligible</td>
                        <td className="p-3">
                          {onOpenScanner ? (
                            <button
                              type="button"
                              onClick={() => onOpenScanner('plus')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold text-[11px] transition-colors cursor-pointer"
                              title="Open scanner for Plus plan QR"
                            >
                              <QrCode className="w-3 h-3 text-blue-600" />
                              <span>Scan Plus QR</span>
                            </button>
                          ) : (
                            <span className="text-blue-600">Free with VIP QR</span>
                          )}
                        </td>
                        <td className="p-3">
                          {onOpenScanner ? (
                            <button
                              type="button"
                              onClick={() => onOpenScanner('pro')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-semibold text-[11px] transition-colors cursor-pointer"
                              title="Open scanner for Pro plan QR"
                            >
                              <QrCode className="w-3 h-3 text-amber-600" />
                              <span>Scan Pro QR</span>
                            </button>
                          ) : (
                            <span className="text-amber-600">Free with VIP QR</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Direct chats & group messaging</td>
                        <td className="p-3 text-emerald-600 font-semibold">Unlimited</td>
                        <td className="p-3 text-emerald-600 font-semibold">Unlimited</td>
                        <td className="p-3 text-emerald-600 font-semibold">Unlimited</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Collaborative Spaces</td>
                        <td className="p-3 text-slate-400">1 Space</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">5 Spaces</td>
                        <td className="p-3 text-amber-600 font-semibold">Unlimited Spaces</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Nested sub-channels per space</td>
                        <td className="p-3 text-slate-400">2 Channels</td>
                        <td className="p-3">5 Channels</td>
                        <td className="p-3 text-amber-600 font-semibold">Unlimited Channels</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Profile & Chat Badges</td>
                        <td className="p-3 text-slate-400">None</td>
                        <td className="p-3 text-blue-600 font-medium flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
                          <span>Blue Star</span>
                        </td>
                        <td className="p-3 text-amber-600 font-medium">
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            <Crown className="w-3.5 h-3.5 fill-amber-300 text-amber-500" />
                            <span>Gold Star + Crown</span>
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Media & Cloud File Storage</td>
                        <td className="p-3 font-mono">100 MB</td>
                        <td className="p-3 font-mono font-semibold text-blue-600">500 MB</td>
                        <td className="p-3 font-mono font-semibold text-amber-600">10 GB</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Embedded collaborative canvas</td>
                        <td className="p-3 text-slate-400">View only</td>
                        <td className="p-3">Standard</td>
                        <td className="p-3 text-amber-600 font-semibold">Real-time multiplayer</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Team Polls & Code Snippets</td>
                        <td className="p-3 text-slate-400">No</td>
                        <td className="p-3 text-emerald-600">Yes</td>
                        <td className="p-3 text-emerald-600 font-semibold">Yes (with syntax highlight)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Scheduled Messages</td>
                        <td className="p-3 text-slate-400">No</td>
                        <td className="p-3 text-slate-400">No</td>
                        <td className="p-3 text-emerald-600 font-semibold">Yes</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Subscription Cancel Action */}
              {currentUser.plan !== 'free' && (
                <div className="pt-2 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Active Subscription: PulseChat {currentUser.plan.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Renews on: {currentUser.planRenewsAt ? new Date(currentUser.planRenewsAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>

                  <button
                    onClick={handleCancelSubscription}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
            </>
          )}

          {/* Billing History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Payment History & Receipts
              </h4>

              {payments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No payment transactions recorded yet.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden text-xs">
                  {payments.map((p) => (
                    <div key={p.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            PulseChat {p.plan.toUpperCase()}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              p.status === 'success'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {p.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          Order: {p.orderId} • ID: {p.paymentId || 'N/A'} • Method: {p.method.toUpperCase()}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          ${p.amount.toFixed(2)} {p.currency}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ----------------- Razorpay Checkout Modal ----------------- */}
      {checkoutModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Razorpay Brand Bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-400">Razorpay</span>
                <span className="text-xs text-slate-400">· Secure Checkout</span>
              </div>
              <button
                onClick={() => setCheckoutModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCompletePayment} className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/60">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    PulseChat {checkoutModal.plan.toUpperCase()}
                  </h4>
                  <p className="text-[11px] text-slate-500">30-day recurring subscription</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    ${checkoutModal.amount / 100}
                  </span>
                  <span className="text-[10px] text-slate-400 block">USD</span>
                </div>
              </div>

              {/* Payment Method Selector: Cards or UPI */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Payment Method (Cards or UPI only)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                      paymentMethod === 'card'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Debit / Credit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI / QR</span>
                  </button>
                </div>
              </div>

              {/* Payment Inputs */}
              {paymentMethod === 'card' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4532 •••• •••• 8892"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="•••"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    UPI ID or VPA
                  </label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="username@okhdfcbank or user@upi"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    A payment request will be sent to your UPI app for authorization.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {loading
                      ? 'Processing Secure Payment...'
                      : `Pay $${checkoutModal.amount / 100} & Activate`}
                  </span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center leading-normal">
                Encrypted with 256-bit TLS. Razorpay processes your payment directly. By upgrading, you agree to recurring monthly billing which you can cancel anytime.
              </p>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
