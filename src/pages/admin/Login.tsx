import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { cn } from '@/lib/utils';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin', { replace: true });
    } catch {
      setError('wrong email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-screen h-dvh bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-white text-3xl font-black tracking-tighter uppercase italic tiktok-glitch mb-2">
            PrincessTok
          </h1>
          <h2 className="text-white text-xl font-medium tracking-wide">admin</h2>
          <p className="text-white/30 text-sm">not for everyone</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3',
                'text-white placeholder:text-white/25 text-sm outline-none',
                'focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/30 transition'
              )}
            />
          </div>

          <div className="space-y-2">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3',
                'text-white placeholder:text-white/25 text-sm outline-none',
                'focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/30 transition'
              )}
            />
          </div>

          {error && (
            <p className="text-red-400/80 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full py-3 rounded-xl text-sm font-medium tracking-wide transition',
              'bg-gradient-to-r from-pink-600 to-pink-500 text-white',
              'hover:from-pink-500 hover:to-pink-400',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'pink-glow'
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                signing in
              </span>
            ) : (
              'sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
