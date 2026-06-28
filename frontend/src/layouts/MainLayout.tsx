import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import NeedsBar from '../components/NeedsBar';
import api from '../api/api';
import { Howl } from 'howler';
import { sfxClick } from '../utils/sfx';

// Inicjalizacja muzyki tła
const bgMusic = new Howl({
  src: ['https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'], // darmowy jazz
  html5: true,
  loop: true,
  volume: 0.15,
});

const MainLayout: React.FC = () => {
  const { user, needs, logout, updateNeeds, setUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [playingMusic, setPlayingMusic] = useState(false);
  const [bagInventory, setBagInventory] = useState<any[]>([]);
  const [showQuests, setShowQuests] = useState(false);

  const fetchBag = async () => {
    if (user?.hasBag) {
      try {
        const res = await api.get('/auth/me');
        setBagInventory(res.data.user.bagInventory || []);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    if (!useAuthStore.getState().isAuthenticated) {
      navigate('/login');
    } else if (user && !user.characterCreated) {
      navigate('/character');
    } else {
      fetchBag();
    }
  }, [user, navigate]);

  const activeTab = location.pathname.split('/').pop() || 'kasyno';

  const handleLogout = () => {
    bgMusic.stop();
    logout();
    navigate('/login');
  };

  const toggleMusic = () => {
    if (playingMusic) {
      bgMusic.pause();
    } else {
      bgMusic.play();
    }
    setPlayingMusic(!playingMusic);
  };

  const handleUseFromBag = async (itemName: string) => {
    try {
      const res = await api.post('/shop/consume', { itemName, fromBag: true });
      updateNeeds(res.data.needs);
      setBagInventory(res.data.bagInventory || []);
      alert(`Skonsumowano ${itemName} z plecaka!`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Błąd użycia przedmiotu.');
    }
  };

  // Helper do pobrania aktualnego statusu użytkownika przy otwieraniu zadań
  const handleOpenQuests = async () => {
    sfxClick();
    setShowQuests(true);
    try {
      const res = await api.get('/auth/me');
      if (res.data.user) {
        setUser(res.data.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="logo">
            <span className="logo-chip">🪙</span> CASINO STAR
          </div>
          
          <button onClick={toggleMusic} className="btn-ghost btn-sm" style={{ marginRight: 'auto', marginLeft: '20px' }}>
            {playingMusic ? '🔇 Wyłącz Muzykę' : '🎵 Włącz Muzykę'}
          </button>

          {user && (
            <>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginRight: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Boss: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{user.nickname}</span>
                  {user.tinderBadge === 'silver' && (
                    <span title="Srebrny dymek Tindera" style={{ 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      background: 'linear-gradient(135deg, #bdc3c7, #7f8c8d)', 
                      color: '#fff', 
                      fontSize: '0.7rem', 
                      fontWeight: 'bold',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      boxShadow: '0 0 5px rgba(255,255,255,0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'help'
                    }}>
                      💬 Srebro
                    </span>
                  )}
                  {user.tinderBadge === 'gold' && (
                    <span title="Złoty dymek Tindera" style={{ 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      background: 'linear-gradient(135deg, #f1c40f, #f39c12)', 
                      color: '#000', 
                      fontSize: '0.7rem', 
                      fontWeight: 'black',
                      textShadow: '0 1px 1px rgba(255,255,255,0.5)',
                      boxShadow: '0 0 8px rgba(241,196,15,0.5)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'help'
                    }}>
                      💬 Złoto
                    </span>
                  )}
                </span>
                <button 
                  onClick={handleOpenQuests}
                  className="btn-gold btn-sm" 
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  📜 Zadania
                </button>
              </div>
              <div className="token-counter" style={{ marginRight: '10px' }}>
                <span className="token-icon">🪙</span>
                <span style={{ fontWeight: 'bold', color: 'var(--gold)' }}>{user.tokens} żetonów</span>
              </div>
              <div className="token-counter" style={{ 
                marginRight: '20px', 
                background: 'linear-gradient(135deg, #1e522e 0%, #27ae60 100%)', 
                border: '1px solid #2ecc71',
                boxShadow: '0 0 10px rgba(46, 204, 113, 0.2)',
                color: '#fff',
                cursor: 'default'
              }}>
                <span className="token-icon">💵</span>
                <span style={{ fontWeight: 'bold' }}>$ {(user.dollars ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
          <button className="btn-ghost btn-sm" onClick={handleLogout}>Wyloguj</button>
        </div>
      </header>

      {/* Modal zadań (Quests overlay - pełny ekran) */}
      {showQuests && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#07070c',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'flex-start', zIndex: 999999,
          padding: '40px 20px',
          overflowY: 'auto',
        }}>
          <div style={{
            width: '100%', maxWidth: '600px',
            background: '#0f0f1b',
            padding: '30px', borderRadius: '24px',
            border: '3px solid var(--border-gold)',
            boxShadow: '0 0 50px rgba(212, 175, 55, 0.35), inset 0 0 30px rgba(0,0,0,0.9)',
            margin: 'auto 0',
            animation: 'bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            <h2 style={{
              color: 'var(--gold)',
              fontFamily: "'Cinzel Decorative', 'Playfair Display', serif",
              textShadow: '0 0 15px var(--gold)',
              textAlign: 'center',
              marginBottom: '20px',
              fontSize: '1.8rem',
              letterSpacing: '0.08em'
            }}>📜 MAFIJNE KONTRAKTY</h2>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginBottom: '28px',
            }}>
              {/* Quest 1 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '16px 20px', borderRadius: '12px',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>🏠 1. Ucieczka z rudery</span>
                  <span style={{
                    color: user?.playerHouse?.houseId && user.playerHouse.houseId > 1 ? '#2ecc71' : 'var(--gold)',
                    fontSize: '0.85rem', fontWeight: 'bold',
                    background: user?.playerHouse?.houseId && user.playerHouse.houseId > 1 ? 'rgba(46, 204, 113, 0.15)' : 'rgba(212, 175, 55, 0.1)',
                    padding: '4px 10px', borderRadius: '12px'
                  }}>
                    {user?.playerHouse?.houseId && user.playerHouse.houseId > 1 ? 'ZAKOŃCZONE' : 'W TRAKCIE'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  Kup swoją pierwszą posiadłość (minimum Kawalerka), aby odblokować lodówkę i uciec z rudery.
                </p>
              </div>

              {/* Quest 2 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '16px 20px', borderRadius: '12px',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>🪙 2. Pierwsza fortuna</span>
                  <span style={{
                    color: user && user.tokens >= 100000 ? '#2ecc71' : 'var(--gold)',
                    fontSize: '0.85rem', fontWeight: 'bold',
                    background: user && user.tokens >= 100000 ? 'rgba(46, 204, 113, 0.15)' : 'rgba(212, 175, 55, 0.1)',
                    padding: '4px 10px', borderRadius: '12px'
                  }}>
                    {user && user.tokens >= 100000 ? 'ZAKOŃCZONE' : `${user?.tokens || 0} / 100 000 🪙`}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  Zgromadź co najmniej 100 000 żetonów poprzez pracę w McDonalds, szkole lub szczęście w kasynie.
                  </p>
              </div>

              {/* Quest 3 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '16px 20px', borderRadius: '12px',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>🃏 3. Hierarchia Blackjacka</span>
                  <span style={{
                    color: (user?.playerStats?.blackjackWinsTotal || 0) >= 500 ? '#2ecc71' : 'var(--gold)',
                    fontSize: '0.85rem', fontWeight: 'bold',
                    background: (user?.playerStats?.blackjackWinsTotal || 0) >= 500 ? 'rgba(46, 204, 113, 0.15)' : 'rgba(212, 175, 55, 0.1)',
                    padding: '4px 10px', borderRadius: '12px'
                  }}>
                    {(user?.playerStats?.blackjackWinsTotal || 0) >= 500 ? 'MAX POZIOM' : `Suma: ${user?.playerStats?.blackjackWinsTotal || 0} wygranych`}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• Nowicjusz Blackjack (20 wygranych)</span>
                    <span style={{ color: (user?.playerStats?.blackjackWinsTotal || 0) >= 20 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                      {(user?.playerStats?.blackjackWinsTotal || 0) >= 20 ? 'ZALICZONE ✓' : 'BRAK ✗'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• Amator Blackjack (50 wygranych)</span>
                    <span style={{ color: (user?.playerStats?.blackjackWinsTotal || 0) >= 50 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                      {(user?.playerStats?.blackjackWinsTotal || 0) >= 50 ? 'ZALICZONE ✓' : 'BRAK ✗'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• Capo Blackjack (100 wygranych)</span>
                    <span style={{ color: (user?.playerStats?.blackjackWinsTotal || 0) >= 100 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                      {(user?.playerStats?.blackjackWinsTotal || 0) >= 100 ? 'ZALICZONE ✓' : 'BRAK ✗'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• Consiliere Blackjack (250 wygranych)</span>
                    <span style={{ color: (user?.playerStats?.blackjackWinsTotal || 0) >= 250 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                      {(user?.playerStats?.blackjackWinsTotal || 0) >= 250 ? 'ZALICZONE ✓' : 'BRAK ✗'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• Boss Blackjack (500 wygranych)</span>
                    <span style={{ color: (user?.playerStats?.blackjackWinsTotal || 0) >= 500 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                      {(user?.playerStats?.blackjackWinsTotal || 0) >= 500 ? 'ZALICZONE ✓' : 'BRAK ✗'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                sfxClick();
                setShowQuests(false);
              }}
              className="btn-gold btn-full"
              style={{ padding: '14px', fontSize: '1.05rem', fontWeight: '900', borderRadius: '12px' }}
            >
              POWRÓT DO GRY
            </button>
          </div>
        </div>
      )}

      {/* Needs Bar */}
      <section className="needs-section" style={{ display: 'flex', gap: '20px', padding: '16px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
        <div style={{ flex: 1 }}><NeedsBar label="Sen" icon="🌙" value={needs.sleep} /></div>
        <div style={{ flex: 1 }}><NeedsBar label="Głód" icon="🍔" value={needs.hunger} /></div>
        <div style={{ flex: 1 }}><NeedsBar label="Pragnienie" icon="💧" value={needs.hydration} /></div>
        <div style={{ flex: 1 }}><NeedsBar label="Zadowolenie" icon="😊" value={needs.happiness ?? 100} /></div>
      </section>

      {/* Main Grid Wrapper (with left drawer if player has bag) */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        
        {/* Plecak (Bag Drawer) - Left hand side */}
        {user?.hasBag && (
          <aside className="glass-card" style={{ width: '200px', margin: '16px', padding: '16px', borderRight: '1px solid var(--border-gold)' }}>
            <h3 style={{ color: 'var(--gold)', marginBottom: '12px', fontSize: '1rem', textAlign: 'center' }}>🎒 Twój Plecak</h3>
            {bagInventory.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>Pusty plecak...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bagInventory.map((item) => (
                  <div key={item.itemName} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--gold)', marginBottom: '4px' }}>{item.itemName} (x{item.quantity})</div>
                    <button className="btn-gold btn-sm btn-full" style={{ padding: '3px', fontSize: '0.7rem' }} onClick={() => handleUseFromBag(item.itemName)}>
                      Użyj
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Navigation tabs */}
          <nav className="nav-tabs" style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
            <button className={`nav-tab ${activeTab === 'kasyno' ? 'active' : ''}`} onClick={() => navigate('/game/kasyno')}>Kasyno 🎦</button>
            <button className={`nav-tab ${activeTab === 'rywalizacja' ? 'active' : ''}`} onClick={() => navigate('/game/rywalizacja')}>Rywalizacja 🏆</button>
            <button className={`nav-tab ${activeTab === 'rozrywka' ? 'active' : ''}`} onClick={() => navigate('/game/rozrywka')}>Rozrywka 🔞</button>
            <button className={`nav-tab ${activeTab === 'sklep' ? 'active' : ''}`} onClick={() => navigate('/game/sklep')}>Sklep 🛝</button>
            <button className={`nav-tab ${activeTab === 'praca' ? 'active' : ''}`} onClick={() => navigate('/game/praca')}>Praca 💼</button>
            <button className={`nav-tab ${activeTab === 'biznes' ? 'active' : ''}`} onClick={() => navigate('/game/biznes')}>Biznes 🏢</button>
            <button 
              className={`nav-tab ${activeTab === 'plock' ? 'active' : ''}`} 
              onClick={() => navigate('/game/plock')} 
              style={{ 
                borderBottomColor: activeTab === 'plock' ? '#e74c3c' : '#e74c3c',
                color: activeTab === 'plock' ? '#fff' : '#ff7675',
                fontSize: '1.1rem', 
                fontWeight: '900',
                textShadow: '0 0 8px #ff2e63',
                border: '1.5px solid #ff2e63',
                borderRadius: '8px',
                padding: '4px 12px',
                background: activeTab === 'plock' ? 'rgba(231, 76, 60, 0.25)' : 'rgba(231, 76, 60, 0.1)',
                boxShadow: '0 0 10px rgba(231, 76, 60, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🇵🇱 EVENT PŁOCK 🇵🇱
            </button>
            <button className={`nav-tab ${activeTab === 'ranking' ? 'active' : ''}`} onClick={() => navigate('/game/ranking')}>Ranking 🏅</button>
          </nav>

          <main className="page-content" style={{ padding: '20px', flex: 1 }}>
            <Outlet context={{ refreshBag: fetchBag }} />
          </main>
        </div>

      </div>
    </div>
  );
};

export default MainLayout;
