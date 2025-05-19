import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors'; // 👈 CORS 추가
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();

// ✅ CORS 설정
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', // FE 도메인
    credentials: true, // 필요 시 쿠키 허용
  })
);
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
