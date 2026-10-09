import React from 'react';
import HeroSection from './sections/HeroSection/HeroSection';
import FeaturedRooms from './sections/FeaturedRooms/FeaturedRooms';
import BuildingsSection from './sections/BuildingsSection/BuildingsSection';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <HeroSection />
      <FeaturedRooms />
      <BuildingsSection />
    </div>
  );
};

export default LandingPage;
