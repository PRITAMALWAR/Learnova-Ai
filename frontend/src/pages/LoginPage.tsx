import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register, token } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [examTrack, setExamTrack] = useState('JEE 2026');
  const [err, setErr] = useState('');

  if (token) {
    nav('/dashboard', { replace: true });
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name || undefined, examTrack || undefined);
      nav('/dashboard', { replace: true });
    } catch (ex: unknown) {
      const msg =
        (ex as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Something went wrong';
      setErr(msg);
    }
  };

  return (
    <div className="study-app" style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="study-card study-auth-card">
        <h1 className="study-auth-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="study-sub">AI Study Planner — organize JEE prep and more</p>
        <form onSubmit={submit} style={{ marginTop: 24 }}>
          {mode === 'register' && (
            <div className="study-form-group">
              <label className="study-label">Name</label>
              <input
                className="study-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aryan"
              />
            </div>
          )}
          {mode === 'register' && (
            <div className="study-form-group">
              <label className="study-label">Exam / Goal</label>
              <input
                className="study-input"
                value={examTrack}
                onChange={(e) => setExamTrack(e.target.value)}
                placeholder="JEE 2026"
              />
            </div>
          )}
          <div className="study-form-group">
            <label className="study-label">Email</label>
            <input
              className="study-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="study-form-group">
            <label className="study-label">Password</label>
            <input
              className="study-input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          {err && <p className="study-error">{err}</p>}
          <button type="submit" className="study-btn study-btn-primary" style={{ width: '100%', marginTop: 8 }}>
            {mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <div className="study-auth-switch">
          {mode === 'login' ? (
            <>
              No account?
              <button type="button" onClick={() => setMode('register')}>
                Register
              </button>
            </>
          ) : (
            <>
              Have an account?
              <button type="button" onClick={() => setMode('login')}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
