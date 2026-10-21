// Trang Đăng nhập hệ thống (UC-01) - Phụ trách: Hưng (FE)
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaInfoCircle, FaExclamationCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import Button from '../../../components/common/Button';
import { authApi } from '../../../api/auth.api';
import styles from './LoginPage.module.css';
import { useAuth } from '../../../context/AuthContext.jsx';
import { HOME_PATH } from '../../../constants/menus.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Status & error states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Vui lòng nhập email hoặc số CCCD.');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.login({
        identifier: identifier.trim(),
        password,
        remember,
      });

      const { token, user } = res.data;

      // Lưu phiên qua AuthContext (ghi nhớ → localStorage, không → sessionStorage)
      login({ token, user, remember });

      // Về trang đang mở dở trước khi bị đẩy ra đăng nhập, nếu không thì về trang chủ theo role
      navigate(location.state?.from?.pathname || HOME_PATH[user.role] || '/', { replace: true });
    } catch (err) {
      // Báo lỗi theo đúng chuẩn API & BR (không nói cụ thể sai ở tài khoản hay mật khẩu)
      setErrorMessage(err.message || 'Tài khoản hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  // Nút bấm nhanh tài khoản mẫu để test tiện lợi
  const handleQuickFill = (idVal, passVal) => {
    setIdentifier(idVal);
    setPassword(passVal);
    setErrorMessage('');
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <img src="/logo.png" alt="Housify" className={styles.logoImg} />
          <h1 className={styles.title}>Đăng Nhập Housify</h1>
          <p className={styles.subtitle}>
            Hệ thống quản lý chuỗi nhà trọ & căn hộ cho thuê
          </p>
        </div>

        {/* Thông báo lỗi đỏ nếu có */}
        {errorMessage && (
          <div className={styles.errorAlert} role="alert">
            <FaExclamationCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Ô định danh duy nhất theo UC-01 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Tài khoản</label>
            <input
              type="text"
              className={`${styles.input} ${errorMessage ? styles.inputError : ''}`}
              placeholder="Nhập email hoặc 12 số CCCD..."
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              autoComplete="username"
              disabled={loading}
              required
            />
          </div>

          {/* Ô mật khẩu */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Mật khẩu</label>
            <div className={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${errorMessage ? styles.inputError : ''}`}
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                autoComplete="current-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          </div>

          {/* Dòng Ghi nhớ đăng nhập & Quên mật khẩu */}
          <div className={styles.rememberRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
              />
              <span>Ghi nhớ đăng nhập (7 ngày)</span>
            </label>

            <Link to="/forgot-password" className={styles.forgotLink}>
              Quên mật khẩu?
            </Link>
          </div>

          {/* Nút Đăng nhập */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            icon={!loading && <FaSignInAlt size={14} />}
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập hệ thống'}
          </Button>
        </form>

        {/* Hộp tài khoản mẫu hỗ trợ chấm bài & kiểm thử nhanh */}
        <div className={styles.demoBox}>
          <div className={styles.demoTitle}>Tài khoản mẫu thử nghiệm:</div>
          <div className={styles.demoPills}>
            <button
              type="button"
              className={styles.demoBtn}
              onClick={() => handleQuickFill('admin@housify.vn', 'Admin@123')}
            >
              Chủ trọ (Admin)
            </button>
            <button
              type="button"
              className={styles.demoBtn}
              onClick={() => handleQuickFill('manager@housify.vn', '123456')}
            >
              Quản lý (Manager)
            </button>
            <button
              type="button"
              className={styles.demoBtn}
              onClick={() => handleQuickFill('079203001234', '123456')}
            >
              Khách thuê (CCCD)
            </button>
            <button
              type="button"
              className={styles.demoBtn}
              onClick={() => handleQuickFill('locked@housify.vn', '123456')}
            >
              Tài khoản bị khóa
            </button>
          </div>
        </div>

        {/* Note box */}
        <div className={styles.infoBox}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <FaInfoCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Lưu ý:</strong>
              <div style={{ marginTop: '0.2rem' }}>
                Admin & Quản lý đăng nhập bằng <strong>Email</strong>. Khách thuê đại diện đăng nhập bằng <strong>Số CCCD</strong> qua mật khẩu được tạo khi kích hoạt hợp đồng.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
