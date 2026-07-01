import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface Building {
  id: string;
  name: string;
  emoji: string;
  color: string;
  x: number;
  y: number;
  path: string;
  desc: string;
}

export const TownMap: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Coordinates in percentage (0 to 100)
  const [cowboy, setCowboy] = useState({ x: 50, y: 65 });
  const [target, setTarget] = useState<{ x: number; y: number; path: string } | null>(null);
  
  const houseId = user?.playerHouse?.houseId || 1;
  const houseEmoji = houseId === 4 ? '🏡' : (houseId === 3 ? '🪵' : (houseId === 2 ? '⛺' : '🏚️'));
  const houseName = houseId === 4 ? 'Willa' : (houseId === 3 ? 'Mieszkanie' : (houseId === 2 ? 'Kawalerka' : 'Rudera'));

  const BUILDINGS = React.useMemo<Building[]>(() => [
    { id: 'saloon', name: '🍺 Saloon (Kasyno)', emoji: '🎰', color: '#ff9f43', x: 20, y: 20, path: '/game/kasyno', desc: 'Blackjack, Slots, Crash, Races' },
    { id: 'duel', name: '⚔️ Pojedynki (Online)', emoji: '🤺', color: '#ff3838', x: 50, y: 20, path: '/game/rywalizacja', desc: 'Graj z innymi graczami online' },
    { id: 'sheriff', name: '⭐ Sheriff (Praca)', emoji: '🤠', color: '#10ac84', x: 80, y: 20, path: '/game/praca', desc: 'Burger clicks, Flappy Bird rewards' },
    { id: 'cabaret', name: '💃 Kabaret (Rozrywka)', emoji: '🔞', color: '#ff00e6', x: 20, y: 50, path: '/game/rozrywka', desc: 'Randki, Strip Club, Kino' },
    { id: 'home', name: `🏠 Twój Dom (${houseName})`, emoji: houseEmoji, color: '#ee5253', x: 50, y: 50, path: '/game/dom', desc: 'Odpocznij i zregeneruj siły' },
    { id: 'plock', name: '🇵🇱 Event Płock', emoji: '🇵🇱', color: '#ff7675', x: 80, y: 50, path: '/game/plock', desc: 'Maszyna Płock i mafia' },
    { id: 'store', name: '🛒 General Store (Sklep)', emoji: '📦', color: '#2e86de', x: 20, y: 80, path: '/game/sklep', desc: 'Jedzenie, picie, plecak' },
    { id: 'wanted', name: '📜 Listy Gończe (Ranking)', emoji: '🏅', color: '#ffd700', x: 50, y: 80, path: '/game/ranking', desc: 'Najlepsi rewolwerowcy w mieście' },
    { id: 'bank', name: '🏛️ Bank & Biznes', emoji: '📈', color: '#00d2d3', x: 80, y: 80, path: '/game/biznes', desc: 'Giełda, inwestycje, rankingi' },
  ], [houseEmoji, houseName]);

  // Click-to-walk mouse simulation
  useEffect(() => {
    if (!target) return;

    const interval = setInterval(() => {
      setCowboy((prev) => {
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
          clearInterval(interval);
          setTarget(null);
          navigate(target.path);
          return { x: target.x, y: target.y };
        }

        const step = 2.5; // speed
        return {
          x: prev.x + (dx / dist) * step,
          y: prev.y + (dy / dist) * step,
        };
      });
    }, 30);

    return () => clearInterval(interval);
  }, [target, navigate]);

  // Keyboard WASD/Arrow keys walking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      let dx = 0;
      let dy = 0;
      const step = 3; // percentage shift per press

      if (key === 'w' || key === 'arrowup') dy = -step;
      else if (key === 's' || key === 'arrowdown') dy = step;
      else if (key === 'a' || key === 'arrowleft') dx = -step;
      else if (key === 'd' || key === 'arrowright') dx = step;

      if (dx !== 0 || dy !== 0) {
        setTarget(null); // Cancel mouse target
        setCowboy((prev) => {
          const nextX = Math.max(5, Math.min(95, prev.x + dx));
          const nextY = Math.max(5, Math.min(95, prev.y + dy));

          // Check collision with all buildings
          for (const b of BUILDINGS) {
            const dist = Math.sqrt((b.x - nextX) ** 2 + (b.y - nextY) ** 2);
            if (dist < 5) {
              setTimeout(() => navigate(b.path), 50);
              break;
            }
          }

          return { x: nextX, y: nextY };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, BUILDINGS]);

  const handleBuildingClick = (b: Building) => {
    setTarget({ x: b.x, y: b.y, path: b.path });
  };

  return (
    <div style={{
      position: 'relative', width: '100%', height: '500px',
      background: 'radial-gradient(circle, #e2b474 20%, #c49454 100%)',
      borderRadius: '24px', border: '5px solid #5c3a21',
      boxShadow: '0 15px 35px rgba(0,0,0,0.5), inset 0 0 50px rgba(0,0,0,0.3)',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)',
      marginBottom: '20px'
    }}>
      {/* Decorative Desert Items */}
      <span style={{ position: 'absolute', left: '10%', top: '45%', fontSize: '2rem', opacity: 0.35 }}>🌵</span>
      <span style={{ position: 'absolute', right: '12%', top: '48%', fontSize: '2.2rem', opacity: 0.35 }}>🌵</span>
      <span style={{ position: 'absolute', left: '45%', top: '15%', fontSize: '1.8rem', opacity: 0.25 }}>🪨</span>
      <span style={{ position: 'absolute', right: '40%', top: '78%', fontSize: '2rem', opacity: 0.2 }}>🌾</span>

      {/* Grid Paths */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '20%', height: '8px', background: 'rgba(0,0,0,0.1)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '8px', background: 'rgba(0,0,0,0.1)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: '80%', height: '8px', background: 'rgba(0,0,0,0.1)' }} />
      <div style={{ position: 'absolute', left: '20%', top: 0, bottom: 0, width: '8px', background: 'rgba(0,0,0,0.1)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '8px', background: 'rgba(0,0,0,0.1)' }} />
      <div style={{ position: 'absolute', left: '80%', top: 0, bottom: 0, width: '8px', background: 'rgba(0,0,0,0.1)' }} />

      {/* Buildings */}
      {BUILDINGS.map((b) => (
        <button
          key={b.id}
          onClick={() => handleBuildingClick(b)}
          style={{
            position: 'absolute', left: `${b.x}%`, top: `${b.y}%`,
            transform: 'translate(-50%, -50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            zIndex: 10,
          }}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #8b5a2b, #5c3a21)',
            border: `3px solid ${b.color}`,
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {b.emoji}
          </div>
          <span style={{
            marginTop: '8px', background: 'rgba(0,0,0,0.85)', color: '#f5eedc',
            fontSize: '0.8rem', fontWeight: 'bold', padding: '3px 8px',
            borderRadius: '6px', border: '1px solid rgba(229,177,60,0.4)',
            whiteSpace: 'nowrap',
          }}>
            {b.name}
          </span>
        </button>
      ))}

      {/* Cowboy Avatar */}
      <div style={{
        position: 'absolute', left: `${cowboy.x}%`, top: `${cowboy.y}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: '2.5rem',
        zIndex: 20,
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
        transition: 'transform(all) 0.05s',
        animation: target ? 'walk-bob 0.25s infinite alternate' : 'none',
      }}>
        🤠
      </div>

      {/* Bottom Tip Bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(28, 14, 7, 0.95)', borderTop: '2px solid #5c3a21',
        padding: '10px 20px', textAlign: 'center', fontSize: '0.85rem', color: '#c5b497'
      }}>
        Użyj klawiszy WASD / Strzałek do chodzenia, lub kliknij budynek, aby kowboj podszedł sam.
      </div>

      <style>{`
        @keyframes walk-bob {
          0% { transform: translate(-50%, -55%) rotate(-5deg); }
          100% { transform: translate(-50%, -45%) rotate(5deg); }
        }
      `}</style>
    </div>
  );
};
export default TownMap;
