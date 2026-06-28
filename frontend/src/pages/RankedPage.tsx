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

  const { user, setUser, updateNeeds } = useAuthStore();
  const { rankedMatch, setRankedMatch } = useGameStore();

  // Socket state dla gier ranked
  const [pHand, setPHand] = useState<any[]>([]);
  const [oHand, setOHand] = useState<any[]>([]);
  const [pScore, setPScore] = useState(0);
  const [oScore, setOScore] = useState(0);
  const [points, setPoints] = useState({ player: 0, opponent: 0 });
  const [isMyTurn, setIsMyTurn] = useState(false);
  
  // Slots Ranked
  const [myProgress, setMyProgress] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  const [slotSymbols, setSlotSymbols] = useState(['🍒', '🍋', '⭐']);

  useEffect(() => {
    if (!rankedMatch) return;

    // Słuchaj aktualizacji stanu gry ranked
    socket.on('gameState', (data: any) => {
      if (data.game === 'blackjack') {
        const isP1 = data.p1Id === socket.id;
        setPHand(isP1 ? data.p1Hand : data.p2Hand);
        setOHand(isP1 ? data.p2Hand : data.p1Hand);
        setPScore(isP1 ? data.p1Score : data.p2Score);
        setOScore(isP1 ? data.p2Score : data.p1Score);
        setPoints({
          player: isP1 ? data.p1Points : data.p2Points,
          opponent: isP1 ? data.p2Points : data.p1Points,
        });
        setIsMyTurn(data.currentTurn === socket.id);
      } else if (data.game === 'slots') {
        const isP1 = data.p1Id === socket.id;
        setMyProgress(isP1 ? data.p1Progress : data.p2Progress);
        setOppProgress(isP1 ? data.p2Progress : data.p1Progress);
        if (data.lastSpinResult && data.lastSpinner === socket.id) {
          setSlotSymbols(data.lastSpinResult);
        }
      }
    });

    socket.on('gameEnd', (data: any) => {
      const amIWinner = data.winnerId === socket.id;
      setMatchResult(amIWinner ? 'Zwycięstwo! +350 żetonów.' : 'Porażka! Utracono 150 żetonów.');
      
      // Zaktualizuj stan potrzeb i waluty
      updateNeeds(data.needs);
      if (user) {
        setUser({ ...user, tokens: user.tokens + data.tokensDelta });
      }

      setTimeout(() => {
        setRankedMatch(null);
        setMatchResult(null);
        setSearching(false);
        setPHand([]);
        setOHand([]);
      }, 5000);
    });

    return () => {
      socket.off('gameState');
      socket.off('gameEnd');
    };
  }, [rankedMatch, user, setRankedMatch, updateNeeds, setUser]);

  const handleStartSearch = (type: 'blackjack' | 'slots') => {
    setGameType(type);
    setSearching(true);
  };

  const hitRanked = () => {
    socket.emit('rankedAction', { action: 'hit', matchId: rankedMatch?.matchId });
  };

  const standRanked = () => {
    socket.emit('rankedAction', { action: 'stand', matchId: rankedMatch?.matchId });
  };

  const doubleRanked = () => {
    socket.emit('rankedAction', { action: 'double', matchId: rankedMatch?.matchId });
  };

  const spinRanked = () => {
    socket.emit('rankedAction', { action: 'spin', matchId: rankedMatch?.matchId });
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

              <div className="blackjack-table">
                {/* Opponent area */}
                <div className="dealer-area">
                  <span className="hand-label">{rankedMatch.opponent}</span>
                  <div className="hand-cards">
                    {oHand.map((card, idx) => (
                      <PlayingCard key={idx} card={card} />
                    ))}
                  </div>
                  <div className="score-display">Wynik: {oScore}</div>
                </div>

                <div className="blackjack-divider" />

                {/* Player area */}
                <div className="player-area">
                  <span className="hand-label">Twoje karty</span>
                  <div className="hand-cards">
                    {pHand.map((card, idx) => (
                      <PlayingCard key={idx} card={card} />
                    ))}
                  </div>
                  <div className="score-display">Wynik: {pScore}</div>
                </div>
              </div>

              {isMyTurn && (
                <div className="action-buttons">
                  <button className="btn-gold" onClick={hitRanked}>Dobierz</button>
                  <button className="btn-ghost" onClick={standRanked}>Pas</button>
                  <button className="btn-ghost" onClick={doubleRanked}>Podwój</button>
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
