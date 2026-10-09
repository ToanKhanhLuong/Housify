import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './src/layouts/MainLayout';
import LandingPage from './src/pages/Landing/LandingPage';
import RoomListPage from './src/pages/RoomList/RoomListPage';
import RoomDetailPage from './src/pages/RoomDetail/RoomDetailPage';
import LoginPage from './src/pages/Auth/Login/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="rooms" element={<RoomListPage />} />
          <Route path="rooms/:id" element={<RoomDetailPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="*" element={<LandingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
