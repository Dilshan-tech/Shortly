import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './components/common/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { GuestRoute } from './components/auth/GuestRoute.jsx';
import { Layout } from './components/layout/Layout.jsx';
import { OverviewPage } from './pages/OverviewPage.jsx';
import { CreateLinkPage } from './pages/CreateLinkPage.jsx';
import { LinkLibraryPage } from './pages/LinkLibraryPage.jsx';
import { LinkAnalyticsPage } from './pages/LinkAnalyticsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Guest-only routes: redirect to dashboard if already authenticated */}
              <Route
                path="/login"
                element={
                  <GuestRoute>
                    <LoginPage />
                  </GuestRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <GuestRoute>
                    <RegisterPage />
                  </GuestRoute>
                }
              />

              {/* Protected dashboard routes: require authentication */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<OverviewPage />} />
                <Route path="create" element={<CreateLinkPage />} />
                <Route path="links" element={<LinkLibraryPage />} />
                <Route path="analytics/:id" element={<LinkAnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="account" element={<Navigate to="/settings" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
