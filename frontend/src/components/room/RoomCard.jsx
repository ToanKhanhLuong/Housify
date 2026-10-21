import React from 'react';
import { Link } from 'react-router-dom';
import styles from './RoomCard.module.css';

// Format tiền theo dạng chuẩn có khoảng trắng giữa hàng nghìn
const formatPrice = (price) => {
  if (!price) return '0 đ/tháng';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' đ/tháng';
};

export default function RoomCard({ room }) {
  if (!room) return null;

  const isAvailable = room.status === 'available' || room.status === 'AVAILABLE';
  const isMaintenance = room.status === 'MAINTENANCE';
  const roomId = room.id || room._id;
  const displayTitle = room.title || `${room.type || 'Phòng'} ${room.roomNumber} - ${room.buildingName || ''}`;
  const displayPrice = room.rentPrice || room.price;

  return (
    <Link to={`/rooms/${roomId}`} className={styles.card} title={displayTitle}>
      {/* Thumbnail */}
      <div className={styles.imgWrap}>
        <img
          src={room.thumbnail || (room.images && room.images[0]) || '/banner_default.jpg'}
          alt={displayTitle}
          className={styles.img}
          loading="lazy"
        />
      </div>

      {/* Body Content */}
      <div className={styles.body}>
        {/* Title */}
        <h3 className={styles.title}>{displayTitle}</h3>

        {/* Address */}
        <p className={styles.address} title={room.address}>
          {room.address}
        </p>

        {/* Price & Area Specs */}
        <div className={styles.bottomRow}>
          <span className={styles.price}>{formatPrice(displayPrice)}</span>
          <span className={styles.area}>{room.area} m²</span>
        </div>
      </div>
    </Link>
  );
}
