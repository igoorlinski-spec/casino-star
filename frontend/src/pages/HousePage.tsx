import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';
import { sfxEat, sfxDrink, sfxSleep, sfxError } from '../utils/sfx';

interface House {
  id: number;
  name: string;
  price: number;
  sleepBonus: number;
  hasFridge: boolean;
  hasTap: boolean;
  freeFood: boolean;
}

export const HousePage: React.FC = () => {
  const { user, setUser, updateNeeds } = useAuthStore();
  const [currentHouse, setCurrentHouse] = useState<House | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const meRes = await api.get('/auth/me');
      setInventory(meRes.data.user.inventory || []);
      
      // Fetch houses to find current details
      const housesRes = await api.get('/shop/houses');
      const houseId = meRes.data.user.playerHouse?.houseId || 1;
      const found = housesRes.data.houses.find((h: House) => h.id === houseId);
      setCurrentHouse(found || null);

      // Fetch other players for robbery list
      const lbRes = await api.get('/leaderboard');
      setPlayers(lbRes.data.leaderboard || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goSleep = async () => {
    try {
      sfxSleep();
      const res = await api.post('/house/sleep');
      updateNeeds(res.data.needs);
      alert(res.data.message);
      fetchData();
    } catch (err: any) {
      sfxError();
      alert(err.response?.data?.error || 'Nie udało się położyć spać.');
    }
  };

  const drinkTap = async () => {
    try {
      sfxDrink();
      const res = await api.post('/shop/drink-tap');
      updateNeeds(res.data.needs);
      alert('🚰 Napiłeś się czystej wody z kranu! Pragnienie zaspokojone.');
      fetchData();
    } catch (err: any) {
      sfxError();
      alert(err.response?.data?.error || 'Błąd.');
    }
  };

  const eatFreeFood = async () => {
    try {
      sfxEat();
      const res = await api.post('/shop/free-food');
      updateNeeds(res.data.needs);
      alert('🍽️ Zjadłeś darmowy, pyszny posiłek w swojej Willi!');
      fetchData();
    } catch (err: any) {
      sfxError();
      alert(err.response?.data?.error || 'Błąd.');
    }
  };

  const consumeFridge = async (itemName: string) => {
    try {
      const isFood = ['Kebab', 'Chleb', 'Ptasie Mleczko'].includes(itemName);
      if (isFood) sfxEat(); else sfxDrink();
      const res = await api.post('/shop/consume', { itemName, fromBag: false });
      updateNeeds(res.data.needs);
      setInventory(res.data.inventory || []);
      alert(`Skonsumowano ${itemName} z lodówki!`);
    } catch (err: any) {
      sfxError();
      alert(err.response?.data?.error || 'Błąd.');
    }
  };

  const robPlayer = async (targetNickname: string) => {
    if (!window.confirm(`Czy na pewno chcesz napaść na dom gracza ${targetNickname}? Masz 10% szans na sukces. Porażka kosztuje $1000 kary.`)) return;
    try {
      const res = await api.post('/house/rob', { targetNickname });
      alert(res.data.message);
      if (user) {
        setUser({ ...user, dollars: res.data.dollars });
      }
      fetchData();
    } catch (err: any) {
      sfxError();
      alert(err.response?.data?.error || 'Napad się nie udał.');
    }
  };

  if (!currentHouse) {
    return <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>Ładowanie twojego domu...</div>;
  }

  const houseEmoji = currentHouse.id === 4 ? '🏡' : (currentHouse.id === 3 ? '🪵' : (currentHouse.id === 2 ? '⛺' : '🏚️'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <div className="glass-card" style={{ padding: '30px', textAlign: 'center', border: '2px solid var(--border-gold)' }}>
        <span style={{ fontSize: '4rem' }}>{houseEmoji}</span>
        <h2 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', margin: '12px 0' }}>
          Twój Dom: {currentHouse.name}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Witamy w domu, rewolwerowcu. Tutaj możesz odpocząć, najeść się i napić.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ color: 'var(--gold)', marginBottom: '16px', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
          🛌 Wyposażenie i akcje
        </h3>

        {/* Spanie */}
        <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '4px' }}>
            😴 Odpoczynek (Sen)
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Spanie przywraca w pełni (100%) wskaźnik energii.
          </p>
          <button className="btn-gold btn-full" onClick={goSleep}>
            Idź spać 🛌
          </button>
        </div>

        {/* Kran z wodą */}
        <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '4px' }}>
            🚰 Bieżąca woda (Kran)
          </p>
          {currentHouse.hasTap ? (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Nawadnia w pełni (100%) Twoje pragnienie.
              </p>
              <button className="btn-ghost btn-sm btn-full" onClick={drinkTap}>
                Napij się wody z kranu
              </button>
            </>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--red)', fontStyle: 'italic' }}>
              Niedostępne w Twoim typie domu. Wymaga Mieszkania lub Willi.
            </p>
          )}
        </div>

        {/* Darmowe jedzenie */}
        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '4px' }}>
            🍽️ Spiżarnia (Darmowe jedzenie)
          </p>
          {currentHouse.freeFood ? (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Zaspokaja głód (+60 Głodu) darmowym jedzeniem.
              </p>
              <button className="btn-ghost btn-sm btn-full" onClick={eatFreeFood}>
                Zjedz posiłek
              </button>
            </>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--red)', fontStyle: 'italic' }}>
              Niedostępne. Darmowa spiżarnia znajduje się wyłącznie w Willi.
            </p>
          )}
        </div>
      </div>

      {/* Lodówka */}
      {currentHouse.hasFridge && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--gold)', marginBottom: '12px', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
            🧊 Lodówka
          </h3>
          {inventory.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Twoja lodówka jest pusta. Kup artykuły spożywcze w sklepie.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inventory.map((item: any) => (
                <div key={item.itemName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>
                    {item.itemName} <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.85rem' }}>x{item.quantity}</span>
                  </span>
                  <button className="btn-gold btn-sm" onClick={() => consumeFridge(item.itemName)}>Zjedz</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Napady na sąsiadów */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ color: 'var(--gold)', marginBottom: '12px', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
          🤠 Napady na sąsiadów (10% szans)
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Zrób wjazd na chatę innego rewolwerowca. Sukces daje procent z jego gotówki. Porażka kosztuje grzywnę <strong style={{ color: '#ff7675' }}>$ 1000.00 USD</strong>.
        </p>
        
        {players.filter(p => p.nickname !== user?.nickname).length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Brak innych graczy w miasteczku...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {players.filter(p => p.nickname !== user?.nickname).map((p: any) => (
              <div key={p.nickname} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{p.nickname}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Dom: {p.houseName}</span>
                </div>
                <button 
                  className="btn-ghost btn-sm" 
                  style={{ 
                    borderColor: '#c0392b', 
                    color: '#ff7675', 
                    padding: '5px 12px', 
                    fontSize: '0.8rem', 
                    background: 'rgba(192, 57, 43, 0.15)',
                    cursor: 'pointer'
                  }} 
                  onClick={() => robPlayer(p.nickname)}
                >
                  Napadnij 🧨
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HousePage;
