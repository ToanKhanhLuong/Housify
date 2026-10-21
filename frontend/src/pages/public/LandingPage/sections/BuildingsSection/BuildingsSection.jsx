import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight, FaMapMarkerAlt } from 'react-icons/fa';
import styles from './BuildingsSection.module.css';

export default function BuildingsSection({ buildings = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Hiển thị 3 tòa nhà 1 lượt trên desktop
  const itemsPerPage = 3;
  const maxIndex = Math.max(0, buildings.length - itemsPerPage);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  if (!buildings || buildings.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.header}>
          <div>
            <span className={styles.tag}>HỆ THỐNG CƠ SỞ</span>
            <h2 className={styles.title}>Các Tòa Nhà Thuộc Chuỗi Housify</h2>
            <p className={styles.subtitle}>
              Các tòa nhà tọa lạc tại các vị trí trung tâm, gần các trường đại học lớn tại TP.HCM và Hà Nội.
            </p>
          </div>

          {/* Navigation Arrows */}
          <div className={styles.navControls}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous buildings"
            >
              <FaChevronLeft size={14} />
            </button>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next buildings"
            >
              <FaChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Carousel Slider Window */}
        <div className={styles.carouselWindow}>
          <div
            className={styles.carouselTrack}
            style={{
              transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`
            }}
          >
            {buildings.map((bld) => (
              <div key={bld.id || bld._id} className={styles.carouselItem}>
                <Link
                  to={`/rooms?building=${bld.id || bld._id}`}
                  className={styles.bldCard}
                  title={`Xem danh sách phòng tại ${bld.name}`}
                >
                  {/* Building Image */}
                  <div className={styles.imgWrap}>
                    <img
                      src={bld.image || '/banner_default.jpg'}
                      alt={bld.name}
                      className={styles.bldImg}
                      loading="lazy"
                    />
                  </div>

                  {/* Building Info */}
                  <div className={styles.bldBody}>
                    <h3 className={styles.bldName}>{bld.name}</h3>
                    <p className={styles.bldAddress} title={bld.address}>
                      <FaMapMarkerAlt className={styles.mapIcon} />
                      <span>{bld.address}</span>
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Dots */}
        <div className={styles.dotsWrap}>
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.dot} ${currentIndex === idx ? styles.dotActive : ''}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
