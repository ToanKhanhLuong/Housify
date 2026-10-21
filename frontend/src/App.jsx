// Bọc Router, AuthProvider (người đang đăng nhập) và ToastContainer (toast tự tắt sau 5 giây) cho toàn app
// Hiện toast trong trang: import { toast } from 'react-toastify'; toast.success('...'); toast.error(err.message);
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext.jsx';
import AppRoutes from './routes/index.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={5000} newestOnTop />
      </AuthProvider>
    </BrowserRouter>
  );
}
