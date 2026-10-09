import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaArrowRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { mockBuildings } from '../../../../data/mockBuildings';
import styles from './BuildingsSection.module.css';

const BuildingsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);

  // Update visible count based on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 640) {
        setVisibleCount(1);
      } else if (window.innerWidth <= 992) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, mockBuildings.length - visibleCount);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  // Calculate slide offset percentage
  // Gap is 1.5rem (24px)
  // Each slide movement shifts by 1 card + gap
  const getTransform = () => {
    if (visibleCount === 3) {
      return `translateX(calc(-${currentIndex} * ((100% - 3rem) / 3 + 1.5rem)))`;
    } else if (visibleCount === 2) {
      return `translateX(calc(-${currentIndex} * ((100% - 1.5rem) / 2 + 1.5rem)))`;
    } else {
      return `translateX(calc(-${currentIndex} * (100% + 1.5rem)))`;
    }
  };

  return (
    <section id="buildings" className={styles.section}>
      <div className="container-custom">
        {/* Header & Slider Navigation Controls */}
        <div className={styles.headerRow}>
          <div className={styles.titleArea}>
            <span className="section-tag">Hệ thống cơ sở</span>
            <h2 className={styles.title}>Các Tòa Nhà Thuộc Hệ Thống Housify</h2>
            <p className={styles.subtitle}>
              Housify sở hữu và trực tiếp vận hành chuỗi tòa nhà tại TP.HCM và Hà Nội, tiện nghi, an ninh tuyệt đối.
            </p>
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Tòa nhà trước"
            >
              <FaChevronLeft size={16} />
            </button>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Tòa nhà tiếp theo"
            >
              <FaChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Carousel Slider Viewport */}
        <div className={styles.carouselViewport}>
          <div
            className={styles.carouselTrack}
            style={{ transform: getTransform() }}
          >
            {mockBuildings.map((bld) => (
              <div key={bld.id} className={styles.slideItem}>
                <div className={styles.buildingCard}>
                  <div className={styles.imgWrap}>
                    <img src={bld.image} alt={bld.name} className={styles.img} />
                    <span className={styles.roomCountBadge}>
                      Còn {bld.availableRooms} phòng trống
                    </span>
                  </div>

                  <div className={styles.content}>
                    <h3 className={styles.name}>{bld.name}</h3>
                    <p className={styles.address} title={bld.address}>
                      <FaMapMarkerAlt color="#0284c7" size={13} style={{ marginRight: '4px', flexShrink: 0 }} />
                      {bld.address}
                    </p>

                    <div className={styles.linkRow}>
                      <Link
                        to={`/rooms?building=${bld.id}`}
                        className={styles.viewLink}
                      >
                        <span>Xem phòng tại tòa này</span>
                        <FaArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className={styles.dotsWrap}>
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.dot} ${currentIndex === idx ? styles.activeDot : ''}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Trượt tới slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BuildingsSection;
