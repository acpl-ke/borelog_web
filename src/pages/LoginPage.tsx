import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(username, password);
      if (!result.isSucess) {
        setError(result.msg || 'Invalid credentials');
        return;
      }
      navigate('/find-pile', {
        state: {
          userId: result.id ?? null,
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login" className="screen active">
      <div className="login-inner">
        <div className="login-brand">
          <div className="brand-mark">F</div>
          <div>
            <div className="b1">Foundation Engg. Co.</div>
            <div className="b2">Bore Log System</div>
          </div>
        </div>

        <div className="login-hero">
          <div className="eyebrow">Sign in · 01</div>
          <h1>
            Every bore, <em>recorded.</em>
          </h1>
          <p>Capture pile foundation data right from the site, no paperwork required.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Username</label>
            <input
              type="text"
              placeholder="site.engineer"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="row-between">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />{' '}
              Remember me
            </label>
           
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>

          <div className="login-foot">FEC · v 2.4.1 · 2526</div>
        </form>
      </div>
    </div>
  );
};
