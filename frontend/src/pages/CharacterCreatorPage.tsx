import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';

const CharacterCreatorPage: React.FC = () => {
  const [skinColor, setSkinColor] = useState('light');
  const [hairStyle, setHairStyle] = useState('short');
  const [loading, setLoading] = useState(false);
  
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  const skins = [
    { name: 'Jasna', value: 'light', color: '#f5deb3' },
    { name: 'Średnia', value: 'medium', color: '#c68642' },
    { name: 'Opalona', value: 'tan', color: '#a0522d' },
    { name: 'Ciemna', value: 'dark', color: '#4a2c17' },
    { name: 'Głęboka', value: 'deep', color: '#2d1a0e' },
  ];

  const hairs = [
    { name: 'Krótkie', value: 'short' },
    { name: 'Długie', value: 'long' },
    { name: 'Kręcone', value: 'curly' },
    { name: 'Łysy', value: 'bald' },
    { name: 'Irokez', value: 'mohawk' },
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.post('/auth/character', { skinColor, hairStyle });
      if (user) {
        setUser({ ...user, skinColor, hairStyle, characterCreated: true });
      }
      navigate('/game/kasyno');
    } catch (err) {
      console.error('Błąd zapisu postaci:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '20px'
    }}>
      <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '600px', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        
        {/* Podgląd postaci SVG */}
        <div style={{ flex: '1', minWidth: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: 'var(--gold)', marginBottom: '20px', fontFamily: 'var(--font-display)' }}>Twoja Postać</h2>
          
          <svg width="150" height="150" viewBox="0 0 100 100" style={{ border: '2px solid var(--border-gold)', borderRadius: '50%', background: 'var(--bg-secondary)', padding: '10px' }}>
            {/* Twarz */}
            <circle cx="50" cy="50" r="30" fill={skins.find(s => s.value === skinColor)?.color || '#f5deb3'} />
            
            {/* Oczy */}
            <circle cx="42" cy="48" r="3" fill="#111" />
            <circle cx="58" cy="48" r="3" fill="#111" />
            
            {/* Usta (Uśmiech mafioza) */}
            <path d="M 40 62 Q 50 68 60 62" stroke="#111" strokeWidth="2.5" fill="none" />
            
            {/* Fryzury */}
            {hairStyle === 'short' && (
              <path d="M 20 50 Q 20 20 50 20 Q 80 20 80 50 Q 50 15 20 50" fill="#332211" />
            )}
            {hairStyle === 'long' && (
              <path d="M 20 50 Q 20 15 50 15 Q 80 15 80 50 Q 82 70 80 80 Q 75 50 50 25 Q 25 50 20 80 Q 18 70 20 50" fill="#332211" />
            )}
            {hairStyle === 'curly' && (
              <g fill="#332211">
                <circle cx="50" cy="22" r="8" />
                <circle cx="35" cy="28" r="8" />
                <circle cx="65" cy="28" r="8" />
                <circle cx="25" cy="40" r="8" />
                <circle cx="75" cy="40" r="8" />
              </g>
            )}
            {hairStyle === 'mohawk' && (
              <path d="M 46 12 Q 50 2 54 12 Q 54 28 46 28 Z" fill="#8b0000" />
            )}
          </svg>
        </div>

        {/* Opcje wyboru */}
        <div style={{ flex: '1.2', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>Stwórz Tożsamość</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Wybierz wygląd, zanim wejdziesz do Casino Star.</p>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Kolor skóry</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {skins.map((s) => (
                <button 
                  key={s.value}
                  onClick={() => setSkinColor(s.value)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', backgroundColor: s.color,
                    border: skinColor === s.value ? '2px solid var(--gold)' : '2px solid transparent',
                    boxShadow: skinColor === s.value ? 'var(--shadow-gold)' : 'none',
                    cursor: 'pointer'
                  }}
                  title={s.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Fryzura</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {hairs.map((h) => (
                <button
                  key={h.value}
                  onClick={() => setHairStyle(h.value)}
                  className={hairStyle === h.value ? 'btn-gold btn-sm' : 'btn-ghost btn-sm'}
                  style={{ padding: '6px 12px' }}
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-gold btn-full" onClick={handleSave} disabled={loading} style={{ marginTop: '12px' }}>
            {loading ? 'Zapisywanie...' : 'Rozpocznij przygodę'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CharacterCreatorPage;
