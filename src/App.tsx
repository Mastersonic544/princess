import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Feed from '@/pages/Feed';
import AdminLogin from '@/pages/admin/Login';
import AdminDashboard from '@/pages/admin/Dashboard';
import AuthGuard from '@/components/auth/AuthGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public feed */}
        <Route
          path="/"
          element={
            <ErrorBoundary>
              <Feed />
            </ErrorBoundary>
          }
        />

        {/* Admin login — public */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin dashboard — protected by Firebase Auth */}
        <Route
          path="/admin"
          element={
            <AuthGuard>
              <AdminDashboard />
            </AuthGuard>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
