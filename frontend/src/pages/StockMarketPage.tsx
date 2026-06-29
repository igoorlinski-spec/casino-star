import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';

interface StockHolding {
  shares: number;
  avgBuyPrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPct: number;
}

interface Stock {
  id: string;
  name: string;
  emoji: string;
  price: number;
  initialPrice: number;
  changeVsInitial: number;
  lastUpdatedAt: string;
  holding: StockHolding | null;
}

const fmt = (n: number) =>
  n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (n: number) => (n >= 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`);
const pctColor = (n: number) => (n >= 0 ? '#2ecc71' : '#e74c3c');

// Mini sparkline – prosta wizualizacja trendu (ostatnia wartość vs poprzednia)
const TrendArrow: React.FC<{ value: number }> = ({ value }) =>
  value >= 0
    ? <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '1.1rem' }}>▲</span>
    : <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '1.1rem' }}>▼</span>;

// Pasek postępu ceny (od 10% do 40× initial)
const PriceBar: React.FC<{ price: number; initial: number }> = ({ price, initial }) => {
  const minP = initial * 0.10;
  const maxP = initial * 40;
  const pctPos = Math.max(0, Math.min(100, ((price - minP) / (maxP - minP)) * 100));
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
      <div style={{
        width: `${pctPos}%`, height: '100%', borderRadius: 4,
        background: pctPos > 50
          ? 'linear-gradient(90deg, #f1c40f, #2ecc71)'
          : 'linear-gradient(90deg, #e74c3c, #f1c40f)',
        transition: 'width 0.8s ease',
      }} />
    </div>
  );
};

const StockMarketPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [tokens, setTokens] = useState(user?.tokens ?? 0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Stock | null>(null);
  const [buyAmount, setBuyAmount] = useState(100);
  const [sellShares, setSellShares] = useState(0);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [tab, setTab] = useState<'market' | 'portfolio'>('market');
  // ticker odświeżający dane co 15 s
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/stocks');
      setStocks(res.data.stocks);
      setTokens(res.data.tokens);
      if (user) setUser({ ...user, tokens: res.data.tokens });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [tick, fetchData]);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const handleBuy = async () => {
    if (!selected) return;
    try {
      const res = await api.post('/stocks/buy', { stockId: selected.id, tokenAmount: buyAmount });
      setMsg({ text: res.data.message, ok: true });
      setTokens(res.data.tokens);
      if (user) setUser({ ...user, tokens: res.data.tokens });
      await fetchData();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.error || 'Błąd zakupu', ok: false });
    }
  };

  const handleSell = async () => {
    if (!selected) return;
    try {
      const res = await api.post('/stocks/sell', { stockId: selected.id, sharesToSell: sellShares });
      setMsg({ text: res.data.message, ok: true });
      setTokens(res.data.tokens);
      if (user) setUser({ ...user, tokens: res.data.tokens });
      await fetchData();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.error || 'Błąd sprzedaży', ok: false });
    }
  };

  const portfolio = stocks.filter(s => s.holding && s.holding.shares > 0.0001);
  const totalPortfolioValue = portfolio.reduce((sum, s) => sum + (s.holding?.currentValue ?? 0), 0);
  const totalCost = portfolio.reduce((sum, s) => sum + (s.holding ? s.holding.avgBuyPrice * s.holding.shares : 0), 0);
  const totalPL = totalPortfolioValue - totalCost;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--gold)', fontSize: '1.3rem' }}>Ładowanie giełdy… 📈</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Nagłówek ─────────────────────────────────────────────────────────── */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #000 60%, #0a1628 100%)',
        border: '3px solid #3498db', borderRadius: 20, padding: 32, textAlign: 'center',
        boxShadow: '0 0 40px rgba(52,152,219,0.3)',
      }}>
        <h2 style={{
          fontFamily: "'Cinzel Decorative', serif", color: '#fff',
          fontSize: '2.4rem', fontWeight: 900,
          textShadow: '0 0 10px #3498db, 0 0 30px #2980b9',
          marginBottom: 8,
        }}>
          📈 GIEŁDA CASINO STAR 📉
        </h2>
        <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: '0.95rem', marginBottom: 16 }}>
          10 największych spółek świata. Ceny zmieniają się co minutę, nawet gdy jesteś offline.
          <br />
          <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>⚠️ Rynek jest obciążony na niekorzyść gracza — większość portfeli topnieje!</span>
        </p>
        <div style={{ display: 'inline-flex', gap: 24, background: 'rgba(0,0,0,0.5)', padding: '10px 30px', borderRadius: 12, border: '1px solid rgba(52,152,219,0.3)' }}>
          <span style={{ color: '#aaa' }}>Twoje żetony:</span>
          <strong style={{ color: 'var(--gold)', fontSize: '1.2rem' }}>🪙 {tokens.toLocaleString()}</strong>
          <span style={{ color: '#aaa' }}>Wartość portfela:</span>
          <strong style={{ color: totalPL >= 0 ? '#2ecc71' : '#e74c3c', fontSize: '1.2rem' }}>
            💼 {fmt(totalPortfolioValue)} ({totalPL >= 0 ? '+' : ''}{fmt(totalPL)} 🪙)
          </strong>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {[
          { id: 'market', label: '📊 Rynek', color: '#3498db' },
          { id: 'portfolio', label: '💼 Mój Portfel', color: '#2ecc71' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className="btn-ghost"
            style={{
              padding: '10px 28px', borderRadius: 10, fontWeight: 'bold',
              border: `1px solid ${tab === t.id ? t.color : 'rgba(255,255,255,0.1)'}`,
              background: tab === t.id ? `${t.color}15` : 'transparent',
              color: tab === t.id ? t.color : '#bbb',
              boxShadow: tab === t.id ? `0 0 15px ${t.color}20` : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Rynek ────────────────────────────────────────────────────────────── */}
      {tab === 'market' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {stocks.map(stock => {
            const isSelected = selected?.id === stock.id;
            const sharesBought = buyAmount / stock.price;
            return (
              <div
                key={stock.id}
                className="glass-card"
                style={{
                  padding: 20, cursor: 'pointer',
                  border: `2px solid ${isSelected ? '#3498db' : stock.changeVsInitial >= 0 ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'}`,
                  background: isSelected
                    ? 'linear-gradient(145deg, #0a1e33, #000)'
                    : 'rgba(10,10,15,0.95)',
                  boxShadow: isSelected ? '0 0 20px rgba(52,152,219,0.3)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
                onClick={() => { setSelected(isSelected ? null : stock); setMsg(null); setSellShares(stock.holding?.shares ?? 0); }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.8rem' }}>{stock.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>{stock.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#555' }}>{stock.id.toUpperCase()}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--gold)' }}>🪙 {fmt(stock.price)}</div>
                    <div style={{ fontSize: '0.8rem', color: pctColor(stock.changeVsInitial), display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      <TrendArrow value={stock.changeVsInitial} />
                      {pct(stock.changeVsInitial)} vs start
                    </div>
                  </div>
                </div>

                {/* Pasek zakres */}
                <PriceBar price={stock.price} initial={stock.initialPrice} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#555' }}>
                  <span>min: {fmt(stock.initialPrice * 0.1)}</span>
                  <span>start: {fmt(stock.initialPrice)}</span>
                  <span>max: {fmt(stock.initialPrice * 40)}</span>
                </div>

                {/* Portfel użytkownika dla tej akcji */}
                {stock.holding && (
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#aaa' }}>Twoje akcje:</span>
                      <strong style={{ color: '#fff' }}>{stock.holding.shares.toFixed(4)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#aaa' }}>Wartość:</span>
                      <strong style={{ color: 'var(--gold)' }}>🪙 {fmt(stock.holding.currentValue)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#aaa' }}>Zysk/Strata:</span>
                      <strong style={{ color: pctColor(stock.holding.profitLoss) }}>
                        {stock.holding.profitLoss >= 0 ? '+' : ''}{fmt(stock.holding.profitLoss)} ({pct(stock.holding.profitLossPct)})
                      </strong>
                    </div>
                  </div>
                )}

                {/* Panel transakcji */}
                {isSelected && (
                  <div style={{ borderTop: '1px solid rgba(52,152,219,0.3)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {msg && (
                      <div style={{ color: msg.ok ? '#2ecc71' : '#e74c3c', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }}>
                        {msg.text}
                      </div>
                    )}

                    {/* KUP */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold' }}>Kup za żetony:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                        {[100, 500, 1000, 5000].map(amt => (
                          <button
                            key={amt}
                            onClick={e => { e.stopPropagation(); setBuyAmount(amt); }}
                            style={{
                              padding: '4px 2px', fontSize: '0.7rem', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold',
                              border: `1px solid ${buyAmount === amt ? '#3498db' : '#333'}`,
                              background: buyAmount === amt ? 'rgba(52,152,219,0.2)' : 'rgba(0,0,0,0.4)',
                              color: buyAmount === amt ? '#3498db' : '#777',
                            }}
                          >{amt}</button>
                        ))}
                      </div>
                      <input
                        type="number" min={1} value={buyAmount}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setBuyAmount(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ background: 'rgba(52,152,219,0.1)', border: '1px solid #3498db', color: '#3498db', padding: '6px 10px', borderRadius: 6, fontWeight: 'bold', width: '100%' }}
                      />
                      <div style={{ fontSize: '0.72rem', color: '#666' }}>
                        Dostaniesz ≈ {sharesBought.toFixed(6)} akcji
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleBuy(); }}
                        disabled={buyAmount > tokens}
                        className="btn-gold btn-sm"
                        style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)', borderColor: '#3498db' }}
                      >
                        Kup za {buyAmount} 🪙
                      </button>
                    </div>

                    {/* SPRZEDAJ */}
                    {stock.holding && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                        <div style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold' }}>Sprzedaj akcje:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                          {[
                            { label: '25%', val: stock.holding.shares * 0.25 },
                            { label: '50%', val: stock.holding.shares * 0.5 },
                            { label: 'Wszystko', val: stock.holding.shares },
                          ].map(({ label, val }) => (
                            <button
                              key={label}
                              onClick={e => { e.stopPropagation(); setSellShares(parseFloat(val.toFixed(6))); }}
                              style={{
                                padding: '4px 2px', fontSize: '0.68rem', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold',
                                border: '1px solid #e74c3c', background: 'rgba(231,76,60,0.1)', color: '#e74c3c',
                              }}
                            >{label}</button>
                          ))}
                        </div>
                        <input
                          type="number" min={0} step={0.0001} value={sellShares}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setSellShares(parseFloat(e.target.value) || 0)}
                          style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '6px 10px', borderRadius: 6, fontWeight: 'bold', width: '100%' }}
                        />
                        <div style={{ fontSize: '0.72rem', color: '#666' }}>
                          Otrzymasz ≈ {Math.floor(sellShares * stock.price).toLocaleString()} 🪙
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleSell(); }}
                          disabled={sellShares <= 0 || sellShares > stock.holding.shares}
                          className="btn-ghost btn-sm"
                          style={{ border: '1px solid #e74c3c', color: '#e74c3c' }}
                        >
                          Sprzedaj {sellShares.toFixed(4)} akcji
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Portfel ──────────────────────────────────────────────────────────── */}
      {tab === 'portfolio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {portfolio.length === 0 ? (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
              <p style={{ color: '#aaa' }}>Nie posiadasz żadnych akcji. Wejdź na Rynek i kup swoje pierwsze!</p>
            </div>
          ) : (
            <>
              {/* Podsumowanie portfela */}
              <div className="glass-card" style={{
                padding: 20, border: `2px solid ${totalPL >= 0 ? '#2ecc71' : '#e74c3c'}`,
                background: totalPL >= 0 ? 'linear-gradient(135deg, #0a1f0a, #000)' : 'linear-gradient(135deg, #1f0a0a, #000)',
              }}>
                <h3 style={{ color: totalPL >= 0 ? '#2ecc71' : '#e74c3c', marginBottom: 12, textAlign: 'center' }}>
                  {totalPL >= 0 ? '📈 Portfel na plusie!' : '📉 Portfel na minusie'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, textAlign: 'center' }}>
                  <div>
                    <div style={{ color: '#aaa', fontSize: '0.8rem' }}>Wartość aktualna</div>
                    <div style={{ color: 'var(--gold)', fontWeight: 900, fontSize: '1.2rem' }}>🪙 {fmt(totalPortfolioValue)}</div>
                  </div>
                  <div>
                    <div style={{ color: '#aaa', fontSize: '0.8rem' }}>Koszt zakupu</div>
                    <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.2rem' }}>🪙 {fmt(totalCost)}</div>
                  </div>
                  <div>
                    <div style={{ color: '#aaa', fontSize: '0.8rem' }}>Zysk / Strata</div>
                    <div style={{ color: pctColor(totalPL), fontWeight: 900, fontSize: '1.2rem' }}>
                      {totalPL >= 0 ? '+' : ''}{fmt(totalPL)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista pozycji */}
              {portfolio.map(stock => (
                <div key={stock.id} className="glass-card" style={{ padding: 20, border: `1px solid ${pctColor(stock.holding!.profitLoss)}44` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 10, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.5rem' }}>{stock.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{stock.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#555' }}>{stock.holding!.shares.toFixed(4)} akcji</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#aaa' }}>Cena aktualna</div>
                      <div style={{ fontWeight: 'bold', color: 'var(--gold)' }}>🪙 {fmt(stock.price)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#aaa' }}>Śr. cena zakupu</div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>🪙 {fmt(stock.holding!.avgBuyPrice)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#aaa' }}>Wartość</div>
                      <div style={{ fontWeight: 'bold', color: 'var(--gold)' }}>🪙 {fmt(stock.holding!.currentValue)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#aaa' }}>Zysk/Strata</div>
                      <div style={{ fontWeight: 'bold', color: pctColor(stock.holding!.profitLoss) }}>
                        {stock.holding!.profitLoss >= 0 ? '+' : ''}{fmt(stock.holding!.profitLoss)}<br />
                        <span style={{ fontSize: '0.75rem' }}>({pct(stock.holding!.profitLossPct)})</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setTab('market'); setSelected(stock); setSellShares(stock.holding!.shares); }}
                      className="btn-ghost btn-sm"
                      style={{ border: '1px solid #e74c3c', color: '#e74c3c', flex: 1 }}
                    >
                      Sprzedaj wszystko
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StockMarketPage;
