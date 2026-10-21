// Giữ người đang đăng nhập cho cả app. Dùng: const { user, login, logout } = useAuth();
// user lấy từ GET /auth/me; user.role so với ROLE trong constants/enums.js
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { getToken, setToken, clearToken } from '../utils/session';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // có token thì phải hỏi BE trước khi vẽ trang, chưa có thì khỏi chờ
    const [loading, setLoading] = useState(() => Boolean(getToken()));

    const loadUser = useCallback(async () => {
        const res = await api.get('/auth/me');
        setUser(res.data);
        return res.data;
    }, []);

    useEffect(() => {
        if (!getToken()) return;
        loadUser()
            .catch(() => { }) // 401 đã do axios.js xử lý; BE đang tắt thì coi như chưa đăng nhập
            .finally(() => setLoading(false));
    }, [loadUser]);

    useEffect(() => {
        const onLogout = () => setUser(null);
        window.addEventListener('auth:logout', onLogout);
        return () => window.removeEventListener('auth:logout', onLogout);
    }, []);

    // trang đăng nhập gọi API login xong thì truyền token vào đây
    const login = useCallback(
        async (token, remember = false) => {
            setToken(token, remember);
            return loadUser();
        },
        [loadUser],
    );

    // UC-02: BE không lưu phiên nên đăng xuất chỉ cần xóa token
    const logout = useCallback(() => {
        clearToken();
        setUser(null);
    }, []);

    // reloadUser: sửa hồ sơ xong gọi để header cập nhật tên
    const value = useMemo(
        () => ({ user, loading, login, logout, reloadUser: loadUser }),
        [user, loading, login, logout, loadUser],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);