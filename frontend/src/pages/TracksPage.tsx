import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';
import { sfxClick, sfxWin, sfxLose, sfxFun } from '../utils/sfx';

interface TargetCircle {
  id: number;
  x: number;
  y: number;
  clicked: boolean;
}

const TracksPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState<{
    active: boolean;
    victim: { id: string; name: string; rescue: number; bury: number; risk: boolean } | null;
    claimedBy: string | null;
    isYours: boolean;
    timeLeft: number;
  } | null>(null);

  const [claimedVictim, setClaimedVictim] = useState<any>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  
  // CPR Mini-game state
  const [isPlayingCpr, setIsPlayingCpr] = useState(false);
  const [cprCircles, setCprCircles] = useState<TargetCircle[]>([]);
  const [cprTimer, setCprTimer] = useState(0);
  const timerRef = useRef<any>(null);

  const { user, setUser } = useAuthStore();

  const fetchState = async () => {
    try {
      const res = await api.get('/tracks/state');
      setGameState(res.data);
      if (!res.data.isYours) {
        setClaimedVictim(null);
      }
    } catch (err) {
      console.error('Failed to fetch tracks state:', err);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 4000);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleClaim = async () => {
    sfxClick();
    setLoading(true);
    setOutcome(null);
    try {
      const res = await api.post('/tracks/claim');
      setClaimedVictim(res.data.victim);
      await fetchState();
    } catch (err: any) {
      sfxLose();
      alert(err.response?.data?.error || 'Błąd podczas przejmowania ciała.');
    } finally {
      setLoading(false);
    }
  };

  const handleBury = async () => {
    sfxClick();
    setLoading(true);
    try {
      const res = await api.post('/tracks/action', { action: 'bury', success: true });
      setOutcome(res.data.message);
      sfxFun();
      if (user) {
        setUser({ ...user, dollars: res.data.dollars });
      }
      setClaimedVictim(null);
      await fetchState();
    } catch (err: any) {
      sfxLose();
      alert(err.response?.data?.error || 'Błąd');
    } finally {
      setLoading(false);
    }
  };

  const startCprGame = () => {
    sfxClick();
    // Generate 5 random circles
    const circles: TargetCircle[] = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: 15 + Math.random() * 70, // 15% to 85% width
      y: 20 + Math.random() * 60, // 20% to 80% height
      clicked: false
    }));
    setCprCircles(circles);
    setCprTimer(5.5); // 5.5 seconds to click all
    setIsPlayingCpr(true);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCprTimer((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current!);
          finishCpr(false);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  };

  const handleCircleClick = (id: number) => {
    sfxClick();
    setCprCircles((prev) => {
      const updated = prev.map(c => c.id === id ? { ...c, clicked: true } : c);
      // Check if all clicked
      const allClicked = updated.every(c => c.clicked);
      if (allClicked) {
        clearInterval(timerRef.current!);
        finishCpr(true);
      }
      return updated;
    });
  };

  const finishCpr = async (passed: boolean) => {
    setIsPlayingCpr(false);
    setLoading(true);
    try {
      const res = await api.post('/tracks/action', { action: 'rescue', success: passed });
      setOutcome(res.data.message);
      if (res.data.message.includes('Sukces')) {
        sfxWin();
      } else {
        sfxLose();
      }
      if (user) {
        setUser({ ...user, dollars: res.data.dollars });
      }
      setClaimedVictim(null);
      await fetchState();
    } catch (err: any) {
      sfxLose();
      alert(err.response?.data?.error || 'Błąd');
    } finally {
      setLoading(false);
    }
  };

  // Convert minutes and seconds from timeLeft
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Upper stats / Desert vibe */}
      <div className="glass-card" style={{
        padding: '30px', background: 'rgba(26, 12, 5, 0.9)',
        border: '2px solid var(--gold)', borderRadius: 20,
        boxShadow: '0 0 25px rgba(212,175,55,0.15)', textAlign: 'center',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, #ff9f43, #ee5253, #ff9f43)'
        }} />

        <h2 style={{
          fontFamily: 'var(--font-display)', color: 'var(--gold)',
          textShadow: '0 0 10px rgba(212,175,55,0.4)', fontSize: '2rem',
          margin: '0 0 10px 0', letterSpacing: '0.05em'
        }}>
          🛤️ Tory Kolejowe w Miasteczku
        </h2>
        <p style={{ color: '#dcdde1', maxWidth: 650, margin: '0 auto 15px auto', fontSize: '0.95rem' }}>
          Tory są wspólne dla wszystkich rewolwerowców w okolicy! Co 3 minuty przejeżdża pociąg towarowy, 
          który czasem potrąca zbłąkanych wędrowców. Ten, kto pierwszy zbada tory i przejmie ciało, 
          zgarnia nagrodę lub próbuje reanimacji!
        </p>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.4)', padding: '8px 20px', borderRadius: 30, border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '1.2rem' }}>🕒</span>
          <span style={{ fontWeight: 800, color: '#ff9f43' }}>Następny pociąg za:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#fff', fontSize: '1.2rem' }}>
            {gameState ? formatTime(gameState.timeLeft) : '---'}
          </span>
        </div>
      </div>

      {/* Main Track Interactive Arena */}
      <div className="glass-card" style={{
        height: 380, position: 'relative', background: '#2d1e16',
        borderRadius: 20, border: '3px solid #5c3a21', overflow: 'hidden',
        boxShadow: 'inset 0 0 80px rgba(0,0,0,0.8)'
      }}>
        {/* Sky / Desert Horizon gradient */}
        <div style={{
          height: '40%',
          background: 'linear-gradient(to bottom, #d35400 0%, #e67e22 50%, #f39c12 100%)',
          opacity: 0.8, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          position: 'relative'
        }}>
          {/* Glowing hot sun */}
          <div style={{
            position: 'absolute', bottom: -20, width: 80, height: 80,
            borderRadius: '50%', background: '#fff',
            boxShadow: '0 0 40px #f1c40f, 0 0 80px #e67e22'
          }} />
        </div>

        {/* Ground */}
        <div style={{
          height: '60%', background: '#8a6240', position: 'relative'
        }}>
          {/* Cactus decorations */}
          <span style={{ position: 'absolute', left: '8%', top: '10%', fontSize: '2.5rem', opacity: 0.35 }}>🌵</span>
          <span style={{ position: 'absolute', right: '10%', top: '25%', fontSize: '2.2rem', opacity: 0.35 }}>🌵</span>

          {/* Railway Tracks stretching horizontally */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '45%', height: 28,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            {/* Wooden Ties (Sleepers) */}
            <div style={{
              position: 'absolute', left: 0, right: 0, height: '100%',
              backgroundImage: 'repeating-linear-gradient(90deg, #4d3319, #4d3319 12px, transparent 12px, transparent 38px)'
            }} />
            {/* Metal Rails */}
            <div style={{ width: '100%', height: 3, background: '#bdc3c7', boxShadow: '0 1px 3px rgba(0,0,0,0.5)', zIndex: 2 }} />
            <div style={{ width: '100%', height: 3, background: '#bdc3c7', boxShadow: '0 1px 3px rgba(0,0,0,0.5)', zIndex: 2 }} />
          </div>

          {/* Active Victim on Tracks */}
          {gameState?.active && gameState.victim && (
            <div 
              style={{
                position: 'absolute', left: '50%', top: '35%', transform: 'translateX(-50%)',
                textAlign: 'center', zIndex: 5, animation: 'pulse 1.5s infinite'
              }}
            >
              <div style={{ fontSize: '3rem', cursor: 'pointer', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}>
                👨🏾‍🦱
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.75)', color: '#ff7675', padding: '3px 12px',
                borderRadius: 12, border: '1px solid #ff7675', fontWeight: 800, fontSize: '0.8rem',
                marginTop: 5, whiteSpace: 'nowrap'
              }}>
                Ranny: {gameState.victim.name}
              </div>
            </div>
          )}

          {/* No active victim message */}
          {(!gameState?.active || !gameState.victim) && !claimedVictim && (
            <div style={{
              position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center', background: 'rgba(0,0,0,0.6)', padding: '12px 24px',
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <span style={{ fontSize: '1.2rem', color: '#bdc3c7', fontWeight: 700 }}>
                {gameState?.claimedBy 
                  ? `🤠 Ciało sprzątnięte przez rewolwerowca: ${gameState.claimedBy}` 
                  : '🛤️ Tory są czyste. Czekanie na kolejny przejazd pociągu...'
                }
              </span>
            </div>
          )}
        </div>

        {/* CPR rhythm game overlay */}
        {isPlayingCpr && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 50, display: 'flex', flexDirection: 'column'
          }}>
            {/* CPR Header */}
            <div style={{ padding: 15, background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#ff4757', fontWeight: 900, fontSize: '1.2rem' }}>💖 REANIMACJA (CPR)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#fff', fontSize: '0.9rem' }}>Klikaj pulsujące serca:</span>
                <div style={{
                  width: 150, height: 10, background: '#333', borderRadius: 5, overflow: 'hidden', border: '1px solid #555'
                }}>
                  <div style={{
                    width: `${(cprTimer / 5.5) * 100}%`, height: '100%',
                    background: cprTimer < 2 ? '#ff4757' : '#2ecc71', transition: 'width 0.1s linear'
                  }} />
                </div>
              </div>
            </div>

            {/* Click Game Field */}
            <div style={{ flex: 1, position: 'relative' }}>
              {cprCircles.map((circle) => !circle.clicked && (
                <button
                  key={circle.id}
                  onClick={() => handleCircleClick(circle.id)}
                  style={{
                    position: 'absolute', left: `${circle.x}%`, top: `${circle.y}%`,
                    transform: 'translate(-50%, -50%)', width: 60, height: 60,
                    borderRadius: '50%', border: '3px solid #ff4757',
                    background: 'radial-gradient(circle, #ff6b81 0%, #ff4757 100%)',
                    color: '#fff', fontSize: '1.8rem', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 0 15px #ff4757',
                    animation: 'pulse 0.8s infinite'
                  }}
                >
                  ❤️
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action / Outcome control panel */}
      {outcome && (
        <div style={{
          background: outcome.includes('Sukces') || outcome.includes('Pochowałeś') ? 'rgba(46,204,113,0.15)' : 'rgba(255,71,87,0.15)',
          border: `1px solid ${outcome.includes('Sukces') || outcome.includes('Pochowałeś') ? '#2ecc71' : '#ff4757'}`,
          color: outcome.includes('Sukces') || outcome.includes('Pochowałeś') ? '#2ecc71' : '#ff4757',
          padding: '16px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem'
        }}>
          {outcome}
        </div>
      )}

      {/* Interaction block */}
      {gameState?.active && gameState.victim && !claimedVictim && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleClaim}
            disabled={loading}
            className="btn-gold"
            style={{
              padding: '16px 40px', fontSize: '1.2rem', fontWeight: 900,
              boxShadow: '0 0 25px rgba(212,175,55,0.4)', borderRadius: 30
            }}
          >
            🧨 Zbadaj i przejmij ciało Hindusa!
          </button>
        </div>
      )}

      {claimedVictim && (
        <div className="glass-card" style={{
          padding: '24px', background: 'rgba(25, 12, 5, 0.95)',
          border: '2px solid var(--gold)', borderRadius: 16,
          display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center'
        }}>
          <h3 style={{ color: 'var(--gold)', margin: 0 }}>
            🤠 Przejąłeś ciało: <span style={{ color: '#ff7675' }}>{claimedVictim.name}</span>
          </h3>
          <p style={{ color: '#bdc3c7', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
            Wybierz, co chcesz zrobić z poszkodowanym. Pochowanie jest bezpieczne i szybkie. 
            Uratowanie wymaga reanimacji (szansa na sukces wynosi 65%), ale nagroda jest wielokrotnie wyższa!
          </p>

          <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
            <button
              onClick={handleBury}
              disabled={loading}
              style={{
                padding: '12px 30px', background: '#34495e', border: '2px solid #7f8c8d',
                color: '#fff', fontWeight: 800, borderRadius: 8, cursor: 'pointer'
              }}
            >
              🪦 Pochowaj (Zdobądź ${claimedVictim.bury})
            </button>
            <button
              onClick={startCprGame}
              disabled={loading}
              style={{
                padding: '12px 30px', background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
                border: '2px solid #ff4757', color: '#fff', fontWeight: 800, borderRadius: 8,
                cursor: 'pointer', boxShadow: '0 0 15px rgba(255,71,87,0.3)'
              }}
            >
              💖 Reanimuj (Zdobądź ${claimedVictim.rescue} - Szansa: 65%)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TracksPage;
