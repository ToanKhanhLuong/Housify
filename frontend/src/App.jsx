import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/index.jsx';
import ScrollToTop from './components/common/ScrollToTop.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRoutes />
    </BrowserRouter>
  );
}
