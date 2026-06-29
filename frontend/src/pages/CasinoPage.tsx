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
      <div style={{ lineHeight: 1.1, fontSize: '0.95rem' }}>
        <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>{rank}</div>
        <div>{sym}</div>
      </div>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '2rem', lineHeight: 1,
        textShadow: red ? '0 0 8px rgba(185,28,28,0.3)' : 'none',
      }}>{sym}</div>
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

// ZAWODNICZKI
interface Runner {
  id: number;
  name: string;
  emoji: string;
  color: string;
}

const RUNNERS: Runner[] = [
  { id: 1, name: 'Scarlett', emoji: '💃', color: '#ff2a6d' },
  { id: 2, name: 'Roxanne', emoji: '👠', color: '#05d9e8' },
  { id: 3, name: 'Lola', emoji: '💄', color: '#ff00e6' },
  { id: 4, name: 'Mercedes', emoji: '🕶️', color: '#f5a623' },
  { id: 5, name: 'Carmen', emoji: '👑', color: '#2ecc71' }
];

// ─── MAIN CASINO PAGE ────────────────────────────────────────────────────────
const CasinoPage: React.FC = () => {
  const [mode, setMode] = useState<'blackjack' | 'slots' | 'races'>('blackjack');
  const [bet, setBet] = useState(25);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; type: 'win' | 'lose' | 'push' | 'bj' } | null>(null);
  const [animKey, setAnimKey] = useState(0);

  // Blackjack
  const [dealerCards, setDealerCards] = useState<CardDef[]>([]);
  const [dealerValue, setDealerValue] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [playerCards, setPlayerCards] = useState<CardDef[]>([]);
  const [playerValue, setPlayerValue] = useState<number | null>(null);

  // Slots
  const { user, needs, setUser, updateNeeds } = useAuthStore();
  const { slotSpinning, setSlotSpinning, slotResult, setSlotResult, slotSymbols, setSlotSymbols } = useGameStore();

  // Wyścigi
  const [selectedRunner, setSelectedRunner] = useState<number | null>(null);
  const [raceRunning, setRaceRunning] = useState(false);
  const [runnerPositions, setRunnerPositions] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [raceResultMsg, setRaceResultMsg] = useState<string | null>(null);
  const [winningRunnerId, setWinningRunnerId] = useState<number | null>(null);

  const depleted = needs.sleep <= 0 || needs.hunger <= 0 || needs.hydration <= 0 || (needs.happiness ?? 100) <= 0;
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
      setDealerCards(d.dealerHand);
      setDealerValue(d.dealerValue);
      setPhase('done');
      updateNeeds(d.needs);
      if (user) setUser({ ...user, tokens: d.tokens });

      if (d.result === 'win' || d.result === 'blackjack') {
        sfxWin();
        setResult({ text: d.result === 'blackjack' ? '👑 Blackjack!' : '✅ Wygrałeś rozdanie!', type: 'win' });
      } else if (d.result === 'push') {
        setResult({ text: '🤝 Remis, stawka zwrócona.', type: 'push' });
      } else {
        sfxLose();
        setResult({ text: '❌ Przegrałeś z krupierem.', type: 'lose' });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const doubleDown = async () => {
    sfxClick();
    setLoading(true);
    try {
      const res = await api.post('/game/blackjack/double');
      const d = res.data;
      bumpAnim();
      setPlayerCards(d.playerHand);
      setDealerCards(d.dealerHand);
      setPlayerValue(d.playerValue);
      setDealerValue(d.dealerValue);
      setPhase('done');
      updateNeeds(d.needs);
      if (user) setUser({ ...user, tokens: d.tokens });

      if (d.result === 'win') {
        sfxWin();
        setResult({ text: '✅ Podwójna wygrana!', type: 'win' });
      } else if (d.result === 'push') {
        setResult({ text: '🤝 Remis, stawka zwrócona.', type: 'push' });
      } else {
        sfxLose();
        setResult({ text: '❌ Podwójna przegrana.', type: 'lose' });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── SLOTS ──────────────────────────────────────────────────────────────────
  const spin = async () => {
    if (slotSpinning || depleted || !user || user.tokens < bet) return;
    sfxSpinStart();
    setSlotSpinning(true);
    setSlotResult(null);
    setUser({ ...user, tokens: user.tokens - bet });

    try {
      const res = await api.post('/game/slots/spin', { bet });
      const d = res.data;
      updateNeeds(d.needs);

      setTimeout(() => {
        setSlotSymbols(d.reels);
        setSlotSpinning(false);
        sfxReelStop();

        const isWin = d.multiplier > 0;
        setSlotResult({ win: isWin, amount: d.winnings, symbols: d.reels });
        setUser({ ...user, tokens: d.tokens });

        if (isWin) {
          if (d.isBonus) sfxJackpot();
          else sfxWin();
        } else {
          sfxLose();
        }
      }, 1000);
    } catch (e) {
      setSlotSpinning(false);
      api.get('/auth/me').then(r => { if (user) setUser(r.data.user); });
    }
  };

  // ── WYŚCIGI ─────────────────────────────────────────────────────────────────
  const startRace = async () => {
    if (raceRunning || selectedRunner === null || depleted || !user || user.tokens < bet) return;
    sfxSpinStart();
    setRaceRunning(true);
    setRaceResultMsg(null);
    setWinningRunnerId(null);
    setRunnerPositions({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    // Odejmij stawkę lokalnie
    setUser({ ...user, tokens: user.tokens - bet });

    try {
      const res = await api.post('/game/race/bet', { bet, runner: selectedRunner });
      const winningId = res.data.winningRunner;

      // Rozpocznij animację ruchu zawodniczek
      let currentPos = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const interval = setInterval(() => {
        let reachedFinish = false;
        
        currentPos = {
          1: currentPos[1] + Math.random() * 3.5,
          2: currentPos[2] + Math.random() * 3.5,
          3: currentPos[3] + Math.random() * 3.5,
          4: currentPos[4] + Math.random() * 3.5,
          5: currentPos[5] + Math.random() * 3.5,
        };

        // Koryguj pozycje, aby zwycięzca dojechał pierwszy na samym końcu
        RUNNERS.forEach(r => {
          if (currentPos[r.id as 1|2|3|4|5] >= 90) {
            reachedFinish = true;
          }
        });

        setRunnerPositions({ ...currentPos });

        if (reachedFinish) {
          clearInterval(interval);
          
          // Ustaw ostateczne pozycje (zwycięzca na 100, reszta z tyłu)
          const finalPos: Record<number, number> = {};
          RUNNERS.forEach(r => {
            finalPos[r.id] = r.id === winningId ? 100 : Math.min(94, currentPos[r.id as 1|2|3|4|5]);
          });
          setRunnerPositions(finalPos);

          setWinningRunnerId(winningId);
          setRaceResultMsg(res.data.message);
          updateNeeds(res.data.needs);
          setUser({ ...user, tokens: res.data.tokens });

          if (res.data.isWin) sfxWin();
          else sfxLose();

          setRaceRunning(false);
        }
      }, 100);

    } catch (e) {
      setRaceRunning(false);
      api.get('/auth/me').then(r => { if (user) setUser(r.data.user); });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Taby Wyboru Gry */}
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
        {[
          { id: 'blackjack', label: '🃏 Blackjack', color: 'var(--gold)' },
          { id: 'slots', label: '🎰 Automat', color: '#e040fb' },
          { id: 'races', label: '🏁 Wyścigi (x5)', color: '#05d9e8' }
        ].map(t => (
          <button key={t.id} onClick={() => { sfxClick(); setMode(t.id as any); }}
            style={{
              background: mode === t.id ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: `2px solid ${mode === t.id ? t.color : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 14, padding: '12px 24px', cursor: 'pointer',
              color: mode === t.id ? '#fff' : '#aaa', fontWeight: 800, fontSize: '0.95rem',
              boxShadow: mode === t.id ? `0 0 15px ${t.color}22` : 'none',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          BLACKJACK
      ══════════════════════════════════════════════════ */}
      {mode === 'blackjack' && (
        <div style={{
          background: 'linear-gradient(150deg, #112518 0%, #061009 70%, #0c1c11 100%)',
          borderRadius: 24, border: '3px solid var(--border-gold)',
          boxShadow: '0 0 50px rgba(0,250,100,0.08), inset 0 0 30px rgba(0,0,0,0.8)',
          padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20
        }}>
          <NeonTitle text="Blackjack Vegas" color="#d4af37" />

          {/* Dealer card area */}
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <span style={{ color: '#aaa', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em' }}>KRUPIER</span>
            <div style={{ height: 16 }} />
            <CardRow cards={dealerCards} animBase={animKey + 100} />
            {dealerValue !== null && <Score val={dealerValue} />}
          </div>

          <div style={{ width: '100%', height: '1px', background: 'rgba(212,175,55,0.15)', margin: '10px 0' }} />

          {/* Player card area */}
          <div style={{ textAlign: 'center' }}>
            <CardRow cards={playerCards} animBase={animKey} />
            {playerValue !== null && <Score val={playerValue} bust={playerValue > 21} />}
            <div style={{ height: 10 }} />
            <span style={{ color: '#aaa', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em' }}>GRACZ</span>
          </div>

          {/* Result announcement */}
          {result && (
            <div style={{
              fontSize: '1.45rem', fontWeight: 900,
              color: result.type === 'win' ? '#f1c40f' : result.type === 'lose' ? '#e74c3c' : '#ccc',
              textShadow: result.type === 'win' ? '0 0 15px #f1c40f88' : 'none',
              animation: 'bounce-in 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              {result.text}
            </div>
          )}

          <div style={{ height: 6 }} />

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

      {/* ══════════════════════════════════════════════════
          WYŚCIGI (RACES)
      ══════════════════════════════════════════════════ */}
      {mode === 'races' && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          
          {/* Obszar toru wyścigowego */}
          <div className="glass-card" style={{
            flex: 2, minWidth: 320, padding: 24,
            background: 'linear-gradient(135deg, #0d001a 0%, #030008 100%)',
            border: '3px solid #05d9e8',
            boxShadow: '0 0 35px rgba(5,217,232,0.15)',
            display: 'flex', flexDirection: 'column', gap: 20
          }}>
            <div style={{ textAlign: 'center' }}>
              <NeonTitle text="🏁 WIRTUALNY TOR" color="#05d9e8" />
              <p style={{ color: '#888', fontSize: '0.85rem', marginTop: 8 }}>
                Wybierz zawodniczkę, obstaw stawkę i wygraj 5x więcej! Szanse: 20% na każdą.
              </p>
            </div>

            {/* Tor wyścigowy w CSS */}
            <div style={{
              background: 'rgba(0,0,0,0.8)', border: '2px solid rgba(5,217,232,0.3)',
              borderRadius: 16, padding: '16px 12px', display: 'flex', flexDirection: 'column',
              gap: 12, position: 'relative', overflow: 'hidden'
            }}>
              {/* Linia startu i mety */}
              <div style={{ position: 'absolute', left: 45, top: 0, bottom: 0, width: 2, background: 'dashed rgba(255,255,255,0.2)' }} />
              <div style={{ position: 'absolute', right: 40, top: 0, bottom: 0, width: 4, background: 'repeating-linear-gradient(45deg, #fff, #fff 4px, #000 4px, #000 8px)' }} />

              {RUNNERS.map((runner) => {
                const pos = runnerPositions[runner.id] || 0;
                const isSelected = selectedRunner === runner.id;
                const isWinner = winningRunnerId === runner.id;
                
                return (
                  <div key={runner.id} style={{
                    display: 'flex', alignItems: 'center', height: 48,
                    background: isSelected ? 'rgba(5,217,232,0.06)' : 'rgba(255,255,255,0.02)',
                    borderRadius: 8, padding: '0 8px', border: `1px solid ${isSelected ? 'rgba(5,217,232,0.4)' : 'transparent'}`,
                    position: 'relative'
                  }}>
                    {/* Numer i imię toru */}
                    <div style={{ width: 35, fontWeight: 900, color: runner.color, fontSize: '0.9rem' }}>
                      #{runner.id}
                    </div>

                    {/* Poruszający się runner */}
                    <div style={{
                      position: 'absolute',
                      left: `calc(40px + ${pos * 0.8}%)`, // mapuje 0-100 do szerokości toru
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'left 0.1s linear',
                      zIndex: 5
                    }}>
                      <span style={{
                        fontSize: '1.8rem',
                        filter: isWinner ? 'drop-shadow(0 0 10px #f1c40f)' : 'none',
                        animation: raceRunning ? 'float-up 0.5s infinite alternate' : 'none'
                      }}>
                        {runner.emoji}
                      </span>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700,
                        color: runner.color, background: 'rgba(0,0,0,0.8)',
                        padding: '2px 6px', borderRadius: 4, border: `1px solid ${runner.color}`
                      }}>
                        {runner.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Komunikat o wygranej */}
            {raceResultMsg && (
              <div style={{
                textAlign: 'center', fontWeight: 900, fontSize: '1.25rem',
                color: raceResultMsg.includes('WYGRANA') ? '#2ecc71' : '#ff3838',
                textShadow: raceResultMsg.includes('WYGRANA') ? '0 0 15px rgba(46,204,113,0.3)' : 'none',
                animation: 'bounce-in 0.5s ease'
              }}>
                {raceResultMsg}
              </div>
            )}

            {/* Przyciski operacyjne */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {CHIP_PRESETS.slice(0, 4).map(v => (
                  <Chip key={v} val={v} active={bet === v} onClick={() => { sfxClick(); setBet(v); }} />
                ))}
              </div>

              <button
                onClick={startRace}
                disabled={raceRunning || selectedRunner === null || depleted || !user || user.tokens < bet}
                style={{
                  padding: '12px 42px',
                  background: raceRunning
                    ? 'rgba(5,217,232,0.2)'
                    : 'linear-gradient(135deg, #05d9e8, #0056b3)',
                  border: '2px solid #05d9e8', borderRadius: 30, color: '#fff',
                  fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.12em',
                  boxShadow: raceRunning ? 'none' : '0 0 25px rgba(5,217,232,0.4)',
                  cursor: (raceRunning || selectedRunner === null) ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.15s',
                  opacity: (depleted || selectedRunner === null) ? 0.5 : 1
                }}
                onMouseEnter={e => !raceRunning && selectedRunner !== null && (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {raceRunning ? '🏁 BIEGNĄ...' : '🏁 ZACZNIJ WYŚCIG'}
              </button>
            </div>

          </div>

          {/* Panel Wyboru Zawodniczki (Obstawianie) */}
          <div className="glass-card" style={{
            flex: 1, minWidth: 240, padding: 20,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(5,217,232,0.25)',
            display: 'flex', flexDirection: 'column', gap: 14
          }}>
            <h3 style={{
              color: '#05d9e8', fontWeight: 900, fontSize: '1rem',
              textAlign: 'center', marginBottom: 10, letterSpacing: '0.08em'
            }}>
              BET: WYBIERZ FAWORYTA
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {RUNNERS.map((runner) => {
                const isSelected = selectedRunner === runner.id;
                return (
                  <button
                    key={runner.id}
                    disabled={raceRunning}
                    onClick={() => { sfxClick(); setSelectedRunner(runner.id); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 10,
                      background: isSelected ? `${runner.color}15` : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${isSelected ? runner.color : 'rgba(255,255,255,0.08)'}`,
                      cursor: raceRunning ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      width: '100%'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.4rem' }}>{runner.emoji}</span>
                      <span style={{ fontWeight: 800, color: isSelected ? runner.color : '#ccc', fontSize: '0.85rem' }}>
                        {runner.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: runner.color }}>
                      x5.0
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{
              marginTop: 10, fontSize: '0.75rem', color: '#666',
              lineHeight: '1.5', textAlign: 'center'
            }}>
              Wszystkie zawodniczki startują w równych warunkach. Losowy generator prędkości decyduje o wygranej.
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default CasinoPage;
