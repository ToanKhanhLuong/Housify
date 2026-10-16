// Tạo Express app: cors, json, morgan, mount routes vào /api, notFound, errorHandler
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes.js';
import { notFound } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Mọi API nằm dưới /api
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;