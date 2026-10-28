// Gốc ứng dụng: router + đăng nhập + toast (ToastContainer chỉ đặt 1 lần ở đây)
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
      <ToastContainer position="top-right" autoClose={5000} newestOnTop />
    </AuthProvider>
  </BrowserRouter>
);

export default App;