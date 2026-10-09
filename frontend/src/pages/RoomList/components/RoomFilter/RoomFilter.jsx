import React from 'react';
import { FaSearch, FaRedo } from 'react-icons/fa';
import Button from '../../../../components/ui/Button/Button';
import { mockBuildings } from '../../../../data/mockBuildings';
import styles from './RoomFilter.module.css';

const RoomFilter = ({
  filters,
  onFilterChange,
  onReset
}) => {
  return (
    <div className={styles.filterCard}>
      <div className={styles.grid}>
        {/* Search text */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Tìm kiếm từ khóa</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Tên phòng, đường, quận..."
              className={styles.input}
              value={filters.keyword}
              onChange={(e) => onFilterChange('keyword', e.target.value)}
            />
          </div>
        </div>

        {/* Building Select */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Tòa nhà</label>
          <select
            className={styles.select}
            value={filters.building}
            onChange={(e) => onFilterChange('building', e.target.value)}
          >
            <option value="">Tất cả tòa nhà</option>
            {mockBuildings.map((bld) => (
              <option key={bld.id} value={bld.id}>
                {bld.name} ({bld.district})
              </option>
            ))}
          </select>
        </div>

        {/* Price Select */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Mức giá thuê</label>
          <select
            className={styles.select}
            value={filters.price}
            onChange={(e) => onFilterChange('price', e.target.value)}
          >
            <option value="">Tất cả mức giá</option>
            <option value="under_3.5">Dưới 3.5 triệu</option>
            <option value="3.5_4.5">Từ 3.5 - 4.5 triệu</option>
            <option value="above_4.5">Trên 4.5 triệu</option>
          </select>
        </div>

        {/* Room Type */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Loại phòng</label>
          <select
            className={styles.select}
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
          >
            <option value="">Tất cả loại phòng</option>
            <option value="Gác lửng">Phòng Gác lửng</option>
            <option value="Studio">Phòng Studio</option>
            <option value="Duplex">Duplex</option>
            <option value="1 Phòng ngủ">1 Phòng ngủ</option>
          </select>
        </div>

        {/* Reset Button */}
        <div>
          <Button
            variant="ghost"
            size="md"
            onClick={onReset}
            icon={<FaRedo size={12} />}
            title="Đặt lại bộ lọc"
          >
            Xóa lọc
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomFilter;
