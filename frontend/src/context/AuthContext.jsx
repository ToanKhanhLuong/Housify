// Người đang đăng nhập: user, login, logout, updateUser; mở app thì nạp lại /auth/me (UC-01, UC-02)
// user có dạng BE trả về: { id, email, role, status, name, phone?, building? (Manager), cccd? (Customer) }
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios.js';
import { getToken, getStoredUser, saveSession, saveUser, clearSession } from '../utils/session.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? getStoredUser() : null));
  // Đang hỏi lại BE thông tin mới nhất (vd Manager vừa được phân công tòa) → chưa vội chặn route
  const [checking, setChecking] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data);
        saveUser(res.data);
      })
      // 401 thì axios đã tự đăng xuất; lỗi mạng thì dùng tạm user đã lưu
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // Gọi sau khi API đăng nhập trả về { token, user }
  const login = useCallback(({ token, user: loggedInUser, remember }) => {
    saveSession({ token, user: loggedInUser, remember });
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  // Cập nhật user sau khi sửa hồ sơ
  const updateUser = useCallback((nextUser) => {
    saveUser(nextUser);
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({ user, checking, login, logout, updateUser }),
    [user, checking, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
