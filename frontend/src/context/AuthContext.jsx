// Giữ người đang đăng nhập cho cả app. Dùng: const { user, login, logout } = useAuth();
// user lấy từ GET /auth/me; user.role so với ROLE trong constants/enums.js
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { BiErrorCircle } from 'react-icons/bi';
import api from '../api/axios';
import { getToken, setToken, clearToken } from '../utils/session';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // có token thì phải hỏi BE trước khi vẽ trang, chưa có thì khỏi chờ
    const [loading, setLoading] = useState(() => Boolean(getToken()));
    const [sessionReplacedMsg, setSessionReplacedMsg] = useState('');
    const [countdown, setCountdown] = useState(5);

    // dùng .then thay vì await: setUser nằm trong callback, không chạy đồng bộ trong useEffect
    // (luật react-hooks/set-state-in-effect)
    const loadUser = useCallback(
        () =>
            api.get('/auth/me').then((res) => {
                setUser(res.data);
                return res.data;
            }),
        [],
    );

    useEffect(() => {
        if (!getToken()) return;
        loadUser()
            .catch(() => { }) // 401 đã do axios.js xử lý; BE đang tắt thì coi như chưa đăng nhập
            .finally(() => setLoading(false));
    }, [loadUser]);

    useEffect(() => {
        const onLogout = () => setUser(null);
        const onSessionReplaced = (event) => {
            setSessionReplacedMsg((prev) => prev || event.detail || 'Tài khoản đang được đăng nhập ở nơi khác.');
            setCountdown(5);
        };
        window.addEventListener('auth:logout', onLogout);
        window.addEventListener('auth:session-replaced', onSessionReplaced);
        return () => {
            window.removeEventListener('auth:logout', onLogout);
            window.removeEventListener('auth:session-replaced', onSessionReplaced);
        };
    }, []);

    const acknowledgeSessionReplaced = useCallback(() => {
        setSessionReplacedMsg('');
        setUser(null);
    }, []);

    // Tự đếm ngược 5 giây rồi chuyển về /login nếu người dùng chưa bấm nút
    useEffect(() => {
        if (!sessionReplacedMsg) return undefined;
        const tick = setInterval(() => {
            setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
        }, 1000);
        const autoOut = setTimeout(() => {
            setSessionReplacedMsg('');
            setUser(null);
        }, 5000);
        return () => {
            clearInterval(tick);
            clearTimeout(autoOut);
        };
    }, [sessionReplacedMsg]);

    // trang đăng nhập gọi API login xong thì truyền token vào đây
    const login = useCallback(
        async (token, remember = false) => {
            setSessionReplacedMsg('');
            setToken(token, remember);
            return loadUser();
        },
        [loadUser],
    );

    // UC-02: đăng xuất xóa token
    const logout = useCallback(() => {
        clearToken();
        window.dispatchEvent(new Event('auth:logout'));
        setSessionReplacedMsg('');
        setUser(null);
    }, []);

    // reloadUser: sửa hồ sơ xong gọi để header cập nhật tên
    const value = useMemo(
        () => ({ user, loading, login, logout, reloadUser: loadUser }),
        [user, loading, login, logout, loadUser],
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
            <Modal
                show={Boolean(sessionReplacedMsg)}
                backdrop="static"
                keyboard={false}
                centered
            >
                <Modal.Header>
                    <Modal.Title className="h5 fw-bold text-danger flex items-center gap-2 mb-0">
                        <BiErrorCircle size={22} />
                        Phiên đăng nhập đã kết thúc
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-2">
                    <p className="mb-0 fw-semibold">{sessionReplacedMsg}</p>
                    <p className="mb-0 small text-secondary">
                        Tài khoản của bạn vừa được đăng nhập trên một thiết bị hoặc trình duyệt khác.
                        Hệ thống sẽ tự động chuyển về trang đăng nhập sau <b>{countdown} giây</b>.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={acknowledgeSessionReplaced}>
                        Đăng nhập lại ngay
                    </Button>
                </Modal.Footer>
            </Modal>
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);