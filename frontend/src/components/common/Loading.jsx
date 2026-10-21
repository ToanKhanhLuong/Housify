// Vòng xoay đang tải. fullScreen: giữa màn hình (lúc mở app kiểm tra đăng nhập)
import { Spinner } from 'react-bootstrap';

export default function Loading({ text = 'Đang tải...', fullScreen = false }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 text-gray-500 ${fullScreen ? 'min-h-screen' : 'py-10'}`}
    >
      <Spinner animation="border" size="sm" />
      <span>{text}</span>
    </div>
  );
}
