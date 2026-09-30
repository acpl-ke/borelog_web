import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { OtpPage } from './pages/OtpPage';
import { FindPilePage } from './pages/FindPilePage';
import { BoreLogPage } from './pages/BoreLogPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/otp" element={<OtpPage />} />
      <Route
        path="/find-pile"
        element={
          <ProtectedRoute>
            <FindPilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/borelog/:projectId/:pileNo"
        element={
          <ProtectedRoute>
            <BoreLogPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);
