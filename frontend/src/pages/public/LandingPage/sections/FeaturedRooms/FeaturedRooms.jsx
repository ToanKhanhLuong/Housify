import React from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';
import RoomCard from '../../../../../components/room/RoomCard';
import styles from './FeaturedRooms.module.css';

export default function FeaturedRooms({ rooms = [] }) {
  // Hiển thị tối đa 8 phòng (2 dòng x 4 phòng)
  const displayRooms = rooms.slice(0, 8);

  return (
    <section className={styles.section} id="featured-rooms">
      <div className={styles.container}>
        {/* Header Row: Tin nổi bật + Xem thêm > */}
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Tin nổi bật</h2>

          <Link to="/rooms" className={styles.viewAllLink}>
            <span>Xem thêm</span>
            <FaChevronRight size={12} />
          </Link>
        </div>

        {/* 4 Cards Grid */}
        <div className={styles.grid}>
          {displayRooms.map((room) => (
            <RoomCard key={room.id || room._id} room={room} />
          ))}
        </div>
      </div>
    </section>
  );
}
