/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { PrivateRoute, AdminRoute } from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';
import { Dashboard } from './pages/Dashboard';
import { Matches } from './pages/Matches';
import { MatchDetail } from './pages/MatchDetail';
import { MiscBets } from './pages/MiscBets';
import { Participants } from './pages/Participants';
import { Settlement } from './pages/Settlement';
import { Login } from './pages/Login';
import { AdminUsers } from './pages/AdminUsers';
import { Profile } from './pages/Profile';
import { Toaster } from './components/ui/sonner';
import { useStore } from './store/useStore';
import { seedDefaultUsers } from './lib/seedUsers';

function AppInner() {
  const fetchAll = useStore((state) => state.fetchAll);

  useEffect(() => {
    fetchAll();
    seedDefaultUsers(); // idempotent: inserts defaults only if missing
  }, [fetchAll]);

  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes — any authenticated user */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index         element={<Dashboard />} />
        <Route path="matches"       element={<Matches />} />
        <Route path="matches/:id"   element={<MatchDetail />} />
        <Route path="misc-bets"     element={<MiscBets />} />
        <Route path="participants"  element={<Participants />} />
        <Route path="settlement"    element={<Settlement />} />
        <Route path="profile"       element={<Profile />} />

        {/* Admin-only route */}
        <Route
          path="admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppInner />
        <Toaster theme="dark" />
      </AuthProvider>
    </Router>
  );
}
