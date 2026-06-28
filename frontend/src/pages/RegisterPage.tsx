import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuthStore } from '../stores/authStore';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.substring(0, 10);
    setNickname(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', { email, nickname, password });
      const { token, user, needs } = response.data;
      login(token, user, needs);
      navigate('/character');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Rejestracja nie powiodła się.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '20px'
    }}>
      <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{
          textAlign: 'center', fontFamily: 'var(--font-display)', color: 'var(--gold)',
          fontSize: '2.5rem', marginBottom: '8px', textShadow: 'var(--shadow-gold)'
        }}>REJESTRACJA</h1>
        <p style={{
          textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem',
          marginBottom: '32px', fontStyle: 'italic'
        }}>„Nowy w mieście? Zapisz się do księgi.”</p>

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
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Nickname</label>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{nickname.length}/10</span>
            </div>
            <input type="text" required value={nickname} onChange={handleNicknameChange} placeholder="Maks. 10 znaków" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Hasło (min. 6 znaków)</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Potwierdź hasło</label>
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-gold btn-full" disabled={loading}>
            {loading ? 'Rejestrowanie...' : 'Zarejestruj się'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Masz już konto? <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => navigate('/login')}>Zaloguj się</span>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
