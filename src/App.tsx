/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Matches } from './pages/Matches';
import { MatchDetail } from './pages/MatchDetail';
import { MiscBets } from './pages/MiscBets';
import { Participants } from './pages/Participants';
import { Settlement } from './pages/Settlement';
import { Toaster } from './components/ui/sonner';
import { useEffect } from 'react';
import { useStore } from './store/useStore';

export default function App() {
  const fetchAll = useStore((state) => state.fetchAll);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="matches" element={<Matches />} />
          <Route path="matches/:id" element={<MatchDetail />} />
          <Route path="misc-bets" element={<MiscBets />} />
          <Route path="participants" element={<Participants />} />
          <Route path="settlement" element={<Settlement />} />
        </Route>
      </Routes>
      <Toaster theme="dark" />
    </Router>
  );
}
