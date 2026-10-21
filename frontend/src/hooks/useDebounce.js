// Trả về giá trị sau khi người dùng ngừng gõ `delay` ms – dùng cho ô tìm kiếm, ô lọc giá
import { useEffect, useState } from 'react';

export default function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
