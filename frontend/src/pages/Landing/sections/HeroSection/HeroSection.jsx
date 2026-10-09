import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaDollarSign, FaRulerCombined } from 'react-icons/fa';
import styles from './HeroSection.module.css';

const HeroSection = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.append('keyword', keyword.trim());
    if (price) params.append('price', price);
    if (area) params.append('area', area);

    // Chuyển thẳng sang trang danh sách phòng /rooms
    navigate(`/rooms?${params.toString()}`);
  };

  return (
    <div className={styles.boxHead}>
      {/* Banner Container with background image */}
      <div className={styles.boxHeadContainer}>
        <div className={styles.boxHeadBg}>
          <img
            src="/banner_default.jpg"
            className={styles.bannerImg}
            alt="Housify Banner"
            fetchPriority="high"
          />
          <div className={styles.bgOverlay} />
        </div>

        {/* Content on the Left */}
        <div className="container-custom" style={{ width: '100%' }}>
          <div className={styles.contentFrame}>
            <h1 className={styles.heading}>
              Tìm nhanh, kiếm dễ
              <span className={styles.headingHighlight}>Trọ Housify toàn quốc</span>
            </h1>
            <p className={styles.description}>
              Hệ thống thông tin và cho thuê phòng trọ tiện nghi, an ninh 24/7 trực tiếp quản lý và vận hành trên toàn quốc.
            </p>
          </div>
        </div>
      </div>

      {/* Search Box Bar overlapping bottom */}
      <div className={styles.boxHeadSearch}>
        <div className="container-custom">
          <form className={styles.boxSearch} onSubmit={handleSearch}>
            <div className={styles.searchList}>
              {/* Field 1: Keyword / Location */}
              <div className={styles.searchItem}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Bạn muốn tìm trọ ở đâu?"
                  className={styles.inputField}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>

              {/* Field 2: Price Range */}
              <div className={styles.searchItem}>
                <FaDollarSign className={styles.searchIcon} />
                <select
                  className={styles.selectField}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                >
                  <option value="">Mức giá</option>
                  <option value="under_3.5">Dưới 3.5 triệu</option>
                  <option value="3.5_4.5">Từ 3.5 - 4.5 triệu</option>
                  <option value="above_4.5">Trên 4.5 triệu</option>
                </select>
              </div>

              {/* Field 3: Area Range */}
              <div className={styles.searchItem}>
                <FaRulerCombined className={styles.searchIcon} />
                <select
                  className={styles.selectField}
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                >
                  <option value="">Diện tích</option>
                  <option value="under_25">Dưới 25 m²</option>
                  <option value="25_35">25 - 35 m²</option>
                  <option value="above_35">Trên 35 m²</option>
                </select>
              </div>

              {/* Field 4: Orange Search Button */}
              <button type="submit" className={styles.searchBtn}>
                <FaSearch size={14} />
                <span>Tìm kiếm</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
