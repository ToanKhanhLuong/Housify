import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../ui/Badge/Badge';
import styles from './RoomCard.module.css';

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN').format(price) + ' đ/tháng';
};

const RoomCard = ({ room }) => {
  if (!room) return null;

  const isAvailable = room.status === 'available';
  const statusLabel = isAvailable ? 'Còn trống' : 'Sắp trống';
  const statusVariant = isAvailable ? 'available' : 'coming_soon';

  return (
    <Link to={`/rooms/${room.id}`} className={styles.card} title={room.title}>
      {/* Thumbnail & Status Badge */}
      <div className={styles.imgWrap}>
        <img
          src={room.thumbnail}
          alt={room.title}
          className={styles.img}
          loading="lazy"
        />
        <div className={styles.badgeTopLeft}>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
      </div>

      {/* Body Content */}
      <div className={styles.body}>
        {/* Title */}
        <h3 className={styles.title}>{room.title}</h3>

        {/* Address directly below title */}
        <span className={styles.address} title={room.address}>
          {room.address}
        </span>

        {/* Price & Area Specs */}
        <div className={styles.bottomRow}>
          <span className={styles.price}>{formatPrice(room.price)}</span>
          <span className={styles.area}>{room.area} m²</span>
        </div>
      </div>
    </Link>
  );
};

export default RoomCard;
