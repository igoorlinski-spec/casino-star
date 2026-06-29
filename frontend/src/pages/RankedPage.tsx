import React, { useState, useEffect } from 'react';
import socket from '../socket/socket';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import MatchmakingOverlay from '../components/MatchmakingOverlay';
import PlayingCard from '../components/PlayingCard';

const SYMBOL_EMOJI: Record<string, string> = {
  cherry:  '🍒',
  lemon:   '🍋',
  star:    '⭐',
  diamond: '💎',
  seven:   '7️⃣',
};

const toEmoji = (s: string) => SYMBOL_EMOJI[s] ?? s;

// ── Tiery stawek ───────────────────────────────────────────────
const BET_TIERS = [
  { value: 100,    label: '100',    tier: 'Bronze',   color: '#cd7f32', bg: 'rgba(205,127,50,0.12)', emoji: '🪵' },
  { value: 300,    label: '300',    tier: 'Silver',   color: '#aaa',    bg: 'rgba(180,180,180,0.1)', emoji: '🪨' },
  { value: 1000,   label: '1 000',  tier: 'Gold',     color: '#f1c40f', bg: 'rgba(241,196,15,0.12)', emoji: '🪶' },
  { value: 5000,   label: '5 000',  tier: 'Platinum', color: '#2ecc71', bg: 'rgba(46,204,113,0.12)', emoji: '💵' },
  { value: 10000,  label: '10 000', tier: 'Diamond',  color: '#3498db', bg: 'rgba(52,152,219,0.12)', emoji: '💎' },
  { value: 25000,  label: '25 000', tier: 'Master',   color: '#9b59b6', bg: 'rgba(155,89,182,0.14)', emoji: '👑' },
  { value: 50000,  label: '50 000', tier: 'Legend',   color: '#e74c3c', bg: 'rgba(231,76,60,0.14)',  emoji: '🔥' },
  { value: 100000, label: '100 000',tier: 'God',      color: '#f39c12', bg: 'rgba(243,156,18,0.18)', emoji: '⚡' },
] as const;

const SlotGrid: React.FC<{ reels: string[]; highlight?: boolean }> = ({ reels, highlight }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 64px)',
    gap: '6px',
    background: 'rgba(0,0,0,0.6)',
    padding: '12px',
    borderRadius: '12px',
    border: `2px solid ${highlight ? 'var(--gold)' : 'rgba(212,175,55,0.25)'}`,
  }}>
    {(reels.length === 9 ? reels : Array(9).fill('?')).map((sym, idx) => (
      <div key={idx} style={{
        width: '64px', height: '64px',
        background: '#111',
        borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.9rem',
        border: '1px solid #2a2a2a',
        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.6)',
      }}>
        {toEmoji(sym)}
      </div>
    ))}
  </div>
);

const RankedPage: React.FC = () => {
  const [searching, setSearching] = useState(false);
  const [gameType, setGameType] = useState<'blackjack' | 'slots'>('blackjack');
  const [matchResult, setMatchResult] = useState<string | null>(null);
  const [blackjackBet, setBlackjackBet] = useState<number>(300);
  const [slotsBet, setSlotsBet] = useState<number>(300);

  const { user, setUser } = useAuthStore();
  const { rankedMatch, setRankedMatch } = useGameStore();

  // Socket state dla gier ranked
  const [pHand, setPHand] = useState<any[]>([]);
  const [oHand, setOHand] = useState<any[]>([]);
  const [dHand, setDHand] = useState<any[]>([]);
  const [pScore, setPScore] = useState(0);
  const [oScore, setOScore] = useState(0);
  const [dScore, setDScore] = useState(0);
  const [points, setPoints] = useState({ player: 0, opponent: 0 });
  const [isMyTurn, setIsMyTurn] = useState(false);
  
  // Slots Ranked (turn-based)
  const [myReels, setMyReels] = useState<string[]>(Array(9).fill('?'));
  const [oppReels, setOppReels] = useState<string[]>(Array(9).fill('?'));
  const [myMult, setMyMult] = useState<number>(0);
  const [oppMult, setOppMult] = useState<number>(0);

  useEffect(() => {
    if (!rankedMatch) return;

    // ── BJ Events ────────────────────────────────────────────────────────────
    socket.on('rankedBlackjackRound', (data: any) => {
      if (data.dealerVisible) {
        setDHand([data.dealerVisible, { rank: '?', suit: 'hearts', faceDown: true }]);
        setDScore(0);
      }
      const nickname = user?.nickname;
      const isP1 = data.player1.nickname === nickname;
      setPoints({
        player: isP1 ? data.player1.score : data.player2.score,
        opponent: isP1 ? data.player2.score : data.player1.score,
      });
      setIsMyTurn(data.yourTurn === user?.id);

      const oppHandSize = isP1 ? data.player2?.handSize || 2 : data.player1.handSize;
      setOHand(Array.from({ length: oppHandSize }, () => ({ rank: '?', suit: 'hearts', faceDown: true })));
      setOScore(0);
    });

    socket.on('yourHand', (data: any) => {
      setPHand(data.hand);
      setPScore(data.handValue);
    });

    socket.on('rankedBlackjackRoundResult', (data: any) => {
      const nickname = user?.nickname;
      const isP1 = data.player1.nickname === nickname;
      setPHand(isP1 ? data.player1.hand : data.player2.hand);
      setOHand(isP1 ? data.player2.hand : data.player1.hand);
      setPScore(isP1 ? data.player1.handValue : data.player2.handValue);
      setOScore(isP1 ? data.player2.handValue : data.player1.handValue);
      setPoints({
        player: isP1 ? data.player1.score : data.player2.score,
        opponent: isP1 ? data.player2.score : data.player1.score,
      });
      setDHand(data.dealerHand);
      setDScore(data.dealerValue);
      setIsMyTurn(false);
    });

    // ── Slots Events (turn-based) ───────────────────────────────────────────
    socket.on('rankedSlotsRound', (data: any) => {
      const isP1 = data.player1.nickname === user?.nickname;
      setPoints({
        player: isP1 ? data.player1.score : data.player2?.score || 0,
        opponent: isP1 ? data.player2?.score || 0 : data.player1.score,
      });
      setIsMyTurn(data.currentTurn === user?.id);

      const p1Data = data.player1;
      const p2Data = data.player2;

      setMyReels(isP1 ? (p1Data.reels.length ? p1Data.reels : ['🍒', '🍋', '⭐']) : (p2Data?.reels.length ? p2Data.reels : ['🍒', '🍋', '⭐']));
      setOppReels(isP1 ? (p2Data?.reels.length ? p2Data.reels : ['🍒', '🍋', '⭐']) : (p1Data.reels.length ? p1Data.reels : ['🍒', '🍋', '⭐']));
      setMyMult(isP1 ? p1Data.multiplier : p2Data?.multiplier || 0);
      setOppMult(isP1 ? p2Data?.multiplier || 0 : p1Data.multiplier);
    });

    socket.on('rankedSpinResult', (data: any) => {
      const isMe = data.userId === user?.id;
      if (isMe) {
        setMyReels(data.reels);
        setMyMult(data.multiplier);
      } else {
        setOppReels(data.reels);
        setOppMult(data.multiplier);
      }
    });

    socket.on('rankedSlotsRoundResult', (data: any) => {
      const isP1 = data.player1.nickname === user?.nickname;
      setPoints({
        player: isP1 ? data.player1.score : data.player2?.score || 0,
        opponent: isP1 ? data.player2?.score || 0 : data.player1.score,
      });
      setMyReels(isP1 ? data.player1.reels : data.player2?.reels || ['🍒', '🍋', '⭐']);
      setOppReels(isP1 ? data.player2?.reels || ['🍒', '🍋', '⭐'] : data.player1.reels);
      setMyMult(isP1 ? data.player1.multiplier : data.player2?.multiplier || 0);
      setOppMult(isP1 ? data.player2?.multiplier || 0 : data.player1.multiplier);
      setIsMyTurn(false);
    });

    // ── End Game ─────────────────────────────────────────────────────────────
    socket.on('matchResult', (data: any) => {
      const amIWinner = data.winnerId === user?.id;
      setMatchResult(amIWinner ? `Zwycięstwo! +${data.winReward} żetonów.` : `Porażka! Utracono ${data.lossPenalty} żetonów.`);
      
      if (user) {
        setUser({
          ...user,
          tokens: user.tokens + (amIWinner ? data.winReward : -data.lossPenalty)
        });
      }

      setTimeout(() => {
        setRankedMatch(null);
        setMatchResult(null);
        setSearching(false);
        setPHand([]);
        setOHand([]);
        setDHand([]);
        setDScore(0);
        setOScore(0);
        setPScore(0);
        setMyReels(['🍒', '🍋', '⭐']);
        setOppReels(['🍒', '🍋', '⭐']);
        setMyMult(0);
        setOppMult(0);
      }, 5000);
    });

    return () => {
      socket.off('rankedBlackjackRound');
      socket.off('yourHand');
      socket.off('rankedBlackjackRoundResult');
      socket.off('rankedSlotsRound');
      socket.off('rankedSpinResult');
      socket.off('rankedSlotsRoundResult');
      socket.off('matchResult');
    };
  }, [rankedMatch, user, setRankedMatch, setUser]);

  const handleStartSearch = (type: 'blackjack' | 'slots') => {
    setGameType(type);
    setSearching(true);
  };

  const hitRanked = () => {
    socket.emit('rankedHit', { roomId: rankedMatch?.matchId, token: useAuthStore.getState().token });
  };

  const standRanked = () => {
    socket.emit('rankedStand', { roomId: rankedMatch?.matchId, token: useAuthStore.getState().token });
  };

  const spinRanked = () => {
    socket.emit('rankedSpin', { roomId: rankedMatch?.matchId, token: useAuthStore.getState().token });
  };

  if (searching && !rankedMatch) {
    return <MatchmakingOverlay gameType={gameType} bet={gameType === 'blackjack' ? blackjackBet : slotsBet} onClose={() => setSearching(false)} />;
  }

  return (
    <div>
      {rankedMatch ? (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2>Rywalizacja Ranked: {rankedMatch.game === 'blackjack' ? 'Blackjack' : 'Automaty'}</h2>
            <div style={{ color: 'var(--gold)', fontWeight: 'bold' }}>
              Rywal: {rankedMatch.opponent}
            </div>
          </div>

          {matchResult ? (
            <div style={{
              textAlign: 'center', padding: '40px', fontSize: '1.5rem', fontWeight: 'bold',
              color: 'var(--gold)', animation: 'bounce-in 0.5s ease'
            }}>
              {matchResult}
            </div>
          ) : rankedMatch.game === 'blackjack' ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.1rem', color: 'var(--gold)' }}>
                Punkty: Ty ({points.player}) vs Przeciwnik ({points.opponent}) — (Do 3 zwycięstw)
              </div>

              <div className="blackjack-table" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="dealer-area" style={{ textAlign: 'center' }}>
                  <span className="hand-label" style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>Krupier</span>
                  <div className="hand-cards" style={{ display: 'flex', gap: '8px', justifyContent: 'center', minHeight: '120px' }}>
                    {dHand.map((card, idx) => (
                      <PlayingCard key={idx} card={card} />
                    ))}
                  </div>
                  <div className="score-display" style={{ marginTop: '6px', fontWeight: 'bold' }}>Wynik: {dScore}</div>
                </div>

                <div className="blackjack-divider" style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                  <div className="opponent-area" style={{ textAlign: 'center' }}>
                    <span className="hand-label" style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>{rankedMatch.opponent}</span>
                    <div className="hand-cards" style={{ display: 'flex', gap: '8px', justifyContent: 'center', minHeight: '120px' }}>
                      {oHand.map((card, idx) => (
                        <PlayingCard key={idx} card={card} />
                      ))}
                    </div>
                    <div className="score-display" style={{ marginTop: '6px', fontWeight: 'bold' }}>Wynik: {oScore}</div>
                  </div>

                  <div className="player-area" style={{ textAlign: 'center' }}>
                    <span className="hand-label" style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>Twoje karty</span>
                    <div className="hand-cards" style={{ display: 'flex', gap: '8px', justifyContent: 'center', minHeight: '120px' }}>
                      {pHand.map((card, idx) => (
                        <PlayingCard key={idx} card={card} />
                      ))}
                    </div>
                    <div className="score-display" style={{ marginTop: '6px', fontWeight: 'bold' }}>Wynik: {pScore}</div>
                  </div>
                </div>
              </div>

              {isMyTurn && (
                <div className="action-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                  <button className="btn-gold" onClick={hitRanked}>Dobierz</button>
                  <button className="btn-ghost" onClick={standRanked}>Pas</button>
                </div>
              )}
              {!isMyTurn && (
                <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>
                  Ruch przeciwnika...
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.1rem', color: 'var(--gold)' }}>
                Punkty: Ty ({points.player}) vs Przeciwnik ({points.opponent}) — (Do 3 zwycięstw)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '20px', justifyItems: 'center' }}>
                {/* Opponent */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ color: 'var(--text-secondary)', margin: 0 }}>{rankedMatch.opponent}</h3>
                  <SlotGrid reels={oppReels} />
                  <div style={{ fontWeight: 'bold', color: oppMult > 0 ? 'var(--gold)' : 'var(--text-secondary)' }}>
                    Mnożnik: {oppMult > 0 ? `${oppMult}x` : '—'}
                  </div>
                </div>

                {/* Player */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ color: 'var(--gold)', margin: 0 }}>Twoje Automaty</h3>
                  <SlotGrid reels={myReels} highlight />
                  <div style={{ fontWeight: 'bold', color: myMult > 0 ? 'var(--gold)' : 'var(--text-secondary)' }}>
                    Mnożnik: {myMult > 0 ? `${myMult}x` : '—'}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                {isMyTurn ? (
                  <button className="btn-gold btn-lg" onClick={spinRanked}>🎰 POCIĄGNIJ DŹWIGNIĘ</button>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Oczekiwanie na ruch przeciwnika...</div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: 'var(--gold)', marginBottom: '12px' }}>🎴 Ranked Blackjack</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
                Pierwszy do 3 wygranych rozdań wygrywa stawkę. Przegrany traci połowę stawki.
              </p>

              <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#aaa', fontWeight: 'bold' }}>
                Wybierz stawkę:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
                {BET_TIERS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setBlackjackBet(t.value)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: 10,
                      border: `2px solid ${blackjackBet === t.value ? t.color : 'rgba(255,255,255,0.08)'}`,
                      background: blackjackBet === t.value ? t.bg : 'rgba(0,0,0,0.3)',
                      color: blackjackBet === t.value ? t.color : '#888',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.78rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      transition: 'all 0.15s',
                      boxShadow: blackjackBet === t.value ? `0 0 12px ${t.color}44` : 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{t.emoji}</span>
                    <span>{t.label} 🪙</span>
                    <span style={{ fontSize: '0.65rem', color: blackjackBet === t.value ? t.color : '#555', fontStyle: 'italic' }}>{t.tier}</span>
                  </button>
                ))}
              </div>

              {/* Info o wybranej stawce */}
              {(() => {
                const t = BET_TIERS.find(x => x.value === blackjackBet)!
                return (
                  <div style={{
                    background: t.bg, border: `1px solid ${t.color}44`,
                    borderRadius: 10, padding: '10px 16px', fontSize: '0.85rem',
                    display: 'flex', justifyContent: 'space-around', marginBottom: 16
                  }}>
                    <span style={{ color: '#2ecc71' }}>+{(t.value).toLocaleString()} za wygraną 🏆</span>
                    <span style={{ color: '#e74c3c' }}>−{(t.value / 2).toLocaleString()} za przegraną 📹</span>
                  </div>
                );
              })()}
            </div>

            <button
              className="btn-gold btn-full"
              onClick={() => handleStartSearch('blackjack')}
              style={{ fontSize: '1rem', padding: '14px' }}
            >
              Szukaj przeciwnika za {BET_TIERS.find(x=>x.value===blackjackBet)?.emoji} {BET_TIERS.find(x=>x.value===blackjackBet)?.label} 🪙
            </button>
          </div>
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: 'var(--gold)', marginBottom: '12px' }}>🎰 Ranked Slots</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
                Kręć na zmianę z przeciwnikiem. Lepszy mnożnik zdobywa punkt. Gra do 3 punktów, remis = dogrywka!
              </p>

              <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#aaa', fontWeight: 'bold' }}>
                Wybierz stawkę:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
                {BET_TIERS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setSlotsBet(t.value)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: 10,
                      border: `2px solid ${slotsBet === t.value ? t.color : 'rgba(255,255,255,0.08)'}`,
                      background: slotsBet === t.value ? t.bg : 'rgba(0,0,0,0.3)',
                      color: slotsBet === t.value ? t.color : '#888',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.78rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      transition: 'all 0.15s',
                      boxShadow: slotsBet === t.value ? `0 0 12px ${t.color}44` : 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{t.emoji}</span>
                    <span>{t.label} 🪙</span>
                    <span style={{ fontSize: '0.65rem', color: slotsBet === t.value ? t.color : '#555', fontStyle: 'italic' }}>{t.tier}</span>
                  </button>
                ))}
              </div>

              {/* Info o wybranej stawce */}
              {(() => {
                const t = BET_TIERS.find(x => x.value === slotsBet)!
                return (
                  <div style={{
                    background: t.bg, border: `1px solid ${t.color}44`,
                    borderRadius: 10, padding: '10px 16px', fontSize: '0.85rem',
                    display: 'flex', justifyContent: 'space-around', marginBottom: 16
                  }}>
                    <span style={{ color: '#2ecc71' }}>+{(t.value).toLocaleString()} za wygraną 🏆</span>
                    <span style={{ color: '#e74c3c' }}>−{(t.value / 2).toLocaleString()} za przegraną 📹</span>
                  </div>
                );
              })()}
            </div>

            <button
              className="btn-gold btn-full"
              onClick={() => handleStartSearch('slots')}
              style={{ fontSize: '1rem', padding: '14px' }}
            >
              Szukaj przeciwnika za {BET_TIERS.find(x=>x.value===slotsBet)?.emoji} {BET_TIERS.find(x=>x.value===slotsBet)?.label} 🪙
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankedPage;
