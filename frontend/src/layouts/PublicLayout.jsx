import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { FaSearch, FaSignInAlt, FaFacebookF, FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa';
import styles from './PublicLayout.module.css';

export default function PublicLayout() {
  return (
    <div className={styles.layoutWrapper}>
      {/* ===== HEADER ===== */}
      <header className={styles.header}>
        <div className={styles.container}>
          {/* Logo */}
          <Link to="/" className={styles.logoWrap}>
            <img src="/logo.png" alt="Housify" className={styles.logoImg} />
            <span className={styles.logoText}>Housify</span>
          </Link>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <Link to="/rooms" className={styles.btnSecondary}>
              <FaSearch size={13} />
              <span>Xem phòng</span>
            </Link>

            <Link to="/login" className={styles.btnPrimary}>
              <FaSignInAlt size={13} />
              <span>Đăng nhập</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className={styles.mainContent}>
        <Outlet />
      </main>

      {/* ===== FOOTER ===== */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            {/* Cột 1: Về Housify */}
            <div>
              <h4 className={styles.colTitle}>Về Housify</h4>
              <ul className={styles.linkList}>
                <li><Link to="/docs/gioi-thieu">Giới thiệu</Link></li>
                <li><Link to="/docs/chinh-sach-bao-mat">Chính sách bảo mật</Link></li>
                <li><Link to="/docs/quy-dinh-su-dung">Quy định sử dụng</Link></li>
                <li><Link to="/docs/quy-che-hoat-dong">Quy chế hoạt động</Link></li>
              </ul>
            </div>

            {/* Cột 2: Hỗ trợ */}
            <div>
              <h4 className={styles.colTitle}>Hỗ trợ</h4>
              <ul className={styles.linkList}>
                <li><Link to="/docs/huong-dan">Hướng dẫn thuê phòng</Link></li>
                <li><Link to="/docs/lien-he">Liên hệ Ban Quản Lý</Link></li>
              </ul>
            </div>

            {/* Cột 3: Kết nối với chúng tôi */}
            <div>
              <h4 className={styles.colTitle}>Kết nối với chúng tôi</h4>
              <div className={styles.socialList}>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className={styles.socialBtn} title="Facebook">
                  <FaFacebookF size={14} />
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noreferrer" className={styles.socialBtn} title="TikTok">
                  <FaTiktok size={14} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className={styles.socialBtn} title="Instagram">
                  <FaInstagram size={14} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" className={styles.socialBtn} title="YouTube">
                  <FaYoutube size={14} />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className={styles.bottomBar}>
            <p className={styles.copyrightText}>Kênh Thông Tin Nhà Trọ, Phòng Trọ Cho Thuê Housify Tại Việt Nam</p>
            <p className={styles.copyrightSub}>Copyright © {new Date().getFullYear()} Housify.vn. Đã đăng ký bản quyền.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
