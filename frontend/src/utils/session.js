// Lưu token đăng nhập. Ghi nhớ đăng nhập → localStorage, không ghi nhớ → sessionStorage (đóng tab là mất)
const KEY = 'token';

export const getToken = () => localStorage.getItem(KEY) || sessionStorage.getItem(KEY);

export const setToken = (token, remember = false) => {
    clearToken();
    (remember ? localStorage : sessionStorage).setItem(KEY, token);
};

export const clearToken = () => {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
};