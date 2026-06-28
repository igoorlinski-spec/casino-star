import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';
import Badge from '../components/Badge';

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  tokens: number;
  house: string;
  blackjackWinsTotal: number;
  tinderBadge?: string;
}

const RankingPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get('/leaderboard');
        setLeaderboard(res.data.leaderboard);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="glass-card" style={{ padding: '32px' }}>
      <h2 style={{
        color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: '2rem',
        marginBottom: '8px', textShadow: 'var(--shadow-gold)', textAlign: 'center'
      }}>TABLICA WYNIKÓW</h2>
      <p style={{
        color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic',
        marginBottom: '32px', textAlign: 'center'
      }}>„Kto rządzi w mieście, a kto tylko sprząta ulice.”</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Ładowanie rankingu...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-gold)', color: 'var(--gold)', textAlign: 'left' }}>
                <th style={{ padding: '12px 8px' }}>Pozycja</th>
                <th style={{ padding: '12px 8px' }}>Gracz</th>
                <th style={{ padding: '12px 8px' }}>Żetony</th>
                <th style={{ padding: '12px 8px' }}>Posiadłość</th>
                <th style={{ padding: '12px 8px' }}>Odznaki</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => {
                const isCurrentUser = user && user.nickname === entry.nickname;
                return (
                  <tr 
                    key={entry.nickname} 
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      backgroundColor: isCurrentUser ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
                      color: isCurrentUser ? 'var(--gold)' : 'var(--text-primary)'
                    }}
                  >
                    <td style={{ padding: '16px 8px', fontWeight: 'bold' }}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}.`}
                    </td>
                    <td style={{ padding: '16px 8px', fontWeight: isCurrentUser ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{entry.nickname}</span>
                      {entry.tinderBadge === 'silver' && (
                        <span title="Srebrny dymek Tindera" style={{ 
                          padding: '1px 5px', 
                          borderRadius: '4px', 
                          background: 'linear-gradient(135deg, #bdc3c7, #7f8c8d)', 
                          color: '#fff', 
                          fontSize: '0.65rem', 
                          fontWeight: 'bold',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          boxShadow: '0 0 5px rgba(255,255,255,0.3)',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}>
                          💬 Srebro
                        </span>
                      )}
                      {entry.tinderBadge === 'gold' && (
                        <span title="Złoty dymek Tindera" style={{ 
                          padding: '1px 5px', 
                          borderRadius: '4px', 
                          background: 'linear-gradient(135deg, #f1c40f, #f39c12)', 
                          color: '#000', 
                          fontSize: '0.65rem', 
                          fontWeight: 'black',
                          textShadow: '0 1px 1px rgba(255,255,255,0.5)',
                          boxShadow: '0 0 8px rgba(241,196,15,0.5)',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}>
                          💬 Złoto
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 8px' }}>
                      🪙 {entry.tokens.toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>
                      {entry.house}
                    </td>
                    <td style={{ padding: '16px 8px' }}>
                      <Badge wins={entry.blackjackWinsTotal} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RankingPage;
