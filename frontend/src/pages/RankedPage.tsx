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
  const [gameType, setGameType] = useState<'blackjack' | 'slots' | 'races'>('blackjack');
  const [matchResult, setMatchResult] = useState<string | null>(null);
  const [blackjackBet, setBlackjackBet] = useState<number>(300);
  const [slotsBet, setSlotsBet] = useState<number>(300);
  const [racesBet, setRacesBet] = useState<number>(300);

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

  // Races Ranked state
  const [racesRoomState, setRacesRoomState] = useState<any>(null);
  const [racesWinningRunner, setRacesWinningRunner] = useState<number | null>(null);
  const [racesWinnerResults, setRacesWinnerResults] = useState<any>(null);
  const [racesRunnerPositions, setRacesRunnerPositions] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [selectedRacesRunner, setSelectedRacesRunner] = useState<number | null>(null);
  const [raceAnimRunning, setRaceAnimRunning] = useState(false);

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

    // ── Races Events ─────────────────────────────────────────────────────────
    socket.on('rankedRacesUpdate', (data: any) => {
      setRacesRoomState(data);
      if (data.status === 'racing' && !raceAnimRunning) {
        setRaceAnimRunning(true);
        setRacesWinningRunner(data.winningRunner);
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
          RUNNERS.forEach(r => {
            if (currentPos[r.id as 1|2|3|4|5] >= 90) {
              reachedFinish = true;
            }
          });
          setRacesRunnerPositions({ ...currentPos });

          if (reachedFinish) {
            clearInterval(interval);
            const finalPos: Record<number, number> = {};
            RUNNERS.forEach(r => {
              finalPos[r.id] = r.id === data.winningRunner ? 100 : Math.min(94, currentPos[r.id as 1|2|3|4|5]);
            });
            setRacesRunnerPositions(finalPos);
          }
        }, 100);
      }
    });

    socket.on('rankedRacesResult', (data: any) => {
      setRacesWinningRunner(data.winningRunner);
      setRacesWinnerResults(data.results);
      
      const myRes = data.results[user?.id || ''];
      if (myRes) {
        setMatchResult(myRes.isWin ? `Zwycięstwo! +${myRes.winnings} żetonów.` : `Porażka! Utracono ${racesBet} żetonów.`);
        if (user) {
          setUser({ ...user, tokens: myRes.tokens });
        }
      } else {
        setMatchResult('Koniec wyścigu (nie brałeś udziału).');
      }

      setTimeout(() => {
        setRankedMatch(null);
        setMatchResult(null);
        setSearching(false);
        setRacesRoomState(null);
        setRacesWinningRunner(null);
        setRacesWinnerResults(null);
        setSelectedRacesRunner(null);
        setRaceAnimRunning(false);
        setRacesRunnerPositions({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      }, 5000);
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
      socket.off('rankedRacesUpdate');
      socket.off('rankedRacesResult');
      socket.off('matchResult');
    };
  }, [rankedMatch, user, setRankedMatch, setUser]);

  const handleStartSearch = (type: 'blackjack' | 'slots' | 'races') => {
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
    return <MatchmakingOverlay gameType={gameType} bet={gameType === 'blackjack' ? blackjackBet : gameType === 'slots' ? slotsBet : racesBet} onClose={() => setSearching(false)} />;
  }

  return (
    <div>
      {rankedMatch ? (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2>Rywalizacja Ranked: {rankedMatch.game === 'blackjack' ? 'Blackjack' : rankedMatch.game === 'slots' ? 'Automaty' : 'Wyścigi'}</h2>
            <div style={{ color: 'var(--gold)', fontWeight: 'bold' }}>
              {rankedMatch.game === 'races' ? 'Lobby Wielu Graczy' : `Rywal: ${rankedMatch.opponent}`}
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
          ) : rankedMatch.game === 'slots' ? (
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
          ) : (
            <div>
              {racesRoomState?.status === 'lobby' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--gold)', textShadow: '0 0 10px rgba(212,175,55,0.4)', marginBottom: 8 }}>
                      🏁 LOBBY WYŚCIGÓW RANKED
                    </div>
                    <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                      Poczekaj na innych graczy lub upływ czasu. Stawka: <strong style={{ color: '#d4af37' }}>{racesRoomState.bet} 🪙</strong>
                    </p>
                  </div>

                  {/* Timer */}
                  <div style={{
                    background: 'rgba(212,175,55,0.08)', border: '2px solid var(--gold)',
                    borderRadius: '50%', width: 90, height: 90, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 2,
                    boxShadow: '0 0 20px rgba(212,175,55,0.2)'
                  }}>
                    <span style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 700 }}>POZOSTAŁO</span>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{racesRoomState.timeLeft}s</span>
                  </div>

                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
                    
                    {/* Lista Graczy */}
                    <div className="glass-card" style={{ flex: 1, minWidth: 280, padding: 20, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ color: 'var(--gold)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, marginBottom: 12 }}>
                        👥 Gracze w pokoju ({racesRoomState.players.length}/5)
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {racesRoomState.players.map((p: any, idx: number) => (
                          <div key={idx} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                            border: `1px solid ${p.userId === user?.id ? 'var(--gold)' : 'transparent'}`
                          }}>
                            <span style={{ fontWeight: 800, color: p.userId === user?.id ? 'var(--gold)' : '#ccc' }}>
                              {p.nickname} {p.userId === user?.id && ' (Ty)'}
                            </span>
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 900, padding: '3px 8px', borderRadius: 12,
                              background: p.hasBet ? 'rgba(46,204,113,0.15)' : 'rgba(243,156,18,0.15)',
                              color: p.hasBet ? '#2ecc71' : '#f39c12',
                              display: 'flex', alignItems: 'center', gap: 6
                            }}>
                              {p.hasBet ? (
                                <>
                                  <img src={RUNNERS.find(r=>r.id===p.selectedRunner)?.image} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                                  <span>ZAKŁAD: {RUNNERS.find(r=>r.id===p.selectedRunner)?.name}</span>
                                </>
                              ) : 'WYBIERA...'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Obstawianie */}
                    <div className="glass-card" style={{ flex: 1, minWidth: 280, padding: 20, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ color: 'var(--gold)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, marginBottom: 12 }}>
                        👉 Obstaw zawodniczkę (Wygrana x5.0)
                      </h3>

                      {(() => {
                        const myPlayer = racesRoomState.players.find((p: any) => p.userId === user?.id);
                        if (myPlayer?.hasBet) {
                          const chosen = RUNNERS.find(r => r.id === myPlayer.selectedRunner);
                          return (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                              <p style={{ color: '#aaa', marginBottom: 10 }}>Twój zatwierdzony zakład:</p>
                              <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 10,
                                padding: '12px 24px', borderRadius: 12, background: `${chosen?.color}15`,
                                border: `2px solid ${chosen?.color}`
                              }}>
                                <img src={chosen?.image} alt={chosen?.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${chosen?.color}` }} />
                                <span style={{ fontWeight: 900, color: chosen?.color, fontSize: '1.2rem' }}>{chosen?.name}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                              {RUNNERS.map(runner => {
                                const isSel = selectedRacesRunner === runner.id;
                                return (
                                  <button key={runner.id} onClick={() => setSelectedRacesRunner(runner.id)}
                                    style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                      background: isSel ? `${runner.color}15` : 'rgba(255,255,255,0.03)',
                                      border: `2px solid ${isSel ? runner.color : 'rgba(255,255,255,0.08)'}`,
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <img src={runner.image} alt={runner.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${runner.color}` }} />
                                      <span style={{ fontWeight: 800, color: isSel ? runner.color : '#ccc', fontSize: '0.85rem' }}>{runner.name}</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: runner.color }}>x5.0</span>
                                  </button>
                                );
                              })}
                            </div>
                            <button className="btn-gold btn-full" disabled={selectedRacesRunner === null}
                              onClick={() => {
                                socket.emit('rankedRacesPlaceBet', {
                                  roomId: racesRoomState.roomId,
                                  token: useAuthStore.getState().token,
                                  runner: selectedRacesRunner
                                });
                              }}
                              style={{ marginTop: 10, padding: 12, fontSize: '0.95rem' }}
                            >
                              Zatwierdź zakład (Stawka: {racesRoomState.bet})
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>
              )}

              {(racesRoomState?.status === 'racing' || racesRoomState?.status === 'done') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#05d9e8', textShadow: '0 0 10px rgba(5,217,232,0.4)', marginBottom: 8 }}>
                      🏁 {racesRoomState.status === 'racing' ? 'TRWA GONITWA RANKED!' : 'WYŚCIG ZAKOŃCZONY!'}
                    </div>
                    <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                      Synchroniczny bieg wieloosobowy na żywo.
                    </p>
                  </div>

                  <div style={{
                    background: 'rgba(0,0,0,0.8)', border: '2px solid rgba(5,217,232,0.3)',
                    borderRadius: 16, padding: '16px 12px', display: 'flex', flexDirection: 'column',
                    gap: 12, position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', left: 45, top: 0, bottom: 0, width: 2, background: 'dashed rgba(255,255,255,0.2)' }} />
                    <div style={{ position: 'absolute', right: 40, top: 0, bottom: 0, width: 4, background: 'repeating-linear-gradient(45deg, #fff, #fff 4px, #000 4px, #000 8px)' }} />

                    {RUNNERS.map(runner => {
                      const pos = racesRunnerPositions[runner.id] || 0;
                      const isWinner = racesWinningRunner === runner.id;
                      
                      const myPlayer = racesRoomState.players.find((p: any) => p.userId === user?.id);
                      const isMyBet = myPlayer?.selectedRunner === runner.id;

                      return (
                        <div key={runner.id} style={{
                          display: 'flex', alignItems: 'center', height: 48,
                          background: isMyBet ? 'rgba(5,217,232,0.06)' : 'rgba(255,255,255,0.02)',
                          borderRadius: 8, padding: '0 8px', border: `1px solid ${isMyBet ? 'rgba(5,217,232,0.4)' : 'transparent'}`,
                          position: 'relative'
                        }}>
                          <div style={{ width: 35, fontWeight: 900, color: runner.color, fontSize: '0.9rem' }}>
                            #{runner.id}
                          </div>

                          <div style={{
                            position: 'absolute',
                            left: `calc(40px + ${pos * 0.8}%)`,
                            display: 'flex', alignItems: 'center', gap: 6,
                            transition: 'left 0.1s linear',
                            zIndex: 5
                          }}>
                            <img src={runner.image} alt={runner.name} style={{
                              width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                              border: `2px solid ${runner.color}`,
                              filter: isWinner && racesRoomState.status === 'done' ? 'drop-shadow(0 0 10px #f1c40f)' : 'none',
                              animation: racesRoomState.status === 'racing' ? 'float-up 0.5s infinite alternate' : 'none'
                            }} />
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 700,
                              color: runner.color, background: 'rgba(0,0,0,0.8)',
                              padding: '2px 6px', borderRadius: 4, border: `1px solid ${runner.color}`
                            }}>
                              {runner.name} {isMyBet && '⭐'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {racesRoomState.status === 'done' && racesWinnerResults && (
                    <div className="glass-card" style={{ padding: 20, background: 'rgba(46,204,113,0.05)', border: '2px solid #2ecc71', textAlign: 'center', animation: 'bounce-in 0.5s ease' }}>
                      <h3 style={{ color: '#2ecc71', fontSize: '1.4rem', fontWeight: 900, marginBottom: 12 }}>
                        🏆 ZWYCIĘŻYŁA ZAWODNICZKA #{racesWinningRunner} ({RUNNERS.find(r=>r.id===racesWinningRunner)?.name})!
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 400, margin: '0 auto' }}>
                        {racesRoomState.players.map((p: any) => {
                          const res = racesWinnerResults[p.userId];
                          if (!res) return null;
                          return (
                            <div key={p.userId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                              <span style={{ fontWeight: 800 }}>{p.nickname}:</span>
                              <span style={{ color: res.isWin ? '#2ecc71' : '#ff3838', fontWeight: 900 }}>
                                {res.isWin ? `WYGRANA (+${res.winnings} 🪙)` : `PRZEGRANA (-${racesRoomState.bet} 🪙)`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
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

          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: 'var(--gold)', marginBottom: '12px' }}>🏁 Ranked Races</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
                Lobby do 5 graczy. Wybierz zawodniczkę i postaw stawkę w ciągu minuty. Wygrany zgarnia x5.0 stawki!
              </p>

              <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#aaa', fontWeight: 'bold' }}>
                Wybierz stawkę:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
                {BET_TIERS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setRacesBet(t.value)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: 10,
                      border: `2px solid ${racesBet === t.value ? t.color : 'rgba(255,255,255,0.08)'}`,
                      background: racesBet === t.value ? t.bg : 'rgba(0,0,0,0.3)',
                      color: racesBet === t.value ? t.color : '#888',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.78rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      transition: 'all 0.15s',
                      boxShadow: racesBet === t.value ? `0 0 12px ${t.color}44` : 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{t.emoji}</span>
                    <span>{t.label} 🪙</span>
                    <span style={{ fontSize: '0.65rem', color: racesBet === t.value ? t.color : '#555', fontStyle: 'italic' }}>{t.tier}</span>
                  </button>
                ))}
              </div>

              {/* Info o wybranej stawce */}
              {(() => {
                const t = BET_TIERS.find(x => x.value === racesBet)!
                return (
                  <div style={{
                    background: t.bg, border: `1px solid ${t.color}44`,
                    borderRadius: 10, padding: '10px 16px', fontSize: '0.85rem',
                    display: 'flex', justifyContent: 'space-around', marginBottom: 16
                  }}>
                    <span style={{ color: '#2ecc71' }}>+{(t.value * 4).toLocaleString()} za trafienie (netto) 🏆</span>
                    <span style={{ color: '#e74c3c' }}>−{t.value.toLocaleString()} za pudło 📹</span>
                  </div>
                );
              })()}
            </div>

            <button
              className="btn-gold btn-full"
              onClick={() => handleStartSearch('races')}
              style={{ fontSize: '1rem', padding: '14px' }}
            >
              Szukaj wyścigu za {BET_TIERS.find(x=>x.value===racesBet)?.emoji} {BET_TIERS.find(x=>x.value===racesBet)?.label} 🪙
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankedPage;
