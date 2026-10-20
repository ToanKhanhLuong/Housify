import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaShieldAlt, FaClock, FaPhoneAlt } from 'react-icons/fa';
import Button from '../../../components/common/Button';
import Badge from '../../../components/common/Badge';
import ZaloButton from '../../../components/common/ZaloButton';
import { mockRooms } from '../../../mocks/landing.mock';
import styles from './RoomDetailPage.module.css';

const formatPrice = (price) => {
  if (!price) return '0 đ/tháng';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' đ/tháng';
};

export default function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const room = mockRooms.find((r) => r.id === id || r._id === id) || mockRooms[0];
  const [selectedImg, setSelectedImg] = useState(room?.thumbnail || '');

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
                      className={`${styles.thumb} ${(selectedImg || room.thumbnail) === img ? styles.activeThumb : ''}`}
                      onClick={() => setSelectedImg(img)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Room Core Info */}
            <div className={styles.detailSection}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Badge variant="primary" className={styles.squareElement}>
                  {room.type || room.roomTypeName || 'Tiêu chuẩn'}
                </Badge>
              </div>

              <h1 className={styles.title}>
                {room.title || `${room.type || 'Phòng'} ${room.roomNumber} - ${room.buildingName}`}
              </h1>
              
              <div className={styles.addressRow}>
                <FaMapMarkerAlt color="#0284c7" />
                <span>{room.address}</span>
              </div>

              <div className={styles.priceTag}>
                {formatPrice(room.rentPrice || room.price)}
              </div>

              {/* Specs Table - 4 Columns matching BE Room model */}
              <div className={styles.specsTable}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Diện tích</span>
                  <span className={styles.specVal}>{room.area} m²</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Vị trí tầng</span>
                  <span className={styles.specVal}>Tầng {room.floorNumber || room.floor || 1}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Sức chứa</span>
                  <span className={styles.specVal}>Tối đa {room.capacity || 2} người</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Tiền cọc</span>
                  <span className={styles.specVal}>
                    {formatPrice(room.deposit || room.rentPrice || room.price)}
                  </span>
                </div>
              </div>

              {/* Description */}
              <h2 className={styles.sectionHeading}>Mô tả & Quy định tòa nhà</h2>
              <p style={{ color: '#475569', lineHeight: '1.7', marginBottom: '2rem' }}>
                {room.description ||
                  'Phòng thuộc hệ thống quản lý trực tiếp Housify, an ninh đảm bảo, giờ giấc tự do, có ban quản lý hỗ trợ tại tòa nhà.'}
              </p>

              {/* Utility Pricing according to BE service_prices */}
              <h2 className={styles.sectionHeading} style={{ marginTop: '2rem' }}>
                Chi phí dịch vụ & Điện nước (Theo biểu giá tòa nhà)
              </h2>
              <div className={styles.utilityList}>
                <div className={styles.utilityRow}>
                  <span>Tiền điện</span>
                  <strong>{room.electricityPrice || 'Theo chỉ số công tơ (3.500 đ/kWh)'}</strong>
                </div>
                <div className={styles.utilityRow}>
                  <span>Tiền nước</span>
                  <strong>{room.waterPrice || 'Theo chỉ số / đầu người (100.000 đ/người)'}</strong>
                </div>
                <div className={styles.utilityRow}>
                  <span>Phí dịch vụ & Quản lý</span>
                  <strong>{room.serviceFee || '150.000 đ/phòng'}</strong>
                </div>
                {room.parkingFee && (
                  <div className={styles.utilityRow}>
                    <span>Phí gửi xe máy</span>
                    <strong>{room.parkingFee}</strong>
                  </div>
                )}
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
                <div className={styles.managerInfoBox}>
                  <div className={styles.managerNameLg}>{room.manager.name}</div>
                  <div className={styles.managerRoleLg}>Quản lý phụ trách tòa nhà</div>
                </div>
              )}

              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                Quý khách có nhu cầu xem phòng thực tế vui lòng nhắn tin Zalo hoặc gọi trực tiếp Quản lý tòa nhà để được hướng dẫn nhanh nhất:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <ZaloButton
                  phone={room.manager?.phone || room.manager?.zalo}
                  label="Nhắn Zalo Với Quản Lý"
                  size="lg"
                  fullWidth
                  className={styles.squareElement}
                />

                <a
                  href={`tel:${room.manager?.phone || '0901234567'}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    icon={<FaPhoneAlt size={14} />}
                    className={styles.squareElement}
                  >
                    Gọi: {room.manager?.phone || '0901 234 567'}
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
}
