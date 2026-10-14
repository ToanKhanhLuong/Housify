// Bọc Router cho toàn app. Iter 1 thêm AuthProvider, khi cần toast thì thêm ToastContainer
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/index.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
