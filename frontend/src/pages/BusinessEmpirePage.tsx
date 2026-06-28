import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';
import { sfxClick, sfxBuy, sfxWin } from '../utils/sfx';

interface BusinessItem {
  id: number;
  businessId: string;
  level: number;
  hasManager: boolean;
  uncollected: number;
  nextUpgradeCost: number;
  incomePerMin: number;
}

interface RealEstateItem {
  id: number;
  estateId: string;
}

interface CarItem {
  id: number;
  carId: string;
}

interface CatalogBusiness {
  id: string;
  name: string;
  basePrice: number;
  baseIncomePerMin: number;
  upgradeMultiplier: number;
  incomeMultiplier: number;
  managerPrice: number;
}

interface CatalogRealEstate {
  id: string;
  name: string;
  price: number;
  incomePerMin: number;
}

interface CatalogCar {
  id: string;
  name: string;
  price: number;
  happinessBonus: number;
}

interface BusinessState {
  dollars: number;
  tokens: number;
  businesses: BusinessItem[];
  realEstates: RealEstateItem[];
  cars: CarItem[];
  catalogs: {
    businesses: Record<string, CatalogBusiness>;
    realEstate: Record<string, CatalogRealEstate>;
    cars: Record<string, CatalogCar>;
  };
}

const BusinessEmpirePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [data, setData] = useState<BusinessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'exchange' | 'businesses' | 'properties' | 'cars'>('businesses');
  
  // Stan wymiany żetonów
  const [exchangeAmount, setExchangeAmount] = useState<number>(100);
  const [exchangeMsg, setExchangeMsg] = useState<string | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/business');
      setData(res.data);
      // Synchronizuj portfele z globalnym store
      if (user) {
        setUser({
          ...user,
          tokens: res.data.tokens,
          dollars: res.data.dollars,
        });
      }
    } catch (err) {
      console.error('Failed to fetch business status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Odświeżaj co 20 sekund, aby gracz widział naliczające się automatycznie zyski!
    const interval = setInterval(fetchStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleExchange = async () => {
    sfxClick();
    setExchangeMsg(null);
    setExchangeError(null);
    try {
      const res = await api.post('/business/exchange', { tokenAmount: exchangeAmount });
      sfxWin();
      setExchangeMsg(res.data.message);
      fetchStatus();
    } catch (err: any) {
      setExchangeError(err.response?.data?.error || 'Błąd wymiany');
    }
  };

  const handleBuy = async (itemType: 'business' | 'real_estate' | 'car', itemId: string) => {
    sfxClick();
    try {
      const res = await api.post('/business/buy', { itemType, itemId });
      sfxBuy();
      alert(res.data.message);
      fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Błąd zakupu');
    }
  };

  const handleUpgrade = async (businessId: string) => {
    sfxClick();
    try {
      const res = await api.post('/business/upgrade', { businessId });
      sfxBuy();
      alert(res.data.message);
      fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Błąd ulepszenia');
    }
  };

  const handleCollect = async (businessId: string) => {
    sfxClick();
    try {
      const res = await api.post('/business/collect', { businessId });
      sfxWin();
      alert(res.data.message);
      fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Błąd zbierania zysków');
    }
  };

  const handleHireManager = async (businessId: string) => {
    sfxClick();
    try {
      const res = await api.post('/business/hire', { businessId });
      sfxBuy();
      alert(res.data.message);
      fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Błąd zatrudnienia menedżera');
    }
  };

  if (loading || !data) {
    return <div style={{ textAlign: 'center', padding: 50, color: 'var(--gold)' }}>Ładowanie Twojego Imperium... 🏢</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Nagłówek Imperium */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, #1e522e 0%, #000 70%, #1e522e 100%)',
        border: '3px solid #2ecc71',
        borderRadius: 20, padding: 32, textAlign: 'center',
        boxShadow: '0 0 40px rgba(46,204,113,0.3)',
      }}>
        <h2 style={{
          fontFamily: "'Cinzel Decorative', serif",
          color: '#fff', fontSize: '2.5rem', fontWeight: 900,
          textShadow: '0 0 10px #2ecc71, 0 0 30px #27ae60',
          marginBottom: 10
        }}>🏢 IMPERIUM BIZNESOWE 🏢</h2>
        <p style={{ color: '#ccc', fontStyle: 'italic', fontSize: '1rem' }}>
          Buduj pasywny dochód, kupuj luksusowe nieruchomości i buduj flotę supercarów. Zarabiaj miliony dolarów.
        </p>
        <div style={{
          display: 'inline-flex',
          gap: 20,
          marginTop: 15,
          background: 'rgba(0,0,0,0.5)',
          padding: '8px 24px',
          borderRadius: 12,
          border: '1px solid rgba(46, 204, 113, 0.3)'
        }}>
          <span style={{ color: '#aaa' }}>Twój stan konta:</span>
          <strong style={{ color: '#2ecc71', fontSize: '1.2rem' }}>$ {data.dollars.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</strong>
        </div>
      </div>

      {/* Podzakładki */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {[
          { id: 'businesses', label: '💼 Biznesy', color: '#2ecc71' },
          { id: 'properties', label: '🏙️ Nieruchomości', color: '#3498db' },
          { id: 'cars', label: '🏎️ Garaż luksusowy', color: '#e74c3c' },
          { id: 'exchange', label: '🪙 Kantor walutowy', color: 'var(--gold)' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className="btn-ghost"
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: '0.95rem',
              fontWeight: 'bold',
              border: '1px solid ' + (activeSubTab === tab.id ? tab.color : 'rgba(255,255,255,0.1)'),
              background: activeSubTab === tab.id ? `${tab.color}15` : 'transparent',
              color: activeSubTab === tab.id ? tab.color : '#bbb',
              boxShadow: activeSubTab === tab.id ? `0 0 15px ${tab.color}20` : 'none',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 1. KANTOR / WYMIANA */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'exchange' && (
        <div className="glass-card" style={{ maxWidth: 500, margin: '0 auto', padding: 30, textAlign: 'center' }}>
          <h3 style={{ color: 'var(--gold)', marginBottom: 15 }}>🪙 KANTOR WALUTOWY</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
            Wymień żetony wygrane w kasynie na legalną gotówkę USD ($). <br/>
            <strong>Kurs wymiany: 10 żetonów = $1.00 USD.</strong>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#aaa', fontWeight: 'bold' }}>Żetony:</span>
              <input
                type="number"
                min="10"
                step="10"
                value={exchangeAmount}
                onChange={e => setExchangeAmount(Math.max(10, parseInt(e.target.value) || 0))}
                style={{
                  background: 'rgba(212,175,55,0.1)', border: '1px solid var(--gold)',
                  color: 'var(--gold)', padding: '8px 12px', borderRadius: 8,
                  width: 120, fontWeight: 900, fontSize: '1.1rem', textAlign: 'center'
                }}
              />
            </div>
            
            <div style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '1rem' }}>
              Otrzymasz: $ {(exchangeAmount / 10).toFixed(2)} USD
            </div>

            {exchangeMsg && <div style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '0.9rem' }}>{exchangeMsg}</div>}
            {exchangeError && <div style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '0.9rem' }}>{exchangeError}</div>}

            <button
              onClick={handleExchange}
              disabled={data.tokens < exchangeAmount}
              className="btn-gold"
              style={{ padding: '12px 30px', borderRadius: 20, marginTop: 10, width: '100%', maxWidth: 250 }}
            >
              Wymień żetony
            </button>
            <span style={{ fontSize: '0.75rem', color: '#666' }}>Posiadasz obecnie: 🪙 {data.tokens.toLocaleString()} żetonów</span>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 2. BIZNESY */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'businesses' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {Object.values(data.catalogs.businesses).map(cat => {
            // Sprawdź czy użytkownik posiada ten biznes
            const owned = data.businesses.find(b => b.businessId === cat.id);

            return (
              <div
                key={cat.id}
                className="glass-card"
                style={{
                  padding: 24,
                  border: `2px solid ${owned ? '#2ecc71' : 'rgba(255,255,255,0.05)'}`,
                  background: owned ? 'linear-gradient(145deg, #102617 0%, #000 100%)' : 'rgba(10,10,15,0.95)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>{cat.name}</h3>
                  {owned && (
                    <span style={{
                      background: '#2ecc71', color: '#000', fontSize: '0.75rem',
                      padding: '2px 8px', borderRadius: 10, fontWeight: 'bold'
                    }}>
                      Poziom {owned.level}
                    </span>
                  )}
                </div>

                {!owned ? (
                  <>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Kup ten biznes i zacznij generować pasywne zyski.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: 10 }}>
                      <span style={{ color: '#aaa' }}>Cena zakupu:</span>
                      <strong style={{ color: '#2ecc71' }}>$ {cat.basePrice.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#aaa' }}>Zysk bazowy:</span>
                      <strong style={{ color: '#fff' }}>$ {cat.baseIncomePerMin}/min</strong>
                    </div>
                    <button
                      onClick={() => handleBuy('business', cat.id)}
                      disabled={data.dollars < cat.basePrice}
                      className="btn-gold"
                      style={{ marginTop: 15, padding: '10px', width: '100%' }}
                    >
                      Kup Biznes
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0', background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#aaa' }}>Generuje zysk:</span>
                        <strong style={{ color: '#2ecc71' }}>$ {owned.incomePerMin.toLocaleString()}/min</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#aaa' }}>Status Menedżera:</span>
                        <strong style={{ color: owned.hasManager ? '#2ecc71' : '#e74c3c' }}>
                          {owned.hasManager ? 'Zatrudniony (Auto) 🤖' : 'Brak (Ręcznie) 🛑'}
                        </strong>
                      </div>
                    </div>

                    {/* Ręczne zbieranie jeśli brak menedżera */}
                    {!owned.hasManager ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, border: '1px dashed rgba(255,255,255,0.1)', padding: 10, borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#aaa' }}>Zgromadzony zysk:</span>
                          <strong style={{ color: '#f1c40f' }}>$ {owned.uncollected.toLocaleString()} USD</strong>
                        </div>
                        <button
                          onClick={() => handleCollect(cat.id)}
                          disabled={owned.uncollected <= 0}
                          className="btn-gold btn-sm"
                          style={{ background: 'linear-gradient(135deg, #f1c40f, #f39c12)', color: '#000', fontWeight: 'bold' }}
                        >
                          Odbierz zyski 💰
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: '#2ecc71', fontStyle: 'italic', textAlign: 'center' }}>
                        Menedżer automatycznie przelewa zyski na Twoje konto!
                      </div>
                    )}

                    {/* Ulepszenia i Menedżer */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button
                        onClick={() => handleUpgrade(cat.id)}
                        disabled={data.dollars < owned.nextUpgradeCost}
                        className="btn-ghost btn-sm"
                        style={{ flex: 1, border: '1px solid #2ecc71', color: '#2ecc71', padding: '6px' }}
                      >
                        Ulepsz (${owned.nextUpgradeCost.toLocaleString()})
                      </button>

                      {!owned.hasManager && (
                        <button
                          onClick={() => handleHireManager(cat.id)}
                          disabled={data.dollars < cat.managerPrice}
                          className="btn-ghost btn-sm"
                          style={{ flex: 1, border: '1px solid #f1c40f', color: '#f1c40f', padding: '6px' }}
                        >
                          Menedżer (${cat.managerPrice.toLocaleString()})
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 3. NIERUCHOMOŚCI */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'properties' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {Object.values(data.catalogs.realEstate).map(estate => {
            const owned = data.realEstates.find(e => e.estateId === estate.id);

            return (
              <div
                key={estate.id}
                className="glass-card"
                style={{
                  padding: 24,
                  border: `2px solid ${owned ? '#3498db' : 'rgba(255,255,255,0.05)'}`,
                  background: owned ? 'linear-gradient(145deg, #0f2130 0%, #000 100%)' : 'rgba(10,10,15,0.95)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>{estate.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  W pełni pasywne źródło rentu. Automatycznie zasila Twoje konto co minutę bez żadnego klikania!
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0', background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#aaa' }}>Generuje czynsz:</span>
                    <strong style={{ color: '#3498db' }}>$ {estate.incomePerMin.toLocaleString()}/min</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#aaa' }}>Status:</span>
                    <strong style={{ color: owned ? '#3498db' : '#999' }}>
                      {owned ? 'Posiadasz (Rent naliczany) 💸' : 'Do kupienia'}
                    </strong>
                  </div>
                </div>

                {!owned ? (
                  <button
                    onClick={() => handleBuy('real_estate', estate.id)}
                    disabled={data.dollars < estate.price}
                    className="btn-gold"
                    style={{ marginTop: 10, padding: '10px', width: '100%', background: 'linear-gradient(135deg, #3498db, #2980b9)', borderColor: '#3498db' }}
                  >
                    Kup za $ {estate.price.toLocaleString()}
                  </button>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#3498db', textAlign: 'center', fontStyle: 'italic' }}>
                    Nieruchomość przynosi stały zysk na Twoje konto.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 4. SAMOCHODY / GARAŻ */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'cars' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {Object.values(data.catalogs.cars).map(car => {
            const owned = data.cars.find(c => c.carId === car.id);

            return (
              <div
                key={car.id}
                className="glass-card"
                style={{
                  padding: 24,
                  border: `2px solid ${owned ? '#e74c3c' : 'rgba(255,255,255,0.05)'}`,
                  background: owned ? 'linear-gradient(145deg, #2b0b0b 0%, #000 100%)' : 'rgba(10,10,15,0.95)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>{car.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Luksusowe auta są symbolem statusu. Zakup podnosi natychmiastowo zadowolenie (Happiness).
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0', background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#aaa' }}>Bonus zadowolenia:</span>
                    <strong style={{ color: '#e74c3c' }}>+{car.happinessBonus} Zadowolenia</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#aaa' }}>Status:</span>
                    <strong style={{ color: owned ? '#e74c3c' : '#999' }}>
                      {owned ? 'W garażu 🏎️' : 'Do kupienia'}
                    </strong>
                  </div>
                </div>

                {!owned ? (
                  <button
                    onClick={() => handleBuy('car', car.id)}
                    disabled={data.dollars < car.price}
                    className="btn-gold"
                    style={{ marginTop: 10, padding: '10px', width: '100%', background: 'linear-gradient(135deg, #e74c3c, #c0392b)', borderColor: '#e74c3c' }}
                  >
                    Kup za $ {car.price.toLocaleString()}
                  </button>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#e74c3c', textAlign: 'center', fontStyle: 'italic' }}>
                    Ten prestiżowy wóz parkuje dumnie w Twoim garażu.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BusinessEmpirePage;
