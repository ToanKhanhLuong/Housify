import React from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';
import RoomCard from '../../../../components/cards/RoomCard/RoomCard';
import { mockRooms } from '../../../../data/mockRooms';
import styles from './FeaturedRooms.module.css';

const FeaturedRooms = () => {
  const featuredList = mockRooms.slice(0, 8);

  return (
    <section className={styles.section}>
      <div className="container-custom">
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Tin nổi bật</h2>

          <Link to="/rooms" className={styles.viewAllLink}>
            <span>Xem thêm</span>
            <FaChevronRight size={12} />
          </Link>
        </div>

        {/* 4 Cards Grid */}
        <div className={styles.grid}>
          {featuredList.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedRooms;
