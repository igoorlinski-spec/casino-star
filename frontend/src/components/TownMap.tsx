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

const TownMap: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Coordinates in percentage (0 to 100)
  const [avatar, setAvatar] = useState({ x: 50, y: 65 });
  const [target, setTarget] = useState<{ x: number; y: number; path: string } | null>(null);
  
  const houseId = user?.playerHouse?.houseId || 1;
  const houseEmoji = houseId === 4 ? '🏢' : (houseId === 3 ? '🏨' : (houseId === 2 ? '🏬' : '🏘️'));
  const houseName = houseId === 4 ? 'Rezydencja Vegas' : (houseId === 3 ? 'Penthouse' : (houseId === 2 ? 'Apartament VIP' : 'Skromny Motel'));

  const BUILDINGS = React.useMemo<Building[]>(() => [
    { id: 'saloon', name: '🎰 Casino Bellagio', emoji: '🎲', color: '#00f0ff', x: 20, y: 20, path: '/game/kasyno', desc: 'Blackjack, Slots, Crash, Races' },
    { id: 'duel', name: '⚡ High Roller Arena', emoji: '🏆', color: '#ff007f', x: 50, y: 20, path: '/game/rywalizacja', desc: 'Graj z innymi graczami online' },
    { id: 'sheriff', name: '👮 Security Patrol', emoji: '🚨', color: '#39ff14', x: 80, y: 20, path: '/game/praca', desc: 'Burger clicks, Flappy Bird rewards' },
    { id: 'cabaret', name: '🔞 Vegas Nightclub', emoji: '💃', color: '#ff00aa', x: 20, y: 50, path: '/game/rozrywka', desc: 'Randki, Strip Club, Kino' },
    { id: 'home', name: `🏨 Twój Apartament (${houseName})`, emoji: houseEmoji, color: '#ffd700', x: 50, y: 50, path: '/game/dom', desc: 'Odpocznij i zregeneruj siły' },
    { id: 'tracks', name: '🚇 Vegas Monorail', emoji: '🚝', color: '#ff5e00', x: 80, y: 50, path: '/game/tory', desc: 'Przejmij rannych na torach metra' },
    { id: 'store', name: '🛍️ Fashion Mall (Sklep)', emoji: '👜', color: '#a29bfe', x: 20, y: 80, path: '/game/sklep', desc: 'Jedzenie, picie, plecak' },
    { id: 'wanted', name: '📜 Hall of Fame (Ranking)', emoji: '🏅', color: '#00d2d3', x: 50, y: 80, path: '/game/ranking', desc: 'Najlepsi gracze w Vegas' },
    { id: 'bank', name: '🏛️ Bank & Biznes', emoji: '💼', color: '#1dd1a1', x: 80, y: 80, path: '/game/biznes', desc: 'Giełda, inwestycje, rankingi' },
  ], [houseEmoji, houseName]);

  // Click-to-walk mouse simulation
  useEffect(() => {
    if (!target) return;

    const interval = setInterval(() => {
      setAvatar((prev) => {
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
          clearInterval(interval);
          setTarget(null);
          navigate(target.path);
          return { x: target.x, y: target.y };
        }

        const speed = 2.5; // speed
        return {
          x: prev.x + (dx / dist) * speed,
          y: prev.y + (dy / dist) * speed,
        };
      });
    }, 30);

    return () => clearInterval(interval);
  }, [target, navigate]);

  // Keyboard navigation (WASD & Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if the user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      let dx = 0;
      let dy = 0;
      const step = 3;

      if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') dy = -step;
      else if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') dy = step;
      else if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') dx = -step;
      else if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') dx = step;

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        setTarget(null); // Cancel mouse target
        setAvatar((prev) => {
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
  }, [BUILDINGS, navigate]);

  const handleBuildingClick = (b: Building) => {
    setTarget({ x: b.x, y: b.y, path: b.path });
  };

  return (
    <div style={{
      position: 'relative', width: '100%', height: '500px',
      background: 'radial-gradient(circle, #100624 20%, #03010b 100%)',
      borderRadius: '24px', border: '5px solid #00f0ff',
      boxShadow: '0 15px 40px rgba(0,240,255,0.25), inset 0 0 80px rgba(0,0,0,0.9)',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)',
      marginBottom: '20px'
    }}>
      {/* Decorative Las Vegas Items */}
      <span style={{ position: 'absolute', left: '10%', top: '45%', fontSize: '2.5rem', opacity: 0.45, animation: 'float-up 8s infinite linear' }}>🌴</span>
      <span style={{ position: 'absolute', right: '12%', top: '48%', fontSize: '2.5rem', opacity: 0.45 }}>🌴</span>
      <span style={{ position: 'absolute', left: '45%', top: '15%', fontSize: '2rem', opacity: 0.4, animation: 'neon-flicker 3s infinite' }}>✨</span>
      <span style={{ position: 'absolute', right: '40%', top: '78%', fontSize: '2.2rem', opacity: 0.35 }}>🏎️</span>

      {/* Glowing Neon Grid Roads */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '20%', height: '8px', background: 'rgba(0, 240, 255, 0.25)', boxShadow: '0 0 10px rgba(0,240,255,0.5)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '8px', background: 'rgba(0, 240, 255, 0.25)', boxShadow: '0 0 10px rgba(0,240,255,0.5)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: '80%', height: '8px', background: 'rgba(0, 240, 255, 0.25)', boxShadow: '0 0 10px rgba(0,240,255,0.5)' }} />
      <div style={{ position: 'absolute', left: '20%', top: 0, bottom: 0, width: '8px', background: 'rgba(0, 240, 255, 0.25)', boxShadow: '0 0 10px rgba(0,240,255,0.5)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '8px', background: 'rgba(0, 240, 255, 0.25)', boxShadow: '0 0 10px rgba(0,240,255,0.5)' }} />
      <div style={{ position: 'absolute', left: '80%', top: 0, bottom: 0, width: '8px', background: 'rgba(0, 240, 255, 0.25)', boxShadow: '0 0 10px rgba(0,240,255,0.5)' }} />

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
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #1b0c36, #070314)',
            border: `3px solid ${b.color}`,
            boxShadow: `0 8px 20px rgba(0,0,0,0.6), 0 0 12px ${b.color}aa`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.2rem',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = `0 12px 25px rgba(0,0,0,0.8), 0 0 20px ${b.color}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = `0 8px 20px rgba(0,0,0,0.6), 0 0 12px ${b.color}aa`;
          }}
          >
            {b.emoji}
          </div>
          <span style={{
            marginTop: '8px', background: 'rgba(5, 2, 12, 0.9)', color: '#ffffff',
            fontSize: '0.8rem', fontWeight: '800', padding: '3px 10px',
            borderRadius: '15px', border: `1px solid ${b.color}`,
            whiteSpace: 'nowrap',
            boxShadow: `0 4px 10px rgba(0,0,0,0.5), 0 0 5px ${b.color}55`
          }}>
            {b.name}
          </span>
        </button>
      ))}

      {/* VIP Avatar (Gentleman in Tuxedo) */}
      <div style={{
        position: 'absolute', left: `${avatar.x}%`, top: `${avatar.y}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: '2.8rem',
        zIndex: 20,
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8))',
        transition: 'transform(all) 0.05s',
        animation: target ? 'walk-bob 0.25s infinite alternate' : 'none',
      }}>
        🤵
      </div>

      {/* CSS Animation for walking bobbing */}
      <style>{`
        @keyframes walk-bob {
          0% { transform: translate(-50%, -50%) translateY(0) scaleX(1); }
          100% { transform: translate(-50%, -50%) translateY(-6px) scaleX(0.95); }
        }
      `}</style>
    </div>
  );
};

export default TownMap;
