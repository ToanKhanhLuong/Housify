import React, { useState } from 'react';
import HeroSection from './sections/HeroSection/HeroSection';
import FeaturedRooms from './sections/FeaturedRooms/FeaturedRooms';
import BuildingsSection from './sections/BuildingsSection/BuildingsSection';
import { mockRooms, mockBuildings } from '../../../mocks/landing.mock';

export default function LandingPage() {
  const [rooms, setRooms] = useState(mockRooms || []);

  const handleSearch = ({ keyword, price, area }) => {
    let filtered = [...mockRooms];

    if (keyword && keyword.trim()) {
      const kw = keyword.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.title?.toLowerCase().includes(kw) ||
          r.address?.toLowerCase().includes(kw) ||
          r.buildingName?.toLowerCase().includes(kw) ||
          r.roomNumber?.toLowerCase().includes(kw)
      );
    }

    if (price === 'under_3.5') {
      filtered = filtered.filter((r) => (r.rentPrice || r.price) < 3500000);
    } else if (price === '3.5_4.5') {
      filtered = filtered.filter((r) => (r.rentPrice || r.price) >= 3500000 && (r.rentPrice || r.price) <= 4500000);
    } else if (price === 'above_4.5') {
      filtered = filtered.filter((r) => (r.rentPrice || r.price) > 4500000);
    }

    if (area === 'under_25') {
      filtered = filtered.filter((r) => r.area < 25);
    } else if (area === '25_35') {
      filtered = filtered.filter((r) => r.area >= 25 && r.area <= 35);
    } else if (area === 'above_35') {
      filtered = filtered.filter((r) => r.area > 35);
    }

    setRooms(filtered);

    // Cuộn mượt xuống phần kết quả phòng
    const featuredElem = document.getElementById('featured-rooms');
    if (featuredElem) {
      featuredElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div>
      {/* 1. Hero Banner + Floating Search Bar */}
      <HeroSection onSearch={handleSearch} />

      {/* 2. Featured Rooms (8 rooms 2x4 grid) */}
      <FeaturedRooms rooms={rooms} />

      {/* 3. Housify Buildings (3 buildings/view carousel) */}
      <BuildingsSection buildings={mockBuildings || []} />
    </div>
  );
}
