import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user, needs } = response.data;
      login(token, user, needs);
      
      if (!user.characterCreated) {
        navigate('/character');
      } else {
        navigate('/game/kasyno');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Niepoprawny login lub hasło.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '20px', position: 'relative', overflow: 'hidden'
    }}>
      {/* Mafia-themed visual background effects using inline styling / CSS variables */}
      <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '400px', zIndex: 10 }}>
        <h1 style={{
          textAlign: 'center', fontFamily: 'var(--font-display)', color: 'var(--gold)',
          fontSize: '2.5rem', marginBottom: '8px', textShadow: 'var(--shadow-gold)'
        }}>CASINO STAR</h1>
        <p style={{
          textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem',
          marginBottom: '32px', fontStyle: 'italic'
        }}>„Witaj w rodzinie, przyjacielu...”</p>

        {error && (
          <div style={{
            background: 'rgba(192, 57, 43, 0.1)', border: '1px solid var(--red)',
            color: '#f0e6d3', padding: '10px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="np. don@corleone.com"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Hasło</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn-gold btn-full" disabled={loading}>
            {loading ? 'Łączenie...' : 'Wejdź do kasyna'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Nie masz jeszcze konta? <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => navigate('/register')}>Zarejestruj się</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
