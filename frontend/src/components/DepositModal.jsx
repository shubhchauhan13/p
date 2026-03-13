import { useState, useEffect } from 'react';
import { X, ChevronLeft, Copy, ChevronDown, Check, ArrowRight } from 'lucide-react';

const MOCK_ADDRESS = '0x4dA93Bf8e52Ac23f1E8a7dC9B02C4F8b361919A';
const CHAINS = ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base'];
const TOKENS = ['USDC', 'ETH', 'USDT', 'DAI'];

// ─── Real-looking 21×21 QR code grid ───
const QR = [
  [1,1,1,1,1,1,1,0,1,1,0,1,0,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,1,1,0,1,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,0,1,0,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,0,1,1,0,0,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,0,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,1,0,1,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
  [1,0,1,1,0,1,1,1,0,0,1,0,1,1,1,1,0,1,1,0,1],
  [0,1,1,0,0,1,0,0,1,1,0,1,0,0,0,1,1,0,1,1,0],
  [1,1,0,0,1,0,1,0,0,0,1,0,1,0,1,0,0,1,0,1,1],
  [0,0,1,1,0,1,0,1,1,0,0,1,0,1,0,1,1,0,1,0,0],
  [1,0,1,0,1,1,1,0,1,1,0,0,1,0,1,0,1,1,0,1,0],
  [0,0,0,0,0,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,1],
  [1,1,1,1,1,1,1,0,0,1,0,1,0,0,1,1,0,1,0,1,0],
  [1,0,0,0,0,0,1,0,1,0,1,1,1,0,0,1,1,0,1,0,1],
  [1,0,1,1,1,0,1,0,0,1,0,0,0,1,1,0,0,1,0,1,0],
  [1,0,1,1,1,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1],
  [1,0,1,1,1,0,1,0,0,0,1,0,1,1,0,0,1,0,1,1,0],
  [1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0,0,1],
  [1,1,1,1,1,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1],
];

function QRCode() {
  const size = 21;
  const cell = 10;
  const pad = 12;
  const total = size * cell + pad * 2;
  return (
    <div className="dm-qr-wrap">
      <div className="dm-qr-scan-line" />
      <svg
        width={total} height={total}
        viewBox={`0 0 ${total} ${total}`}
        style={{ display: 'block' }}
      >
        <rect width={total} height={total} fill="white" rx="6" />
        {QR.map((row, r) =>
          row.map((on, c) =>
            on ? (
              <rect
                key={`${r}-${c}`}
                x={pad + c * cell + 1}
                y={pad + r * cell + 1}
                width={cell - 2}
                height={cell - 2}
                rx="1.5"
                fill="#09090b"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}

// ─── Token icons ───
function UsdcIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <radialGradient id="usdc-g" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#usdc-g)" />
      <text x="16" y="21" textAnchor="middle" fill="white" fontSize="12" fontWeight="700" fontFamily="Arial">$</text>
    </svg>
  );
}

function EthIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <radialGradient id="eth-g" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#eth-g)" />
      <path d="M16 5l-7 11.5 7 3.5 7-3.5z" fill="rgba(255,255,255,0.8)" />
      <path d="M16 21.5l-7-4.5 7 10 7-10z" fill="rgba(255,255,255,0.6)" />
    </svg>
  );
}

function PolygonIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <radialGradient id="matic-g" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#matic-g)" />
      <path d="M21 12.5l-3.5-2a1 1 0 00-1 0l-3.5 2A1 1 0 0012 13.4v4a1 1 0 00.5.87l3.5 2a1 1 0 001 0l3.5-2a1 1 0 00.5-.87v-4a1 1 0 00-.5-.9z" fill="white" />
    </svg>
  );
}

function VisaIcon() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1f6e, #263099)',
      borderRadius: 6,
      padding: '3px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(37,49,153,0.4)'
    }}>
      <svg width="34" height="12" viewBox="0 0 50 18">
        <text x="2" y="14" fill="white" fontSize="14" fontWeight="900" fontFamily="Arial" letterSpacing="1">VISA</text>
      </svg>
    </div>
  );
}

function MastercardIcon() {
  return (
    <svg width="30" height="22" viewBox="0 0 44 32">
      <circle cx="16" cy="16" r="14" fill="#eb001b" />
      <circle cx="28" cy="16" r="14" fill="#f79e1b" />
      <path d="M22 6.3a14 14 0 010 19.4A14 14 0 0122 6.3z" fill="#ff5f00" />
    </svg>
  );
}

function CoinbaseIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <radialGradient id="cb-g" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#4d88ff" />
          <stop offset="100%" stopColor="#0052ff" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#cb-g)" />
      <circle cx="16" cy="16" r="8.5" fill="white" />
      <circle cx="16" cy="16" r="4.5" fill="#0052ff" />
    </svg>
  );
}

function PaypalIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <radialGradient id="pp-g" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#003eb3" />
          <stop offset="100%" stopColor="#001f6b" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#pp-g)" />
      <text x="16" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="900" fontFamily="Arial">PayPal</text>
    </svg>
  );
}

function ExchangeIcon({ label, color1, color2, text }) {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32">
      <defs>
        <radialGradient id={`ex-g-${text}`} cx="35%" cy="35%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill={`url(#ex-g-${text})`} />
      <text x="16" y="20" textAnchor="middle" fill="white" fontSize="8" fontWeight="800" fontFamily="Arial">{text}</text>
    </svg>
  );
}

// ─── View wrapper with slide animation ───
function ViewPane({ children }) {
  return <div className="dm-view-pane">{children}</div>;
}

export default function DepositModal({ user, onClose }) {
  const [activeView, setActiveView] = useState('menu');
  const [prevView, setPrevView] = useState(null);
  const [animDir, setAnimDir] = useState('forward');
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [selectedChain, setSelectedChain] = useState('Ethereum');
  const [showTokenDrop, setShowTokenDrop] = useState(false);
  const [showChainDrop, setShowChainDrop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardAmount, setCardAmount] = useState('100');
  const [closing, setClosing] = useState(false);

  const balance = Number(user?.balance || 0).toFixed(2);

  const navigate = (view, dir = 'forward') => {
    setPrevView(activeView);
    setAnimDir(dir);
    setActiveView(view);
  };

  const goBack = () => navigate('menu', 'back');

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 320);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(MOCK_ADDRESS).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TITLES = {
    menu: 'Deposit',
    crypto: 'Transfer Crypto',
    card: 'Deposit',
    exchange: 'Select an exchange',
    paypal: 'PayPal',
  };

  return (
    <div className={`dm-overlay ${closing ? 'dm-overlay-out' : ''}`} onClick={handleClose}>
      <div
        className={`dm-modal ${closing ? 'dm-modal-out' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Aurora glow at top */}
        <div className="dm-aurora" />

        {/* Header */}
        <div className="dm-header">
          <button
            className="dm-nav-btn"
            onClick={activeView !== 'menu' ? goBack : undefined}
            style={{ opacity: activeView !== 'menu' ? 1 : 0, pointerEvents: activeView !== 'menu' ? 'auto' : 'none' }}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="dm-header-title">{TITLES[activeView]}</span>
          <button className="dm-nav-btn dm-close-btn" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        {/* Content area */}
        <div className="dm-content" key={activeView} data-dir={animDir}>

          {/* ── MENU ── */}
          {activeView === 'menu' && (
            <ViewPane>
              <p className="dm-balance-label">
                <span className="dm-balance-dot" />
                Polymarket Balance: <strong>${balance}</strong>
              </p>

              <div className="dm-menu-list">
                {[
                  {
                    id: 'crypto',
                    title: 'Transfer Crypto',
                    sub: 'No limit • Instant',
                    icons: [<UsdcIcon key="u" />, <EthIcon key="e" />, <PolygonIcon key="p" />],
                    delay: '0ms',
                  },
                  {
                    id: 'card',
                    title: 'Deposit with Card',
                    sub: '$20,000 / 5 min',
                    icons: [<VisaIcon key="v" />, <MastercardIcon key="mc" />],
                    delay: '40ms',
                  },
                  {
                    id: 'exchange',
                    title: 'Connect Exchange',
                    sub: 'No limit • 2 min',
                    icons: [<CoinbaseIcon key="cb" />],
                    delay: '80ms',
                  },
                  {
                    id: 'paypal',
                    title: 'Deposit with PayPal',
                    sub: '$10,000 / 5 min',
                    icons: [<PaypalIcon key="pp" />],
                    delay: '120ms',
                  },
                ].map(item => (
                  <button
                    key={item.id}
                    className="dm-menu-row"
                    style={{ animationDelay: item.delay }}
                    onClick={() => navigate(item.id)}
                  >
                    <div className="dm-menu-row-left">
                      <span className="dm-menu-row-title">{item.title}</span>
                      <span className="dm-menu-row-sub">{item.sub}</span>
                    </div>
                    <div className="dm-menu-row-right">
                      <div className="dm-icon-cluster">{item.icons}</div>
                      <ArrowRight size={14} className="dm-row-arrow" />
                    </div>
                  </button>
                ))}
              </div>
            </ViewPane>
          )}

          {/* ── TRANSFER CRYPTO ── */}
          {activeView === 'crypto' && (
            <ViewPane>
              <p className="dm-balance-label">
                <span className="dm-balance-dot" />
                Polymarket Balance: <strong>${balance}</strong>
              </p>

              <div className="dm-selectors-row">
                {/* Token */}
                <div className="dm-dropdown-group">
                  <label className="dm-dropdown-label">Supported token</label>
                  <button className="dm-dropdown-btn" onClick={() => { setShowTokenDrop(v => !v); setShowChainDrop(false); }}>
                    <span>{selectedToken}</span>
                    <ChevronDown size={13} className={showTokenDrop ? 'rotated' : ''} />
                  </button>
                  {showTokenDrop && (
                    <div className="dm-dropdown-list">
                      {TOKENS.map(t => (
                        <button key={t} className={`dm-dropdown-opt ${selectedToken === t ? 'active' : ''}`}
                          onClick={() => { setSelectedToken(t); setShowTokenDrop(false); }}>
                          {t}
                          {selectedToken === t && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chain */}
                <div className="dm-dropdown-group">
                  <label className="dm-dropdown-label">Supported chain</label>
                  <button className="dm-dropdown-btn" onClick={() => { setShowChainDrop(v => !v); setShowTokenDrop(false); }}>
                    <span>{selectedChain}</span>
                    <ChevronDown size={13} className={showChainDrop ? 'rotated' : ''} />
                  </button>
                  {showChainDrop && (
                    <div className="dm-dropdown-list">
                      {CHAINS.map(c => (
                        <button key={c} className={`dm-dropdown-opt ${selectedChain === c ? 'active' : ''}`}
                          onClick={() => { setSelectedChain(c); setShowChainDrop(false); }}>
                          {c}
                          {selectedChain === c && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <QRCode />

              <div className="dm-address-block">
                <span className="dm-address-label">Your deposit address</span>
                <span className="dm-address-value">{MOCK_ADDRESS.slice(0, 10)}...{MOCK_ADDRESS.slice(-6)}</span>
                <button className="dm-copy-btn" onClick={handleCopy}>
                  {copied
                    ? <><Check size={13} /> Copied!</>
                    : <><Copy size={13} /> Copy address</>
                  }
                </button>
              </div>

              <p className="dm-footnote">Price impact: 0.00%</p>
            </ViewPane>
          )}

          {/* ── DEPOSIT WITH CARD ── */}
          {activeView === 'card' && (
            <ViewPane>
              <p className="dm-balance-label">
                <span className="dm-balance-dot" />
                Polymarket Balance: <strong>${balance}</strong>
              </p>

              <div className="dm-amount-center">
                <div className="dm-amount-row">
                  <span className="dm-amount-currency">$</span>
                  <input
                    className="dm-amount-input"
                    type="number"
                    value={cardAmount}
                    onChange={e => setCardAmount(e.target.value)}
                    min="1"
                    autoFocus
                  />
                </div>
                <div className="dm-amount-underline" />
              </div>

              <div className="dm-quick-row">
                {[50, 100, 200, 500].map(a => (
                  <button
                    key={a}
                    className={`dm-quick-chip ${cardAmount === String(a) ? 'active' : ''}`}
                    onClick={() => setCardAmount(String(a))}
                  >
                    ${a}
                  </button>
                ))}
              </div>

              <div className="dm-info-row">
                <span className="dm-info-label">Provider</span>
                <span className="dm-info-val">Auto-picked for you</span>
              </div>

              <button className="dm-cta-btn">
                Continue
                <ArrowRight size={15} />
              </button>
            </ViewPane>
          )}

          {/* ── CONNECT EXCHANGE ── */}
          {activeView === 'exchange' && (
            <ViewPane>
              <div className="dm-exchange-list">
                <button className="dm-exchange-row active">
                  <CoinbaseIcon size={28} />
                  <span className="dm-exchange-name">Coinbase</span>
                  <ArrowRight size={14} className="dm-row-arrow" />
                </button>
                {[
                  { name: 'Binance', c1: '#f5c542', c2: '#b8860b', t: 'BNB' },
                  { name: 'Kraken',  c1: '#8b63f0', c2: '#5c2fa8', t: 'KRK' },
                  { name: 'Gemini',  c1: '#00d4e5', c2: '#0090a0', t: 'GEM' },
                ].map(ex => (
                  <div key={ex.name} className="dm-exchange-row disabled">
                    <ExchangeIcon color1={ex.c1} color2={ex.c2} text={ex.t} />
                    <span className="dm-exchange-name">{ex.name}</span>
                    <span className="dm-badge-soon">Coming Soon</span>
                  </div>
                ))}
              </div>
            </ViewPane>
          )}

          {/* ── PAYPAL ── */}
          {activeView === 'paypal' && (
            <ViewPane>
              <p className="dm-balance-label">
                <span className="dm-balance-dot" />
                Polymarket Balance: <strong>${balance}</strong>
              </p>
              <div className="dm-paypal-center">
                <div className="dm-paypal-icon-wrap">
                  <PaypalIcon size={52} />
                  <div className="dm-paypal-glow" />
                </div>
                <p className="dm-paypal-desc">
                  You'll be redirected to PayPal to complete your deposit securely.
                </p>
              </div>
              <div className="dm-info-row">
                <span className="dm-info-label">Limit</span>
                <span className="dm-info-val">$10,000 / 5 min</span>
              </div>
              <button className="dm-cta-btn">
                Continue with PayPal
                <ArrowRight size={15} />
              </button>
            </ViewPane>
          )}

        </div>
      </div>
    </div>
  );
}
