import React, { useEffect, useState } from 'react';
import socket from '../socket/socket';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';

interface MatchmakingOverlayProps {
  gameType: 'blackjack' | 'slots' | 'races';
  bet?: number;
  onClose: () => void;
}

const MatchmakingOverlay: React.FC<MatchmakingOverlayProps> = ({ gameType, bet, onClose }) => {
  const [countdown, setCountdown] = useState(25);
  const setRankedMatch = useGameStore((state) => state.setRankedMatch);

  useEffect(() => {
    // Połącz socket jeśli niepołączony
    if (!socket.connected) {
      socket.connect();
    }

    // Dołącz do kolejki z tokenem JWT i wybraną stawką
    const token = useAuthStore.getState().token;
    socket.emit('joinQueue', { gameType, token, bet });

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleMatchFound = (data: any) => {
      const nickname = useAuthStore.getState().user?.nickname;
      const opponent = data.players ? data.players.find((p: string) => p !== nickname) : 'Przeciwnik';
      setRankedMatch({
        matchId: data.roomId,
        opponent: opponent,
        playerScore: 0,
        opponentScore: 0,
        game: gameType,
        status: 'playing',
      });
    };

    socket.on('matchFound', handleMatchFound);

    return () => {
      clearInterval(timer);
      socket.emit('leaveQueue', { gameType });
      socket.off('matchFound', handleMatchFound);
    };
  }, [gameType, setRankedMatch]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(10, 10, 15, 0.9)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '20px'
    }}>
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
        <h2 style={{ color: 'var(--gold)', marginBottom: '16px' }}>Szukanie przeciwnika</h2>
        <div style={{
          width: '50px', height: '50px', border: '3px solid var(--border-gold)',
          borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Łączenie z graczem online...
        </p>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--gold)' }}>
          {countdown}s
        </div>
        <button className="btn-red btn-sm" style={{ marginTop: '24px' }} onClick={onClose}>
          Anuluj
        </button>
      </div>
    </div>
  );
};

export default MatchmakingOverlay;
