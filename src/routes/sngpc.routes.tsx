import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SngpcDashboard from '../pages/tenant/SngpcDashboard';

export default function SngpcRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SngpcDashboard />} />
    </Routes>
  );
}
