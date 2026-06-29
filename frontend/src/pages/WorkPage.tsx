import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';
import { sfxBurger, sfxWin, sfxLose, sfxBuy } from '../utils/sfx';

interface Question {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string; };
}

// ─── FLAPPY BIRD SUBCOMPONENT ────────────────────────────────────────────────
const FlappyBird: React.FC<{
  user: any;
  setUser: (u: any) => void;
  updateNeeds: (n: any) => void;
}> = ({ user, setUser, updateNeeds }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [earnedMsg, setEarnedMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const birdY = useRef(240);
  const birdVelocity = useRef(0);
  const pipes = useRef<Array<{ x: number; top: number; bottom: number; passed: boolean }>>([]);
  const frameId = useRef<number | null>(null);
  const scoreRef = useRef(0);

  const startGame = useCallback(() => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    scoreRef.current = 0;
    setEarnedMsg(null);
    birdY.current = 240;
    birdVelocity.current = 0;
    pipes.current = [
      { x: 500, top: 120, bottom: 120, passed: false },
      { x: 800, top: 100, bottom: 150, passed: false },
    ];
  }, []);

  const jump = useCallback(() => {
    if (!isPlaying && !gameOver) {
      startGame();
      return;
    }
    if (gameOver) return;
    birdVelocity.current = -5.8;
  }, [isPlaying, gameOver, startGame]);

  const handleGameOver = async () => {
    setGameOver(true);
    setIsPlaying(false);
    if (frameId.current) cancelAnimationFrame(frameId.current);
    
    const finalScore = scoreRef.current;
    if (finalScore > highScore) setHighScore(finalScore);

    setLoading(true);
    try {
      const res = await api.post('/work/flappy-bird', { score: finalScore });
      setEarnedMsg(res.data.message);
      updateNeeds(res.data.needs);
      if (user) setUser({ ...user, tokens: res.data.tokens, dollars: res.data.dollars });
      sfxWin();
    } catch (e) {
      console.error(e);
      sfxLose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const update = () => {
      frameCount++;

      // Bird physics
      birdVelocity.current += 0.22; // Gravity (slower fall)
      birdY.current += birdVelocity.current;

      // Floor & ceiling collision (radius is 14)
      if (birdY.current > canvas.height - 14 || birdY.current < 14) {
        handleGameOver();
        return;
      }

      // Generate new pipes
      if (frameCount % 100 === 0) {
        const gap = 150; // Larger gap for larger screen
        const minHeight = 50;
        const maxHeight = canvas.height - gap - minHeight;
        const topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
        const bottomHeight = canvas.height - gap - topHeight;
        pipes.current.push({
          x: canvas.width,
          top: topHeight,
          bottom: bottomHeight,
          passed: false
        });
      }

      // Move and check pipes
      for (let i = 0; i < pipes.current.length; i++) {
        const p = pipes.current[i];
        p.x -= 2.5; // Speed

        // Collision detection
        const birdX = 100; // Shifted right on wider screen
        const birdRadius = 14;
        const pipeWidth = 60;

        // Bounding box collision
        if (birdX + birdRadius > p.x && birdX - birdRadius < p.x + pipeWidth) {
          if (birdY.current - birdRadius < p.top || birdY.current + birdRadius > canvas.height - p.bottom) {
            handleGameOver();
            return;
          }
        }

        // Score check
        if (p.x + pipeWidth < birdX && !p.passed) {
          p.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }
      }

      // Filter off-screen pipes
      pipes.current = pipes.current.filter(p => p.x > -100);

      // Render
      ctx.fillStyle = '#0f021e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background grid lines (arcade style)
      ctx.strokeStyle = 'rgba(5, 217, 232, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw pipes (neon style)
      pipes.current.forEach(p => {
        const pipeWidth = 60;
        
        // Top pipe
        const gradTop = ctx.createLinearGradient(p.x, 0, p.x + pipeWidth, 0);
        gradTop.addColorStop(0, '#ff2a6d');
        gradTop.addColorStop(1, '#9b00e8');
        ctx.fillStyle = gradTop;
        ctx.fillRect(p.x, 0, pipeWidth, p.top);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, 0, pipeWidth, p.top);

        // Bottom pipe
        const gradBot = ctx.createLinearGradient(p.x, canvas.height - p.bottom, p.x + pipeWidth, canvas.height);
        gradBot.addColorStop(0, '#ff2a6d');
        gradBot.addColorStop(1, '#9b00e8');
        ctx.fillStyle = gradBot;
        ctx.fillRect(p.x, canvas.height - p.bottom, pipeWidth, p.bottom);
        ctx.strokeRect(p.x, canvas.height - p.bottom, pipeWidth, p.bottom);
      });

      // Draw bird (Neon cyan circle)
      ctx.beginPath();
      ctx.arc(100, birdY.current, 14, 0, Math.PI * 2);
      const birdGrad = ctx.createRadialGradient(100, birdY.current, 2, 100, birdY.current, 14);
      birdGrad.addColorStop(0, '#fff');
      birdGrad.addColorStop(0.4, '#05d9e8');
      birdGrad.addColorStop(1, '#005f73');
      ctx.fillStyle = birdGrad;
      ctx.fill();
      ctx.shadowColor = '#05d9e8';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Draw eye
      ctx.beginPath();
      ctx.arc(104, birdY.current - 4, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();

      // Draw beak
      ctx.beginPath();
      ctx.moveTo(110, birdY.current - 2);
      ctx.lineTo(118, birdY.current + 2);
      ctx.lineTo(110, birdY.current + 4);
      ctx.fillStyle = '#f5a623';
      ctx.fill();

      frameId.current = requestAnimationFrame(update);
    };

    frameId.current = requestAnimationFrame(update);

    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current);
    };
  }, [isPlaying]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 800, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        <span>Wynik: <strong style={{ color: 'var(--gold)' }}>{score}</strong></span>
        <span>Rekord: <strong style={{ color: '#05d9e8' }}>{highScore}</strong></span>
      </div>

      <div style={{ position: 'relative', width: 800, height: 480, background: '#0f021e', border: '3px solid #ff2a6d', borderRadius: 16, overflow: 'hidden', boxShadow: '0 0 25px rgba(255, 42, 109, 0.2)' }}>
        <canvas ref={canvasRef} width={800} height={480} onClick={jump} style={{ display: 'block', cursor: 'pointer' }} />
        
        {(!isPlaying || gameOver) && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 2, 30, 0.85)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16, color: '#fff', textAlign: 'center',
            padding: 20
          }}>
            {gameOver ? (
              <>
                <h2 style={{ color: '#ff2a6d', fontSize: '2rem', fontFamily: 'var(--font-display)', textShadow: '0 0 10px #ff2a6d' }}>KONIEC GRY 💀</h2>
                {loading ? (
                  <p style={{ color: '#aaa' }}>Zapisywanie wyniku...</p>
                ) : (
                  <>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Twój wynik: {score} rur</p>
                    {earnedMsg && <div style={{ background: 'rgba(46,204,113,0.15)', border: '1px solid #2ecc71', color: '#2ecc71', padding: '8px 16px', borderRadius: 8, fontWeight: 700 }}>{earnedMsg}</div>}
                    <button className="btn-gold" onClick={startGame} style={{ padding: '10px 24px', fontSize: '1rem' }}>
                      Zagraj Ponownie 🔄
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <h2 style={{ color: '#05d9e8', fontSize: '2rem', fontFamily: 'var(--font-display)', textShadow: '0 0 10px #05d9e8' }}>FLAPPY BIRD 🐦</h2>
                <p style={{ color: '#ccc', fontSize: '0.9rem', maxWidth: 500 }}>
                  Steruj ptakiem za pomocą <strong style={{ color: '#fff' }}>Spacji</strong> lub <strong style={{ color: '#fff' }}>Kliknięcia</strong>. Omijaj fioletowo-różowe rury.<br />
                  <span style={{ color: '#2ecc71', fontWeight: 800 }}>Zarobek: 3 $ za każdą ominiętą rurę!</span>
                </p>
                <button className="btn-gold" onClick={startGame} style={{ padding: '12px 28px', fontSize: '1rem' }}>
                  Rozpocznij Pracę 🚀
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const WorkPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mcdonalds' | 'school' | 'flappy'>('mcdonalds');

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
  }, []);  const currentEarnPerClick = 1 + burgerBonusLevel;

  const handleBurgerClick = async () => {
    try {
      sfxBurger();
      const res = await api.post('/work/click');
      const earn = res.data.earn ?? 1;
      setEarnedToday(prev => prev + earn);
      setBurgerMultLevel(res.data.burgerMultLevel ?? burgerMultLevel);
      setBurgerBonusLevel(res.data.burgerBonusLevel ?? burgerBonusLevel);
      if (user) setUser({ ...user, tokens: res.data.tokens, dollars: res.data.dollars });
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
      if (user) setUser({ ...user, tokens: res.data.tokens, dollars: res.data.dollars });
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
        setFeedback('✅ Poprawna odpowiedź! +15 $');
        setEarnedSchool(prev => prev + 15);
        if (user) setUser({ ...user, tokens: res.data.tokens, dollars: res.data.dollars });
      } else {
        sfxLose();
        setFeedback('❌ Błędna odpowiedź! -10 Zadowolenia');
      }
      setTimeout(() => fetchQuestion(), 2000);
    } catch (err) { console.error(err); }
  };

  // Wyliczanie rozmiaru burgera (np. poziom 0 -> 3rem, 1 -> 4.5rem, 2 -> 6rem, 3 -> 7.5rem)
  const burgerFontSize = `${3 + burgerMultLevel * 1.5}rem`;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button className={activeTab === 'mcdonalds' ? 'btn-gold' : 'btn-ghost'} onClick={() => setActiveTab('mcdonalds')}>
          McDonald's (Burger)
        </button>
        <button className={activeTab === 'school' ? 'btn-gold' : 'btn-ghost'} onClick={() => setActiveTab('school')}>
          Szkoła (Matematyka)
        </button>
        <button className={activeTab === 'flappy' ? 'btn-gold' : 'btn-ghost'} onClick={() => setActiveTab('flappy')}>
          Flappy Bird (Bieg)
        </button>
      </div>

      {activeTab === 'mcdonalds' && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

          {/* Panel burgera */}
          <div className="glass-card" style={{ flex: 2, minWidth: 320, padding: '32px', textAlign: 'center', height: '400px', position: 'relative', overflow: 'hidden', background: '#111' }}>
            <div style={{ position: 'absolute', top: '14px', left: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Zarobione: <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{earnedToday} $</span>
            </div>
            <div style={{ position: 'absolute', top: '14px', right: '16px', fontSize: '0.8rem', color: '#f1c40f', fontWeight: 700 }}>
              +{currentEarnPerClick} $/klik
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.85rem' }}>
              Kliknij w burgera, aby zarobić <strong style={{ color: '#f1c40f' }}>{currentEarnPerClick}</strong> $.
            </p>
            <div
              onClick={handleBurgerClick}
              style={{
                position: 'absolute', top: burgerPos.top, left: burgerPos.left,
                fontSize: burgerFontSize, cursor: 'pointer', userSelect: 'none',
                transform: 'translate(-50%, -50%)', transition: 'top 0.2s ease, left 0.2s ease, font-size 0.3s ease'
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
                <span style={{ color: '#f1c40f', fontWeight: 800, fontSize: '0.95rem' }}>🍔 Powiększ burgera</span>
                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{burgerMultLevel}/3</span>
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < burgerMultLevel ? '#f1c40f' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: 10 }}>
                Fizycznie powiększa burgera wyświetlanego na ekranie.<br/>
                Poziom: {burgerMultLevel}/3
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
                <span style={{ color: '#3498db', fontWeight: 800, fontSize: '0.95rem' }}>➕ +1 $/klik (maks +5)</span>
                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{burgerBonusLevel}/5</span>
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < burgerBonusLevel ? '#3498db' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: 10 }}>
                Dodaje +1 $ do bazowego zarobku za kliknięcie.<br/>
                Teraz: +{burgerBonusLevel} $ → Po: +{Math.min(burgerBonusLevel + 1, 5)} $
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
      )}

      {activeTab === 'school' && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>Rozwiązuj zadania maturalne z matematyki (+15 $ za dobrą odpowiedź, -10 zadowolenia za próbę)</span>
            <span>Suma: <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{earnedSchool} $</span></span>
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

      {activeTab === 'flappy' && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <FlappyBird user={user} setUser={setUser} updateNeeds={updateNeeds} />
        </div>
      )}
    </div>
  );
};

export default WorkPage;
