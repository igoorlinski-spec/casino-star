import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';
import { sfxBurger, sfxWin, sfxLose } from '../utils/sfx';

interface Question {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

const WorkPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mcdonalds' | 'school'>('mcdonalds');
  
  // McDonald's state
  const [burgerPos, setBurgerPos] = useState({ top: '50%', left: '50%' });
  const [earnedToday, setEarnedToday] = useState(0);

  // School state
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [earnedSchool, setEarnedSchool] = useState(0);

  const { user, setUser, updateNeeds } = useAuthStore();

  // ==========================================
  // MCDONALD'S
  // ==========================================
  const handleBurgerClick = async () => {
    try {
      sfxBurger();
      const res = await api.post('/work/click');
      setEarnedToday((prev) => prev + 1);
      if (user) {
        setUser({ ...user, tokens: res.data.tokens });
      }
      updateNeeds(res.data.needs);
      
      // Losuj nową pozycję burgera na ekranie
      const randTop = Math.floor(Math.random() * 70) + 15; // 15% - 85%
      const randLeft = Math.floor(Math.random() * 70) + 15;
      setBurgerPos({ top: `${randTop}%`, left: `${randLeft}%` });
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // SZKOŁA
  // ==========================================
  const fetchQuestion = async () => {
    try {
      const res = await api.get('/work/question');
      setQuestion(res.data.question);
      setSelectedAnswer(null);
      setFeedback(null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'school') {
      fetchQuestion();
    }
  }, [activeTab]);

  const handleAnswerSubmit = async (answer: string) => {
    if (selectedAnswer) return; // zablokuj ponowne klikanie
    setSelectedAnswer(answer);

    try {
      const res = await api.post('/work/answer', { questionId: question?.id, answer });
      updateNeeds(res.data.needs);

      if (res.data.correct) {
        sfxWin();
        setFeedback('Poprawna odpowiedź! +15 żetonów, -10 Zadowolenia');
        setEarnedSchool((prev) => prev + 15);
        if (user) {
          setUser({ ...user, tokens: res.data.tokens });
        }
      } else {
        sfxLose();
        setFeedback('Błędna odpowiedź! -10 Zadowolenia');
      }

      // Ładowanie kolejnego pytania po krótkiej pauzie
      setTimeout(() => {
        fetchQuestion();
      }, 2000);

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button 
          className={activeTab === 'mcdonalds' ? 'btn-gold' : 'btn-ghost'}
          onClick={() => setActiveTab('mcdonalds')}
        >
          McDonald's (Praca zręcznościowa)
        </button>
        <button 
          className={activeTab === 'school' ? 'btn-gold' : 'btn-ghost'}
          onClick={() => setActiveTab('school')}
        >
          Szkoła (Quiz matematyczny)
        </button>
      </div>

      {activeTab === 'mcdonalds' ? (
        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', height: '400px', position: 'relative', overflow: 'hidden', background: '#111' }}>
          <div style={{ position: 'absolute', top: '20px', left: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Zarobione w tej sesji: <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{earnedToday} żet.</span>
          </div>

          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Kliknij w latającego burgera, aby zarobić 1 żeton. (Każde kliknięcie zabiera 1 pkt zadowolenia).</p>

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
      ) : (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>Rozwiązuj zadania maturalne z matematyki (+15 żetonów za dobrą odpowiedź, -10 zadowolenia za próbę)</span>
            <span>Suma zarobków: <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{earnedSchool} żet.</span></span>
          </div>

          {question ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: 'rgba(0,0,0,0.5)', padding: '24px', borderRadius: '8px',
                border: '1px solid var(--border-gold)', minHeight: '100px', display: 'flex', alignItems: 'center'
              }}>
                <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-body)', fontWeight: '600' }}>
                  {question.question}
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {Object.entries(question.options).map(([key, value]) => {
                  const isSelected = selectedAnswer === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleAnswerSubmit(key)}
                      disabled={!!selectedAnswer}
                      className={isSelected ? 'btn-gold' : 'btn-ghost'}
                      style={{
                        padding: '16px', textAlign: 'left', display: 'flex', gap: '12px',
                        borderColor: isSelected ? 'var(--gold)' : 'var(--border-gold)'
                      }}
                    >
                      <strong style={{ color: 'var(--gold)' }}>{key}:</strong> {value}
                    </button>
                  );
                })}
              </div>

              {feedback && (
                <div style={{
                  textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem',
                  color: feedback.includes('Poprawna') ? 'var(--gold)' : 'var(--red-dark)'
                }}>
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
