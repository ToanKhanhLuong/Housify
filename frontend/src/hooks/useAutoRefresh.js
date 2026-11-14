// Hook tự động làm mới dữ liệu ngầm mỗi 5 giây (chỉ khi tab đang mở), khi quay lại tab,
// hoặc ngay khi chuông báo có dữ liệu mới ('app:data-changed') — giúp các bên thấy thay đổi mà không cần F5
import { useEffect, useRef } from 'react';
import { getToken } from '../utils/session';

export const APP_DATA_CHANGED = 'app:data-changed';

export const emitDataChanged = () => {
  window.dispatchEvent(new Event(APP_DATA_CHANGED));
};

export const useAutoRefresh = (refreshFn, { intervalMs = 5000, enabled = true } = {}) => {
  const savedCallback = useRef(refreshFn);
  const inFlight = useRef(false);

  useEffect(() => {
    savedCallback.current = refreshFn;
  }, [refreshFn]);

  useEffect(() => {
    if (!enabled) return undefined;

    const trigger = () => {
      if (document.hidden || !getToken() || inFlight.current) return;
      inFlight.current = true;
      Promise.resolve(savedCallback.current?.())
        .catch(() => {})
        .finally(() => {
          inFlight.current = false;
        });
    };

    const timer = setInterval(trigger, intervalMs);
    document.addEventListener('visibilitychange', trigger);
    window.addEventListener(APP_DATA_CHANGED, trigger);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', trigger);
      window.removeEventListener(APP_DATA_CHANGED, trigger);
    };
  }, [enabled, intervalMs]);
};

export default useAutoRefresh;
