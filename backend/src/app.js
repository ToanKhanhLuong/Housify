// Tạo Express app: cors, json, morgan, static /uploads, mount routes vào /api, notFound, errorHandler
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes.js';
import { notFound } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Ảnh upload lưu ở backend/uploads (xem cảnh báo về CCCD trong ghi chú)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mọi API nằm dưới /api
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
