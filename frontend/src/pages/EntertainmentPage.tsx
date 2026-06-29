import React, { useState } from 'react';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';
import { sfxFun, sfxLose, sfxClick } from '../utils/sfx';


const EntertainmentPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  
  const { user, setUser, updateNeeds } = useAuthStore();

  const activities = [
    {
      id: 'walenie_konia',
      name: 'Walenie konia 🍆',
      cost: 0,
      description: 'Darmowa rozrywka we własnym pokoju. Poprawia humor o 5 punktów zadowolenia. Istnieje 1% szansy na zerwanie wędzidełka (szpital kosztuje 2500 $).',
    },
    {
      id: 'kino',
      name: 'Kino 🎬',
      cost: 30,
      description: 'Obejrzyj gangsterski klasyk o rodzinie Soprano. Daje +30 punktów zadowolenia.',
    },
    {
      id: 'randka',
      name: 'Randka z Tindera 👩‍❤️‍👨',
      cost: 120,
      description: 'Kup kolację i spędź miło czas. +50 Zadowolenia, +50 Najedzenia i +50 Nawodnienia.',
    },
    {
      id: 'stripclub',
      name: 'Klub Nocny (Stripclub) 🔞',
      cost: 150,
      description: 'Szalona zabawa. +100 Zadowolenia i +100 Nawodnienia. Kto wie, jak skończy się ta noc...',
    },
  ];

  const handleActivity = async (id: string) => {
    setLoading(true);
    setOutcome(null);
    try {
      sfxClick();
      const res = await api.post('/shop/entertainment', { activity: id });
      setOutcome(res.data.message);
      
      if (res.data.event === 'accident') {
        sfxLose();
      } else {
        sfxFun();
      }

      // Zaktualizuj stan potrzeb, dolary i żetony
      updateNeeds(res.data.needs);
      if (user) {
        setUser({ ...user, tokens: res.data.tokens, dollars: res.data.dollars });
      }
    } catch (err: any) {
      sfxLose();
      setOutcome(err.response?.data?.error || 'Błąd podczas wykonywania akcji.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '32px' }}>
      <h2 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', marginBottom: '12px', textAlign: 'center' }}>
        Mafijna Strefa Rozrywki
      </h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '32px', fontSize: '0.9rem' }}>
        Życie mafioza to nie tylko kasyno. Zregeneruj swoje zadowolenie i zadbaj o zdrowie psychiczne.
      </p>

      {outcome && (
        <div style={{
          background: 'rgba(212,175,55,0.1)', border: '1px solid var(--gold)',
          color: '#f0e6d3', padding: '16px', borderRadius: '8px', marginBottom: '24px',
          textAlign: 'center', fontWeight: 'bold'
        }}>
          {outcome}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {activities.map((act) => {
          const canAfford = user ? user.dollars >= act.cost : false;
          return (
            <div 
              key={act.id} 
              className="glass-card" 
              style={{
                padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <h3 style={{ color: 'var(--gold)' }}>{act.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', flex: 1 }}>{act.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Koszt: {act.cost} $</span>
                <button 
                  className="btn-gold btn-sm" 
                  disabled={loading || !canAfford}
                  onClick={() => handleActivity(act.id)}
                >
                  Wybierz
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EntertainmentPage;
