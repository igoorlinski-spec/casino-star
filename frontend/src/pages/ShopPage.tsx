import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';
import { sfxEat, sfxDrink, sfxSleep, sfxBuy, sfxError } from '../utils/sfx';

interface House {
  id: number;
  name: string;
  price: number;
  sleepBonus: number;
  hasFridge: boolean;
  hasTap: boolean;
  freeFood: boolean;
}

interface BagItem {
  id: number;
  itemName: string;
  quantity: number;
  addedAt: string; // ISO string
}

const GROCERIES = [
  { name: 'Woda',           price: 5,  effect: '+50 Nawodnienia',   emoji: '💧', type: 'drink' },
  { name: 'Herbata',        price: 10, effect: '+70 Nawodnienia',   emoji: '🍵', type: 'drink' },
  { name: 'Kubuś Water',    price: 50, effect: '+100 Nawodnienia',  emoji: '🍼', type: 'drink' },
  { name: 'Chleb',          price: 3,  effect: '+10 Głodu',          emoji: '🍞', type: 'food'  },
  { name: 'Kebab',          price: 25, effect: '+50 Głodu',          emoji: '🌯', type: 'food'  },
  { name: 'Ptasie Mleczko', price: 35, effect: '+100 Głodu',         emoji: '🍬', type: 'food'  },
];

const BAG_SPOIL_MS = 5 * 60 * 1000; // 5 minut

function secondsLeft(addedAt: string): number {
  const added = new Date(addedAt).getTime();
  const remaining = BAG_SPOIL_MS - (Date.now() - added);
  return Math.max(0, Math.floor(remaining / 1000));
}

function formatTimer(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const ShopPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'houses' | 'grocery' | 'tools'>('houses');
  const [houses, setHouses] = useState<House[]>([]);
  const [currentHouseId, setCurrentHouseId] = useState(1);
  const [currentHouse, setCurrentHouse] = useState<House | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [bagItems, setBagItems] = useState<BagItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [, forceUpdate] = useState(0);

  const { user, setUser, updateNeeds } = useAuthStore();
  const context = useOutletContext<{ refreshBag?: () => void }>();

  // Tick co sekundę dla timerów
  useEffect(() => {
    const t = setInterval(() => forceUpdate(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [housesRes, meRes, bagRes] = await Promise.all([
        api.get('/shop/houses'),
        api.get('/auth/me'),
        api.get('/shop/bag'),
      ]);
      setHouses(housesRes.data.houses);
      const houseId = meRes.data.user.playerHouse?.houseId || 1;
      setCurrentHouseId(houseId);
      setInventory(meRes.data.user.inventory || []);
      setBagItems(bagRes.data.bagInventory || []);
      const found = housesRes.data.houses.find((h: House) => h.id === houseId);
      setCurrentHouse(found || null);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const buyHouse = async (houseId: number, price: number) => {
    if (!user || user.dollars < price) { sfxError(); return; }
    try {
      sfxBuy();
      const res = await api.post('/shop/buy-house', { houseId });
      setUser({ ...user, dollars: res.data.dollars, tokens: res.data.tokens });
      fetchData();
    } catch (err) { sfxError(); console.error(err); }
  };

  const buyItem = async (itemName: string, basePrice: number, toBag: boolean) => {
    const qty = quantities[itemName] || 1;
    const discount = qty >= 5 ? 0.6 : 1;
    const total = Math.round(basePrice * discount) * qty;
    if (!user || user.dollars < total) { sfxError(); return; }
    try {
      sfxBuy();
      const res = await api.post('/shop/buy-item', { itemName, quantity: qty, toBag });
      setUser({ ...user, dollars: res.data.dollars, tokens: res.data.tokens });
      if (toBag) {
        setBagItems(res.data.bagInventory || []);
        if (context?.refreshBag) context.refreshBag();
      } else {
        setInventory(res.data.inventory || []);
      }
    } catch (err: any) { sfxError(); console.error(err); }
  };

  const buyBag = async () => {
    if (!user || user.dollars < 30) { sfxError(); return; }
    try {
      sfxBuy();
      const res = await api.post('/shop/buy-bag');
      setUser({ ...user, dollars: res.data.dollars, tokens: res.data.tokens, hasBag: res.data.hasBag });
    } catch (err) { sfxError(); console.error(err); }
  };

  const goSleep = async () => {
    try {
      sfxSleep();
      const res = await api.post('/house/sleep');
      updateNeeds(res.data.needs);
      alert(res.data.message);
      fetchData();
    } catch (err: any) { sfxError(); alert(err.response?.data?.error || 'Nie udało się położyć spać.'); console.error(err); }
  };

  const drinkTap = async () => {
    try {
      sfxDrink();
      const res = await api.post('/shop/drink-tap');
      updateNeeds(res.data.needs);
    } catch (err) { sfxError(); console.error(err); }
  };

  const eatFreeFood = async () => {
    try {
      sfxEat();
      const res = await api.post('/shop/free-food');
      updateNeeds(res.data.needs);
    } catch (err) { sfxError(); console.error(err); }
  };

  const consumeFridge = async (itemName: string) => {
    try {
      const isFood = ['Kebab', 'Chleb', 'Ptasie Mleczko'].includes(itemName);
      if (isFood) sfxEat(); else sfxDrink();
      const res = await api.post('/shop/consume', { itemName, fromBag: false });
      updateNeeds(res.data.needs);
      setInventory(res.data.inventory || []);
    } catch (err) { sfxError(); console.error(err); }
  };

  const setQty = (name: string, val: number) =>
    setQuantities(p => ({ ...p, [name]: Math.max(1, Math.min(10, val)) }));

  return (
    <div>
      {/* Taby */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {(['houses', 'grocery', 'tools'] as const).map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'btn-gold' : 'btn-ghost'}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'houses' ? '🏠 Dom' : tab === 'grocery' ? '🛒 Spożywcze' : '🎒 Narzędzia'}
          </button>
        ))}
      </div>

      {/* ────────── ZAKŁADKA DOM ────────── */}
      {activeTab === 'houses' && (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Lista domów */}
          <div style={{ flex: 2, minWidth: '280px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {houses.map(house => (
              <div key={house.id} className="glass-card" style={{
                padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px',
                border: currentHouseId === house.id ? '2px solid var(--gold)' : undefined,
                boxShadow: currentHouseId === house.id ? 'var(--shadow-gold)' : undefined,
              }}>
                <h3 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{house.name}</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span>😴 Bonus snu: +{house.sleepBonus.toFixed(0)}%</span>
                  <span>{house.hasFridge ? '✅' : '❌'} Lodówka</span>
                  <span>{house.hasTap ? '✅' : '❌'} Kran (darmowa woda)</span>
                  <span>{house.freeFood ? '✅' : '❌'} Darmowe jedzenie</span>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gold)', fontWeight: '700' }}>
                    {house.price === 0 ? 'Gratis' : `$ ${house.price.toLocaleString()}`}
                  </span>
                  {currentHouseId === house.id ? (
                    <span style={{ color: '#2ecc71', fontSize: '0.8rem', fontWeight: '600' }}>✓ Posiadasz</span>
                  ) : (
                    <button className="btn-gold btn-sm" onClick={() => buyHouse(house.id, house.price)} disabled={!user || user.dollars < house.price}>
                      Kup
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Panel akcji domowych */}
          <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ color: 'var(--gold)', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>
                🏠 Akcje w Domu
              </h3>
              {!currentHouse && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ładowanie…</p>}

              {/* Spanie */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  😴 Idź spać — regeneruje sen o +{currentHouse?.sleepBonus.toFixed(0) ?? '?'}%
                </p>
                <button className="btn-ghost btn-sm" onClick={goSleep} style={{ width: '100%' }}>
                  Śpij
                </button>
              </div>

              {/* Kran */}
              {currentHouse?.hasTap ? (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    🚰 Woda z kranu — nawodnienie do 100%
                  </p>
                  <button className="btn-ghost btn-sm" onClick={drinkTap} style={{ width: '100%' }}>
                    Napij się z kranu
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: '16px', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>🚰 Kran niedostępny — potrzebne Mieszkanie lub Willa</p>
                </div>
              )}

              {/* Darmowe jedzenie */}
              {currentHouse?.freeFood ? (
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    🍽️ Darmowy posiłek z Willi (+60 Głodu)
                  </p>
                  <button className="btn-gold btn-sm" onClick={eatFreeFood} style={{ width: '100%' }}>
                    Zjedz za darmo
                  </button>
                </div>
              ) : (
                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>🍽️ Darmowe jedzenie dostępne tylko w Willi</p>
                </div>
              )}
            </div>

            {/* Lodówka */}
            {currentHouse?.hasFridge && inventory.length > 0 && (
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ color: 'var(--gold)', marginBottom: '12px' }}>🧊 Lodówka</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {inventory.map((item: any) => (
                    <div key={item.itemName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.9rem' }}>{item.itemName} <span style={{ color: 'var(--text-secondary)' }}>x{item.quantity}</span></span>
                      <button className="btn-gold btn-sm" onClick={() => consumeFridge(item.itemName)}>Zjedz</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────── ZAKŁADKA SPOŻYWCZE ────────── */}
      {activeTab === 'grocery' && (
        <div>
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(212,175,55,0.1)', borderRadius: '8px', border: '1px solid var(--border-gold)' }}>
            <span style={{ color: 'var(--gold)', fontWeight: '600', fontSize: '0.9rem' }}>
              🎯 Promocja: Kup 5+ sztuk tego samego produktu i zyskaj <strong>40% rabatu!</strong>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {GROCERIES.map(item => {
              const qty = quantities[item.name] || 1;
              const discount = qty >= 5;
              const pricePerUnit = discount ? Math.round(item.price * 0.6) : item.price;
              const total = pricePerUnit * qty;
              return (
                <div key={item.name} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                  {discount && (
                    <div style={{
                      position: 'absolute', top: '10px', right: '-18px',
                      background: '#e74c3c', color: '#fff', fontSize: '0.7rem',
                      fontWeight: '700', padding: '3px 24px', transform: 'rotate(45deg)',
                      letterSpacing: '0.05em',
                    }}>-40%</div>
                  )}
                  <span style={{ fontSize: '2.5rem' }}>{item.emoji}</span>
                  <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{item.name}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.effect}</span>

                  {/* Selektor ilości */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="btn-ghost btn-sm" onClick={() => setQty(item.name, qty - 1)} style={{ padding: '4px 10px', minWidth: 'unset' }}>−</button>
                    <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                    <button className="btn-ghost btn-sm" onClick={() => setQty(item.name, qty + 1)} style={{ padding: '4px 10px', minWidth: 'unset' }}>+</button>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    {discount ? (
                      <>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>$ {item.price * qty}</span>
                        <span style={{ color: '#e74c3c', fontWeight: '700', marginLeft: '6px' }}>$ {total}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--gold)', fontWeight: '700' }}>$ {total}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button
                       className="btn-ghost btn-sm"
                       style={{ flex: 1, fontSize: '0.75rem' }}
                       onClick={() => buyItem(item.name, item.price, false)}
                       disabled={!currentHouse?.hasFridge || !user || user.dollars < total}
                    >
                      🧊 Lodówka
                    </button>
                    {user?.hasBag && (
                      <button
                        className="btn-gold btn-sm"
                        style={{ flex: 1, fontSize: '0.75rem' }}
                        onClick={() => buyItem(item.name, item.price, true)}
                        disabled={!user || user.dollars < total}
                      >
                        🎒 Plecak
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Plecak z timerami */}
          {user?.hasBag && bagItems.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ color: 'var(--gold)', marginBottom: '16px' }}>🎒 Plecak (psuje się po 5 min)</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {bagItems.map(b => {
                  const secs = secondsLeft(b.addedAt);
                  const urgent = secs < 60;
                  return (
                    <div key={b.id} className="glass-card" style={{
                      padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'center',
                      border: urgent ? '1px solid var(--red)' : '1px solid var(--border-gold)',
                    }}>
                      <span style={{ fontWeight: '600' }}>{b.itemName}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>x{b.quantity}</span>
                      <span style={{
                        fontSize: '0.8rem', fontWeight: '700', fontFamily: 'monospace',
                        color: urgent ? '#e74c3c' : '#2ecc71',
                        animation: urgent ? 'glow-pulse 1s infinite' : 'none',
                      }}>
                        ⏱ {formatTimer(secs)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────── ZAKŁADKA NARZĘDZIA ────────── */}
      {activeTab === 'tools' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '3rem' }}>🎒</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--gold)', marginBottom: '8px' }}>Plecak Mafioza</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Pozwala zabrać ze sobą do 5 artykułów spożywczych.
                Jedzenie psuje się po <strong style={{ color: 'var(--gold)' }}>5 minutach</strong> i znika z plecaka.
                Spożywaj je z panelu bocznego w dowolnym momencie.
              </p>
              <p style={{ color: 'var(--gold)', fontWeight: '700', marginTop: '8px' }}>$ 30.00</p>
            </div>
            {user?.hasBag ? (
              <span style={{ color: '#2ecc71', fontWeight: '600' }}>✓ Posiadasz plecak</span>
            ) : (
              <button className="btn-gold" onClick={buyBag} disabled={!user || user.dollars < 30}>
                Kup Plecak
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPage;
