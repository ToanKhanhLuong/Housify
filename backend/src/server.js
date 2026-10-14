// Điểm khởi động: đọc env, kết nối MongoDB, chạy app, bật các job định kỳ
import { asyncExitHook } from 'exit-hook';

import app from './app.js';
import { CONNECT_DB, CLOSE_DB } from './config/db.js';
import { env } from './config/env.js';
import { startJobs } from './jobs/index.js';

const START_SERVER = () => {
  app.listen(env.PORT, () => {
    console.log(`Server running at http://localhost:${env.PORT}`);
  });
  startJobs();
};

CONNECT_DB()
  .then(() => {
    console.log('Connected to MongoDB');
    START_SERVER();
  })
  .catch((error) => {
    console.error('Cannot connect to MongoDB:', error);
    process.exit(1);
  });

asyncExitHook(
  async () => {
    console.log('Server is shutting down...');
    await CLOSE_DB();
    console.log('MongoDB connection closed.');
  },
  { wait: 500 },
);