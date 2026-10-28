import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/common/ToastContext.jsx';
import { Layout } from './components/layout/Layout.jsx';
import { OverviewPage } from './pages/OverviewPage.jsx';
import { CreateLinkPage } from './pages/CreateLinkPage.jsx';
import { LinkLibraryPage } from './pages/LinkLibraryPage.jsx';
import { LinkAnalyticsPage } from './pages/LinkAnalyticsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="create" element={<CreateLinkPage />} />
            <Route path="links" element={<LinkLibraryPage />} />
            <Route path="analytics/:id" element={<LinkAnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
