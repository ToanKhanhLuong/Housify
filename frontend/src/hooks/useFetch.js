// Gọi API lấy dữ liệu khi trang mở / khi deps đổi. Lỗi tự toast (tự ẩn sau 5 giây)
// Cách dùng:
//   const { data, loading, error, reload, setData } = useFetch(() => roomApi.listByBuilding(id, filters), [id, filters]);
//   data là res.data (axios.js đã bóc { success, data, message })
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export default function useFetch(fetcher, deps = []) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });

  // key đổi = cần tải lại. loading tính từ key nên không phải setState đồng bộ trong effect
  const key = JSON.stringify(deps) + '#' + reloadCount;

  useEffect(() => {
    let ignore = false;
    fetcher()
      .then((res) => {
        if (!ignore) setResult({ key, data: res.data, error: null });
      })
      .catch((err) => {
        if (ignore) return;
        toast.error(err.message);
        setResult({ key, data: null, error: err });
      });
    return () => {
      ignore = true;
    };
    // fetcher là hàm mới mỗi lần render, chỉ cần chạy lại khi key đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setReloadCount((c) => c + 1), []);

  // Sửa data tại chỗ sau khi lưu, khỏi gọi lại API
  const setData = useCallback(
    (updater) =>
      setResult((r) => ({ ...r, data: typeof updater === 'function' ? updater(r.data) : updater })),
    [],
  );

  return { data: result.data, error: result.error, loading: result.key !== key, reload, setData };
}
