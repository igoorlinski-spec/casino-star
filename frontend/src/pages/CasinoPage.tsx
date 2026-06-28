import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import SlotReel from '../components/SlotReel';
import {
  sfxCardDeal, sfxWin, sfxJackpot, sfxLose,
  sfxSpinStart, sfxReelStop, sfxClick
} from '../utils/sfx';

// ─── SUIT MAP ────────────────────────────────────────────────────────────────
const SUIT: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
  '♥': '♥', '♦': '♦', '♣': '♣', '♠': '♠',
};

// ─── SINGLE CARD COMPONENT ───────────────────────────────────────────────────
interface CardDef { rank: string; suit: string; faceDown?: boolean }

const VegasCard: React.FC<{ card: CardDef; delay: number }> = ({ card, delay }) => {
  const [in_, setIn] = useState(false);
  useEffect(() => {
    // Szybkie włączenie flagi animacji na następnym ticku pętli zdarzeń
    const r = requestAnimationFrame(() => setIn(true));
    return () => cancelAnimationFrame(r);
  }, []);

  if (card.faceDown) {
    return (
      <div style={{
        width: 80, height: 115, borderRadius: 12, flexShrink: 0,
        background: `
          repeating-linear-gradient(
            45deg,
            #1a0a4a,
            #1a0a4a 6px,
            #2a1264 6px,
            #2a1264 12px
          )`,
        border: '2px solid #d4af37',
        boxShadow: '0 8px 24px rgba(0,0,0,0.8), 0 0 12px rgba(212,175,55,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.8rem',
        opacity: in_ ? 1 : 0,
        transform: in_
          ? 'translateY(0) rotateY(0deg) scale(1)'
          : 'translateY(-80px) rotateY(90deg) scale(0.7)',
        transition: `opacity 0.35s ease ${delay}ms, transform 0.4s cubic-bezier(0.34,1.4,0.64,1) ${delay}ms`,
      }}>
        <span style={{ filter: 'drop-shadow(0 2px 6px rgba(212,175,55,0.6))', fontSize: '2.2rem' }}>🎴</span>
      </div>
    );
  }

  const sym = SUIT[card.suit] || card.suit;
  const red = sym === '♥' || sym === '♦';
  const rank = card.rank || '?';

  return (
    <div style={{
      width: 80, height: 115, borderRadius: 12, flexShrink: 0,
      background: 'linear-gradient(160deg, #fff 0%, #f8f8f8 100%)',
      border: '2px solid rgba(0,0,0,0.08)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '5px 7px',
      position: 'relative',
      color: red ? '#b91c1c' : '#111',
      fontWeight: 900,
      userSelect: 'none',
      opacity: in_ ? 1 : 0,
      transform: in_
        ? 'translateY(0) rotateY(0deg) scale(1)'
        : 'translateY(-80px) rotateY(90deg) scale(0.7)',
      transition: `opacity 0.35s ease ${delay}ms, transform 0.42s cubic-bezier(0.34,1.4,0.64,1) ${delay}ms`,
    }}>
      {/* Top-left */}
      <div style={{ lineHeight: 1.1, fontSize: '0.95rem' }}>
        <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>{rank}</div>
        <div>{sym}</div>
      </div>
      {/* Center big symbol */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '2rem', lineHeight: 1,
        textShadow: red ? '0 0 8px rgba(185,28,28,0.3)' : 'none',
      }}>{sym}</div>
      {/* Bottom-right (rotated) */}
      <div style={{ lineHeight: 1.1, fontSize: '0.95rem', transform: 'rotate(180deg)', alignSelf: 'flex-end' }}>
        <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>{rank}</div>
        <div>{sym}</div>
      </div>
    </div>
  );
};

// ─── CARD ROW ────────────────────────────────────────────────────────────────
const CardRow: React.FC<{ cards: CardDef[]; animBase: number }> = ({ cards, animBase }) => (
  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', minHeight: 120, alignItems: 'center' }}>
    {cards.map((c, i) => (
      <VegasCard key={`${animBase}-${i}`} card={c} delay={i * 220} />
    ))}
  </div>
);

// ─── SCORE BADGE ─────────────────────────────────────────────────────────────
const Score: React.FC<{ val: number | string; bust?: boolean }> = ({ val, bust }) => (
  <div style={{
    display: 'inline-block', marginTop: 8,
    padding: '3px 18px', borderRadius: 20,
    background: bust ? 'rgba(231,76,60,0.25)' : 'rgba(0,0,0,0.5)',
    border: `1px solid ${bust ? '#e74c3c' : 'rgba(212,175,55,0.4)'}`,
    color: bust ? '#e74c3c' : '#d4af37',
    fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.05em',
  }}>
    {val}
  </div>
);

// ─── GLOWING NEON TITLE ──────────────────────────────────────────────────────
const NeonTitle: React.FC<{ text: string; color?: string }> = ({ text, color = '#d4af37' }) => (
  <div style={{
    fontFamily: "'Cinzel Decorative', 'Playfair Display', serif",
    fontWeight: 900,
    fontSize: '2.2rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color,
    textShadow: `0 0 10px ${color}, 0 0 30px ${color}, 0 0 60px ${color}88, 0 0 100px ${color}44`,
    animation: 'neon-flicker 4s ease-in-out infinite',
  }}>
    {text}
  </div>
);

// ─── BET CHIP PRESETS ────────────────────────────────────────────────────────
const CHIP_PRESETS = [10, 25, 50, 100, 250, 500];

const Chip: React.FC<{ val: number; onClick: () => void; active: boolean }> = ({ val, onClick, active }) => {
  const colors: Record<number, { bg: string; border: string }> = {
    10:  { bg: '#e74c3c', border: '#c0392b' },
    25:  { bg: '#3498db', border: '#2980b9' },
    50:  { bg: '#2ecc71', border: '#27ae60' },
    100: { bg: '#9b59b6', border: '#8e44ad' },
    250: { bg: '#e67e22', border: '#d35400' },
    500: { bg: '#d4af37', border: '#b8940f' },
  };
  const c = colors[val] ?? { bg: '#666', border: '#444' };
  return (
    <button onClick={onClick} style={{
      width: 54, height: 54, borderRadius: '50%',
      background: `radial-gradient(circle at 35% 35%, ${c.bg}ff, ${c.border})`,
      border: `3px solid ${c.border}`,
      boxShadow: active
        ? `0 0 0 3px white, 0 0 20px ${c.bg}, 0 8px 20px rgba(0,0,0,0.6)`
        : '0 4px 12px rgba(0,0,0,0.5)',
      color: 'white', fontWeight: 900, fontSize: '0.75rem',
      cursor: 'pointer',
      transform: active ? 'scale(1.12) translateY(-3px)' : 'scale(1)',
      transition: 'all 0.15s ease',
      letterSpacing: '0.02em',
    }}>
      {val >= 1000 ? `${val/1000}K` : val}
    </button>
  );
};

// ─── MAIN CASINO PAGE ────────────────────────────────────────────────────────
const CasinoPage: React.FC = () => {
  const [mode, setMode] = useState<'blackjack' | 'slots'>('blackjack');
  const [bet, setBet] = useState(25);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; type: 'win' | 'lose' | 'push' | 'bj' } | null>(null);
  const [animKey, setAnimKey] = useState(0);

  // Dealer state held separately so it NEVER disappears on hit
  const [dealerCards, setDealerCards] = useState<CardDef[]>([]);
  const [dealerValue, setDealerValue] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');

  const { user, needs, setUser, updateNeeds } = useAuthStore();
  const { slotSpinning, setSlotSpinning, slotResult, setSlotResult, slotSymbols, setSlotSymbols } = useGameStore();

  const depleted = needs.sleep <= 0 || needs.hunger <= 0 || needs.hydration <= 0 || (needs.happiness ?? 100) <= 0;
  const [playerCards, setPlayerCards] = useState<CardDef[]>([]);
  const [playerValue, setPlayerValue] = useState<number | null>(null);

  const bumpAnim = () => setAnimKey(k => k + 1);

  // ── BLACKJACK ──────────────────────────────────────────────────────────────
  const startGame = async () => {
    if (depleted || !user || user.tokens < bet) return;
    sfxClick();
    setLoading(true);
    setResult(null);
    setPhase('idle');
    try {
      const res = await api.post('/game/blackjack/start', { bet });
      const d = res.data;
      bumpAnim();
      setPlayerCards(d.playerHand);
      setDealerCards([d.dealerVisible, { rank: '?', suit: '?', faceDown: true }]);
      setPlayerValue(d.playerValue);
      setDealerValue(null);
      setPhase('playing');
      const dealCount = (d.playerHand?.length || 2) + 2;
      for (let i = 0; i < dealCount; i++) setTimeout(() => sfxCardDeal(), i * 200);
    } catch (e: any) { alert(e.response?.data?.error || 'Błąd'); }
    finally { setLoading(false); }
  };

  const hit = async () => {
    sfxClick();
    setLoading(true);
    try {
      const res = await api.post('/game/blackjack/hit');
      const d = res.data;
      bumpAnim();
      setPlayerCards(d.playerHand);
      setPlayerValue(d.playerValue);
      // ← dealer stays unchanged, we only update dealerVisible if backend sends it
      if (d.dealerVisible) {
        setDealerCards(prev => {
          const copy = [...prev];
          copy[0] = d.dealerVisible;
          return copy;
        });
      }
      setTimeout(() => sfxCardDeal(), 0);
      if (d.bust) {
        sfxLose();
        setResult({ text: '💥 Przebicie! Przekroczyłeś 21.', type: 'lose' });
        setPhase('done');
        updateNeeds(d.needs);
        await api.get('/auth/me').then(r => { if (user) setUser({ ...user, tokens: r.data.user.tokens }); });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const stand = async () => {
    sfxClick();
    setLoading(true);
    try {
      const res = await api.post('/game/blackjack/stand');
      const d = res.data;
      bumpAnim();
      setPlayerCards(d.playerHand);
      setDealerCards(d.dealerHand);
      setDealerValue(d.dealerValue);
      setPlayerValue(d.playerValue);
      setPhase('done');
      resolveResult(d.outcome, d.payout);
      updateNeeds(d.needs);
      if (user) setUser({ ...user, tokens: d.tokens });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const doubleDown = async () => {
    if (!user || user.tokens < bet) return;
    sfxClick();
    setLoading(true);
    try {
      const res = await api.post('/game/blackjack/double');
      const d = res.data;
      bumpAnim();
      setPlayerCards(d.playerHand);
      setDealerCards(d.dealerHand);
      setDealerValue(d.dealerValue);
      setPlayerValue(d.playerValue);
      setPhase('done');
      resolveResult(d.outcome, d.payout);
      updateNeeds(d.needs);
      if (user) setUser({ ...user, tokens: d.tokens });
      sfxCardDeal();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const resolveResult = (outcome: string, payout: number) => {
    if (outcome === 'blackjack') {
      sfxJackpot();
      setResult({ text: `🎉 BLACKJACK! +${payout} żetonów!`, type: 'bj' });
    } else if (outcome === 'win') {
      sfxWin();
      setResult({ text: `✅ Wygrałeś! +${payout} żetonów`, type: 'win' });
    } else if (outcome === 'loss') {
      sfxLose();
      setResult({ text: '❌ Przegrałeś. Krupier wygrywa.', type: 'lose' });
    } else {
      setResult({ text: '🤝 Remis – zwrot stawki.', type: 'push' });
    }
  };

  // ── SLOTS ──────────────────────────────────────────────────────────────────
  const spin = async () => {
    if (depleted || !user || user.tokens < bet || slotSpinning) return;
    sfxClick(); sfxSpinStart();
    setSlotSpinning(true);
    setSlotResult(null);
    setUser({ ...user, tokens: user.tokens - bet });
    try {
      const res = await api.post('/game/slots/spin', { bet });
      setTimeout(() => {
        setSlotSymbols(res.data.reels);
        setSlotSpinning(false);
        const win = res.data.multiplier > 0;
        win ? (res.data.multiplier >= 20 ? sfxJackpot() : sfxWin()) : sfxLose();
        sfxReelStop();
        setSlotResult({ symbols: res.data.reels, win, amount: bet * res.data.multiplier });
        updateNeeds(res.data.needs);
        setUser({ ...user, tokens: res.data.tokens });
      }, 2400);
    } catch (e) {
      setSlotSpinning(false);
      api.get('/auth/me').then(r => { if (user) setUser({ ...user, tokens: r.data.user.tokens }); });
    }
  };

  const resultColor = result?.type === 'bj' ? '#f1c40f'
    : result?.type === 'win' ? '#2ecc71'
    : result?.type === 'lose' ? '#e74c3c'
    : '#aaa';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── NEON HEADER ── */}
      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <NeonTitle text="Casino Star" />
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12,
        }}>
          {(['blackjack', 'slots'] as const).map(m => (
            <button key={m} onClick={() => { sfxClick(); setMode(m); setResult(null); }} style={{
              padding: '10px 32px',
              background: mode === m
                ? 'linear-gradient(135deg, #d4af37, #f5e088, #b8940f)'
                : 'rgba(255,255,255,0.05)',
              border: `2px solid ${mode === m ? '#d4af37' : 'rgba(212,175,55,0.3)'}`,
              borderRadius: 30,
              color: mode === m ? '#111' : '#d4af37',
              fontWeight: 900,
              fontSize: '0.9rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: mode === m ? '0 0 20px rgba(212,175,55,0.5)' : 'none',
              transition: 'all 0.2s ease',
            }}>
              {m === 'blackjack' ? '🃏 Blackjack' : '🎰 Slots'}
            </button>
          ))}
        </div>
      </div>

      {/* ── ALERTS ── */}
      {depleted && (
        <div style={{
          padding: '14px 20px', background: 'rgba(231,76,60,0.12)',
          border: '1px solid #e74c3c', borderRadius: 12, textAlign: 'center',
          fontWeight: 700, color: '#e74c3c', fontSize: '0.95rem',
          animation: 'glow-pulse 1.5s infinite',
        }}>
          ⚠️ Jesteś wycieńczony! Kasyno odmawia Ci gry. Odpocznij i zadbaj o potrzeby.
        </div>
      )}
      {!depleted && (needs.happiness ?? 100) <= 10 && (
        <div style={{ padding: '10px 16px', background: 'rgba(231,76,60,0.07)', border: '1px dashed #e74c3c', borderRadius: 8, textAlign: 'center', fontSize: '0.83rem', color: '#e74c3c' }}>
          🚨 KRYTYCZNY nastrój ({needs.happiness}%) — Twoje szanse na wygraną drastycznie spadły!
        </div>
      )}
      {!depleted && (needs.happiness ?? 100) > 10 && (needs.happiness ?? 100) <= 20 && (
        <div style={{ padding: '10px 16px', background: 'rgba(212,175,55,0.06)', border: '1px dashed #d4af37', borderRadius: 8, textAlign: 'center', fontSize: '0.83rem', color: '#d4af37' }}>
          ⚠️ Zły humor ({needs.happiness}%) — Kasyno wyczuwa Twój smutek. Szanse na wygraną są znacznie mniejsze.
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          BLACKJACK TABLE
      ══════════════════════════════════════════════════ */}
      {mode === 'blackjack' && (
        <div style={{
          background: `
            radial-gradient(ellipse at 50% 20%, #1a5c2a 0%, #0f3d1a 45%, #09270f 100%)
          `,
          borderRadius: 24,
          border: '4px solid',
          borderImage: 'linear-gradient(135deg, #d4af37, #f5e088, #b8940f, #d4af37) 1',
          boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 30px rgba(212,175,55,0.15), inset 0 0 40px rgba(0,0,0,0.5)',
          padding: '32px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Felt texture overlay */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 20,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
            pointerEvents: 'none',
          }} />

          {/* Gold decorative arc */}
          <div style={{
            position: 'absolute', bottom: -80, left: '50%',
            transform: 'translateX(-50%)',
            width: 700, height: 200,
            border: '2px solid rgba(212,175,55,0.25)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }} />

          {/* ─ DEALER ─ */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              display: 'inline-block',
              padding: '3px 20px', borderRadius: 20,
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(212,175,55,0.3)',
              color: 'rgba(212,175,55,0.8)',
              fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 14,
            }}>
              ♠ Krupier ♠
            </div>
            <CardRow
              key={`d-${animKey}`}
              cards={dealerCards.length > 0 ? dealerCards : [
                { rank: '?', suit: '?', faceDown: true },
                { rank: '?', suit: '?', faceDown: true },
              ]}
              animBase={animKey * 1000}
            />
            {phase === 'done' && dealerValue !== null && (
              <Score val={dealerValue} bust={dealerValue > 21} />
            )}
          </div>

          {/* ─ Divider ─ */}
          <div style={{
            height: 1, margin: '20px 0',
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4) 30%, rgba(212,175,55,0.4) 70%, transparent)',
          }} />

          {/* ─ PLAYER ─ */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              display: 'inline-block',
              padding: '3px 20px', borderRadius: 20,
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(212,175,55,0.3)',
              color: 'rgba(212,175,55,0.8)',
              fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 14,
            }}>
              ♦ Twój Układ ♦
            </div>
            <CardRow
              key={`p-${animKey}`}
              cards={playerCards.length > 0 ? playerCards : [
                { rank: '?', suit: '?', faceDown: true },
                { rank: '?', suit: '?', faceDown: true },
              ]}
              animBase={animKey * 1000 + 500}
            />
            {playerValue !== null && (
              <Score val={playerValue} bust={(playerValue || 0) > 21} />
            )}
          </div>

          {/* ─ WYNIK ─ */}
          {result && (
            <div style={{
              textAlign: 'center', padding: '16px',
              fontSize: '1.6rem', fontWeight: 900,
              color: resultColor,
              textShadow: `0 0 20px ${resultColor}, 0 0 40px ${resultColor}66`,
              animation: 'bounce-in 0.5s cubic-bezier(0.34,1.6,0.64,1)',
              letterSpacing: '0.05em',
            }}>
              {result.text}
            </div>
          )}
        </div>
      )}

      {/* ─ CHIP SELECTOR + CONTROLS ─ */}
      {mode === 'blackjack' && (
        <div style={{
          background: 'rgba(10,10,20,0.85)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 20,
          padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center',
        }}>
          {/* Chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {CHIP_PRESETS.map(v => (
              <Chip key={v} val={v} active={bet === v} onClick={() => { sfxClick(); setBet(v); }} />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em' }}>STAWKA:</span>
            <input type="number" min="10" value={bet}
              onChange={e => setBet(Math.max(10, parseInt(e.target.value) || 0))}
              style={{
                background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.4)',
                color: '#d4af37', padding: '8px 14px', borderRadius: 10,
                width: 90, fontWeight: 900, fontSize: '1.1rem', textAlign: 'center',
              }}
            />
            <span style={{ color: 'rgba(212,175,55,0.5)', fontSize: '0.85rem' }}>🪙</span>
          </div>

          {/* Action buttons */}
          {phase !== 'playing' ? (
            <button onClick={startGame}
              disabled={loading || depleted || !user || user.tokens < bet}
              style={{
                padding: '12px 48px',
                background: 'linear-gradient(135deg, #d4af37, #f5e088, #b8940f)',
                border: 'none', borderRadius: 30,
                color: '#111', fontWeight: 900, fontSize: '1.05rem',
                letterSpacing: '0.15em', textTransform: 'uppercase',
                cursor: 'pointer', boxShadow: '0 0 25px rgba(212,175,55,0.5), 0 6px 20px rgba(0,0,0,0.5)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                opacity: loading || depleted ? 0.5 : 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {loading ? '...' : '🃏 ROZDAJ'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { label: '➕ DOBIERZ', action: hit, primary: true },
                { label: '✋ PAS', action: stand, primary: false },
                { label: '✖ PODWÓJ', action: doubleDown, primary: false },
              ].map(({ label, action, primary }) => (
                <button key={label} onClick={action} disabled={loading}
                  style={{
                    padding: '11px 28px',
                    background: primary
                      ? 'linear-gradient(135deg, #d4af37, #f5e088, #b8940f)'
                      : 'rgba(255,255,255,0.07)',
                    border: `2px solid ${primary ? '#d4af37' : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: 24,
                    color: primary ? '#111' : '#ccc',
                    fontWeight: 800, fontSize: '0.9rem',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    opacity: loading ? 0.5 : 1,
                    transition: 'transform 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          SLOT MACHINE
      ══════════════════════════════════════════════════ */}
      {mode === 'slots' && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

          {/* Machine body */}
          <div style={{
            flex: 2, minWidth: 300,
            background: 'linear-gradient(160deg, #1a0a30 0%, #0d0520 60%, #180a28 100%)',
            borderRadius: 28,
            border: '3px solid #d4af37',
            boxShadow: '0 0 60px rgba(212,175,55,0.3), 0 0 30px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,0,0,0.5)',
            padding: '32px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
          }}>
            <NeonTitle text="🎰 SLOTS" color="#e040fb" />

            {/* Reels grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              background: 'rgba(0,0,0,0.7)',
              padding: 20, borderRadius: 18,
              border: '2px solid rgba(212,175,55,0.4)',
              boxShadow: 'inset 0 0 25px rgba(0,0,0,0.8), 0 0 20px rgba(212,175,55,0.15)',
              position: 'relative',
            }}>
              {/* scanlines overlay */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 16,
                background: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.12) 4px, rgba(0,0,0,0.12) 6px)',
                pointerEvents: 'none', zIndex: 2,
              }} />
              {slotSymbols.map((sym, i) => (
                <SlotReel key={i} symbol={sym} spinning={slotSpinning} delay={i * 90} />
              ))}
            </div>

            {/* Result */}
            {slotResult && (
              <div style={{
                fontSize: '1.4rem', fontWeight: 900, textAlign: 'center',
                color: slotResult.win ? '#f1c40f' : '#888',
                textShadow: slotResult.win ? '0 0 20px #f1c40f, 0 0 40px #f1c40f66' : 'none',
                animation: 'bounce-in 0.5s ease',
                letterSpacing: '0.05em',
              }}>
                {slotResult.win ? `🎰 WYGRANA! +${slotResult.amount} 🪙` : '😔 Brak wygranej.'}
              </div>
            )}

            {/* Bet + Spin */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {CHIP_PRESETS.slice(0, 4).map(v => (
                  <Chip key={v} val={v} active={bet === v} onClick={() => { sfxClick(); setBet(v); }} />
                ))}
              </div>
              <button onClick={spin}
                disabled={slotSpinning || depleted || !user || user.tokens < bet}
                style={{
                  padding: '14px 44px',
                  background: slotSpinning
                    ? 'rgba(224,64,251,0.2)'
                    : 'linear-gradient(135deg, #e040fb, #aa00ff)',
                  border: '2px solid #e040fb',
                  borderRadius: 30, color: 'white',
                  fontWeight: 900, fontSize: '1.2rem',
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  cursor: slotSpinning ? 'not-allowed' : 'pointer',
                  boxShadow: slotSpinning ? 'none' : '0 0 30px rgba(224,64,251,0.5), 0 6px 20px rgba(0,0,0,0.6)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  opacity: depleted ? 0.4 : 1,
                }}
                onMouseEnter={e => !slotSpinning && (e.currentTarget.style.transform = 'scale(1.06)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {slotSpinning ? '⏳ SPINNING...' : '🎰 SPIN!'}
              </button>
            </div>
          </div>

          {/* Paytable */}
          <div style={{
            flex: 1, minWidth: 200,
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(212,175,55,0.25)',
            borderRadius: 16, padding: '20px 18px',
          }}>
            <div style={{
              fontFamily: "'Cinzel Decorative', serif",
              color: '#d4af37', fontWeight: 700,
              fontSize: '1rem', letterSpacing: '0.1em',
              textAlign: 'center', marginBottom: 16,
              textShadow: '0 0 10px rgba(212,175,55,0.5)',
            }}>
              TABELA WYPŁAT
            </div>

            {[
              ['Ułożenie', 'Wymagane'],
              ['Brak wygranej', 'Mniej niż 4 takie same'],
              ['Zwykła wygrana', '4 takie same symbole'],
              ['Średnia wygrana', '5 - 7 takich samych'],
              ['Wysoka wygrana', '8 takich samych'],
              ['JACKPOT 🎊', '9 takich samych symbolów'],
            ].map(([label, val]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '5px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: '0.8rem',
                color: label === 'JACKPOT 🎊' ? '#e040fb' : label === 'Brak wygranej' ? '#e74c3c' : 'rgba(255,255,255,0.7)',
              }}>
                <span>{label}</span>
                <span style={{ fontWeight: 700, color: label === 'JACKPOT 🎊' ? '#e040fb' : '#d4af37' }}>{val}</span>
              </div>
            ))}

            <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
              🍒 ×1.5 | 🍋 ×2 | ⭐ ×3.5<br />
              💎 ×7 | 7️⃣ ×15<br />
              <br />
              ×4→ x1 | ×5→ x2.5<br />
              ×6→ x5 | ×7→ x12<br />
              ×8→ x25 | ×9→ x60
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasinoPage;
