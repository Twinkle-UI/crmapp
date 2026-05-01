import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import admissionRoutes from './routes/admissionRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import importRoutes from './routes/importRoutes.js';

const app = express();
const httpServer = createServer(app);

app.use(helmet());

/**
 * CORS configuration — supports multiple allowed origins.
 *
 * Why: in production we'll have at least 2 frontend origins:
 *   1. The Vercel preview URL (e.g. https://yourapp-git-main.vercel.app)
 *   2. The Vercel production URL (e.g. https://yourapp.vercel.app)
 *   3. (Later) Your custom domain (https://crm.yourbrand.com)
 *
 * The CLIENT_URL env var supports a comma-separated list:
 *   CLIENT_URL=https://app.com,https://www.app.com,http://localhost:5173
 */
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
}));

// Socket.io — same origin policy as REST API
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`🔌 Socket disconnected: ${socket.id}`));
});
app.set('io', io);

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/import', importRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const start = async () => {
  await connectDB();
  httpServer.listen(PORT, () =>
    console.log(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`)
  );
};
start();
