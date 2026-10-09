import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import RoomCard from '../../components/cards/RoomCard/RoomCard';
import RoomFilter from './components/RoomFilter/RoomFilter';
import Button from '../../components/ui/Button/Button';
import { mockRooms } from '../../data/mockRooms';
import styles from './RoomListPage.module.css';

const RoomListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    building: searchParams.get('building') || '',
    price: searchParams.get('price') || '',
    type: searchParams.get('type') || '',
    area: searchParams.get('area') || ''
  });

  // Sync URL search params on change
  useEffect(() => {
    setFilters({
      keyword: searchParams.get('keyword') || '',
      building: searchParams.get('building') || '',
      price: searchParams.get('price') || '',
      type: searchParams.get('type') || '',
      area: searchParams.get('area') || ''
    });
  }, [searchParams]);

  const handleFilterChange = (field, value) => {
    const updated = { ...filters, [field]: value };
    setFilters(updated);

    const newParams = new URLSearchParams();
    Object.keys(updated).forEach((key) => {
      if (updated[key]) newParams.append(key, updated[key]);
    });
    setSearchParams(newParams);
  };

  const handleReset = () => {
    setFilters({ keyword: '', building: '', price: '', type: '' });
    setSearchParams(new URLSearchParams());
  };

  // Filter Logic
  const filteredRooms = mockRooms.filter((room) => {
    // Keyword match
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      const matchTitle = room.title.toLowerCase().includes(kw);
      const matchAddress = room.address.toLowerCase().includes(kw);
      const matchBuilding = room.buildingName.toLowerCase().includes(kw);
      const matchRoomNum = room.roomNumber.toLowerCase().includes(kw);
      const matchCity = room.city?.toLowerCase().includes(kw);
      const matchDistrict = room.district?.toLowerCase().includes(kw);
      if (!matchTitle && !matchAddress && !matchBuilding && !matchRoomNum && !matchCity && !matchDistrict) {
        return false;
      }
    }

    // Building match
    if (filters.building && room.buildingId !== filters.building) {
      return false;
    }

    // Type match
    if (filters.type && room.type !== filters.type) {
      return false;
    }

    // Price match
    if (filters.price === 'under_3.5' && room.price >= 3500000) {
      return false;
    }
    if (filters.price === '3.5_4.5' && (room.price < 3500000 || room.price > 4500000)) {
      return false;
    }
    if (filters.price === 'above_4.5' && room.price <= 4500000) {
      return false;
    }

    // Area match
    if (filters.area === 'under_25' && room.area >= 25) {
      return false;
    }
    if (filters.area === '25_35' && (room.area < 25 || room.area > 35)) {
      return false;
    }
    if (filters.area === 'above_35' && room.area <= 35) {
      return false;
    }

    return true;
  });

  return (
    <div className={styles.page}>
      <div className="container-custom">
        {/* Page Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Danh Sách Phòng Trọ Cho Thuê</h1>
          <p className={styles.subtitle}>
            Tất cả phòng đều thuộc chuỗi quản lý trực tiếp Housify. Liên hệ Quản lý qua Zalo để hẹn lịch xem phòng miễn phí.
          </p>
        </div>

        {/* Filter Bar */}
        <RoomFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />

        {/* Results Metadata */}
        <div className={styles.resultsMeta}>
          <div>
            Tìm thấy <span className={styles.resultsCount}>{filteredRooms.length}</span> phòng phù hợp
          </div>
        </div>

        {/* Rooms Grid */}
        {filteredRooms.length > 0 ? (
          <div className={styles.grid}>
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>Không tìm thấy phòng phù hợp</h3>
            <p className={styles.emptyText}>
              Hãy thử thay đổi tiêu chí tìm kiếm hoặc xóa các bộ lọc để xem toàn bộ danh sách phòng.
            </p>
            <Button variant="primary" onClick={handleReset}>
              Xem tất cả phòng
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomListPage;
