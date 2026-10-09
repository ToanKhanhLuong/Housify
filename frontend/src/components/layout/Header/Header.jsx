import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBuilding, FaBars, FaTimes, FaSignInAlt, FaSearch } from 'react-icons/fa';
import Button from '../../ui/Button/Button';
import styles from './Header.module.css';

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenu = () => setMobileOpen(false);

  return (
    <header className={styles.header}>
      <div className={`container-custom ${styles.inner}`}>
        {/* Brand Logo - click về trang chủ */}
        <Link to="/" className={styles.logo} onClick={closeMenu}>
          <img src="/logo.png" alt="Housify" className={styles.logoImg} />
          <span className={styles.logoText}>
            Housify
            <span className={styles.logoTag}>SYSTEM</span>
          </span>
        </Link>

        {/* Desktop CTA Action Buttons */}
        <div className={styles.actions}>
          <Link to="/rooms">
            <Button variant="outline" size="sm" icon={<FaSearch size={12} />}>
              Xem phòng
            </Button>
          </Link>

          <Link to="/login">
            <Button variant="primary" size="sm" icon={<FaSignInAlt size={12} />}>
              Đăng nhập
            </Button>
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            className={styles.mobileToggle}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          <div className={styles.mobileActions}>
            <Link to="/rooms" onClick={closeMenu}>
              <Button variant="outline" fullWidth icon={<FaSearch size={14} />}>
                Xem danh sách phòng
              </Button>
            </Link>
            <Link to="/login" onClick={closeMenu}>
              <Button variant="primary" fullWidth icon={<FaSignInAlt size={14} />}>
                Đăng nhập hệ thống
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
