import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { EmptyState } from './components/StateViews.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { BrowsePage } from './pages/BrowsePage.jsx';
import { ClientDetailPage, ContractDetailPage, FreelancerDetailPage } from './pages/DetailPages.jsx';
import { EscrowPage } from './pages/EscrowPage.jsx';
import { FundGigPage } from './pages/FundGigPage.jsx';
import { ReviewsPage } from './pages/ReviewsPage.jsx';
import { WorkersMapPage } from './pages/WorkersMapPage.jsx';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/browse" replace />} />
        <Route path="browse" element={<BrowsePage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="freelancers/:id" element={<FreelancerDetailPage />} />
        <Route path="contracts/:id" element={<ContractDetailPage />} />
        <Route path="fund" element={<FundGigPage />} />
        <Route path="escrow" element={<EscrowPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="workers" element={<WorkersMapPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route
          path="*"
          element={
            <EmptyState title="Page not found">
              <Link to="/browse">Go to Browse</Link>
            </EmptyState>
          }
        />
      </Route>
    </Routes>
  );
}
