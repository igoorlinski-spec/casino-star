import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';
import { sfxBurger, sfxWin, sfxLose, sfxBuy } from '../utils/sfx';

interface Question {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string; };
}

const WorkPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mcdonalds' | 'school'>('mcdonalds');

  const [burgerPos, setBurgerPos] = useState({ top: '50%', left: '50%' });
  const [earnedToday, setEarnedToday] = useState(0);
  const [burgerMultLevel, setBurgerMultLevel] = useState(0);
  const [burgerBonusLevel, setBurgerBonusLevel] = useState(0);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [earnedSchool, setEarnedSchool] = useState(0);

  const { user, setUser, updateNeeds } = useAuthStore();

  // Załaduj poziomy ulepszeń przy starcie
  useEffect(() => {
    api.get('/auth/me').then(r => {
      if (r.data.user) {
        setBurgerMultLevel(r.data.user.burgerMultLevel ?? 0);
        setBurgerBonusLevel(r.data.user.burgerBonusLevel ?? 0);
      }
    }).catch(() => {});
  }, []);

  const currentEarnPerClick = (1 + burgerBonusLevel) * Math.pow(2, burgerMultLevel);

  const handleBurgerClick = async () => {
    try {
      sfxBurger();
      const res = await api.post('/work/click');
      const earn = res.data.earn ?? 1;
      setEarnedToday(prev => prev + earn);
      setBurgerMultLevel(res.data.burgerMultLevel ?? burgerMultLevel);
      setBurgerBonusLevel(res.data.burgerBonusLevel ?? burgerBonusLevel);
      if (user) setUser({ ...user, tokens: res.data.tokens });
      updateNeeds(res.data.needs);
      const randTop = Math.floor(Math.random() * 70) + 15;
      const randLeft = Math.floor(Math.random() * 70) + 15;
      setBurgerPos({ top: `${randTop}%`, left: `${randLeft}%` });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpgrade = async (type: 'mult' | 'bonus') => {
    setUpgradeLoading(true);
    setUpgradeMsg(null);
    try {
      sfxBuy();
      const res = await api.post(`/work/upgrade-${type}`);
      setBurgerMultLevel(res.data.burgerMultLevel);
      setBurgerBonusLevel(res.data.burgerBonusLevel);
      if (user) setUser({ ...user, tokens: res.data.tokens });
      setUpgradeMsg(res.data.message);
    } catch (err: any) {
      setUpgradeMsg(err.response?.data?.error || 'Błąd zakupu');
    } finally {
      setUpgradeLoading(false);
      setTimeout(() => setUpgradeMsg(null), 3000);
    }
  };

  const fetchQuestion = async () => {
    try {
      const res = await api.get('/work/question');
      setQuestion(res.data.question);
      setSelectedAnswer(null);
      setFeedback(null);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (activeTab === 'school') fetchQuestion();
  }, [activeTab]);

  const handleAnswerSubmit = async (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    try {
      const res = await api.post('/work/answer', { questionId: question?.id, answer });
      updateNeeds(res.data.needs);
      if (res.data.correct) {
        sfxWin();
        setFeedback('✅ Poprawna odpowiedź! +15 żetonów');
        setEarnedSchool(prev => prev + 15);
        if (user) setUser({ ...user, tokens: res.data.tokens });
      } else {
        sfxLose();
        setFeedback('❌ Błędna odpowiedź! -10 Zadowolenia');
      }
      setTimeout(() => fetchQuestion(), 2000);
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button className={activeTab === 'mcdonalds' ? 'btn-gold' : 'btn-ghost'} onClick={() => setActiveTab('mcdonalds')}>
          McDonald's (Praca zręcznościowa)
        </button>
        <button className={activeTab === 'school' ? 'btn-gold' : 'btn-ghost'} onClick={() => setActiveTab('school')}>
          Szkoła (Quiz matematyczny)
        </button>
      </div>

      {activeTab === 'mcdonalds' ? (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

          {/* Panel burgera */}
          <div className="glass-card" style={{ flex: 2, minWidth: 320, padding: '32px', textAlign: 'center', height: '400px', position: 'relative', overflow: 'hidden', background: '#111' }}>
            <div style={{ position: 'absolute', top: '14px', left: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Zarobione: <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{earnedToday} żet.</span>
            </div>
            <div style={{ position: 'absolute', top: '14px', right: '16px', fontSize: '0.8rem', color: '#f1c40f', fontWeight: 700 }}>
              +{currentEarnPerClick}/klik
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.85rem' }}>
              Kliknij w burgera, aby zarobić <strong style={{ color: '#f1c40f' }}>{currentEarnPerClick}</strong> żeton{currentEarnPerClick === 1 ? '' : 'ów'}.
            </p>
            <div
              onClick={handleBurgerClick}
              style={{
                position: 'absolute', top: burgerPos.top, left: burgerPos.left,
                fontSize: '3rem', cursor: 'pointer', userSelect: 'none',
                transform: 'translate(-50%, -50%)', transition: 'top 0.2s ease, left 0.2s ease'
              }}
            >
              🍔
            </div>
          </div>

          {/* Panel ulepszeń */}
          <div className="glass-card" style={{ flex: 1, minWidth: 240, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ color: 'var(--gold)', fontWeight: 900, textAlign: 'center', marginBottom: 4, letterSpacing: 1 }}>
              🔧 Ulepszenia Burgera
            </h3>

            {upgradeMsg && (
              <div style={{
                background: upgradeMsg.includes('!') ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)',
                border: `1px solid ${upgradeMsg.includes('!') ? '#2ecc71' : '#e74c3c'}`,
                borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem',
                color: upgradeMsg.includes('!') ? '#2ecc71' : '#e74c3c', textAlign: 'center'
              }}>
                {upgradeMsg}
              </div>
            )}

            {/* Ulepszenie x2 */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: '#f1c40f', fontWeight: 800, fontSize: '0.95rem' }}>🍔 Powiększ burgera x2</span>
                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{burgerMultLevel}/3</span>
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < burgerMultLevel ? '#f1c40f' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: 10 }}>
                Mnoży zarobki x2 za każdy poziom.<br/>
                Teraz: x{Math.pow(2, burgerMultLevel)} → Po: x{Math.pow(2, Math.min(burgerMultLevel + 1, 3))}
              </p>
              <button
                className="btn-gold"
                style={{ width: '100%', padding: '8px', fontSize: '0.82rem', opacity: burgerMultLevel >= 3 ? 0.4 : 1 }}
                onClick={() => handleUpgrade('mult')}
                disabled={upgradeLoading || burgerMultLevel >= 3}
              >
                {burgerMultLevel >= 3 ? 'MAKS ✅' : '🪙 1 000 żetonów'}
              </button>
            </div>

            {/* Ulepszenie +1/klik */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(52,152,219,0.3)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: '#3498db', fontWeight: 800, fontSize: '0.95rem' }}>➕ +1 żeton/klik</span>
                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{burgerBonusLevel}/5</span>
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < burgerBonusLevel ? '#3498db' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: 10 }}>
                Dodaje +1 żeton do każdego kliknięcia.<br/>
                Teraz: +{burgerBonusLevel}/klik → Po: +{Math.min(burgerBonusLevel + 1, 5)}/klik
              </p>
              <button
                className="btn-gold"
                style={{ width: '100%', padding: '8px', fontSize: '0.82rem', background: 'linear-gradient(135deg,#2980b9,#3498db)', opacity: burgerBonusLevel >= 5 ? 0.4 : 1 }}
                onClick={() => handleUpgrade('bonus')}
                disabled={upgradeLoading || burgerBonusLevel >= 5}
              >
                {burgerBonusLevel >= 5 ? 'MAKS ✅' : '🪙 1 000 żetonów'}
              </button>
            </div>

          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>Rozwiązuj zadania maturalne z matematyki (+15 żetonów za dobrą odpowiedź, -10 zadowolenia za próbę)</span>
            <span>Suma: <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{earnedSchool} żet.</span></span>
          </div>

          {question ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-gold)', minHeight: '100px', display: 'flex', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-body)', fontWeight: '600' }}>{question.question}</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {Object.entries(question.options).map(([key, value]) => (
                  <button key={key} onClick={() => handleAnswerSubmit(key)} disabled={!!selectedAnswer}
                    className={selectedAnswer === key ? 'btn-gold' : 'btn-ghost'}
                    style={{ padding: '16px', textAlign: 'left', display: 'flex', gap: '12px' }}>
                    <strong style={{ color: 'var(--gold)' }}>{key}:</strong> {value}
                  </button>
                ))}
              </div>
              {feedback && (
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: feedback.includes('✅') ? 'var(--gold)' : 'var(--red-dark)' }}>
                  {feedback}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>Ładowanie zadania...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkPage;
