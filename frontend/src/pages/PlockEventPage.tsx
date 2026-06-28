import React, { useState } from 'react';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';
import { sfxSpinStart, sfxWin, sfxJackpot, sfxLose, sfxClick, sfxBuy } from '../utils/sfx';

// Symbole Płock: kielbasa, kebab, syrenka, zubr, orzel
const PLOCK_EMOJI: Record<string, string> = {
  kebab: '🥙',
  kielbasa: '🌭',
  syrenka: '🧜‍♀️',
  zubr: '🦬',
  orzel: '🦅',
};

const PlockEventPage: React.FC = () => {
  const { user, needs, setUser, updateNeeds } = useAuthStore();
  
  const [spinning, setSpinning] = useState(false);
  const [bet, setBet] = useState(50);
  const [reels, setReels] = useState<string[]>(Array(16).fill('kebab'));
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [winnings, setWinnings] = useState<number | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);

  const depleted = needs.sleep <= 0 || needs.hunger <= 0 || needs.hydration <= 0 || (needs.happiness ?? 100) <= 0;

  const handleSpin = async () => {
    if (spinning || depleted || !user || user.tokens < bet) return;
    sfxSpinStart();
    setSpinning(true);
    setResultMsg(null);
    setWinnings(null);

    // Odejmij stawkę lokalnie dla szybkości UI
    setUser({ ...user, tokens: user.tokens - bet });

    try {
      const res = await api.post('/game/plock/spin', { bet });
      
      // Animacja bębnów
      let ticks = 0;
      const interval = setInterval(() => {
        setReels(Array.from({ length: 16 }, () => {
          const keys = Object.keys(PLOCK_EMOJI);
          return keys[Math.floor(Math.random() * keys.length)];
        }));
        ticks++;
        if (ticks > 15) {
          clearInterval(interval);
          setReels(res.data.reels);
          setSpinning(false);

          const win = res.data.multiplier > 0;
          if (win) {
            if (res.data.multiplier >= 150) {
              sfxJackpot();
            } else {
              sfxWin();
            }
          } else {
            sfxLose();
          }

          setWinnings(res.data.winnings);
          setResultMsg(res.data.message);
          updateNeeds(res.data.needs);
          setUser({ 
            ...user, 
            tokens: res.data.tokens,
            tinderHearts: res.data.tinderHearts 
          });
        }
      }, 100);
    } catch (e) {
      setSpinning(false);
      api.get('/auth/me').then(r => {
        if (user) setUser(r.data.user);
      });
    }
  };

  const handleClaim = async (rewardId: string) => {
    sfxClick();
    setClaimLoading(true);
    try {
      const res = await api.post('/game/plock/claim', { rewardId });
      sfxBuy();
      alert(res.data.message);
      // Zaktualizuj dane użytkownika
      api.get('/auth/me').then(r => {
        if (user) setUser(r.data.user);
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Błąd odbierania nagrody.');
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        @keyframes plock-pulse {
          0% {
            text-shadow: 0 0 10px #ff3838, 0 0 20px #ff3838, 0 0 40px #ff3838, 0 0 60px #ff3838;
            transform: scale(1);
          }
          50% {
            text-shadow: 0 0 20px #ff3838, 0 0 40px #ff9f1a, 0 0 60px #ff9f1a, 0 0 80px #ff3838;
            transform: scale(1.05);
          }
          100% {
            text-shadow: 0 0 10px #ff3838, 0 0 20px #ff3838, 0 0 40px #ff3838, 0 0 60px #ff3838;
            transform: scale(1);
          }
        }
        @keyframes win-glow-anim {
          0% {
            box-shadow: 0 0 20px rgba(46, 204, 113, 0.4), inset 0 0 15px rgba(46, 204, 113, 0.2);
            border-color: #2ecc71;
          }
          100% {
            box-shadow: 0 0 40px rgba(46, 204, 113, 0.8), inset 0 0 30px rgba(46, 204, 113, 0.4);
            border-color: #27ae60;
          }
        }
        .plock-glow-title {
          font-family: 'Cinzel Decorative', serif;
          font-size: 3rem !important;
          font-weight: 900;
          text-align: center;
          background: linear-gradient(to right, #ffffff, #ff7675, #ff3838, #ff7675, #ffffff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: plock-pulse 2s infinite ease-in-out;
          letter-spacing: 3px;
        }
        .glowing-win-container {
          background: rgba(46, 204, 113, 0.15) !important;
          border: 3px solid #2ecc71 !important;
          border-radius: 16px;
          padding: 20px 40px;
          text-align: center;
          animation: win-glow-anim 0.8s infinite alternate ease-in-out;
          margin: 15px 0;
          width: 100%;
          max-width: 500px;
        }
        .glowing-win-text {
          font-size: 1.8rem;
          font-weight: 900;
          color: #2ecc71;
          text-shadow: 0 0 15px #2ecc71;
          margin-bottom: 5px;
        }
        .glowing-win-amount {
          font-size: 2.8rem;
          font-weight: 900;
          color: #f1c40f;
          text-shadow: 0 0 20px #f1c40f;
          margin-top: 5px;
        }
      `}</style>
      
      {/* Baner eventowy */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, #e74c3c 0%, #000 70%, #fff 100%)',
        border: '3px solid #e74c3c',
        borderRadius: 20, padding: 32, textAlign: 'center',
        boxShadow: '0 0 40px rgba(231,76,60,0.5)',
      }}>
        <h2 className="plock-glow-title">🇵🇱 TYGODNIOWY EVENT: PŁOCK 🇵🇱</h2>
        <p style={{ color: '#ccc', fontStyle: 'italic', fontSize: '1.2rem', marginTop: 10 }}>
          Odkryj najdziksze zakątki Płocka na maszynie 4x4. Zdobądź najcenniejsze dymki i wymień je na legendarne bogactwa.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

        {/* Sekcja maszyny 4x4 */}
        <div className="glass-card" style={{
          flex: 2, minWidth: 320, padding: 30,
          background: 'linear-gradient(160deg, #150505 0%, #000 100%)',
          border: '3px solid #e74c3c',
          boxShadow: '0 0 50px rgba(231,76,60,0.4), inset 0 0 30px rgba(0,0,0,0.9)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24
        }}>
          <h3 style={{ color: '#e74c3c', letterSpacing: '2px', textTransform: 'uppercase', textShadow: '0 0 10px #e74c3c' }}>
            🎰 PŁOCK 4x4 CASINO SLOT
          </h3>

          {/* Grid 4x4 (16 Reels) */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
            background: 'rgba(0,0,0,0.85)', padding: 20, borderRadius: 20,
            border: '2px solid rgba(231, 76, 60, 0.4)',
            boxShadow: 'inset 0 0 25px rgba(0,0,0,0.9)'
          }}>
            {reels.map((sym, idx) => (
              <div 
                key={idx}
                style={{
                  width: 70, height: 70, borderRadius: 12,
                  background: 'linear-gradient(145deg, #1f1f2e, #11111a)',
                  border: '1px solid rgba(231, 76, 60, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.5rem',
                  boxShadow: 'inset 0 0 8px rgba(0,0,0,0.8)',
                  transform: spinning ? 'scale(0.95)' : 'scale(1)',
                  transition: 'transform 0.1s ease',
                  filter: spinning ? 'blur(1px)' : 'none',
                }}
              >
                {PLOCK_EMOJI[sym] || '🥙'}
              </div>
            ))}
          </div>

          {resultMsg && (
            <div className={(!resultMsg.includes('Brak') && !resultMsg.includes('smutny') && !resultMsg.includes('wycieńczony')) ? 'glowing-win-container' : ''} style={
              (resultMsg.includes('Brak') || resultMsg.includes('smutny') || resultMsg.includes('wycieńczony')) ? {
                fontSize: '1.4rem', fontWeight: 900, color: '#999',
                textShadow: 'none',
                animation: 'bounce-in 0.5s ease',
                padding: '10px 20px',
                textAlign: 'center'
              } : {}
            }>
              {(!resultMsg.includes('Brak') && !resultMsg.includes('smutny') && !resultMsg.includes('wycieńczony')) ? (
                <>
                  <div className="glowing-win-text">{resultMsg}</div>
                  {winnings !== null && winnings > 0 && (
                    <div className="glowing-win-amount">+🪙 {winnings.toLocaleString()} ŻETONÓW!</div>
                  )}
                </>
              ) : (
                resultMsg
              )}
            </div>
          )}

          {/* Kontrolki stawki i darmowe dymki */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#aaa', fontSize: '0.85rem', fontWeight: 700 }}>STAWKA (min 50):</span>
              <input 
                type="number" min="50" value={bet} 
                onChange={e => setBet(Math.max(50, parseInt(e.target.value) || 0))}
                style={{
                  background: 'rgba(231,76,60,0.1)', border: '1px solid #e74c3c',
                  color: '#e74c3c', padding: '8px 12px', borderRadius: 8,
                  width: 80, fontWeight: 900, fontSize: '1.1rem', textAlign: 'center',
                }}
              />
            </div>

            <button 
              onClick={handleSpin}
              disabled={spinning || depleted || !user || user.tokens < bet}
              style={{
                padding: '12px 36px',
                background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                color: 'white', fontWeight: 900, fontSize: '1.1rem', borderRadius: 24,
                boxShadow: '0 0 25px rgba(231,76,60,0.5)',
                cursor: 'pointer', transition: 'transform 0.1s',
                opacity: (spinning || depleted) ? 0.5 : 1
              }}
            >
              {spinning ? 'LOSOWANIE...' : '🇵🇱 SPIN! (50+)'}
            </button>
          </div>

          <div style={{
            color: '#e74c3c', fontWeight: 800, fontSize: '1.1rem',
            background: 'rgba(231,76,60,0.1)', padding: '8px 24px', borderRadius: 12,
            border: '1px dashed #e74c3c', marginTop: 10
          }}>
            💬 Twój Licznik Dymków: <span style={{ color: '#fff', fontSize: '1.3rem' }}>{user?.tinderHearts || 0}</span> dymków Tindera
          </div>
        </div>

        {/* Tabela nagród eventowych */}
        <div className="glass-card" style={{
          flex: 1, minWidth: 280, padding: 24,
          background: 'rgba(10, 10, 15, 0.9)',
          border: '1px solid var(--border-gold)'
        }}>
          <h3 style={{ color: 'var(--gold)', textAlign: 'center', marginBottom: 20, letterSpacing: '1px' }}>
            🎁 ODBIERZ NAGRODY EVENTOWE
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {[
              { id: 'silver_badge', title: '🥈 Srebrny dymek profilu', cost: 50, desc: 'Luksusowa srebrna ikona dymku Tindera wyświetlana na czacie/profilu.' },
              { id: 'gold_badge', title: '🥇 Złoty dymek profilu', cost: 100, desc: 'Najbardziej prestiżowa złota ikona dymku Tindera.' },
              { id: '10k_tokens', title: '🪙 10 000 żetonów', cost: 200, desc: 'Zastrzyk prawdziwej gotówki do kasyna.' },
              { id: 'kawalerka', title: '🏠 Posiadłość: Kawalerka', cost: 600, desc: 'Darmowa Kawalerka z lodówką, w pełni umeblowana.' }
            ].map(reward => {
              const count = user?.tinderHearts || 0;
              const canClaim = count >= reward.cost;
              return (
                <div 
                  key={reward.id} 
                  style={{
                    background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12,
                    border: `1px solid ${canClaim ? 'var(--border-gold)' : 'rgba(255,255,255,0.05)'}`,
                    display: 'flex', flexDirection: 'column', gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span style={{ color: canClaim ? 'var(--gold)' : '#ccc', fontSize: '0.9rem' }}>{reward.title}</span>
                    <span style={{ color: '#e74c3c', fontSize: '0.85rem' }}>{reward.cost} 💬</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: '1.3' }}>{reward.desc}</p>
                  <button 
                    onClick={() => handleClaim(reward.id)}
                    disabled={claimLoading || !canClaim}
                    className="btn-gold btn-sm"
                    style={{ marginTop: 6, padding: '6px', fontSize: '0.75rem', width: '100%' }}
                  >
                    Odbierz Nagrodę
                  </button>
                </div>
              );
            })}

          </div>
        </div>

      </div>

    </div>
  );
};

export default PlockEventPage;
