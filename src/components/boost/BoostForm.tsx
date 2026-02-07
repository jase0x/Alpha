'use client';

import { useState, useRef } from 'react';
import {
  X,
  Zap,
  Upload,
  ChevronRight,
  Check,
  AlertTriangle,
  ExternalLink,
  ImageIcon,
} from 'lucide-react';
import {
  BoostTier,
  BoostTierConfig,
  BOOST_TIERS,
  BoostFormData,
} from '@/types/boost';
import { Chain, TokenPair } from '@/types/token';
import { createBoostOrder, activateOrder } from '@/services/boostStore';

interface BoostFormProps {
  tokens: TokenPair[];
  chain: Chain;
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-selected token address (from token detail) */
  preselectedToken?: TokenPair;
}

/** Renders 1, 2, or 3 neon yellow lightning bolts */
function BoltIcon({ count, size = 18 }: { count: number; size?: number }) {
  const boltSize = count === 1 ? size : size - 2;
  return (
    <span className="inline-flex items-center" style={{ gap: count > 1 ? '-4px' : '0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Zap key={i} size={boltSize} fill="#DFFF00" color="#DFFF00" style={{ marginLeft: i > 0 ? -4 : 0 }} />
      ))}
    </span>
  );
}

export default function BoostForm({
  tokens,
  chain,
  onClose,
  onSuccess,
  preselectedToken,
}: BoostFormProps) {
  const [step, setStep] = useState<'token' | 'tier' | 'details' | 'payment' | 'success'>(
    preselectedToken ? 'tier' : 'token',
  );
  const [selectedToken, setSelectedToken] = useState<TokenPair | null>(
    preselectedToken ?? null,
  );
  const [selectedTier, setSelectedTier] = useState<BoostTier>('giga');
  const [tokenSearch, setTokenSearch] = useState('');
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const paymentCurrency = chain === 'x1' ? 'XNT' : 'SOL';
  const tierConfig = BOOST_TIERS[selectedTier];

  // Token search filter
  const filteredTokens = tokenSearch.trim()
    ? tokens.filter(
        (t) =>
          t.baseToken.symbol.toLowerCase().includes(tokenSearch.toLowerCase()) ||
          t.baseToken.name.toLowerCase().includes(tokenSearch.toLowerCase()) ||
          t.address.toLowerCase().includes(tokenSearch.toLowerCase()),
      )
    : tokens.slice(0, 20);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Banner image must be under 2MB');
      return;
    }
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBannerPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedToken || !walletAddress.trim()) return;

    setSubmitting(true);
    // Simulate brief delay for UX
    await new Promise((r) => setTimeout(r, 600));

    const order = createBoostOrder({
      tokenAddress: selectedToken.address,
      tokenSymbol: selectedToken.baseToken.symbol,
      tokenName: selectedToken.baseToken.name,
      chain,
      tier: selectedTier,
      paymentCurrency,
      bannerImageUrl: bannerPreview ?? undefined,
      description: description.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      twitterUrl: twitterUrl.trim() || undefined,
      telegramUrl: telegramUrl.trim() || undefined,
      walletAddress: walletAddress.trim(),
    });

    // Auto-activate for demo purposes
    activateOrder(order.id);
    setCreatedOrderId(order.id);
    setSubmitting(false);
    setStep('success');
  };

  const stepIndex = ['token', 'tier', 'details', 'payment', 'success'].indexOf(step);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative w-full max-w-[540px] max-h-[90vh] bg-black border border-xdex-accent/30 rounded-2xl shadow-2xl shadow-xdex-accent/5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-xdex-border/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Zap size={18} className="text-xdex-accent" />
            <h3 className="text-base font-semibold text-white">Boost Token</h3>
            {step !== 'success' && (
              <span className="text-[10px] text-xdex-text-muted bg-xdex-border/30 px-2 py-0.5 rounded">
                Step {stepIndex + 1} of 4
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-xdex-text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Progress bar */}
        {step !== 'success' && (
          <div className="h-0.5 bg-xdex-border/30 flex-shrink-0">
            <div
              className="h-full bg-xdex-accent transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / 4) * 100}%` }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ============================================ */}
          {/* Step 1: Select Token */}
          {/* ============================================ */}
          {step === 'token' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Select Token to Boost</h4>
                <p className="text-[11px] text-xdex-text-muted">
                  Choose the token you want to promote on Alpha Scan
                </p>
              </div>

              <input
                type="text"
                placeholder="Search by name, symbol, or address..."
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-black border border-xdex-border/60 rounded-xl text-white placeholder:text-xdex-text-muted/50 focus:border-xdex-accent/40 transition-colors outline-none"
              />

              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {filteredTokens.map((t) => (
                  <button
                    key={t.address}
                    onClick={() => {
                      setSelectedToken(t);
                      setStep('tier');
                    }}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border transition-all text-left ${
                      selectedToken?.address === t.address
                        ? 'border-xdex-accent/40 bg-xdex-accent/5'
                        : 'border-xdex-border/40 hover:border-xdex-border hover:bg-white/[0.02]'
                    }`}
                  >
                    {t.baseToken.imageUrl ? (
                      <img
                        src={t.baseToken.imageUrl}
                        alt={t.baseToken.symbol}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-xdex-border flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-xdex-accent">
                          {t.baseToken.symbol.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white">
                          {t.baseToken.symbol}
                        </span>
                        <span className="text-xs text-xdex-text-muted truncate">
                          {t.baseToken.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-xdex-text-muted font-mono truncate block">
                        {t.address.slice(0, 8)}...{t.address.slice(-6)}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-xdex-text-muted flex-shrink-0" />
                  </button>
                ))}
                {filteredTokens.length === 0 && (
                  <div className="text-center py-8 text-xdex-text-muted text-xs">
                    No tokens found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* Step 2: Select Tier */}
          {/* ============================================ */}
          {step === 'tier' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Choose Boost Tier</h4>
                <p className="text-[11px] text-xdex-text-muted">
                  Boosting <span className="text-xdex-accent font-semibold">{selectedToken?.baseToken.symbol}</span> on {chain === 'x1' ? 'X1' : 'Solana'}
                </p>
              </div>

              <div className="space-y-3">
                {(Object.entries(BOOST_TIERS) as [BoostTier, BoostTierConfig][]).map(
                  ([tierId, config]) => {
                    const isSelected = selectedTier === tierId;
                    const price =
                      paymentCurrency === 'XNT' ? config.priceXNT : config.priceSOL;

                    return (
                      <button
                        key={tierId}
                        onClick={() => setSelectedTier(tierId)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-current bg-current/5'
                            : 'border-xdex-border/40 hover:border-xdex-border'
                        }`}
                        style={{
                          borderColor: isSelected ? config.color : undefined,
                          backgroundColor: isSelected
                            ? `${config.color}08`
                            : undefined,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="p-2 rounded-lg flex-shrink-0"
                            style={{ backgroundColor: `${config.color}15` }}
                          >
                            <BoltIcon count={config.boltCount} size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className="text-sm font-semibold"
                                style={{ color: config.color }}
                              >
                                {config.name}
                              </span>
                              <span className="text-sm font-bold text-white font-mono">
                                {price} {paymentCurrency}
                              </span>
                            </div>
                            <p className="text-[11px] text-xdex-text-muted mb-2">
                              {config.description} &middot; {config.durationDays} days
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {config.features.map((f, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-xdex-text-secondary"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                          {isSelected && (
                            <div
                              className="p-0.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: config.color }}
                            >
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>

              <div className="flex gap-2 pt-2">
                {!preselectedToken && (
                  <button
                    onClick={() => setStep('token')}
                    className="px-4 py-2.5 text-xs font-medium text-xdex-text-secondary border border-xdex-border/60 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={() => setStep('details')}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-xdex-accent rounded-xl hover:brightness-110 transition-all"
                >
                  Continue with {BOOST_TIERS[selectedTier].name}
                </button>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* Step 3: Details & Image */}
          {/* ============================================ */}
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Boost Details</h4>
                <p className="text-[11px] text-xdex-text-muted">
                  Add optional details to showcase your token
                </p>
              </div>

              {/* Banner upload (Diamond tier only) */}
              {tierConfig.hasBanner && (
                <div>
                  <label className="text-[11px] text-xdex-text-muted font-medium mb-2 block">
                    Banner Image (displayed in token detail header)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                  {bannerPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-xdex-border/40">
                      <img
                        src={bannerPreview}
                        alt="Banner preview"
                        className="w-full h-32 object-cover"
                      />
                      <button
                        onClick={() => {
                          setBannerPreview(null);
                          setBannerFile(null);
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 rounded-xl border-2 border-dashed border-xdex-border/40 hover:border-xdex-accent/30 flex flex-col items-center justify-center gap-2 transition-colors"
                    >
                      <ImageIcon size={24} className="text-xdex-text-muted" />
                      <span className="text-[11px] text-xdex-text-muted">
                        Click to upload banner (max 2MB)
                      </span>
                      <span className="text-[10px] text-xdex-text-muted/60">
                        Recommended: 1200 x 300px
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-[11px] text-xdex-text-muted font-medium mb-1.5 block">
                  Description <span className="text-xdex-text-muted/50">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your token project..."
                  maxLength={280}
                  rows={3}
                  className="w-full px-3 py-2.5 text-xs bg-black border border-xdex-border/60 rounded-xl text-white placeholder:text-xdex-text-muted/50 focus:border-xdex-accent/40 transition-colors outline-none resize-none"
                />
                <span className="text-[10px] text-xdex-text-muted/50 block text-right">
                  {description.length}/280
                </span>
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[11px] text-xdex-text-muted font-medium mb-1.5 block">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourtoken.com"
                    className="w-full px-3 py-2.5 text-xs bg-black border border-xdex-border/60 rounded-xl text-white placeholder:text-xdex-text-muted/50 focus:border-xdex-accent/40 transition-colors outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-xdex-text-muted font-medium mb-1.5 block">
                      Twitter / X
                    </label>
                    <input
                      type="url"
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="https://x.com/..."
                      className="w-full px-3 py-2.5 text-xs bg-black border border-xdex-border/60 rounded-xl text-white placeholder:text-xdex-text-muted/50 focus:border-xdex-accent/40 transition-colors outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-xdex-text-muted font-medium mb-1.5 block">
                      Telegram
                    </label>
                    <input
                      type="url"
                      value={telegramUrl}
                      onChange={(e) => setTelegramUrl(e.target.value)}
                      placeholder="https://t.me/..."
                      className="w-full px-3 py-2.5 text-xs bg-black border border-xdex-border/60 rounded-xl text-white placeholder:text-xdex-text-muted/50 focus:border-xdex-accent/40 transition-colors outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('tier')}
                  className="px-4 py-2.5 text-xs font-medium text-xdex-text-secondary border border-xdex-border/60 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('payment')}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-xdex-accent rounded-xl hover:brightness-110 transition-all"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* Step 4: Payment */}
          {/* ============================================ */}
          {step === 'payment' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Confirm &amp; Pay</h4>
                <p className="text-[11px] text-xdex-text-muted">
                  Review your boost order and submit payment
                </p>
              </div>

              {/* Order summary */}
              <div className="rounded-xl border border-xdex-border/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-xdex-text-muted">Token</span>
                  <span className="text-sm font-semibold text-white">
                    {selectedToken?.baseToken.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-xdex-text-muted">Tier</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: tierConfig.color }}
                  >
                    {tierConfig.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-xdex-text-muted">Duration</span>
                  <span className="text-sm text-white">{tierConfig.durationDays} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-xdex-text-muted">Rank Boost</span>
                  <span className="text-sm text-xdex-green font-mono">
                    +{tierConfig.rankBoost} positions
                  </span>
                </div>
                <div className="border-t border-xdex-border/30 pt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Total</span>
                  <span className="text-lg font-bold text-white font-mono">
                    {paymentCurrency === 'XNT'
                      ? tierConfig.priceXNT
                      : tierConfig.priceSOL}{' '}
                    {paymentCurrency}
                  </span>
                </div>
              </div>

              {/* Wallet address */}
              <div>
                <label className="text-[11px] text-xdex-text-muted font-medium mb-1.5 block">
                  Your Wallet Address
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder={
                    chain === 'x1'
                      ? '0x...'
                      : 'Enter your Solana wallet address...'
                  }
                  className="w-full px-3 py-2.5 text-xs bg-black border border-xdex-border/60 rounded-xl text-white placeholder:text-xdex-text-muted/50 focus:border-xdex-accent/40 transition-colors outline-none font-mono"
                />
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5">
                <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="text-[10px] text-yellow-400/80 leading-relaxed">
                  Boost is activated immediately for demo purposes. In production,
                  payment verification will be required before activation.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('details')}
                  className="px-4 py-2.5 text-xs font-medium text-xdex-text-secondary border border-xdex-border/60 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!walletAddress.trim() || submitting}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-xdex-accent rounded-xl hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Activate Boost
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* Step 5: Success */}
          {/* ============================================ */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ backgroundColor: `${tierConfig.color}20` }}
              >
                <BoltIcon count={tierConfig.boltCount} size={28} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Boost Activated!</h4>
                <p className="text-[11px] text-xdex-text-muted">
                  <span className="font-semibold text-white">
                    {selectedToken?.baseToken.symbol}
                  </span>{' '}
                  is now boosted with{' '}
                  <span style={{ color: tierConfig.color }} className="font-semibold">
                    {tierConfig.name}
                  </span>{' '}
                  for {tierConfig.durationDays} days
                </p>
              </div>

              <div className="rounded-xl border border-xdex-border/40 p-4 text-left space-y-2 mx-auto max-w-[320px]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-xdex-text-muted">Rank Boost</span>
                  <span className="text-xdex-green font-mono font-medium">
                    +{tierConfig.rankBoost} positions
                  </span>
                </div>
                {tierConfig.hasGlow && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-xdex-text-muted">Glow Effect</span>
                    <span className="text-white">Enabled</span>
                  </div>
                )}
                {tierConfig.hasTrending && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-xdex-text-muted">Trending Bar</span>
                    <span className="text-white">Included</span>
                  </div>
                )}
                {tierConfig.hasBanner && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-xdex-text-muted">Custom Banner</span>
                    <span className="text-white">{bannerPreview ? 'Uploaded' : 'None'}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-center pt-2">
                <button
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-xdex-accent rounded-xl hover:brightness-110 transition-all"
                >
                  Done
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-medium text-xdex-text-secondary border border-xdex-border/60 rounded-xl hover:bg-white/5 transition-colors"
                >
                  View on List
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
