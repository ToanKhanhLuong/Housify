import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FaMapMarkerAlt,
  FaCheckCircle,
  FaPhoneAlt,
  FaArrowLeft,
  FaShieldAlt,
  FaClock
} from 'react-icons/fa';
import Badge from '../../components/ui/Badge/Badge';
import ZaloButton from '../../components/ui/ZaloButton/ZaloButton';
import Button from '../../components/ui/Button/Button';
import { mockRooms } from '../../data/mockRooms';
import styles from './RoomDetailPage.module.css';

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN').format(price) + ' đ/tháng';
};

const RoomDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const room = mockRooms.find((r) => r.id === id) || mockRooms[0];
  const [selectedImg, setSelectedImg] = useState(room.thumbnail);

  if (!room) {
    return (
      <div className="container-custom" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <h2>Không tìm thấy phòng này</h2>
        <Button variant="primary" onClick={() => navigate('/rooms')}>
          Quay lại danh sách phòng
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="container-custom">
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <Link to="/rooms">Danh sách phòng</Link>
          <span>/</span>
          <span>{room.roomNumber} - {room.buildingName}</span>
        </div>

        <div className={styles.mainGrid}>
          {/* Left: Gallery & Content */}
          <div>
            {/* Gallery */}
            <div className={styles.galleryWrap}>
              <img
                src={selectedImg || room.thumbnail}
                alt={room.title}
                className={styles.mainImg}
              />
              {room.images && room.images.length > 1 && (
                <div className={styles.thumbRow}>
                  {room.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Ảnh ${idx + 1}`}
                      className={`${styles.thumb} ${selectedImg === img ? styles.activeThumb : ''}`}
                      onClick={() => setSelectedImg(img)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Room Core Info */}
            <div className={styles.detailSection}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Badge variant={room.status === 'available' ? 'available' : 'coming_soon'} className={styles.squareElement}>
                  {room.status === 'available' ? 'Còn phòng' : 'Sắp trống'}
                </Badge>
                <Badge variant="primary" className={styles.squareElement}>{room.type}</Badge>
              </div>

              <h1 className={styles.title}>{room.title} ({room.roomNumber})</h1>
              
              <div className={styles.addressRow}>
                <FaMapMarkerAlt color="#0284c7" />
                <span>{room.address}</span>
              </div>

              <div className={styles.priceTag}>{formatPrice(room.price)}</div>

              {/* Specs Table */}
              <div className={styles.specsTable}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Diện tích</span>
                  <span className={styles.specVal}>{room.area} m²</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Vị trí tầng</span>
                  <span className={styles.specVal}>Tầng {room.floor}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Tiền cọc</span>
                  <span className={styles.specVal}>{formatPrice(room.deposit || room.price)}</span>
                </div>
              </div>

              {/* Description */}
              <h2 className={styles.sectionHeading}>Mô tả chi tiết phòng</h2>
              <p style={{ color: '#475569', lineHeight: '1.7', marginBottom: '2rem' }}>
                {room.description}
              </p>

              {/* Amenities */}
              <h2 className={styles.sectionHeading}>Tiện nghi nội thất có sẵn</h2>
              <div className={styles.amenitiesGrid}>
                {room.amenities?.map((item, idx) => (
                  <div key={idx} className={styles.amenityItem}>
                    <FaCheckCircle color="#10b981" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Utility Pricing */}
              <h2 className={styles.sectionHeading} style={{ marginTop: '2rem' }}>Chi phí dịch vụ & Điện nước</h2>
              <div className={styles.utilityList}>
                <div className={styles.utilityRow}>
                  <span>Tiền điện</span>
                  <strong>{room.electricityPrice || '3.500đ / kWh'}</strong>
                </div>
                <div className={styles.utilityRow}>
                  <span>Tiền nước</span>
                  <strong>{room.waterPrice || '100.000đ / người'}</strong>
                </div>
                <div className={styles.utilityRow}>
                  <span>Phí dịch vụ & Quản lý</span>
                  <strong>{room.serviceFee || '150.000đ / phòng'}</strong>
                </div>
                <div className={styles.utilityRow}>
                  <span>Gửi xe máy</span>
                  <strong style={{ color: '#10b981' }}>Miễn phí 1-2 xe / phòng</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sticky Contact Card with Zalo */}
          <div>
            <div className={styles.contactCard}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                Liên Hệ Đặt Lịch Xem Phòng
              </h3>

              {room.manager && (
                <div className={styles.managerAvatarWrap}>
                  <img
                    src={room.manager.avatar}
                    alt={room.manager.name}
                    className={styles.managerAvatarLg}
                  />
                  <div>
                    <div className={styles.managerNameLg}>{room.manager.name}</div>
                    <div className={styles.managerRoleLg}>Quản lý phụ trách tòa nhà</div>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                Quý khách có nhu cầu xem phòng thực tế vui lòng nhắn tin Zalo hoặc gọi trực tiếp Quản lý tòa nhà để được hướng dẫn nhanh nhất:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <ZaloButton
                  phone={room.manager?.zalo || room.manager?.phone}
                  label="Nhắn Zalo Với Quản Lý"
                  size="lg"
                  fullWidth
                  className={styles.squareElement}
                />

                <a
                  href={`tel:${room.manager?.phone || '0901234567'}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Button variant="outline" size="lg" fullWidth icon={<FaPhoneAlt size={14} />} className={styles.squareElement}>
                    Gọi: {room.manager?.phone || '0901.234.567'}
                  </Button>
                </a>
              </div>

              <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  <FaShieldAlt color="#0284c7" />
                  <span>Cam kết phòng chính chủ không mất phí môi giới</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#64748b' }}>
                  <FaClock color="#0284c7" />
                  <span>Hỗ trợ xem phòng 8h00 - 20h30 hàng ngày</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetailPage;
