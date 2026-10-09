import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className="container-custom">
        <div className={styles.grid}>
          {/* Cột 1: Về Housify */}
          <div>
            <h4 className={styles.colTitle}>Về Housify</h4>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link to="/docs/gioi-thieu">Giới thiệu</Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/docs/chinh-sach-bao-mat">Chính sách bảo mật</Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/docs/quy-dinh-su-dung">Quy định sử dụng</Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/docs/quy-che-hoat-dong">Quy chế hoạt động</Link>
              </li>
            </ul>
          </div>

          {/* Cột 2: Hỗ trợ */}
          <div>
            <h4 className={styles.colTitle}>Hỗ trợ</h4>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link to="/docs/huong-dan">Hướng dẫn</Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/docs/lien-he">Liên hệ</Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Kết nối với chúng tôi */}
          <div>
            <h4 className={styles.colTitle}>Kết nối với chúng tôi</h4>
            <div className={styles.socialList}>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className={styles.socialBtn}
                title="Facebook"
              >
                <FaFacebookF size={15} />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                className={styles.socialBtn}
                title="TikTok"
              >
                <FaTiktok size={15} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className={styles.socialBtn}
                title="Instagram"
              >
                <FaInstagram size={15} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className={styles.socialBtn}
                title="YouTube"
              >
                <FaYoutube size={15} />
              </a>
            </div>
          </div>
        </div>

        {/* Dòng copyright & thông tin cuối trang ở giữa */}
        <div className={styles.bottomBar}>
          <p>Kênh Thông Tin Nhà Trọ, Phòng Trọ Cho Thuê Housify Tại Việt Nam</p>
          <p>Copyright © {new Date().getFullYear()} Housify.vn</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
