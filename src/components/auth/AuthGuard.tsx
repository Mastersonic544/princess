import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/services/firebase';

type AuthStatus = 'loading' | 'authed' | 'unauthed';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Wraps /admin route — redirects to /admin/login if Firebase Auth has no session.
 * Shows a full-screen dark loading state while auth state resolves.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setStatus(user ? 'authed' : 'unauthed');
    });
    return unsubscribe;
  }, []);

  if (status === 'loading') {
    return (
      <div className="w-screen h-dvh bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-pink-500/40 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unauthed') {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
