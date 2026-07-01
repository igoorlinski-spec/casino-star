import React, { useState, useEffect, useRef } from 'react';
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
  image: string;
}

const RUNNERS: Runner[] = [
  { id: 1, name: 'Scarlett', emoji: '💃', color: '#ff2a6d', image: '/runners/runner1.png' },
  { id: 2, name: 'Roxanne', emoji: '👠', color: '#05d9e8', image: '/runners/runner2.png' },
  { id: 3, name: 'Lola', emoji: '💄', color: '#ff00e6', image: '/runners/runner3.png' },
  { id: 4, name: 'Mercedes', emoji: '🕶️', color: '#f5a623', image: '/runners/runner4.png' },
  { id: 5, name: 'Carmen', emoji: '👑', color: '#2ecc71', image: '/runners/runner5.png' }
];

// ─── CRASH GAME SUBCOMPONENT ──────────────────────────────────────────────────
const CrashGame: React.FC<{
  user: any;
  setUser: (u: any) => void;
  updateNeeds: (n: any) => void;
  depleted: boolean;
}> = ({ user, setUser, updateNeeds, depleted }) => {
  const [bet, setBet] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCrashed, setIsCrashed] = useState(false);
  const [multiplier, setMultiplier] = useState(1.00);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const multiplierRef = useRef(1.00);

  const startCrashGame = async () => {
    if (depleted || !user || user.tokens < bet || isPlaying) return;
    sfxClick();
    setLoading(true);
    setIsPlaying(true);
    setIsCrashed(false);
    setMultiplier(1.00);
    multiplierRef.current = 1.00;
    setHasCashedOut(false);
    setMessage(null);

    try {
      const res = await api.post('/game/crash/start', { bet });
      setUser({ ...user, tokens: res.data.tokens });
      
      const serverCrashMult = parseFloat(atob(res.data.crashMultiplier)) / 9.876;

      startTimeRef.current = Date.now();
      const tick = () => {
        const elapsed = (Date.now() - startTimeRef.current!) / 1000;
        const currentMult = parseFloat(Math.pow(1.075, elapsed).toFixed(2));
        
        if (currentMult >= serverCrashMult) {
          autoCashOut(999.00); // Wybuch na serwerze w czasie rzeczywistym
          return;
        }

        if (currentMult >= 50.00) {
          autoCashOut(50.00);
          return;
        }

        setMultiplier(currentMult);
        multiplierRef.current = currentMult;

        drawGraph(currentMult, false);

        requestRef.current = requestAnimationFrame(tick);
      };
      requestRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Błąd');
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const autoCashOut = async (mult: number) => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setIsPlaying(false);
    try {
      const res = await api.post('/game/crash/cashout', { multiplier: mult });
      if (res.data.won) {
        setHasCashedOut(true);
        setMessage(res.data.message);
        setUser({ ...user, tokens: res.data.tokens });
        updateNeeds(res.data.needs);
        sfxWin();
        drawGraph(mult, false, true);
      } else {
        setIsCrashed(true);
        setMessage(res.data.message);
        updateNeeds(res.data.needs);
        sfxLose();
        drawGraph(res.data.crashMultiplier, true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cashOut = async () => {
    if (!isPlaying || hasCashedOut || isCrashed) return;
    sfxClick();
    setLoading(true);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    const cashoutMult = multiplierRef.current;

    try {
      const res = await api.post('/game/crash/cashout', { multiplier: cashoutMult });
      updateNeeds(res.data.needs);
      if (res.data.won) {
        setHasCashedOut(true);
        setMessage(res.data.message);
        setUser({ ...user, tokens: res.data.tokens });
        sfxWin();
        drawGraph(cashoutMult, false, true);
      } else {
        setIsCrashed(true);
        setMessage(res.data.message);
        sfxLose();
        drawGraph(res.data.crashMultiplier, true);
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Błąd');
    } finally {
      setLoading(false);
      setIsPlaying(false);
    }
  };

  const drawGraph = (mult: number, crashed: boolean, won: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0118';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const startX = 50;
    const startY = h - 50;
    
    const progress = Math.min(1, (mult - 1) / 10);
    const endX = startX + (w - 150) * progress;
    const endY = startY - (h - 150) * Math.sin(progress * Math.PI / 2);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo((startX + endX) / 2, startY, endX, endY);
    
    ctx.lineWidth = 4;
    if (crashed) {
      ctx.strokeStyle = '#ff3838';
    } else if (won) {
      ctx.strokeStyle = '#2ecc71';
    } else {
      ctx.strokeStyle = '#05d9e8';
    }
    ctx.shadowColor = crashed ? '#ff3838' : (won ? '#2ecc71' : '#05d9e8');
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (crashed) {
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath();
      ctx.arc(endX, endY, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff3838';
      ctx.beginPath();
      ctx.arc(endX, endY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(endX, endY, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚀', endX, endY);
    }
  };

  useEffect(() => {
    drawGraph(1.00, false);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="glass-card" style={{
      maxWidth: 800, margin: '0 auto', padding: 24,
      background: 'rgba(10, 1, 24, 0.85)', border: '2px solid rgba(46, 204, 113, 0.25)',
      borderRadius: 20, boxShadow: '0 0 35px rgba(46, 204, 113, 0.1)', display: 'flex', flexDirection: 'column', gap: 20
    }}>
      <h2 style={{
        textAlign: 'center', fontFamily: 'var(--font-display)', color: '#2ecc71',
        textShadow: '0 0 15px rgba(46,204,113,0.3)', margin: 0, fontSize: '2rem', letterSpacing: '0.08em'
      }}>
        🚀 CRASH GAME (CASH)
      </h2>

      <div style={{ position: 'relative', width: '100%', height: 350, borderRadius: 16, overflow: 'hidden', border: '3px solid #2ecc71' }}>
        <canvas ref={canvasRef} width={748} height={350} style={{ display: 'block', width: '100%', height: '100%' }} />

        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '3.8rem', fontWeight: 900, margin: 0,
            color: isCrashed ? '#ff3838' : (hasCashedOut ? '#2ecc71' : '#fff'),
            textShadow: isCrashed ? '0 0 20px #ff3838' : (hasCashedOut ? '0 0 20px #2ecc71' : '0 0 20px rgba(5,217,232,0.5)'),
            transition: 'color 0.2s, text-shadow 0.2s'
          }}>
            {multiplier.toFixed(2)}x
          </h1>
          {isCrashed && <span style={{ color: '#ff3838', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.1em' }}>BUM! WYBUCHŁO 💥</span>}
          {hasCashedOut && <span style={{ color: '#2ecc71', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.1em' }}>WYPŁACONO ✅</span>}
        </div>
      </div>

      {message && (
        <div style={{
          textAlign: 'center', padding: '10px 16px', borderRadius: 8, fontWeight: 700, fontSize: '1.05rem',
          background: message.includes('Sukces') ? 'rgba(46,204,113,0.15)' : 'rgba(255,56,56,0.15)',
          border: `1px solid ${message.includes('Sukces') ? '#2ecc71' : '#ff3838'}`,
          color: message.includes('Sukces') ? '#2ecc71' : '#ff3838',
          animation: 'bounce-in 0.4s ease'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 700 }}>STAWKA (ŻETONY)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              min={1}
              disabled={isPlaying}
              value={bet}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 0);
                setBet(val);
              }}
              style={{
                width: 90, padding: '6px 10px', background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                color: '#fff', fontSize: '0.9rem', fontWeight: 700, outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {[10, 50, 100, 500].map(val => (
                <button
                  key={val}
                  disabled={isPlaying}
                  onClick={() => { sfxClick(); setBet(val); }}
                  style={{
                    padding: '6px 12px', border: `1px solid ${bet === val ? '#2ecc71' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 6, background: bet === val ? 'rgba(46,204,113,0.1)' : 'transparent',
                    color: bet === val ? '#2ecc71' : '#aaa', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem'
                  }}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isPlaying ? (
          <button
            onClick={cashOut}
            disabled={loading}
            style={{
              padding: '16px 60px', borderRadius: 30, border: '3px solid #2ecc71',
              background: 'linear-gradient(135deg, #2ecc71, #27ae60)', color: '#fff',
              fontSize: '1.3rem', fontWeight: 900, cursor: 'pointer',
              boxShadow: '0 0 30px rgba(46, 204, 113, 0.6)', letterSpacing: '0.08em',
              transition: 'transform 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            💰 WYPŁAĆ ({(bet * multiplier).toFixed(0)} 🪙)
          </button>
        ) : (
          <button
            onClick={startCrashGame}
            disabled={loading || depleted || !user || user.tokens < bet}
            style={{
              padding: '16px 60px', borderRadius: 30, border: '3px solid #2ecc71',
              background: 'transparent', color: '#2ecc71',
              fontSize: '1.3rem', fontWeight: 900, cursor: (depleted || user?.tokens < bet) ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 15px rgba(46, 204, 113, 0.2)', letterSpacing: '0.08em',
              opacity: (depleted || user?.tokens < bet) ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => !(depleted || user?.tokens < bet) && (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {depleted ? '⚠️ ZADBAJ O POTRZEBY!' : (user && user.tokens < bet ? '⚠️ BRAK ŻETONÓW' : '🚀 ROZPOCZNIJ GRĘ')}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── CHICKEN ROAD SUBCOMPONENT ────────────────────────────────────────────────
const CHICKEN_MULTIPLIERS = [1.25, 1.43, 1.66, 1.94, 2.28, 2.71, 3.25, 3.94, 4.85, 6.00];

const ChickenGame: React.FC<{
  user: any;
  setUser: (u: any) => void;
  updateNeeds: (n: any) => void;
  depleted: boolean;
}> = ({ user, setUser, updateNeeds, depleted }) => {
  const [bet, setBet] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isCrashed, setIsCrashed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const startChickenGame = async () => {
    if (depleted || !user || user.tokens < bet || isPlaying) return;
    sfxClick();
    setLoading(true);
    setIsCrashed(false);
    setCurrentStep(-1);
    setMessage(null);

    try {
      const res = await api.post('/game/chicken/start', { bet });
      setUser({ ...user, tokens: res.data.tokens });
      setIsPlaying(true);
      sfxSpinStart();
    } catch (err: any) {
      sfxLose();
      alert(err.response?.data?.error || 'Błąd rozpoczynania gry');
    } finally {
      setLoading(false);
    }
  };

  const takeStep = async () => {
    if (!isPlaying || loading) return;
    sfxClick();
    setLoading(true);
    setMessage(null);

    try {
      const res = await api.post('/game/chicken/step');
      if (res.data.crashed) {
        setIsCrashed(true);
        setIsPlaying(false);
        sfxLose();
        setMessage(res.data.message);
        if (res.data.needs) updateNeeds(res.data.needs);
        api.get('/auth/me').then(r => { if (user) setUser(r.data.user); });
      } else {
        setCurrentStep(res.data.step);
        sfxCardDeal();
      }
    } catch (err: any) {
      sfxLose();
      alert(err.response?.data?.error || 'Błąd ruchu');
    } finally {
      setLoading(false);
    }
  };

  const cashout = async () => {
    if (!isPlaying || loading || currentStep < 0) return;
    sfxClick();
    setLoading(true);

    try {
      const res = await api.post('/game/chicken/cashout');
      setUser({ ...user, tokens: res.data.tokens });
      if (res.data.needs) updateNeeds(res.data.needs);
      setIsPlaying(false);
      sfxWin();
      setMessage(res.data.message);
    } catch (err: any) {
      sfxLose();
      alert(err.response?.data?.error || 'Błąd wypłaty');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', width: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <NeonTitle text="🐔 CHICKEN ROAD" color="#ffd700" />
        <p style={{ color: '#a39cb3', fontSize: '0.85rem', marginTop: 8 }}>
          Przeprowadź bezpiecznie kurczaka przez ruchliwą drogę Vegas! Każdy krok zwiększa mnożnik. Nie daj się rozjechać!
        </p>
      </div>

      <div className="glass-card" style={{
        width: '100%', maxWidth: 900, height: 350, background: '#0a0d24',
        border: '3px solid var(--neon-cyan)', borderRadius: 24, overflow: 'hidden',
        boxShadow: 'inset 0 0 60px rgba(0,240,255,0.15)', position: 'relative',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20
      }}>
        <div style={{
          flex: 1, position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 9.5%, rgba(255,255,255,0.06) 9.5%, rgba(255,255,255,0.06) 10%)',
          padding: '0 10px'
        }}>
          {CHICKEN_MULTIPLIERS.map((mult, index) => {
            const isReached = index <= currentStep;
            const isCurrent = index === currentStep;
            return (
              <div key={index} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                height: '100%', position: 'relative'
              }}>
                <div style={{ fontSize: '1.8rem', opacity: isReached ? 0.3 : 1 }}>
                  🚧
                </div>

                <div style={{
                  fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.15)',
                  letterSpacing: '0.05em', transform: 'rotate(-90deg)', margin: '15px 0'
                }}>
                  CHICKEN ROAD
                </div>

                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: '35%', zIndex: 10, fontSize: '3rem',
                    animation: 'walk-bob 0.25s infinite alternate', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                  }}>
                    🐔
                  </div>
                )}

                {isCrashed && index === currentStep + 1 && (
                  <div style={{
                    position: 'absolute', top: '35%', zIndex: 10, fontSize: '3.5rem',
                    animation: 'bounce-in 0.2s'
                  }}>
                    💥
                  </div>
                )}

                <div style={{
                  width: 54, height: 54, borderRadius: '50%',
                  background: isReached ? 'linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)' : 'rgba(0,0,0,0.4)',
                  border: `2px solid ${isReached ? '#ffd700' : 'rgba(255,255,255,0.1)'}`,
                  color: isReached ? '#05020a' : '#a39cb3', fontWeight: 900, fontSize: '0.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isReached ? '0 0 15px rgba(255, 215, 0, 0.4)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  x{mult}
                </div>

                {isCurrent && (
                  <div style={{
                    background: '#ffd700', color: '#000', padding: '3px 8px', borderRadius: 8,
                    fontSize: '0.7rem', fontWeight: 900, marginTop: 5, boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                  }}>
                    x{mult}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {message && (
          <div style={{
            background: isCrashed ? 'rgba(255,0,85,0.15)' : 'rgba(57,255,20,0.15)',
            border: `1px solid ${isCrashed ? 'var(--neon-pink)' : 'var(--neon-green)'}`,
            color: isCrashed ? 'var(--neon-pink)' : 'var(--neon-green)',
            padding: '8px 20px', borderRadius: 12, textAlign: 'center', fontWeight: 'bold',
            fontSize: '0.9rem', width: '100%', marginTop: 10
          }}>
            {message}
          </div>
        )}
      </div>

      <div className="glass-card" style={{
        width: '100%', maxWidth: 700, padding: '20px 24px', background: 'rgba(15, 8, 30, 0.9)',
        border: '1px solid rgba(0,240,255,0.2)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)' }}>STAWKA (🪙):</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <button disabled={isPlaying} onClick={() => setBet(b => Math.max(10, b - 10))} className="btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 6 }}>-</button>
              <input disabled={isPlaying} type="number" value={bet} onChange={e => setBet(Math.max(10, parseInt(e.target.value) || 10))} style={{ width: 80, padding: '6px 10px', textAlign: 'center', borderRadius: 6 }} />
              <button disabled={isPlaying} onClick={() => setBet(b => b + 10)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 6 }}>+</button>
            </div>
          </div>

          {!isPlaying && (
            <div style={{ display: 'flex', gap: 6, marginTop: 15 }}>
              <button onClick={() => setBet(10)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.65rem', borderRadius: 4 }}>MIN</button>
              <button onClick={() => setBet(b => Math.floor(b * 2))} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.65rem', borderRadius: 4 }}>x2</button>
              <button onClick={() => setBet(b => Math.max(10, Math.floor(b / 2)))} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.65rem', borderRadius: 4 }}>/2</button>
            </div>
          )}
        </div>

        <div>
          {!isPlaying ? (
            <button
              onClick={startChickenGame}
              disabled={loading || depleted || !user || user.tokens < bet}
              className="btn-gold"
              style={{ padding: '12px 40px', fontSize: '1.05rem', borderRadius: 30, opacity: (loading || depleted || !user || user.tokens < bet) ? 0.5 : 1 }}
            >
              {depleted 
                ? '⚠️ ZADBAJ O POTRZEBY!' 
                : (user && user.tokens < bet ? '⚠️ BRAK ŻETONÓW' : '🚀 POSTAW BET')}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={cashout}
                disabled={loading || currentStep < 0}
                className="btn-gold"
                style={{ padding: '12px 25px', fontSize: '0.95rem', background: 'linear-gradient(135deg, #2ecc71, #27ae60)', boxShadow: '0 0 15px rgba(46,204,113,0.4)', color: '#fff' }}
              >
                💰 WYPŁAĆ ({currentStep >= 0 ? Math.floor(bet * CHICKEN_MULTIPLIERS[currentStep]) : 0} 🪙)
              </button>
              <button
                onClick={takeStep}
                disabled={loading || currentStep >= 9}
                className="btn-red"
                style={{ padding: '12px 25px', fontSize: '0.95rem' }}
              >
                ➡️ IDŹ DALEJ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── MAIN CASINO PAGE ────────────────────────────────────────────────────────
const CasinoPage: React.FC = () => {
  const [mode, setMode] = useState<'blackjack' | 'slots' | 'races' | 'crash' | 'chicken'>('blackjack');
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
  const raceIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (raceIntervalRef.current) {
        clearInterval(raceIntervalRef.current);
      }
    };
  }, [mode]);

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

      if (d.outcome === 'win' || d.outcome === 'blackjack') {
        sfxWin();
        setResult({ text: d.outcome === 'blackjack' ? '👑 Blackjack!' : '✅ Wygrałeś rozdanie!', type: 'win' });
      } else if (d.outcome === 'push') {
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

      if (d.outcome === 'win') {
        sfxWin();
        setResult({ text: '✅ Podwójna wygrana!', type: 'win' });
      } else if (d.outcome === 'push') {
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
      if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
      
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
          if (raceIntervalRef.current) {
            clearInterval(raceIntervalRef.current);
            raceIntervalRef.current = null;
          }
          
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
      raceIntervalRef.current = interval;

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
          { id: 'races', label: '🏁 Wyścigi (x5)', color: '#05d9e8' },
          { id: 'crash', label: '🚀 Crash Game', color: '#2ecc71' },
          { id: 'chicken', label: '🐔 Chicken Road', color: '#ffd700' }
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
                      <img src={runner.image} alt={runner.name} style={{
                        width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                        border: `2px solid ${runner.color}`,
                        filter: isWinner ? 'drop-shadow(0 0 10px #f1c40f)' : 'none',
                        animation: raceRunning ? 'float-up 0.5s infinite alternate' : 'none'
                      }} />
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
                      <img src={runner.image} alt={runner.name} style={{
                        width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
                        border: `1px solid ${runner.color}`
                      }} />
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

      {mode === 'crash' && (
        <CrashGame user={user} setUser={setUser} updateNeeds={updateNeeds} depleted={depleted} />
      )}

      {mode === 'chicken' && (
        <ChickenGame user={user} setUser={setUser} updateNeeds={updateNeeds} depleted={depleted} />
      )}
    </div>
  );
};

export default CasinoPage;
