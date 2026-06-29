import React, { useState, useEffect } from 'react';
import socket from '../socket/socket';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import MatchmakingOverlay from '../components/MatchmakingOverlay';
import PlayingCard from '../components/PlayingCard';

const RankedPage: React.FC = () => {
  const [searching, setSearching] = useState(false);
  const [gameType, setGameType] = useState<'blackjack' | 'slots'>('blackjack');
  const [matchResult, setMatchResult] = useState<string | null>(null);

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
  
  // Slots Ranked
  const [myProgress, setMyProgress] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  const [slotSymbols, setSlotSymbols] = useState(['🍒', '🍋', '⭐']);

  useEffect(() => {
    if (!rankedMatch) return;

    // 1. Początek rundy lub nowa runda
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
      const placeholderCards = Array.from({ length: oppHandSize }, () => ({ rank: '?', suit: 'hearts', faceDown: true }));
      setOHand(placeholderCards);
      setOScore(0);
    });

    // 2. Kiedy dostajemy własną rękę
    socket.on('yourHand', (data: any) => {
      setPHand(data.hand);
      setPScore(data.handValue);
    });

    // 3. Kiedy runda się kończy
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

    // 4. Obsługa slots ranked start
    socket.on('rankedSlotsStart', () => {
      setMyProgress(0);
      setOppProgress(0);
    });

    // 5. Wyniki spinu ( slots ranked )
    socket.on('rankedSpinResult', (data: any) => {
      setMyProgress(data.virtualTokens);
      setSlotSymbols(data.reels);
    });

    socket.on('botSpinResult', (data: any) => {
      setOppProgress(data.virtualTokens);
    });

    // 6. Koniec meczu
    socket.on('matchResult', (data: any) => {
      const amIWinner = data.winnerId === user?.id;
      setMatchResult(amIWinner ? 'Zwycięstwo! +350 żetonów.' : 'Porażka! Utracono 150 żetonów.');
      
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
      }, 5000);
    });

    return () => {
      socket.off('rankedBlackjackRound');
      socket.off('yourHand');
      socket.off('rankedBlackjackRoundResult');
      socket.off('rankedSlotsStart');
      socket.off('rankedSpinResult');
      socket.off('botSpinResult');
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
    return <MatchmakingOverlay gameType={gameType} onClose={() => setSearching(false)} />;
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
              {/* Wynik gry punktowej */}
              <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.1rem', color: 'var(--gold)' }}>
                Punkty: Ty ({points.player}) vs Przeciwnik ({points.opponent}) — (Do 3 zwycięstw)
              </div>

              <div className="blackjack-table" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Dealer Area */}
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

                {/* Hands columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                  {/* Opponent area */}
                  <div className="opponent-area" style={{ textAlign: 'center' }}>
                    <span className="hand-label" style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>{rankedMatch.opponent}</span>
                    <div className="hand-cards" style={{ display: 'flex', gap: '8px', justifyContent: 'center', minHeight: '120px' }}>
                      {oHand.map((card, idx) => (
                        <PlayingCard key={idx} card={card} />
                      ))}
                    </div>
                    <div className="score-display" style={{ marginTop: '6px', fontWeight: 'bold' }}>Wynik: {oScore}</div>
                  </div>

                  {/* Player area */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center' }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                  <span>Twój postęp ({myProgress}/200)</span>
                  <span>Przeciwnik ({oppProgress}/200)</span>
                </div>
                <div style={{ height: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${(myProgress / 200) * 100}%`, background: 'var(--gold)', transition: 'width 0.3s ease' }} />
                  <div style={{ height: '100%', width: `${(oppProgress / 200) * 100}%`, background: 'var(--red)', position: 'absolute', top: 0, right: 0, opacity: 0.5, transition: 'width 0.3s ease' }} />
                </div>
              </div>

              {/* Slot machine UI */}
              <div style={{ display: 'flex', gap: '12px', background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '12px', border: '3px solid var(--gold)' }}>
                {slotSymbols.map((sym, idx) => (
                  <div key={idx} className="slot-reel" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>{sym}</div>
                ))}
              </div>

              <button className="btn-gold btn-lg" onClick={spinRanked}>SPIN</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--gold)', marginBottom: '12px' }}>Ranked Blackjack</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
              Zagraj w tryb rankingowy z innym graczem. Pierwszy do 3 wygranych rozdań wygrywa 350 prawdziwych żetonów.
            </p>
            <button className="btn-gold btn-full" onClick={() => handleStartSearch('blackjack')}>
              Graj Ranked (+350 / -150)
            </button>
          </div>
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--gold)', marginBottom: '12px' }}>Ranked Slots</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
              Wyścig automatów. Kręć darmowymi wirtualnymi żetonami do momentu ugrania 200 żetonów rankingowych.
            </p>
            <button className="btn-gold btn-full" onClick={() => handleStartSearch('slots')}>
              Graj Ranked (+350 / -150)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankedPage;
