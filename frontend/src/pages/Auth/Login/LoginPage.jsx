import React, { useState } from 'react';
import { FaBuilding, FaSignInAlt, FaInfoCircle } from 'react-icons/fa';
import Button from '../../../components/ui/Button/Button';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Đang phát triển Frontend! \nĐăng nhập bằng tài khoản: ${username}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img src="/logo.png" alt="Housify" className={styles.logoImg} />
          <h1 className={styles.title}>Đăng Nhập Housify</h1>
          <p className={styles.subtitle}>
            Hệ thống quản lý chuỗi nhà trọ & căn hộ cho thuê
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tài khoản</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Nhập tài khoản của bạn..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label className={styles.label} style={{ margin: 0 }}>Mật khẩu</label>
              <a href="#forgot" style={{ fontSize: '0.8rem', color: '#0284c7' }}>Quên mật khẩu?</a>
            </div>
            <input
              type="password"
              className={styles.input}
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            icon={<FaSignInAlt size={14} />}
            style={{ marginTop: '1rem' }}
          >
            Đăng nhập hệ thống
          </Button>
        </form>

        {/* Note box */}
        <div className={styles.infoBox}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <FaInfoCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Lưu ý cho khách thuê:</strong>
              <div style={{ marginTop: '0.2rem' }}>
                Khách thuê đăng nhập bằng tài khoản và mật khẩu được Quản lý tòa nhà cấp sau khi ký hợp đồng thuê phòng.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
